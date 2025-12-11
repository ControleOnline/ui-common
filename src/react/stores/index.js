import {create} from 'zustand';

const storeState = {};

export const useStores = create((set, get) => {
  if (Object.keys(storeState).length > 0) {
    return storeState;
  }

  const stores = require('../../../../../../src/store/stores').default;
  if (!stores || Object.keys(stores).length === 0) {
    console.warn('No stores defined.');
    return {};
  }

  Object.keys(stores).forEach(storeName => {
    const storeModule = stores[storeName];

    if (
      !storeModule ||
      !storeModule.state ||
      !storeModule.mutations ||
      !storeModule.actions
    ) {
      console.warn(
        `Store "${storeName}" is missing required properties. Skipping.`,
      );
      return;
    }

    storeState[storeName] = {
      ...storeModule.state,
      getters: new Proxy(storeModule.state, {
        get: (_, prop) => get()[storeName][prop],
      }),
      actions: {},
    };

    const commit = (type, payload) => {
      if (!storeModule.mutations[type]) {
        console.error(`Mutation "${type}" not found in store "${storeName}"`);
        return;
      }
      const keyChanged = storeModule.mutations[type](
        storeState[storeName].getters,
        payload,
      );
      set(state => ({
        [storeName]: {
          ...state[storeName],
          [keyChanged]: payload,
        },
      }));
    };

    Object.keys(storeModule.actions).forEach(actionName => {
      storeState[storeName].actions[actionName] = (...args) =>
        storeModule.actions[actionName](
          {commit, getters: storeState[storeName].getters},
          ...args,
        );
    });
  });

  return storeState;
});

export const getStore = storeName => {
  const store = useStores.getState()[storeName];
  if (!store) {
    throw new Error(
      `Store "${storeName}" not found. Ensure useStores is initialized.`,
    );
  }
  return store;
};

export const getAllStores = () => useStores.getState();