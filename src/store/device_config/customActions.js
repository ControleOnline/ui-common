import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';
import packageJson from '@package';
import {
  DEVICE_ALERT_SOUND_ENABLED_KEY,
  DEVICE_ALERT_SOUND_URL_KEY,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {isWebRuntimeDevice} from '@controleonline/ui-common/src/react/utils/deviceRuntime';

const getAppVersion = () => {
  const packageVersion = packageJson?.version || packageJson?.default?.version;
  if (packageVersion) {
    return packageVersion;
  }

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const device = JSON.parse(localStorage.getItem('device') || '{}');
      if (device && device.appVersion) {
        return device.appVersion;
      }
    } catch (e) {
      console.warn('Erro ao ler device do localStorage:', e);
    }
  }

  try {
    const deviceInfoModule = require('react-native-device-info');
    const deviceInfo = deviceInfoModule?.default || deviceInfoModule;
    if (deviceInfo && typeof deviceInfo.getVersion === 'function') {
      return deviceInfo.getVersion();
    }
  } catch (e) {
    console.warn('Erro ao ler versao do app:', e);
  }

  return null;
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

  // Sobrescrever a versao com a versao atual do app
  configsObj['config-version'] = getAppVersion();

  // Remontar o params com a versão atualizada
  const updatedParams = {
    ...params,
    device: params.device || getDeviceId(),
    configs: JSON.stringify(configsObj),
  };

  const storedDevice = getStoredDevice();
  const isRuntimeWebDevice =
    isWebRuntimeDevice(storedDevice) &&
    updatedParams.device &&
    updatedParams.device === storedDevice?.id;

  if (isRuntimeWebDevice) {
    const nextItem = {
      ...(getters.item || {}),
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

    commit(types.SET_ITEM, nextItem);
    return Promise.resolve(nextItem);
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
      const d = {...getters.item, configs: parsedConfigs};
      commit(types.SET_ITEM, d);
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

// ===== ALTERAÇÃO: NOVA ACTION PARA GRAVAR CONFIGS PREENCHIDAS AUTOMATICAMENTE =====
export const initializeDeviceConfigs = ({commit, getters}, people) => {
  const defaultConfigs = {
    'check-type': 'manual',
    'pos-type': 'full',
    'print-mode': 'order',
    'product-input-type': 'rfid',
    'sound': '0',
    'vibration': '0',
    [DEVICE_ALERT_SOUND_ENABLED_KEY]: '0',
    [DEVICE_ALERT_SOUND_URL_KEY]: '',
    'config-version': getAppVersion(),
    'pos-gateway': 'infinite-pay',
    'cash-wallet-closed-id': 0,
    'cash-wallet-open-id': 0,
  };

  const params = {
    configs: JSON.stringify(defaultConfigs),
    people: people,
  };

  return addDeviceConfigs({commit, getters}, params);
};
// ===== FIM DA ALTERAÇÃO =====
