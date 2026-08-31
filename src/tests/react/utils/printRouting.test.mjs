import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {
  PRINT_ROUTE_MISSING_DESTINATION,
  resolvePrintRoutingError,
  resolveSpoolDeviceIdsForRuntime,
} from '../../../react/utils/printRouting.js';

const PRINT_DEVICE_TYPE = 'PRINT';
const PDV_DEVICE_TYPE = 'PDV';
const DISPLAY_DEVICE_TYPE = 'DISPLAY';

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

  it('accepts deviceId fallback and prefers device', () => {
    const idsWithOnlyDeviceId = resolveSpoolDeviceIdsForRuntime({
      runtimeDeviceId: 'pdv-1',
      runtimeDeviceType: PDV_DEVICE_TYPE,
      managedPrinters: [{deviceId: 'should-not-be-used', type: PRINT_DEVICE_TYPE}],
      includeLocalDevice: false,
    });
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

describe('resolvePrintRoutingError', () => {
  it('returns a visible message when routing has no destination', () => {
    assert.equal(resolvePrintRoutingError({}), PRINT_ROUTE_MISSING_DESTINATION);
  });

  it('is silent when a printer device is selected', () => {
    assert.equal(
      resolvePrintRoutingError({selectedPrinter: {device: 'printer-a'}}),
      '',
    );
  });
});
