export const isNetworkPrinterRuntimeSupported = false;

export const printOnNetworkPrinter = async () => {
  throw new Error(
    'Impressao de rede disponivel apenas no app nativo. No navegador, use um device local intermediario.',
  );
};
