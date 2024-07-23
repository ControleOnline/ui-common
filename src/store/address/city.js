import * as actions from "@controleonline/quasar-default-ui/src/store/default/actions";
import * as getters from "@controleonline/quasar-default-ui/src/store/default/getters";
import mutations from "@controleonline/quasar-default-ui/src/store/default/mutations";

export default {
  namespaced: true,
  state: {
    resourceEndpoint: "cities",
    isLoading: false,
    error: "",
    violations: null,
    totalItems: 0,
    filters: {},
  },
  actions: actions,
  getters,
  mutations,
};
