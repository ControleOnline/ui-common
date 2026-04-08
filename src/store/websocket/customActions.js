import { api } from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';

export const send = ({ commit, getters }, params = {}) => {
  commit(types.SET_ISSAVING, true);
  commit(types.SET_ERROR, '');

  return api
    .fetch(getters.resourceEndpoint, {
      method: 'POST',
      body: params,
    })
    .then(data => {
      commit(types.SET_ITEM, data || {});
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
