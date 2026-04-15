import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';

const normalizePeopleKey = value =>
  String(value || '')
    .replace(/\D+/g, '')
    .trim();

export const getPrinters = ({commit, getters}, params = {}) => {
  const peopleKey = normalizePeopleKey(params?.people);
  commit(types.SET_ISLOADING, true);
  if (getters.items != null) commit(types.SET_ITEMS, []);
  commit(types.SET_TOTALITEMS, 0);
  return api
    .fetch(getters.resourceEndpoint, {params: params})
    .then(data => {
      commit(types.SET_ITEMS, data['member']);
      commit(types.SET_TOTALITEMS, data['totalItems']);
      commit(types.SET_LOADED_KEY, peopleKey);
      commit(types.SET_LOADED_AT, Date.now());

      return data['member'];
    })
    .catch(e => {
      commit(types.SET_ERROR, e.message);
      throw e;
    })
    .finally(() => {
      commit(types.SET_ISLOADING, false);
    });
};

export const ensureCompanyPrintersLoaded = (context, params = {}) => {
  const peopleKey = normalizePeopleKey(params?.people);
  if (!peopleKey) {
    return Promise.resolve([]);
  }

  if (
    context.getters.loadedKey === peopleKey &&
    Array.isArray(context.getters.items)
  ) {
    return Promise.resolve(context.getters.items);
  }

  if (context.getters.isLoading) {
    return Promise.resolve(context.getters.items || []);
  }

  return getPrinters(context, {
    ...params,
    people: peopleKey,
  });
};
