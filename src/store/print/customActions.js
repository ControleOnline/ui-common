import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';

export function printOrder({commit}, params = {}) {
  commit(types.SET_ISLOADING);

  const options = {
    method: 'POST',
    body: params,
  };

  return api
    .fetch('/orders/' + params.id + '/print', options)

    .then(data => {
      commit(types.SET_ISLOADING, false);

      return data;
    })
    .catch(e => {
      commit(types.SET_ISLOADING, false);

      commit(types.SET_ERROR, e.message);
      throw e;
    });
}

export function getCashRegisterPrint({commit}, params = {}) {
  commit(types.SET_ISLOADING);

  const options = {
    method: 'POST',
    body: params,
  };

  return api
    .fetch('/cash-register/print', options)

    .then(data => {
      commit(types.SET_ISLOADING, false);

      return data;
    })
    .catch(e => {
      commit(types.SET_ISLOADING, false);

      commit(types.SET_ERROR, e.message);
      throw e;
    });
}
export function printPurchasingSuggestion({commit}, params = {}) {
  commit(types.SET_ISLOADING);

  const options = {
    method: 'POST',
    body: params,
  };

  return api
    .fetch('/products/purchasing-suggestion/print', options)

    .then(data => {
      commit(types.SET_ISLOADING, false);

      return data;
    })
    .catch(e => {
      commit(types.SET_ISLOADING, false);

      commit(types.SET_ERROR, e.message);
      throw e;
    });
}

export function printInventory({commit}, params = {}) {
  commit(types.SET_ISLOADING);

  const options = {
    method: 'POST',
    body: params,
  };

  return api
    .fetch('/products/inventory/print', options)
    .then(data => {
      commit(types.SET_ISLOADING, false);
      return data;
    })
    .catch(e => {
      commit(types.SET_ISLOADING, false);

      commit(types.SET_ERROR, e.message);
      throw e;
    });
}

export const addToPrint = ({commit, getters}, print) => {
  let spool = [...getters.print];
  spool.push(print);
  commit(types.SET_PRINT, spool);
};
