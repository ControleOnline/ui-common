import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';
import {isWebRuntimeDevice} from '@controleonline/ui-common/src/react/utils/deviceRuntime';

/** Max age for company device_configs cache used by print routing (ms). */
export const COMPANY_DEVICE_CONFIGS_CACHE_TTL_MS = 30 * 1000;

const normalizePeopleKey = value =>
  String(value || '')
    .replace(/\D+/g, '')
    .trim();

const buildPeopleIri = value => {
  const peopleKey = normalizePeopleKey(value);
  return peopleKey ? `/people/${peopleKey}` : '';
};

const getDeviceId = () => {
  const storedDevice = getStoredDevice();
  if (storedDevice?.id) {
    return storedDevice.id;
  }

  return null;
};

const getStoredDevice = () => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const device = JSON.parse(localStorage.getItem('device') || '{}');
      return device || {};
    } catch (e) {
      console.warn('Erro ao ler device do localStorage:', e);
    }
  }

  return {};
};

const resolveConfigId = config => {
  if (!config) {
    return '';
  }
  if (config.id != null && String(config.id).trim() !== '') {
    return String(config.id).trim();
  }
  const iri = String(config['@id'] || '').trim();
  if (!iri) {
    return '';
  }
  const parts = iri.split('/');
  return String(parts[parts.length - 1] || '').trim();
};

/**
 * Merge a saved device_config into the company list and clear loadedKey so the
 * next ensureCompanyDeviceConfigsLoaded can refresh (print routing picks up
 * manager/destination changes without app rebuild).
 */
const mergeSavedConfigIntoCompanyItems = (commit, getters, saved) => {
  if (!saved) {
    return;
  }

  const currentItems = Array.isArray(getters.items) ? getters.items : [];
  const savedId = resolveConfigId(saved);
  const savedDeviceId = String(
    saved?.device?.device || saved?.device?.id || saved?.device || '',
  ).trim();
  const savedType = String(saved?.type || '').trim().toUpperCase();

  let replaced = false;
  const nextItems = currentItems.map(item => {
    const itemId = resolveConfigId(item);
    if (savedId && itemId && savedId === itemId) {
      replaced = true;
      return {...item, ...saved};
    }

    const itemDeviceId = String(
      item?.device?.device || item?.device?.id || item?.device || '',
    ).trim();
    const itemType = String(item?.type || '').trim().toUpperCase();
    if (
      savedDeviceId &&
      itemDeviceId &&
      savedDeviceId === itemDeviceId &&
      savedType &&
      itemType === savedType
    ) {
      replaced = true;
      return {...item, ...saved};
    }

    return item;
  });

  if (!replaced && savedId) {
    nextItems.push(saved);
  }

  commit(types.SET_ITEMS, nextItems);
  // Force next ensure to re-fetch when TTL allows (other runtimes still refresh via TTL).
  commit(types.SET_LOADED_KEY, '');
  commit(types.SET_LOADED_AT, 0);
};

export const addDeviceConfigs = ({commit, getters}, params) => {
  let configsObj = {};
  if (params.configs) {
    if (typeof params.configs === 'string') {
      try {
        configsObj = JSON.parse(params.configs);
      } catch (e) {
        configsObj = {};
      }
    } else if (typeof params.configs === 'object') {
      configsObj = params.configs;
    }
  }

  const storedDevice = getStoredDevice();
  const updatedParams = {
    ...params,
    device: params.device || getDeviceId(),
    type: params.type || getters.item?.type || storedDevice?.type,
    configs: JSON.stringify(configsObj),
  };
  const isRuntimeWebDevice =
    isWebRuntimeDevice(storedDevice) &&
    updatedParams.device &&
    updatedParams.device === storedDevice?.id;
  const canPersistRuntimeWebDevice =
    isRuntimeWebDevice &&
    !!updatedParams.device &&
    !!updatedParams.people;

  const nextItem = {
    ...(getters.item || {}),
    type: updatedParams.type || getters.item?.type,
    device:
      getters.item?.device || {
        id: storedDevice.id,
        device: storedDevice.id,
      },
    people: params.people || getters.item?.people,
    configs: {
      ...(getters.item?.configs || {}),
      ...configsObj,
    },
  };

  if (isRuntimeWebDevice) {
    commit(types.SET_ITEM, nextItem);
    if (!canPersistRuntimeWebDevice) {
      mergeSavedConfigIntoCompanyItems(commit, getters, nextItem);
      return Promise.resolve(nextItem);
    }
  }

  let options = {
    method: 'POST',
    body: updatedParams,
  };
  commit(types.SET_ISSAVING, true);

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
      const hasParsedConfigs =
        parsedConfigs && Object.keys(parsedConfigs).length > 0;
      const d = {
        ...getters.item,
        ...data,
        type: data?.type || nextItem.type || getters.item?.type,
        configs: hasParsedConfigs
          ? parsedConfigs
          : nextItem.configs || getters.item?.configs || {},
      };
      commit(types.SET_ITEM, d);
      mergeSavedConfigIntoCompanyItems(commit, getters, d);
      return d;
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

export const getCompanyDeviceConfigs = ({commit, getters}, params = {}) => {
  const peopleKey = normalizePeopleKey(params?.people);
  const people = buildPeopleIri(params?.people);

  if (!peopleKey || !people) {
    return Promise.resolve([]);
  }

  commit(types.SET_ISLOADING, true);
  if (getters.items != null) commit(types.SET_ITEMS, []);
  commit(types.SET_TOTALITEMS, 0);
  commit(types.SET_SUMMARY, {});

  return api
    .fetch(getters.resourceEndpoint, {
      params: {
        ...params,
        people,
      },
    })
    .then(data => {
      const items = data?.member || data?.['hydra:member'] || [];
      commit(types.SET_ITEMS, items);
      commit(types.SET_TOTALITEMS, data?.totalItems || items.length || 0);
      commit(types.SET_SUMMARY, data?.summary || {});
      commit(types.SET_LOADED_KEY, peopleKey);
      commit(types.SET_LOADED_AT, Date.now());
      return items;
    })
    .catch(e => {
      commit(types.SET_ERROR, e.message);
      throw e;
    })
    .finally(() => {
      commit(types.SET_ISLOADING, false);
    });
};

export const ensureCompanyDeviceConfigsLoaded = (context, params = {}) => {
  const peopleKey = normalizePeopleKey(params?.people);
  if (!peopleKey) {
    return Promise.resolve([]);
  }

  const force = params?.force === true;
  const loadedAt = Number(context.getters.loadedAt) || 0;
  const cacheAgeMs = loadedAt > 0 ? Date.now() - loadedAt : Number.POSITIVE_INFINITY;
  const cacheFresh =
    !force &&
    context.getters.loadedKey === peopleKey &&
    Array.isArray(context.getters.items) &&
    cacheAgeMs < COMPANY_DEVICE_CONFIGS_CACHE_TTL_MS;

  if (cacheFresh) {
    return Promise.resolve(context.getters.items);
  }

  if (context.getters.isLoading) {
    return Promise.resolve(context.getters.items || []);
  }

  return getCompanyDeviceConfigs(context, params);
};

export const invalidateCompanyDeviceConfigsCache = ({commit}) => {
  commit(types.SET_LOADED_KEY, '');
  commit(types.SET_LOADED_AT, 0);
};
