const assert = require('node:assert/strict');
const {describe, it} = global;

const {
  resolveShopSettings,
  toggleAndSaveBooleanConfig,
} = require('../../../react/utils/shopConfig');

describe('shopConfig', () => {
  it('does not expose loyalty stamp artwork as a shop config', () => {
    const result = resolveShopSettings({
      'shop-loyalty-stamp-icon-url':
        '"https://cdn.example.com/legacy-stamp.png"',
    });

    assert.equal(
      Object.prototype.hasOwnProperty.call(result, 'loyaltyStampIconUrl'),
      false,
    );
  });

  it('persists the next boolean value when a toggle is clicked', async () => {
    const calls = [];
    const setValue = value => {
      calls.push(['setValue', value]);
    };
    const saveConfig = async (configKey, value) => {
      calls.push(['saveConfig', configKey, value]);
      return true;
    };

    await toggleAndSaveBooleanConfig({
      configKey: 'shop-sales-page-enabled',
      currentValue: false,
      saveConfig,
      setValue,
    });

    assert.deepEqual(calls, [
      ['setValue', true],
      ['saveConfig', 'shop-sales-page-enabled', '1'],
    ]);
  });

  it('persists the disabled value when toggling an enabled config', async () => {
    const calls = [];
    const setValue = value => {
      calls.push(['setValue', value]);
    };
    const saveConfig = async (configKey, value) => {
      calls.push(['saveConfig', configKey, value]);
      return true;
    };

    await toggleAndSaveBooleanConfig({
      configKey: 'shop-bottom-bar-enabled',
      currentValue: true,
      saveConfig,
      setValue,
    });

    assert.deepEqual(calls, [
      ['setValue', false],
      ['saveConfig', 'shop-bottom-bar-enabled', '0'],
    ]);
  });
});
