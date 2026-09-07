import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const loaderSource = readFileSync(
  new URL(
    '../../../react/pages/Devices/detail/useDeviceDetailLoaders.js',
    import.meta.url,
  ),
  'utf8',
);

test('device detail loaders receive currentCompany from deps exactly once', () => {
  const dependencies = loaderSource.match(
    /export default function useDeviceDetailLoaders\(deps\)[\s\S]*?const \{([\s\S]*?)\}\s*=\s*deps;/,
  );

  assert.ok(dependencies, 'useDeviceDetailLoaders dependency block not found');
  const block = dependencies[1];
  const hits = block.match(/(?:^|,)\s*currentCompany\s*(?:,|$)/gm) || [];
  assert.equal(
    hits.length,
    1,
    `currentCompany must appear exactly once in deps destructure, found ${hits.length}`,
  );
  assert.match(loaderSource, /currentCompany\?\.id/);
});
