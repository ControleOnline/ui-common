import * as getters from './getters';
import mutations from './mutations';
import * as actions from '@controleonline/ui-default/src/store/default/actions';

export default {
  namespaced: true,
  state: {
    item: {},
    items: [],
    isLoading: true,
    permissions: [],
    disabled: true,
    isAdmin: false,
  },
  actions,
  getters,
  mutations,
};
