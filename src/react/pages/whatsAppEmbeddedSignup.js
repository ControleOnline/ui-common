// Meta WhatsApp Embedded Signup (web only): opens the Facebook login popup with the
// Embedded Signup configuration and resolves with the code + WABA / phone number ids.
// The code is exchanged for the token by the API (POST /whatsapp/embedded-signup).

const SDK_ID = 'facebook-jssdk';
const SIGNUP_EVENT = 'WA_EMBEDDED_SIGNUP';

let sdkPromise = null;

export const isEmbeddedSignupSupported = () =>
  typeof window !== 'undefined' && typeof document !== 'undefined';

const loadFacebookSdk = ({ appId, graphVersion }) => {
  if (window.FB) {
    window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: graphVersion });
    return Promise.resolve(window.FB);
  }
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: graphVersion });
      resolve(window.FB);
    };
    const script = document.createElement('script');
    script.id = SDK_ID;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://connect.facebook.net/pt_BR/sdk.js';
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error('Nao foi possivel carregar o SDK do Facebook.'));
    };
    document.body.appendChild(script);
  });

  return sdkPromise;
};

/**
 * @param {{appId: string, configId: string, graphVersion: string, coexistence: boolean}} options
 * @returns {Promise<{code: string, wabaId: string, phoneNumberId: string}>}
 */
export const launchEmbeddedSignup = async ({ appId, configId, graphVersion, coexistence }) => {
  if (!appId || !configId) {
    throw new Error('Cadastro incorporado do Meta nao configurado na API.');
  }
  const FB = await loadFacebookSdk({ appId, graphVersion });

  return new Promise((resolve, reject) => {
    const session = {};
    let code = '';
    let settled = false;

    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      if (error) reject(error);
      else resolve(value);
    };

    const tryResolve = () => {
      if (code && session.wabaId && session.phoneNumberId) {
        finish(null, { code, ...session });
      }
    };

    // Meta posts the selected WABA / number from the popup; the login callback brings the code.
    const onMessage = event => {
      if (!String(event.origin || '').endsWith('facebook.com')) return;
      let data = event.data;
      try {
        data = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        return;
      }
      if (data?.type !== SIGNUP_EVENT) return;

      if (String(data.event || '').startsWith('FINISH')) {
        session.wabaId = String(data.data?.waba_id || '');
        session.phoneNumberId = String(data.data?.phone_number_id || '');
        tryResolve();
      } else if (data.event === 'CANCEL') {
        const step = data.data?.current_step ? ` (etapa ${data.data.current_step})` : '';
        finish(new Error(data.data?.error_message || `Conexao cancelada no Facebook${step}.`));
      } else if (data.event === 'ERROR') {
        finish(new Error(data.data?.error_message || 'O Facebook retornou um erro.'));
      }
    };
    window.addEventListener('message', onMessage);

    const extras = { setup: {}, sessionInfoVersion: '3' };
    if (coexistence) {
      extras.featureType = 'whatsapp_business_app_onboarding';
    }

    // FB.login requires a plain (non-async) callback.
    FB.login(
      response => {
        code = response?.authResponse?.code || '';
        if (!code) {
          finish(new Error('Login no Facebook nao concluido.'));
          return;
        }
        tryResolve();
        // The session message may arrive a little after the callback.
        setTimeout(() => {
          if (!settled) {
            finish(new Error('O Facebook nao informou a conta e o numero do WhatsApp. Tente novamente.'));
          }
        }, 15000);
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras,
      },
    );
  });
};
