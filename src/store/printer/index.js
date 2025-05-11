import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';
import * as customActions from './customActions';

export default {
  namespaced: true,
  state: {
    item: {},
    items: [],
    resourceEndpoint: 'printers',
    isLoading: false,
    reload: false,
    error: '',
    totalItems: 0,messages:[], message:{},
    filters: {},
    columns: [],
    print: [],
  },
  actions: {...actions, ...customActions},
  getters,
  mutations,
};
