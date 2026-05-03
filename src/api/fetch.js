import { APP_ENV } from "../../../../../config/env.js";

function buildHttpError(response, payload, fallbackMessage) {
  const message =
    payload?.description ||
    payload?.message ||
    payload?.error ||
    fallbackMessage ||
    response.statusText ||
    `HTTP ${response.status}`;

  return {
    message,
    code: response.status,
    status: response.status,
    payload,
  };
}

function parseJsonSafely(text) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

export default function (resourceEndpoint, options = {}) {
  const entryPoint =
    APP_ENV.API_ENTRYPOINT + (APP_ENV.API_ENTRYPOINT.endsWith("/") ? "" : "/");

  if (!resourceEndpoint || !entryPoint) return;

  return fetch(new URL(resourceEndpoint, entryPoint), options).then(
    async (response) => {
      if (options.method == "DELETE") return;

      const responseText = await response.text();
      const json = parseJsonSafely(responseText);

      if (options.responseType == "text") {
        if (!response.ok) {
          throw buildHttpError(response, json, responseText);
        }

        return responseText;
      }

      if (!response.ok) {
        throw buildHttpError(response, json, responseText);
      }

      if (json?.["@type"] == "Error") {
        throw buildHttpError(response, json, json["description"]);
      }

      if (json?.["@type"] == "ConstraintViolationList") {
        throw buildHttpError(response, json, json["violations"]);
      }

      if (json !== null) {
        return json;
      }

      if (!responseText) {
        return null;
      }

      throw buildHttpError(
        response,
        null,
        "Invalid JSON response received from API",
      );
    }
  );
}
