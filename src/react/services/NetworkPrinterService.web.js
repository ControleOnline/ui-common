export const isNetworkPrinterRuntimeSupported = false;

export const decodeNetworkPrinterPayload = payload => payload;

export const checkNetworkPrinterConnection = async () => {
  throw new Error(
    'Teste de conectividade da impressora disponivel apenas no app nativo.',
  );
};

export const printOnNetworkPrinter = async () => {
  throw new Error(
    'Impressao de rede disponivel apenas no app nativo. No navegador, use um device local intermediario.',
  );
};
