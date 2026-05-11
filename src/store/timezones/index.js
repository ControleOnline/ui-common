import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

export default {
  namespaced: true,
  state: {
    item: {},
    items: [],
    resourceEndpoint: 'timezones',
    isLoading: false,
    error: '',
    totalItems: 0,
    messages: [],
    message: {},
    summary: {},
    filters: {},
    columns: [
      {
        isIdentity: true,
        sortable: true,
        name: 'id',
        label: 'id',
        align: 'left',
        format(value) {
          return value;
        },
      },
      {
        sortable: true,
        name: 'name',
        label: 'name',
        align: 'left',
        format(value) {
          return value;
        },
      },
    ],
  },
  actions,
  getters,
  mutations,
};
