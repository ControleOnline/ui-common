import {
  DEFAULT_NETWORK_PRINTER_PORT,
  DEFAULT_NETWORK_PRINTER_CODE_PAGE,
  getPrinterHost,
  NETWORK_PRINTER_CODE_PAGE_CONFIG_KEY,
  NETWORK_PRINTER_PORT_CONFIG_KEY,
  normalizePrinterPort,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {
  decodeNetworkPrinterPayload,
  printOnNetworkPrinter,
} from '@controleonline/ui-common/src/react/services/NetworkPrinterService';

/**
 * Print spool content on a managed network printer when available.
 * @returns {Promise<boolean>} true if managed printer handled the job
 */
export const printOnManagedNetworkPrinter = async ({
  managedPrinter,
  content,
}) => {
  if (!managedPrinter) {
    return false;
  }

  const printerHost = getPrinterHost(managedPrinter);
  const printerPort = normalizePrinterPort(
    managedPrinter?.configs?.[NETWORK_PRINTER_PORT_CONFIG_KEY] ||
      DEFAULT_NETWORK_PRINTER_PORT,
  );
  const printerCodePage =
    managedPrinter?.configs?.[NETWORK_PRINTER_CODE_PAGE_CONFIG_KEY] ||
    DEFAULT_NETWORK_PRINTER_CODE_PAGE;

  await printOnNetworkPrinter({
    host: printerHost,
    port: printerPort,
    codePage: printerCodePage,
    payload: decodeNetworkPrinterPayload(content, {
      codePage: printerCodePage,
    }),
  });

  return true;
};
