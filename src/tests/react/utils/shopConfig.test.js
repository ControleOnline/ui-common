const assert = require('node:assert/strict');
const {describe, it} = global;

const {
  resolveShopSettings,
  SHOP_LOYALTY_STAMP_ICON_URL_CONFIG_KEY,
  toggleAndSaveBooleanConfig,
} = require('../../../react/utils/shopConfig');

describe('shopConfig', () => {
  it('reads the configured loyalty stamp icon URL from general settings', () => {
    const result = resolveShopSettings({
      [SHOP_LOYALTY_STAMP_ICON_URL_CONFIG_KEY]:
        '"https://cdn.example.com/loyalty-stamp.png"',
    });

    assert.equal(
      result.loyaltyStampIconUrl,
      'https://cdn.example.com/loyalty-stamp.png',
    );
  });

  it('keeps the loyalty stamp icon URL empty when it is not configured', () => {
    const result = resolveShopSettings({});

    assert.equal(result.loyaltyStampIconUrl, '');
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
