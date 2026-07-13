const {
  resolveShopSettings,
  SHOP_LOYALTY_STAMP_ICON_URL_CONFIG_KEY,
  toggleAndSaveBooleanConfig,
} = require('../../../react/utils/shopConfig');

const {describe, expect, it} = global;

describe('shopConfig', () => {
  it('reads the configured loyalty stamp icon URL from general settings', () => {
    expect(
      resolveShopSettings({
        [SHOP_LOYALTY_STAMP_ICON_URL_CONFIG_KEY]:
          '"https://cdn.example.com/loyalty-stamp.png"',
      }),
    ).toEqual(
      expect.objectContaining({
        loyaltyStampIconUrl: 'https://cdn.example.com/loyalty-stamp.png',
      }),
    );
  });

  it('keeps the loyalty stamp icon URL empty when it is not configured', () => {
    expect(resolveShopSettings({})).toEqual(
      expect.objectContaining({
        loyaltyStampIconUrl: '',
      }),
    );
  });

  it('persists the next boolean value when a toggle is clicked', async () => {
    const setValue = jest.fn();
    const saveConfig = jest.fn().mockResolvedValue(true);

    await toggleAndSaveBooleanConfig({
      configKey: 'shop-sales-page-enabled',
      currentValue: false,
      saveConfig,
      setValue,
    });

    expect(setValue).toHaveBeenCalledWith(true);
    expect(saveConfig).toHaveBeenCalledWith('shop-sales-page-enabled', '1');
  });

  it('persists the disabled value when toggling an enabled config', async () => {
    const setValue = jest.fn();
    const saveConfig = jest.fn().mockResolvedValue(true);

    await toggleAndSaveBooleanConfig({
      configKey: 'shop-bottom-bar-enabled',
      currentValue: true,
      saveConfig,
      setValue,
    });

    expect(setValue).toHaveBeenCalledWith(false);
    expect(saveConfig).toHaveBeenCalledWith('shop-bottom-bar-enabled', '0');
  });
});
