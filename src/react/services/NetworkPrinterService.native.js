import TcpSocket from 'react-native-tcp-socket';
import {Buffer} from 'buffer';

const DEFAULT_CONNECT_TIMEOUT = 5000;
const DEFAULT_FLUSH_DELAY = 180;
const BASE64_REGEX =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const DEFAULT_CODE_PAGE = 'cp850';

const CP850_CHAR_MAP = {
  'Ç': 0x80,
  'ü': 0x81,
  'é': 0x82,
  'â': 0x83,
  'ä': 0x84,
  'à': 0x85,
  'å': 0x86,
  'ç': 0x87,
  'ê': 0x88,
  'ë': 0x89,
  'è': 0x8a,
  'ï': 0x8b,
  'î': 0x8c,
  'ì': 0x8d,
  'Ä': 0x8e,
  'Å': 0x8f,
  'É': 0x90,
  'æ': 0x91,
  'Æ': 0x92,
  'ô': 0x93,
  'ö': 0x94,
  'ò': 0x95,
  'û': 0x96,
  'ù': 0x97,
  'ÿ': 0x98,
  'Ö': 0x99,
  'Ü': 0x9a,
  'ø': 0x9b,
  '£': 0x9c,
  'Ø': 0x9d,
  '×': 0x9e,
  'ƒ': 0x9f,
  'á': 0xa0,
  'í': 0xa1,
  'ó': 0xa2,
  'ú': 0xa3,
  'ñ': 0xa4,
  'Ñ': 0xa5,
  'ª': 0xa6,
  'º': 0xa7,
  '¿': 0xa8,
  '®': 0xa9,
  '¬': 0xaa,
  '½': 0xab,
  '¼': 0xac,
  '¡': 0xad,
  '«': 0xae,
  '»': 0xaf,
  'Á': 0xb5,
  'Â': 0xb6,
  'À': 0xb7,
  '©': 0xb8,
  'ã': 0xc6,
  'Ã': 0xc7,
  'ð': 0xd0,
  'Ð': 0xd1,
  'Ê': 0xd2,
  'Ë': 0xd3,
  'È': 0xd4,
  'Í': 0xd6,
  'Î': 0xd7,
  'Ï': 0xd8,
  'Ì': 0xde,
  'Ó': 0xe0,
  'Ô': 0xe2,
  'Ò': 0xe3,
  'õ': 0xe4,
  'Õ': 0xe5,
  'µ': 0xe6,
  'Ú': 0xe9,
  'Û': 0xea,
  'Ù': 0xeb,
  'ý': 0xec,
  'Ý': 0xed,
  '¯': 0xee,
  '´': 0xef,
  '±': 0xf1,
  '¾': 0xf3,
  '¶': 0xf4,
  '§': 0xf5,
  '÷': 0xf6,
  '¸': 0xf7,
  '°': 0xf8,
  '¨': 0xf9,
  '·': 0xfa,
  '¹': 0xfb,
  '³': 0xfc,
  '²': 0xfd,
};

const normalizeHost = value => String(value || '').trim();
const normalizeCodePage = value =>
  String(value || DEFAULT_CODE_PAGE).trim().toLowerCase();
const normalizePort = value => {
  const numericValue = Number(String(value || '').replace(/\D+/g, ''));
  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : 9100;
};

const isLikelyBase64 = value => {
  const normalizedValue = String(value || '').replace(/\s+/g, '');
  if (!normalizedValue || normalizedValue.length % 4 !== 0) {
    return false;
  }

  return BASE64_REGEX.test(normalizedValue);
};

const extractPrintTextPayload = payload => {
  const resolvePrintableObject = value => {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const operation = String(value?.operation || '').trim().toUpperCase();
    if (operation !== 'PRINT_TEXT') {
      return null;
    }

    return value;
  };

  if (typeof payload === 'string') {
    const trimmedPayload = payload.trim();
    if (trimmedPayload.startsWith('{') || trimmedPayload.startsWith('[')) {
      try {
        const parsedPayload = JSON.parse(trimmedPayload);
        const printableObject = resolvePrintableObject(parsedPayload);
        if (printableObject) {
          const values = Array.isArray(printableObject?.value)
            ? printableObject.value
            : [printableObject?.value];

          return values.map(item => String(item ?? '')).join('');
        }
      } catch (e) {
        // keep the raw payload fallback below
      }
    }

    return '';
  }

  const printableObject = resolvePrintableObject(payload);
  if (!printableObject) {
    return '';
  }

  const values = Array.isArray(printableObject?.value)
    ? printableObject.value
    : [printableObject?.value];

  return values.map(item => String(item ?? '')).join('');
};

const encodeTextPayload = (text, codePage = DEFAULT_CODE_PAGE) => {
  const normalizedCodePage = normalizeCodePage(codePage);
  if (['latin1', 'iso-8859-1', 'windows-1252', 'win1252'].includes(normalizedCodePage)) {
    return Buffer.from(String(text || ''), 'latin1');
  }

  if (normalizedCodePage !== 'cp850') {
    return Buffer.from(String(text || ''), 'latin1');
  }

  return Buffer.from(
    Array.from(String(text || '')).map(character => {
      const charCode = character.charCodeAt(0);
      if (charCode <= 0x7f) {
        return charCode;
      }

      return CP850_CHAR_MAP[character] ?? 0x3f;
    }),
  );
};

const toPrintBuffer = (payload, {codePage = DEFAULT_CODE_PAGE} = {}) => {
  if (payload === null || payload === undefined) {
    return Buffer.alloc(0);
  }

  const printableTextPayload = extractPrintTextPayload(payload);
  if (printableTextPayload) {
    return encodeTextPayload(printableTextPayload, codePage);
  }

  if (Buffer.isBuffer(payload)) {
    return payload;
  }

  if (payload instanceof Uint8Array) {
    return Buffer.from(payload);
  }

  if (typeof payload !== 'string') {
    return Buffer.from(JSON.stringify(payload), 'utf8');
  }

  if (isLikelyBase64(payload)) {
    return Buffer.from(payload.replace(/\s+/g, ''), 'base64');
  }

  return encodeTextPayload(payload, codePage);
};

export const isNetworkPrinterRuntimeSupported = true;

export const decodeNetworkPrinterPayload = (payload, options = {}) =>
  toPrintBuffer(payload, options);

export const checkNetworkPrinterConnection = ({
  host,
  port,
  connectTimeout = DEFAULT_CONNECT_TIMEOUT,
}) => {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost) {
    return Promise.reject(
      new Error('Endereco de rede da impressora nao informado.'),
    );
  }

  const normalizedPort = normalizePort(port);

  return new Promise((resolve, reject) => {
    let settled = false;
    let socket = null;

    const finish = (error = null) => {
      if (settled) {
        return;
      }

      settled = true;

      try {
        socket?.removeAllListeners?.();
      } catch (e) {
        // noop
      }

      try {
        socket?.end?.();
      } catch (e) {
        // noop
      }

      try {
        socket?.destroy?.();
      } catch (e) {
        // noop
      }

      if (error) {
        reject(error);
        return;
      }

      resolve({
        success: true,
        host: normalizedHost,
        port: normalizedPort,
      });
    };

    socket = TcpSocket.createConnection(
      {
        host: normalizedHost,
        port: normalizedPort,
        reuseAddress: true,
        connectTimeout,
      },
      () => {
        finish();
      },
    );

    socket.on('error', error => {
      finish(error);
    });

    socket.setTimeout(connectTimeout, () => {
      finish(new Error('Tempo esgotado ao conectar na impressora de rede.'));
    });
  });
};

export const printOnNetworkPrinter = ({
  host,
  port,
  payload,
  codePage = DEFAULT_CODE_PAGE,
  connectTimeout = DEFAULT_CONNECT_TIMEOUT,
}) => {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost) {
    return Promise.reject(
      new Error('Endereco de rede da impressora nao informado.'),
    );
  }

  const normalizedPort = normalizePort(port);
  const dataBuffer = toPrintBuffer(payload, {codePage});

  if (!dataBuffer.length) {
    return Promise.reject(new Error('Spool vazio para impressao em rede.'));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let socket = null;

    const finish = (error = null) => {
      if (settled) {
        return;
      }

      settled = true;

      try {
        socket?.removeAllListeners?.();
      } catch (e) {
        // noop
      }

      if (error) {
        try {
          socket?.destroy?.();
        } catch (e) {
          // noop
        }
        reject(error);
        return;
      }

      resolve({success: true});
    };

    socket = TcpSocket.createConnection(
      {
        host: normalizedHost,
        port: normalizedPort,
        reuseAddress: true,
        connectTimeout,
      },
      () => {
        socket.setNoDelay(true);
        socket.write(dataBuffer, undefined, writeError => {
          if (writeError) {
            finish(writeError);
            return;
          }

          setTimeout(() => {
            try {
              socket.end();
            } catch (e) {
              try {
                socket.destroy();
              } catch (destroyError) {
                // noop
              }
            }

            finish();
          }, DEFAULT_FLUSH_DELAY);
        });
      },
    );

    socket.on('error', error => {
      finish(error);
    });

    socket.setTimeout(connectTimeout, () => {
      finish(new Error('Tempo esgotado ao conectar na impressora de rede.'));
    });
  });
};
