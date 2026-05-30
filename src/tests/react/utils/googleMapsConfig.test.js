const {
  GOOGLE_MAPS_ANDROID_API_KEY_CONFIG_KEY,
  GOOGLE_MAPS_WEB_API_KEY_CONFIG_KEY,
  resolveGoogleMapsSettings,
} = require('../../../react/utils/googleMapsConfig');

const {describe, expect, it} = global;

describe('googleMapsConfig', () => {
  it('ignores legacy map keys and keeps the dedicated keys empty', () => {
    expect(
      resolveGoogleMapsSettings({
        'shop-google-maps-api-key': '"legacy-key"',
      }),
    ).toEqual({
      webGoogleMapsApiKey: '',
      androidGoogleMapsApiKey: '',
    });
  });

  it('reads the dedicated web and android keys', () => {
    expect(
      resolveGoogleMapsSettings({
        [GOOGLE_MAPS_WEB_API_KEY_CONFIG_KEY]: '"web-key"',
        [GOOGLE_MAPS_ANDROID_API_KEY_CONFIG_KEY]: '"android-key"',
      }),
    ).toEqual({
      webGoogleMapsApiKey: 'web-key',
      androidGoogleMapsApiKey: 'android-key',
    });
  });
});
