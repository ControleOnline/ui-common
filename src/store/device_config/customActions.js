import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';

export const addDeviceConfigs = ({commit, getters}, params) => {
  let options = {
    method: 'POST',
    body: params,
  };
  commit(types.SET_ISSAVING, true);
  console.log('addDeviceConfigs REQUEST:', getters.resourceEndpoint + '/add-configs', params);
  return api
    .fetch(getters.resourceEndpoint + '/add-configs', options)
    .then(data => {
      let parsedConfigs = {};
      if (data?.configs) {
        if (typeof data.configs === 'string') {
          try {
            parsedConfigs = JSON.parse(data.configs);
          } catch (e) {
            parsedConfigs = {};
          }
        } else if (typeof data.configs === 'object') {
          parsedConfigs = data.configs;
        }
      }
      const d = {...getters.item, configs: parsedConfigs};
      commit(types.SET_ITEM, d);
    })
    .catch(e => {
      console.error('addDeviceConfigs API error:', e);
      commit(types.SET_ERROR, e.message);
      throw e;
    })
    .finally(() => {
      commit(types.SET_ISSAVING, false);
    });
};
