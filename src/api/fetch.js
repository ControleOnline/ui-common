import { ENTRYPOINT } from "../../../../../config/entrypoint.js";

export default function (id, options = {}) {
  const entryPoint = ENTRYPOINT + (ENTRYPOINT.endsWith("/") ? "" : "/");
  return fetch(new URL(id, entryPoint), options)
    .then((response) => {
      if (response.ok) return response;
      return response.json().then((json) => {
        if (json["@type"] == "hydra:Error")
          throw {
            message: json["hydra:description"],
            code: response.status,
            status: response.status,
          };
          return response;
      });
    })
    .catch((error) => {
      throw error;
    })
    .then((response) => response.json());
}
