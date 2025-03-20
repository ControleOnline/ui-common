import {APP_ENV} from '../../../../../config/env.js';

export default function (resourceEndpoint, options = {}) {
  const entryPoint =
    APP_ENV.API_ENTRYPOINT + (APP_ENV.API_ENTRYPOINT.endsWith('/') ? '' : '/');

  if (!resourceEndpoint || !entryPoint) return;

  return fetch(new URL(resourceEndpoint, entryPoint), options)
    .then(response => {
      console.log(options.responseType, entryPoint, resourceEndpoint);
      if (options.responseType == 'text') return response.text();

      return response.json().then(json => {
        if (json['@type'] == 'hydra:Error')
          throw {
            message: json['hydra:description'],
            code: response.status,
            status: response.status,
          };
        if (options.method != 'DELETE') return json;
      });
    })
    .catch(error => {
      throw error;
    });
}
