import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";

export default {
  namespaced: true,
  state: {
    item: {},
    items: [],
    resourceEndpoint: "cities",
    isLoading: false,
    error: "",
    
    totalItems: 0,messages:[], message:{},
    filters: {},
  },
  actions: actions,
  getters,
  mutations,
};
