import * as getters from "./getters";
import mutations from "./mutations";

export default {
  namespaced: true,
  state: {
    isLoading: false,
    permissions: [],
    disabled: true,
    isAdmin: false,
  },
  getters,
  mutations,
};
