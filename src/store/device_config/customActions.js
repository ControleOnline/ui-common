import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';
import {isWebRuntimeDevice} from '@controleonline/ui-common/src/react/utils/deviceRuntime';

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

