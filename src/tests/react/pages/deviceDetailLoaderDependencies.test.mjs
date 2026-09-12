import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const detailDir = join(root, 'src/react/pages/Devices/detail');

function sourceOf(file) {
  return readFileSync(join(detailDir, file), 'utf8');
}

function destructureBlock(source, fnName) {
  const start = source.indexOf(`export default function ${fnName}`);
  assert.ok(start >= 0, `${fnName} export found`);
  const destructureStart = source.indexOf('const {', start);
  const destructureEnd = source.indexOf('} = deps;', destructureStart);
  assert.ok(destructureStart >= 0 && destructureEnd > destructureStart, `${fnName} destructure`);
  return source.slice(destructureStart, destructureEnd);
}

for (const fn of [
  'useDeviceDetailLoaders',
  'useDeviceDetailActions',
  'useDeviceDetailSaves',
]) {
  test(`${fn} destructures currentCompany from deps`, () => {
    const block = destructureBlock(sourceOf(`${fn}.js`), fn);
    assert.match(block, /\bcurrentCompany\b/);
  });
}

test('useDeviceDetailLoaders defines applyCurrentDeviceConfig', () => {
  const source = sourceOf('useDeviceDetailLoaders.js');
  assert.match(source, /const applyCurrentDeviceConfig = useCallback/);
  assert.match(source, /return \{\s*applyCurrentDeviceConfig/s);
});

test('useDeviceDetailLoaders imports useFocusEffect and takes displayStore/printerStore', () => {
  const source = sourceOf('useDeviceDetailLoaders.js');
  assert.match(source, /useFocusEffect/);
  const block = destructureBlock(source, 'useDeviceDetailLoaders');
  assert.match(block, /\bdisplayStore\b/);
  assert.match(block, /\bprinterStore\b/);
});

test('useDeviceDetailStateA exports displayStore, printerStore and themeColors', () => {
  const source = sourceOf('useDeviceDetailStateA.js');
  const ret = source.slice(source.lastIndexOf('return {'));
  assert.match(ret, /\bdisplayStore\b/);
  assert.match(ret, /\bprinterStore\b/);
  assert.match(ret, /\bthemeColors\b/);
});

test('useDeviceDetailSaves destructures themeColors', () => {
  const block = destructureBlock(sourceOf('useDeviceDetailSaves.js'), 'useDeviceDetailSaves');
  assert.match(block, /\bthemeColors\b/);
});

test('DeviceDetailScreen defines palette from brandColors', () => {
  const source = sourceOf('DeviceDetailScreen.js');
  assert.match(source, /const palette = brandColors/);
});
