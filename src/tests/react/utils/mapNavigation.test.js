const {
  buildGoogleMapsNavigationUrl,
  buildNavigationMapQuery,
  buildWazeNavigationUrl,
} = require('../../../react/utils/mapNavigation');

const {describe, expect, it} = global;

describe('mapNavigation', () => {
  it('joins only valid address parts when building the map query', () => {
    expect(
      buildNavigationMapQuery([
        'Rua Emilio Bosco, 5675',
        '',
        'Jardim Sao Geronimo',
        null,
        'Sumare - SP',
      ]),
    ).toBe('Rua Emilio Bosco, 5675, Jardim Sao Geronimo, Sumare - SP');
  });

  it('builds a Google Maps directions url when coordinates are available', () => {
    expect(
      buildGoogleMapsNavigationUrl({
        coordinates: {latitude: -22.8218, longitude: -47.2669},
        origin: {latitude: -22.9, longitude: -47.05},
      }),
    ).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-22.8218%2C-47.2669&origin=-22.9%2C-47.05&travelmode=driving',
    );
  });

  it('falls back to a Google Maps search url when only the query is available', () => {
    expect(
      buildGoogleMapsNavigationUrl({
        mapQuery: 'Rua Emilio Bosco, 5675, Sumare - SP',
      }),
    ).toBe(
      'https://www.google.com/maps/search/?api=1&query=Rua%20Emilio%20Bosco%2C%205675%2C%20Sumare%20-%20SP',
    );
  });

  it('builds a Waze url for either coordinates or a free-form query', () => {
    expect(
      buildWazeNavigationUrl({
        coordinates: {latitude: -22.8218, longitude: -47.2669},
      }),
    ).toBe('https://waze.com/ul?ll=-22.8218,-47.2669&navigate=yes');

    expect(
      buildWazeNavigationUrl({
        mapQuery: 'Rua Emilio Bosco, 5675, Sumare - SP',
      }),
    ).toBe(
      'https://waze.com/ul?q=Rua%20Emilio%20Bosco%2C%205675%2C%20Sumare%20-%20SP&navigate=yes',
    );
  });
});
