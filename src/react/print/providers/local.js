import {CieloPrint} from '@controleonline/ui-orders/src/react/services/Cielo/Print';

export const LOCAL_CIELO_PRINT_UNAVAILABLE_MESSAGE =
  'Impressao local Cielo indisponivel neste equipamento.';

export const resolveLocalCieloPrintErrorMessage = response => {
  const result = String(response?.result || '').trim();

  if (/No Activity found to handle Intent/i.test(result)) {
    return (
      global.t?.t('orders', 'message', 'localCieloPrintUnavailable') ||
      LOCAL_CIELO_PRINT_UNAVAILABLE_MESSAGE
    );
  }

  return (
    result ||
    global.t?.t('orders', 'message', 'printProcessingError') ||
    'Falha ao imprimir.'
  );
};

export const decodeLocalPrintPayload = content => {
  if (content === null || content === undefined) {
    return '';
  }

  if (typeof content !== 'string') {
    return JSON.stringify(content);
  }

  if (typeof globalThis.atob === 'function') {
    try {
      return globalThis.atob(content);
    } catch (error) {
      return content;
    }
  }

  return content;
};

export const printOnLocalCielo = async content => {
  const cielo = new CieloPrint();
  const payload = decodeLocalPrintPayload(content);
  const response = await cielo.print(payload);

  if (response?.success === false) {
    throw new Error(resolveLocalCieloPrintErrorMessage(response));
  }

  return response;
};
