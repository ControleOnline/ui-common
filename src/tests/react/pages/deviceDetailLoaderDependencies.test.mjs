import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const detailDir = join(root, 'src/react/pages/Devices/detail');
const sourceOf = (f) => readFileSync(join(detailDir, f), 'utf8');

test('DeviceDetailScreen detailCtx spreads full composition', () => {
  const source = sourceOf('DeviceDetailScreen.js');
  assert.match(source, /\.\.\.state/);
  assert.match(source, /\.\.\.loaders/);
  assert.match(source, /\.\.\.actions/);
  assert.match(source, /\.\.\.saves/);
  assert.match(source, /orderVisibility:\s*deviceOrderVisibility/);
  assert.match(source, /palette:\s*brandColors/);
});

test('AlertsCommandsSection destructures all shouldShow flags', () => {
  const source = sourceOf('DeviceDetailAlertsCommandsSection.js');
  const block = source.slice(0, source.indexOf('} = ctx;'));
  for (const name of [
    'shouldShowOrderVisibility',
    'shouldShowDeviceBehavior',
    'shouldShowRemotePayment',
    'shouldShowRemoteCommands',
  ]) {
    assert.match(block, new RegExp('\\b' + name + '\\b'), name);
  }
});

test('Saves returns shouldShow flags and render helpers', () => {
  const ret = sourceOf('useDeviceDetailSaves.js').slice(
    sourceOf('useDeviceDetailSaves.js').lastIndexOf('return {'),
  );
  for (const name of [
    'shouldShowDeviceBehavior',
    'shouldShowRemotePayment',
    'shouldShowRemoteCommands',
    'renderHelpButton',
    'renderProduct',
  ]) {
    assert.match(ret, new RegExp('\\b' + name + '\\b'), name);
  }
});
