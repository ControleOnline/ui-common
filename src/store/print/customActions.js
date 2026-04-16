import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';

const normalizePeopleKey = value =>
  String(value || '')
    .replace(/\D+/g, '')
    .trim();

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

export function printOrderProduct({commit}, params = {}) {
  commit(types.SET_ISLOADING);

  const options = {
    method: 'POST',
    body: params,
  };

  return api
    .fetch('/order_products/' + params.id + '/print', options)

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

export function printOrderProductQueue({commit}, params = {}) {
  commit(types.SET_ISLOADING);

  const options = {
    method: 'POST',
    body: params,
  };

  return api
    .fetch('/order_product_queues/' + params.id + '/print', options)

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

export function makePrintDone({commit}, id = {}) {
  commit(types.SET_ISLOADING);

  const options = {
    method: 'PUT',
  };

  return api
    .fetch('/print/'+id+'/done', options)
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

export const requestPrint = ({commit, getters}, printRequest) => {
  let queue = [...(getters.print || [])];
  queue.push(printRequest);
  commit(types.SET_PRINT, queue);
};

export const setSelection = ({commit, getters}, {key, value} = {}) => {
  if (!key) {
    return;
  }

  commit(types.SET_SELECTIONS, {
    ...(getters.selections || {}),
    [key]: value || '',
  });
};

export const clearSelection = ({commit, getters}, key) => {
  if (!key) {
    return;
  }

  const nextSelections = {...(getters.selections || {})};
  delete nextSelections[key];
  commit(types.SET_SELECTIONS, nextSelections);
};

export const ensurePrintDependenciesLoaded = async (
  {dispatch},
  {companyId = null} = {},
) => {
  const peopleKey = normalizePeopleKey(companyId);
  if (!peopleKey) {
    return {
      printers: [],
      deviceConfigs: [],
    };
  }

  const [printers, deviceConfigs] = await Promise.all([
    dispatch('printer/ensureCompanyPrintersLoaded', {
      people: peopleKey,
    }),
    dispatch('device_config/ensureCompanyDeviceConfigsLoaded', {
      people: peopleKey,
    }),
  ]);

  return {
    printers,
    deviceConfigs,
  };
};
