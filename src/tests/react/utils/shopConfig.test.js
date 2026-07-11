const {
  resolveShopSettings,
  SHOP_LOYALTY_STAMP_ICON_URL_CONFIG_KEY,
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
});
