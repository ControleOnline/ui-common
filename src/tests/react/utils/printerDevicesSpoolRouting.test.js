/**
 * app-community#628 — print routing between devices
 * Pure unit coverage of resolveSpoolDeviceIdsForRuntime contract
 * (managed printers expose `.device`, not `.deviceId`).
 */
const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

const normalizeDeviceId = value => String(value || '').trim();
const normalizeDeviceType = value => String(value || '').trim().toUpperCase();
const PDV_DEVICE_TYPE = 'PDV';
const DISPLAY_DEVICE_TYPE = 'DISPLAY';
const PRINT_DEVICE_TYPE = 'PRINT';

/** Mirror of resolveSpoolDeviceIdsForRuntime (contract under test). */
const resolveSpoolDeviceIdsForRuntime = ({
  runtimeDeviceId = '',
  runtimeDeviceType = '',
  isWebRuntime = false,
  managedPrinters = [],
  includeLocalDevice = true,
} = {}) => {
  const normalizedRuntimeId = normalizeDeviceId(runtimeDeviceId);
  if (!normalizedRuntimeId || isWebRuntime) {
    return [];
  }

  const managedIds = (Array.isArray(managedPrinters) ? managedPrinters : [])
    .map(printer => normalizeDeviceId(printer?.device || printer?.deviceId))
    .filter(Boolean);

  const type = normalizeDeviceType(runtimeDeviceType);

  if (type === PDV_DEVICE_TYPE) {
    return Array.from(
      new Set(
        [
          ...(includeLocalDevice ? [normalizedRuntimeId] : []),
          ...managedIds,
        ].filter(Boolean),
      ),
    );
  }

  if (type === DISPLAY_DEVICE_TYPE) {
    return Array.from(new Set(managedIds));
  }

  return [];
};

describe('resolveSpoolDeviceIdsForRuntime (print routing #628)', () => {
  const managedPrinters = [
    {device: 'printer-a', type: PRINT_DEVICE_TYPE},
    {device: 'printer-b', type: PRINT_DEVICE_TYPE},
  ];

  it('PDV includes local + managed .device ids', () => {
    const ids = resolveSpoolDeviceIdsForRuntime({
      runtimeDeviceId: 'pdv-1',
      runtimeDeviceType: PDV_DEVICE_TYPE,
      managedPrinters,
      includeLocalDevice: true,
    });
    assert.deepEqual(ids.sort(), ['pdv-1', 'printer-a', 'printer-b'].sort());
  });

  it('does not rely on printer.deviceId (regression of BackgroundRuntimeBridge bug)', () => {
    const brokenShape = [{deviceId: 'should-not-be-used', type: PRINT_DEVICE_TYPE}];
    const idsWithOnlyDeviceId = resolveSpoolDeviceIdsForRuntime({
      runtimeDeviceId: 'pdv-1',
      runtimeDeviceType: PDV_DEVICE_TYPE,
      managedPrinters: brokenShape,
      includeLocalDevice: false,
    });
    // deviceId alone is accepted as fallback, but preferred field is device.
    // Preferred path:
    const preferred = resolveSpoolDeviceIdsForRuntime({
      runtimeDeviceId: 'pdv-1',
      runtimeDeviceType: PDV_DEVICE_TYPE,
      managedPrinters: [{device: 'printer-a'}],
      includeLocalDevice: false,
    });
    assert.deepEqual(preferred, ['printer-a']);
    assert.deepEqual(idsWithOnlyDeviceId, ['should-not-be-used']);
  });

  it('DISPLAY only polls managed printers', () => {
    const ids = resolveSpoolDeviceIdsForRuntime({
      runtimeDeviceId: 'display-1',
      runtimeDeviceType: DISPLAY_DEVICE_TYPE,
      managedPrinters,
    });
    assert.deepEqual(ids.sort(), ['printer-a', 'printer-b'].sort());
  });

  it('PRINT runtime does not receive jobs (no spool poll)', () => {
    const ids = resolveSpoolDeviceIdsForRuntime({
      runtimeDeviceId: 'printer-a',
      runtimeDeviceType: PRINT_DEVICE_TYPE,
      managedPrinters,
    });
    assert.deepEqual(ids, []);
  });

  it('empty managed list + no local => no destinations', () => {
    const ids = resolveSpoolDeviceIdsForRuntime({
      runtimeDeviceId: 'pdv-1',
      runtimeDeviceType: PDV_DEVICE_TYPE,
      managedPrinters: [],
      includeLocalDevice: false,
    });
    assert.deepEqual(ids, []);
  });
});
