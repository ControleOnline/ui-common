/* global describe, expect, it */

const {
  mergeDeviceConfigs,
  buildDeviceListParams,
  expandDeviceListParamSets,
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

  it('buildDeviceListParams omits type for empty queryTypes (All)', () => {
    const params = buildDeviceListParams({
      companyId: 1,
      page: 1,
      queryTypes: [],
    });
    expect(params.type).toBeUndefined();
    expect(params.people).toBe('/people/1');
  });

  it('buildDeviceListParams does not set array type for multi (caller expands)', () => {
    const params = buildDeviceListParams({
      companyId: 1,
      page: 2,
      queryTypes: ['PRINT', 'PRINTER'],
    });
    expect(params.type).toBeUndefined();
    expect(params.page).toBe(2);
  });

  it('expandDeviceListParamSets returns one set without type for All', () => {
    const sets = expandDeviceListParamSets({
      companyId: 3,
      page: 1,
      pageSize: 50,
      queryTypes: [],
    });
    expect(sets).toHaveLength(1);
    expect(sets[0].type).toBeUndefined();
    expect(sets[0].people).toBe('/people/3');
  });

  it('expandDeviceListParamSets returns one set per type for multi', () => {
    const sets = expandDeviceListParamSets({
      companyId: 5,
      page: 1,
      queryTypes: ['PRINT', 'PRINTER'],
    });
    expect(sets).toHaveLength(2);
    expect(sets[0].type).toBe('PRINT');
    expect(sets[1].type).toBe('PRINTER');
    expect(sets[0].people).toBe('/people/5');
  });

  it('expandDeviceListParamSets single type stays one set', () => {
    const sets = expandDeviceListParamSets({
      companyId: 2,
      page: 1,
      queryTypes: ['DISPLAY'],
    });
    expect(sets).toHaveLength(1);
    expect(sets[0].type).toBe('DISPLAY');
  });
});
