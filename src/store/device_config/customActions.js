import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';
import DeviceInfo from 'react-native-device-info';

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

  // Sobrescrever a versão com a versão atual do app
  configsObj['config-version'] = DeviceInfo.getVersion();

  // Remontar o params com a versão atualizada
  const updatedParams = {
    ...params,
    configs: JSON.stringify(configsObj),
  };

  console.log('addDeviceConfigs PARAMS:', updatedParams);

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
    'config-version': DeviceInfo.getVersion(),
    'pos-gateway': 'infinite-pay',
    'cash-wallet-closed-id': 0,
    'cash-wallet-open-id': 0,
  };

  const params = {
    configs: JSON.stringify(defaultConfigs),
    people: people,
  };

  console.log('initializeDeviceConfigs PARAMS:', params);

  return dispatch('addDeviceConfigs', params);
};
// ===== FIM DA ALTERAÇÃO =====