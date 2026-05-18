import { APP_ENV } from "../../../../../config/env.js";
import resolveSystemErrorMessage from '@controleonline/ui-common/src/react/utils/systemErrorMessage';

const buildHttpError = (response, body) => {
  const message =
    resolveSystemErrorMessage(body) ||
    String(response.statusText || 'Request failed');

  return {
    message: message || 'Request failed',
    code: response.status,
    status: response.status,
    body,
  };
};

const readResponseBody = async (response, responseType) => {
  if (responseType === 'text') {
    return response.text();
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
};

export default function (resourceEndpoint, options = {}) {
  const entryPoint =
    APP_ENV.API_ENTRYPOINT + (APP_ENV.API_ENTRYPOINT.endsWith("/") ? "" : "/");

  if (!resourceEndpoint || !entryPoint) return;

  // if (resourceEndpoint == "/people/companies/my")
  //console.log(entryPoint, resourceEndpoint, options);

  //console.log(entryPoint, resourceEndpoint);

  return fetch(new URL(resourceEndpoint, entryPoint), options).then(async response => {
    const body = await readResponseBody(response, options.responseType);

    if (options.method == "DELETE") {
      if (!response.ok) {
        throw buildHttpError(response, body);
      }

      return;
    }

    if (!response.ok) {
      throw buildHttpError(response, body);
    }

    if (options.responseType == "text") {
      return body;
    }

    if (body && typeof body === 'object') {
      if (body["@type"] == "Error" || body["@type"] == "ConstraintViolationList") {
        throw buildHttpError(response, body);
      }
    }

    return body;
  });
}
