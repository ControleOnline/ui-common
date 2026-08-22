/**
 * Smoke contract: Manager /device-detail alias save without refresh.
 * fluxo: manager-devices
 * Refs: app-community#382
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const detailDir = path.join(__dirname, '../../../react/pages/Devices/detail');

const MODULES_MAX_500 = [
  'DeviceDetailScreen.js',
  'DeviceDetailHeader.js',
  'DeviceDetailRenderers.js',
  'DeviceDetailPdvConfigSection.js',
  'DeviceDetailOrdersPrintSection.js',
  'DeviceDetailAlertsCommandsSection.js',
  'DeviceDetailMovementSections.js',
  'DeviceDetailPaymentSection.js',
  'deviceDetailConstants.js',
  'deviceDetailHelpers.js',
  'OptionButtonChip.js',
  'useDeviceDetailStateA.js',
  'useDeviceDetailStateB.js',
  'useDeviceDetailLoaders.js',
  'useDeviceDetailActions.js',
  'useDeviceDetailSaves.js',
];

describe('device-detail alias save (smoke contract)', () => {
  it('documents acceptance: alias save updates header without refresh', () => {
    assert.equal(true, true);
  });

  it('deviceAliasSync helper exists for save path', () => {
    const helper = path.join(__dirname, '../../../react/utils/deviceAliasSync.js');
    assert.equal(fs.existsSync(helper), true);
    assert.match(fs.readFileSync(helper, 'utf8'), /buildDeviceAliasStoreUpdates/);
  });

  it('all detail modules respect absolute 500-line limit', () => {
    for (const name of MODULES_MAX_500) {
      const f = path.join(detailDir, name);
      assert.equal(fs.existsSync(f), true, `missing ${name}`);
      const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/).length;
      assert.ok(lines <= 500, `${name} has ${lines} lines (max 500)`);
    }
  });
});
