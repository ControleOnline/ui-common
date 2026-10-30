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

/**
 * Persist an official (Meta Cloud API) WhatsApp connection.
 * Uses the standard connections resource; provider + providerConfig hold credentials.
 * Access token is write-only (not returned on list reads).
 */
export const saveOfficialWhatsappConnection = ({ commit, getters }, params = {}) => {
  commit(types.SET_ISLOADING, true);

  const body = {
    name: params.name || `WhatsApp Oficial ${params.phoneNumberId || ''}`.trim(),
    channel: 'whatsapp',
    provider: 'official',
    type: params.type || null,
    people: params.people,
    providerConfig: JSON.stringify({
      access_token: params.accessToken,
      phone_number_id: params.phoneNumberId,
      api_version: params.apiVersion || 'v22.0',
    }),
  };

  if (params.phone) {
    body.phone = params.phone;
  }

  const options = {
    method: params.id ? 'PUT' : 'POST',
    body,
  };

  const endpoint = params.id ? `/connections/${params.id}` : '/connections';

  return api
    .fetch(endpoint, options)
    .then(data => {
      commit(types.SET_ITEM, data);
      return data;
    })
    .catch(e => {
      commit(types.SET_ERROR, e.message);
      throw e;
    })
    .finally(() => {
      commit(types.SET_ISLOADING, false);
    });
};
