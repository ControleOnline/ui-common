import TcpSocket from 'react-native-tcp-socket';
import {Buffer} from 'buffer';

const DEFAULT_CONNECT_TIMEOUT = 5000;
const DEFAULT_FLUSH_DELAY = 180;
const BASE64_REGEX =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const normalizeHost = value => String(value || '').trim();
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

const toPrintBuffer = payload => {
  if (payload === null || payload === undefined) {
    return Buffer.alloc(0);
  }

  const printableTextPayload = extractPrintTextPayload(payload);
  if (printableTextPayload) {
    return Buffer.from(printableTextPayload, 'latin1');
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

  return Buffer.from(payload, 'latin1');
};

export const isNetworkPrinterRuntimeSupported = true;

export const printOnNetworkPrinter = ({
  host,
  port,
  payload,
  connectTimeout = DEFAULT_CONNECT_TIMEOUT,
}) => {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost) {
    return Promise.reject(
      new Error('Endereco de rede da impressora nao informado.'),
    );
  }

  const normalizedPort = normalizePort(port);
  const dataBuffer = toPrintBuffer(payload);

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
