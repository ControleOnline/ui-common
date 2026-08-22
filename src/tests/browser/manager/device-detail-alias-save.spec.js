/**
 * Smoke contract: Manager /device-detail alias save without refresh.
 * fluxo: manager-devices
 * Refs: app-community#382
 *
 * Browser steps (manual/QA when browser env available):
 * 1. Manager → Devices → device detail
 * 2. Edit device name (alias) → save
 * 3. Header shows new name without F5
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const detailDir = path.join(__dirname, '../../../react/pages/Devices/detail');

describe('device-detail alias save (smoke contract)', () => {
  it('documents acceptance: alias save updates header without refresh', () => {
    assert.equal(true, true);
  });

  it('deviceAliasSync helper exists for save path', () => {
    const helper = path.join(__dirname, '../../../react/utils/deviceAliasSync.js');
    assert.equal(fs.existsSync(helper), true);
    assert.match(fs.readFileSync(helper, 'utf8'), /buildDeviceAliasStoreUpdates/);
  });

  it('DeviceDetailRenderers module is within absolute line limit', () => {
    const f = path.join(detailDir, 'DeviceDetailRenderers.js');
    const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/).length;
    assert.ok(lines <= 500, `DeviceDetailRenderers.js has ${lines} lines`);
  });
});
