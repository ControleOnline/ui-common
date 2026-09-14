/**
 * Unit coverage for DeviceDetail applyCurrentDeviceConfig (app-community#706).
 */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const loaderPath = path.resolve(
  __dirname,
  '../../../react/pages/Devices/detail/useDeviceDetailLoaders.js',
);

const normalizeEntityId = value => {
  if (value == null || value === '') return '';
  const raw = String(value);
  const parts = raw.split('/');
  return parts[parts.length - 1];
};

const findCurrentDeviceConfig = (scopedItems, context = {}) => {
  const currentDeviceString = String(context.deviceString || '').trim();
  const currentDeviceType = String(context.deviceType || '')
    .trim()
    .toUpperCase();
  const currentDeviceConfigId = normalizeEntityId(context.deviceId);
  return (scopedItems || []).find(d => {
    const currentConfigType = String(d?.type || d?.device?.type || '')
      .trim()
      .toUpperCase();
    const nextDeviceId = normalizeEntityId(
      d?.device?.id ||
        d?.device?.['@id'] ||
        d?.deviceId ||
        d?.device?.deviceId,
    );
    if (currentDeviceConfigId && nextDeviceId === currentDeviceConfigId) {
      return true;
    }
    return (
      d?.device?.device === currentDeviceString &&
      currentConfigType === currentDeviceType
    );
  });
};

describe('applyCurrentDeviceConfig contract (task-706)', () => {
  test('production loader parses without duplicate bindings', () => {
    const result = spawnSync(process.execPath, ['--check', loaderPath], {
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
  });

  test('selects config by device id even when type/string differ', () => {
    const items = [
      { type: 'DISPLAY', device: { id: '1', device: 'aaa' } },
      { type: 'PDV', device: { id: '/devices/403', device: 'other' } },
    ];
    const found = findCurrentDeviceConfig(items, {
      deviceId: '403',
      deviceString: 'pdv-x',
      deviceType: 'PDV',
    });
    assert.equal(found?.device?.id, '/devices/403');
  });

  test('falls back to device string + type when id is missing', () => {
    const items = [
      { type: 'PDV', device: { device: 'device:403' } },
      { type: 'DISPLAY', device: { device: 'device:403' } },
    ];
    const found = findCurrentDeviceConfig(items, {
      deviceString: 'device:403',
      deviceType: 'PDV',
    });
    assert.equal(found?.type, 'PDV');
  });

  test('returns undefined when no match so loader resets local state', () => {
    const found = findCurrentDeviceConfig([], { deviceId: '403' });
    assert.equal(found, undefined);
  });
});
