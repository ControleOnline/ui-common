import {CieloPrint} from '@controleonline/ui-orders/src/react/services/Cielo/Print';

export const decodeLocalPrintPayload = content => {
  if (content === null || content === undefined) {
    return '';
  }

  if (typeof content !== 'string') {
    return JSON.stringify(content);
  }

  if (typeof atob === 'function') {
    try {
      return atob(content);
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
    throw new Error(
      response?.result ||
        global.t?.t('orders', 'message', 'printProcessingError') ||
        'Falha ao imprimir.',
    );
  }

  return response;
};
