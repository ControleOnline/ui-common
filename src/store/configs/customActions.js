import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';

export const addConfigs = ({commit, getters}, params) => {
  let options = {
    method: 'POST',
    body: params,
  };
  commit(types.SET_ISSAVING, true);
  return api
    .fetch(getters.resourceEndpoint + '/add-configs', options)
    .then(data => {
      return data;
    })
    .catch(e => {
      commit(types.SET_ERROR, e.message);
      throw e;
    })
    .finally(() => {
      commit(types.SET_ISSAVING, false);
    });
};
