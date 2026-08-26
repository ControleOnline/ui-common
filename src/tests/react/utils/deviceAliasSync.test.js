const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildDeviceAliasStoreUpdates,
} = require('../../../react/utils/deviceAliasSync.js');

const normalizeEntityId = value => {
  if (value == null || value === '') return '';
  const raw = String(value);
  const match = raw.match(/(\d+)\s*$/);
  return match ? match[1] : raw.replace(/\D/g, '') || raw;
};

test('buildDeviceAliasStoreUpdates merges alias into device and nested config', () => {
  const { mergedDevice, nextDeviceConfig } = buildDeviceAliasStoreUpdates({
    deviceId: 42,
    nextAlias: 'Caixa 01',
    runtimeDevice: { id: 42, alias: 'Antigo', device: 'uuid-1' },
    runtimeDeviceConfig: {
      id: 7,
      device: { id: 42, alias: 'Antigo', device: 'uuid-1' },
      configs: {},
    },
    savedDevice: { id: 42, alias: 'Caixa 01' },
    normalizeEntityId,
  });

  assert.equal(mergedDevice.alias, 'Caixa 01');
  assert.equal(mergedDevice.id, '42');
  assert.equal(mergedDevice.device, 'uuid-1');
  assert.equal(nextDeviceConfig.device.alias, 'Caixa 01');
  assert.equal(nextDeviceConfig.id, 7);
});

test('buildDeviceAliasStoreUpdates works without runtimeDeviceConfig', () => {
  const { mergedDevice, nextDeviceConfig } = buildDeviceAliasStoreUpdates({
    deviceId: '/devices/9',
    nextAlias: 'Novo',
    runtimeDevice: null,
    runtimeDeviceConfig: null,
    savedDevice: { '@id': '/devices/9', alias: 'Novo' },
    normalizeEntityId,
  });

  assert.equal(mergedDevice.alias, 'Novo');
  assert.equal(mergedDevice.id, '9');
  assert.equal(nextDeviceConfig, null);
});
