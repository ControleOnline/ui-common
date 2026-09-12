import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const detailDir = join(root, 'src/react/pages/Devices/detail');
const sourceOf = (f) => readFileSync(join(detailDir, f), 'utf8');

test('useDeviceDetailSaves returns render helpers', () => {
  const source = sourceOf('useDeviceDetailSaves.js');
  const ret = source.slice(source.lastIndexOf('return {'));
  for (const name of ['renderProduct', 'renderHelpButton', 'renderSwitchRow', 'renderOptionButtons']) {
    assert.match(ret, new RegExp('\\b' + name + '\\b'), name);
  }
});

test('DeviceDetailScreen wires render helpers and section aliases', () => {
  const source = sourceOf('DeviceDetailScreen.js');
  assert.match(source, /renderHelpButton/);
  assert.match(source, /const orderVisibility = deviceOrderVisibility/);
  assert.match(source, /const cashManagementMode = counterCashManagementMode/);
  assert.match(source, /const palette = brandColors/);
});

test('useDeviceDetailStateA exports themeColors', () => {
  const ret = sourceOf('useDeviceDetailStateA.js').slice(
    sourceOf('useDeviceDetailStateA.js').lastIndexOf('return {'),
  );
  assert.match(ret, /\bthemeColors\b/);
});

test('useDeviceDetailLoaders defines applyCurrentDeviceConfig', () => {
  const source = sourceOf('useDeviceDetailLoaders.js');
  assert.match(source, /const applyCurrentDeviceConfig = useCallback/);
});
