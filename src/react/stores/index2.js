import {createContext, useContext, useState, useMemo, useCallback} from 'react';
import stores from '../../../../../../src/store/stores';

const StoreContext = createContext();

function validateStore(storeName, storeModule) {
  if (
    !storeModule ||
    !storeModule.state ||
    !storeModule.mutations ||
    !storeModule.actions
  ) {
    console.warn(
      `Store "${storeName}" is missing required properties. Skipping.`,
    );
    return false;
  }
  return true;
}

export function StoreProvider({children}) {
  if (!stores || Object.keys(stores).length === 0) {
    console.warn('No stores defined.');
    return <>{children}</>;
  }

  const [storesStateData, setStoresStateData] = useState(() => {
    const state = {};
    Object.keys(stores).forEach(storeName => {
      if (validateStore(storeName, stores[storeName])) {
        state[storeName] = {...stores[storeName].state};
      }
    });
    return state;
  });

  const commit = useCallback(
    (storeName, type, payload) => {
      const storeModule = stores[storeName];
      if (!storeModule?.mutations?.[type]) {
        console.error(`Mutation "${type}" not found in store "${storeName}"`);
        return;
      }

      const key = storeModule.mutations[type](
        storesStateData[storeName],
        payload,
      );

      setStoresStateData(prev => ({
        ...prev,
        [storeName]: {
          ...prev[storeName],
          [key]: payload,
        },
      }));
    },
    [storesStateData],
  );

  const storesState = useMemo(() => {
    const result = {};
    Object.keys(stores).forEach(storeName => {
      const storeModule = stores[storeName];
      if (!validateStore(storeName, storeModule)) return;

      const getters = {...storesStateData[storeName]};

      const actions = {};
      Object.keys(storeModule.actions).forEach(actionName => {
        actions[actionName] = (...args) =>
          storeModule.actions[actionName](
            {commit: (t, p) => commit(storeName, t, p), getters},
            ...args,
          );
      });

      result[storeName] = {getters, actions};
    });
    return result;
  }, [storesStateData, commit]);

  return (
    <StoreContext.Provider value={storesState}>
      {children}
    </StoreContext.Provider>
  );
}

export function getStore(storeName) {
  const storesState = useContext(StoreContext);
  if (!storesState?.[storeName]) {
    throw new Error(
      `Store "${storeName}" not found. Ensure StoreProvider is used.`,
    );
  }
  return storesState[storeName];
}

export function getAllStores() {
  return useContext(StoreContext);
}
