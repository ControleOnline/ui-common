import { create } from 'zustand';
import { useSyncExternalStore } from 'react';
import stores from '@stores';

const storeState = {};

export const useStores = create((set, get) => {
  if (Object.keys(storeState).length > 0) {
    return storeState;
  }

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
        `Store "${storeName}" is missing required properties (state, mutations, or actions). Skipping.`,
      );
      return;
    }

    storeState[storeName] = {
      ...storeModule.state,
      getters: new Proxy(storeModule.state, {
        get: (_, prop) => {
          const s = get()[storeName];
          return s ? s[prop] : undefined;
        },
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

    const dispatch = (actionName, ...args) => {
      if (typeof actionName !== 'string' || !actionName) {
        console.error(
          `Dispatch received an invalid action name in store "${storeName}"`,
        );
        return undefined;
      }

      let targetStoreName = storeName;
      let targetActionName = actionName;

      if (actionName.includes('/')) {
        const [parsedStoreName, parsedActionName] = actionName.split('/');
        targetStoreName = parsedStoreName || storeName;
        targetActionName = parsedActionName || actionName;
      }

      const targetStore = get()[targetStoreName];
      const targetAction = targetStore?.actions?.[targetActionName];

      if (typeof targetAction !== 'function') {
        console.error(
          `Action "${targetActionName}" not found in store "${targetStoreName}"`,
        );
        return undefined;
      }

      return targetAction(...args);
    };

    Object.keys(storeModule.actions).forEach(actionName => {
      storeState[storeName].actions[actionName] = (...args) =>
        storeModule.actions[actionName](
          {commit, getters: storeState[storeName].getters, dispatch},
          ...args,
        );
    });
  });

  return storeState;
});

const EMPTY_STORE = { getters: {}, actions: {} };
export const useStore = (storeName) =>
  useSyncExternalStore(
    useStores.subscribe,
    () => {
      const state = useStores.getState();
      if (!state[storeName]) {
        // warn once to help trace missing store causing ReferenceError
        console.warn(`useStore: store not found "${String(storeName)}"`);
        return EMPTY_STORE;
      }
      return state[storeName];
    }
  );

export const getAllStores = () => useStores.getState();
