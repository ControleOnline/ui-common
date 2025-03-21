import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

export default {
  namespaced: true,
  state: {
    item: null, //Don´t Touch plz....
    items: null, //Don´t Touch plz....
    resourceEndpoint: 'configs',
    isLoading: false,
    isSaving: false,
    error: '',
    totalItems: 0,
    filters: {},
  },
  actions: actions,
  getters,
  mutations,
};
