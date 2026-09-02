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

test('device detail loaders receive currentCompany from their dependency object', () => {
  const dependencies = loaderSource.match(
    /export default function useDeviceDetailLoaders\(deps\)[\s\S]*?const \{([\s\S]*?)\}\s*=\s*deps;/,
  );

  assert.ok(dependencies, 'useDeviceDetailLoaders dependency block not found');
  assert.match(
    dependencies[1],
    /(?:^|,)\s*currentCompany\s*(?:,|$)/,
    'currentCompany must be read from deps before loaders use it',
  );
  assert.match(loaderSource, /currentCompany\?\.id/);
});
