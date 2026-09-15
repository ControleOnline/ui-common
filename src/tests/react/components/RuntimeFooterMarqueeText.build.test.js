const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

// Run with the host app's Expo dependencies, just like the production build.
const filename = path.resolve(__dirname, '../../../react/components/RuntimeFooterMarqueeText.js');
const source = fs.readFileSync(filename, 'utf8');

for (const platform of ['web', 'android', 'ios']) {
  test(`runtime footer compiles with the production Expo preset (${platform})`, () => {
    const result = babel.transformSync(source, {
      filename,
      babelrc: false,
      configFile: false,
      presets: [require.resolve('babel-preset-expo')],
      envName: 'production',
      caller: {
        name: 'metro', bundler: 'metro', platform,
        isDev: false, isServer: false, supportsStaticESM: true,
      },
    });
    assert.ok(result.code.length > 0);
    if (platform === 'web') {
      assert.match(result.code, /react-native-web/);
    }
  });
}
