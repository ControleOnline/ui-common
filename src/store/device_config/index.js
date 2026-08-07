import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';
import * as customActions from './customActions';

export default {
  namespaced: true,
  state: {
    item: {},
    items: [],
    resourceEndpoint: 'device_configs',
    isLoading: false,
    isSaving: false,
    error: '',
    totalItems: 0,
    messages: [],
    message: {},
    summary: {},
    loadedKey: '',
    loadedAt: 0,
    filters: {},
    columns: [
      {
        editable: false,
        isIdentity: true,
        sortable: true,
        name: 'id',
        align: 'left',
        label: 'id',
        format(value) {
          return value != null ? `#${value}` : '';
        },
      },
      {
        sortable: true,
        name: 'alias',
        align: 'left',
        label: 'device',
        format(value) {
          return value || '';
        },
      },
      {
        sortable: true,
        name: 'typeLabel',
        align: 'left',
        label: 'type',
        format(value) {
          return value || '';
        },
      },
      {
        sortable: true,
        name: 'type',
        align: 'left',
        label: 'configType',
        format(value) {
          return value || '';
        },
      },
    ],
  },
  actions: {
    ...customActions,
    ...actions,
  },
  getters,
  mutations,
};
