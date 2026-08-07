/* global describe, expect, it */

const {
  mergeDeviceConfigs,
  buildDeviceListParams,
  PAGE_SIZE,
} = require('../../../../react/pages/Devices/deviceTypes/deviceListHelpers');

describe('deviceListHelpers', () => {
  it('mergeDeviceConfigs dedupes by id', () => {
    const merged = mergeDeviceConfigs(
      [{id: 1, type: 'PDV'}, {id: 2, type: 'PRINTER'}],
      [{id: 2, type: 'PRINTER'}, {id: 3, type: 'DISPLAY'}],
    );
    expect(merged.map(item => item.id)).toEqual([1, 2, 3]);
  });

  it('buildDeviceListParams sets people and single type', () => {
    const params = buildDeviceListParams({
      companyId: 9,
      page: 1,
      pageSize: PAGE_SIZE,
      queryTypes: ['PDV'],
    });
    expect(params.people).toBe('/people/9');
    expect(params.type).toBe('PDV');
    expect(params.itemsPerPage).toBe(PAGE_SIZE);
  });

  it('buildDeviceListParams accepts multiple types', () => {
    const params = buildDeviceListParams({
      companyId: 1,
      page: 2,
      queryTypes: ['PDV', 'PRINTER'],
    });
    expect(params.type).toEqual(['PDV', 'PRINTER']);
    expect(params.page).toBe(2);
  });
});
