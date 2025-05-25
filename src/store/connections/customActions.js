import { api } from "@controleonline/ui-common/src/api";
import * as types from "@controleonline/ui-default/src/store/default/mutation_types";

export const createWhatsappConnection = ({ commit, getters }, params = {}) => {
  commit(types.SET_ISLOADING, true);

  let options = {
    method: "POST",
    body: params,
  };

  return api
    .fetch("/whatsapp/create-session" , options)
    .then((data) => {
      commit(types.SET_ITEM, data);

      return data;
    })
    .catch((e) => {
      commit(types.SET_ERROR, e.message);
      throw e;
    })
    .finally(() => {
      commit(types.SET_ISLOADING, false);
    });
};
