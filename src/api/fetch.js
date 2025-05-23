import { APP_ENV } from "../../../../../config/env.js";

export default function (resourceEndpoint, options = {}) {
  const entryPoint =
    APP_ENV.API_ENTRYPOINT + (APP_ENV.API_ENTRYPOINT.endsWith("/") ? "" : "/");

  if (!resourceEndpoint || !entryPoint) return;

  // if (resourceEndpoint == "/people/companies/my")
  //   console.log(entryPoint, resourceEndpoint, options.body);

  console.log(entryPoint, resourceEndpoint);

  return fetch(new URL(resourceEndpoint, entryPoint), options).then(
    (response) => {
      if (options.method == "DELETE") return;
      if (options.responseType == "text") return response.text();

      return response.json().then((json) => {
        if (json["@type"] == "Error")
          throw {
            message: json["description"],
            code: response.status,
            status: response.status,
          };
        if (json["@type"] == "ConstraintViolationList")
          throw {
            message: json["violations"],
            code: response.status,
            status: response.status,
          };
        return json;
      });
    }
  );
}
