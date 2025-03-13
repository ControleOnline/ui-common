import {APP_ENV} from '../../../../../config/env.js';

export default function (resourceEndpoint, options = {}) {
  const entryPoint =
    APP_ENV.API_ENTRYPOINT + (APP_ENV.API_ENTRYPOINT.endsWith('/') ? '' : '/');

  return fetch(new URL(resourceEndpoint, entryPoint), options)
    .then(response => {
      console.log(options.responseType);
      if (response.ok || options.responseType == 'text') return response;
      return response.json().then(json => {
        if (json['@type'] == 'hydra:Error')
          throw {
            message: json['hydra:description'],
            code: response.status,
            status: response.status,
          };
        return response;
      });
    })
    .catch(error => {
      throw error;
    })
    .then(response => {
      if (options.method != 'DELETE')
        if (options.responseType == 'text') return response;
        else return response?.json();
    });
}
