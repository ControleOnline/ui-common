import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const detailDir = join(root, 'src/react/pages/Devices/detail');

function destructureBlock(source, fnName) {
  const start = source.indexOf(`export default function ${fnName}`);
  assert.ok(start >= 0, `${fnName} export found`);
  const destructureStart = source.indexOf('const {', start);
  const destructureEnd = source.indexOf('} = deps;', destructureStart);
  assert.ok(destructureStart >= 0 && destructureEnd > destructureStart, `${fnName} destructure block`);
  return source.slice(destructureStart, destructureEnd);
}

for (const fn of [
  'useDeviceDetailLoaders',
  'useDeviceDetailActions',
  'useDeviceDetailSaves',
]) {
  test(`${fn} destructures currentCompany from deps`, () => {
    const source = readFileSync(join(detailDir, `${fn}.js`), 'utf8');
    const block = destructureBlock(source, fn);
    assert.match(block, /\bcurrentCompany\b/, `${fn} must destructure currentCompany`);
  });
}
