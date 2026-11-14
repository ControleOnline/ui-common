import { api } from "@controleonline/ui-common/src/api";
import * as types from "@controleonline/ui-default/src/store/default/mutation_types";

export const createWhatsappConnection = ({ commit, getters }, params = {}) => {
  commit(types.SET_ISLOADING, true);

  const options = {
    method: "POST",
    body: params,
  };

  return api
    .fetch("/whatsapp/create-session", options)
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

/**
 * Persist official Meta Cloud API WhatsApp connection.
 * channel=whatsapp_official + channelConfig JSON (write-only on API).
 */
export const saveOfficialWhatsappConnection = ({ commit }, params = {}) => {
  commit(types.SET_ISLOADING, true);

  const body = {
    name: params.name || `WA Oficial ${params.phoneNumberId || ""}`.trim().slice(0, 50),
    channel: "whatsapp_official",
    type: params.type || "relationship",
    people: params.people,
    channelConfig: JSON.stringify({
      access_token: params.accessToken,
      phone_number_id: params.phoneNumberId,
      api_version: params.apiVersion || "v22.0",
    }),
  };

  if (params.status) {
    body.status = params.status;
  }
  if (params.phone) {
    body.phone = params.phone;
  }

  const options = {
    method: params.id ? "PUT" : "POST",
    body,
  };

  const endpoint = params.id ? `/connections/${params.id}` : "/connections";

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

/**
 * Persist an e-mail connection (IMAP read + SMTP reply). Credentials go to channelConfig (write-only).
 */
export const saveEmailConnection = ({ commit }, params = {}) => {
  commit(types.SET_ISLOADING, true);
  const port = (value, fallback) => Number(String(value || '').replace(/\D/g, '')) || fallback;
  const body = {
    name: params.name || `E-mail ${params.from_address || ''}`.trim(),
    channel: 'email',
    type: params.type || 'support',
    people: params.people,
    channelConfig: JSON.stringify({
      from_address: params.from_address,
      from_name: params.from_name || '',
      username: params.username,
      password: params.password,
      imap_host: params.imap_host,
      imap_port: port(params.imap_port, 993),
      imap_encryption: 'ssl',
      smtp_host: params.smtp_host,
      smtp_port: port(params.smtp_port, 587),
      smtp_encryption: port(params.smtp_port, 587) === 465 ? 'ssl' : 'tls',
    }),
  };

  return api
    .fetch(params.id ? `/connections/${params.id}` : '/connections', { method: params.id ? 'PUT' : 'POST', body })
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
