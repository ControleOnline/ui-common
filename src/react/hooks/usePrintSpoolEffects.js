import {useEffect} from 'react';
import {
  SOCKET_PRINT_POLL_INTERVAL_DISCONNECTED,
  SOCKET_PRINT_POLL_DELAY_CONNECTED,
} from '@controleonline/ui-common/src/react/utils/printSpoolUtils';

/**
 * Side-effects for PrintService: dependency bootstrap, polling, queue drain, messages.
 * Keeps PrintService.js under the absolute 500-line limit.
 */
export function usePrintSpoolEffects({
  currentCompanyId,
  printActions,
  shouldHandleSpool,
  loadOpenSpools,
  reload,
  websocketConnected,
  lastPrintCommandAt,
  connectedPollTimeoutRef,
  print,
  executePrintRequest,
  spoolRef,
  isPrintingRef,
  goPrint,
  spool,
  clearAckRetry,
  message,
  messages,
  markPrintCommand,
}) {
  useEffect(() => {
    if (!currentCompanyId) {
      return;
    }

    printActions
      .ensurePrintDependenciesLoaded({
        companyId: currentCompanyId,
      })
      .catch(() => {});
  }, [currentCompanyId, printActions]);

  useEffect(() => {
    if (shouldHandleSpool) {
      printActions.setReload(true);
      return;
    }

    printActions.setItems([]);
    printActions.setReload(false);
  }, [printActions, shouldHandleSpool]);

  useEffect(() => {
    if (!reload) {
      return;
    }

    loadOpenSpools();
  }, [loadOpenSpools, reload]);

  useEffect(() => {
    if (!shouldHandleSpool || websocketConnected === true) {
      return;
    }

    printActions.setReload(true);
    const intervalId = setInterval(() => {
      printActions.setReload(true);
    }, SOCKET_PRINT_POLL_INTERVAL_DISCONNECTED);

    return () => {
      clearInterval(intervalId);
    };
  }, [printActions, shouldHandleSpool, websocketConnected]);

  useEffect(() => {
    if (connectedPollTimeoutRef.current) {
      clearTimeout(connectedPollTimeoutRef.current);
      connectedPollTimeoutRef.current = null;
    }

    if (!shouldHandleSpool || !websocketConnected || !lastPrintCommandAt) {
      return;
    }

    const elapsed = Date.now() - lastPrintCommandAt;
    const delay = Math.max(SOCKET_PRINT_POLL_DELAY_CONNECTED - elapsed, 0);

    connectedPollTimeoutRef.current = setTimeout(() => {
      printActions.setReload(true);
    }, delay);

    return () => {
      if (connectedPollTimeoutRef.current) {
        clearTimeout(connectedPollTimeoutRef.current);
        connectedPollTimeoutRef.current = null;
      }
    };
  }, [
    connectedPollTimeoutRef,
    lastPrintCommandAt,
    printActions,
    shouldHandleSpool,
    websocketConnected,
  ]);

  useEffect(() => {
    if (print && print.length > 0) {
      for (const p of print) {
        printActions.addToQueue(() => executePrintRequest(p));
      }
      printActions.initQueue(() => {
        printActions.setPrint([]);
      });
    }
  }, [executePrintRequest, print, printActions]);

  useEffect(() => {
    if (!spoolRef.current?.length || isPrintingRef.current) {
      return;
    }

    goPrint(spoolRef.current[0]);
  }, [goPrint, isPrintingRef, spool, spoolRef]);

  useEffect(
    () => () => {
      clearAckRetry();
    },
    [clearAckRetry],
  );

  useEffect(() => {
    if (!message || Object.keys(message).length === 0) {
      return;
    }

    if (message?.action === 'print' || message?.store === 'print') {
      if (shouldHandleSpool) {
        markPrintCommand();
        printActions.setReload(true);
      }
    }

    printActions.setMessage(null);
  }, [markPrintCommand, message, printActions, shouldHandleSpool]);

  useEffect(() => {
    if (
      messages &&
      messages.length > 0 &&
      (!message || Object.keys(message).length === 0)
    ) {
      const queuedMessages = [...messages];
      printActions.setMessage(queuedMessages.pop());
      printActions.setMessages(queuedMessages);
    }
  }, [messages, message, printActions]);
}

export default usePrintSpoolEffects;
