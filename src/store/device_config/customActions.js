import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';

export const addDeviceConfigs = ({commit, getters}, params) => {
  let options = {
    method: 'POST',
    body: params,
  };
  commit(types.SET_ISSAVING, true);
  return api
    .fetch(getters.resourceEndpoint + '/add-configs', options)
    .then(data => {
      const parsedConfigs = data?.configs ? JSON.parse(data.configs) : {};
      const d = {...getters.item, configs: parsedConfigs};
      commit(types.SET_ITEM, d);
    })
    .catch(e => {
      console.log(e);
      commit(types.SET_ERROR, e.message);
      throw e;
    })
    .finally(() => {
      commit(types.SET_ISSAVING, false);
    });
};
