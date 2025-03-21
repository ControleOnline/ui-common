import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";
import Formatter from "@controleonline/ui-common/src/utils/formatter.js";

export default {
  namespaced: true,
  state: {
 item:{},
items:[],
    resourceEndpoint: "translates",
    isLoading: false,
    error: "",
    
    totalItems: 0,
    filters: {},
    columns: [],
  },
  actions: actions,
  getters,
  mutations,
};
