import {api} from '@controleonline/ui-common/src/api';
import * as types from '@controleonline/ui-default/src/store/default/mutation_types';

export const addConfigs = ({commit, getters}, params) => {
  let options = {
    method: 'POST',
    body: params,
  };
  commit(types.SET_ISSAVING, true);
  return api
    .fetch(getters.resourceEndpoint + '/add-configs', options)
    .then(data => {
      return data;
    })
    .catch(e => {
      commit(types.SET_ERROR, e.message);
      throw e;
    })
    .finally(() => {
      commit(types.SET_ISSAVING, false);
    });
};



export const discoveryMainConfigs = ({commit, getters}, params) => {
  let options = {
    method: 'POST',
    body: params,
  };
  commit(types.SET_ISSAVING, true);
  return api
    .fetch(getters.resourceEndpoint + '/discovery-configs', options)
    .then(data => {
      let parsedConfigs = {};
      const normalizeConfigEntries = raw => {
        let normalized = raw;

        if (typeof normalized === 'string') {
          try {
            normalized = JSON.parse(normalized);
          } catch (e) {
            normalized = null;
          }
        }

        if (Array.isArray(normalized)) {
          const map = {};
          normalized.forEach(config => {
            if (!config || typeof config !== 'object') return;

            const key =
              config.configKey ||
              config.key ||
              config.name ||
              config.config_name;
            const value =
              config.configValue !== undefined
                ? config.configValue
                : config.value !== undefined
                  ? config.value
                  : config.config_value;

            if (key) {
              map[key] = value;
            }
          });
          return map;
        }

        if (normalized && typeof normalized === 'object') {
          return normalized;
        }

        return {};
      };

      const rawConfigs =
        data?.configs ?? data?.member ?? data?.['hydra:member'] ?? data;
      parsedConfigs = normalizeConfigEntries(rawConfigs);

      if (parsedConfigs && typeof parsedConfigs === 'object') {
        const hasTypoKey = Object.prototype.hasOwnProperty.call(
          parsedConfigs,
          'pos-withdrawl-wallet',
        );
        const hasCorrectKey = Object.prototype.hasOwnProperty.call(
          parsedConfigs,
          'pos-withdrawal-wallet',
        );

        if (!hasTypoKey && hasCorrectKey) {
          parsedConfigs['pos-withdrawl-wallet'] =
            parsedConfigs['pos-withdrawal-wallet'];
        }
      }

      commit(types.SET_ITEMS, parsedConfigs);
    })
    .catch(e => {
      commit(types.SET_ERROR, e.message);
      throw e;
    })
    .finally(() => {
      commit(types.SET_ISSAVING, false);
    });
};