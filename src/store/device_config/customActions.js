import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';

const getAppVersion = () => {
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

  return 'unknown';
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
    configs: JSON.stringify(configsObj),
  };

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
export const initializeDeviceConfigs = ({commit, getters, dispatch}, people) => {
  const defaultConfigs = {
    'check-type': 'manual',
    'pos-type': 'full',
    'print-mode': 'order',
    'product-input-type': 'rfid',
    'sound': '0',
    'vibration': '0',
    'config-version': getAppVersion(),
    'pos-gateway': 'infinite-pay',
    'cash-wallet-closed-id': 0,
    'cash-wallet-open-id': 0,
  };

  const params = {
    configs: JSON.stringify(defaultConfigs),
    people: people,
  };

  return dispatch('addDeviceConfigs', params);
};
// ===== FIM DA ALTERAÇÃO =====