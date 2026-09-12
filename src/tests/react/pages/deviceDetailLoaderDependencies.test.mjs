import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const loadersPath = join(root, 'src/react/pages/Devices/detail/useDeviceDetailLoaders.js');

test('useDeviceDetailLoaders destructures currentCompany from deps', () => {
  const source = readFileSync(loadersPath, 'utf8');
  const start = source.indexOf('export default function useDeviceDetailLoaders');
  assert.ok(start >= 0, 'function export found');
  const destructureStart = source.indexOf('const {', start);
  const destructureEnd = source.indexOf('} = deps;', destructureStart);
  assert.ok(destructureStart >= 0 && destructureEnd > destructureStart, 'destructure block found');
  const block = source.slice(destructureStart, destructureEnd);
  assert.match(block, /\bcurrentCompany\b/, 'currentCompany must be destructured from deps');
});
