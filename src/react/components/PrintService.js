import React, {useCallback, useEffect, useRef} from 'react';
import {CieloPrint} from '@controleonline/ui-orders/src/react/services/Cielo/Print';
import {useStore} from '@store';

const SOCKET_PRINT_POLL_INTERVAL = 60000;

const PrintService = () => {
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const printStore = useStore('print');
  const printGetters = printStore.getters;
  const printActions = printStore.actions;
  const deviceStore = useStore('device');
  const deviceGetters = deviceStore.getters;
  const websocketStore = useStore('websocket');
  const websocketGetters = websocketStore.getters;

  const {item: storagedDevice} = deviceGetters;
  const {reload, print, items: spool, message, messages} = printGetters;
  const {currentCompany} = peopleGetters;
  const {summary: websocketSummary} = websocketGetters;

  const isPrintingRef = useRef(false);
  const spoolRef = useRef([]);

  useEffect(() => {
    spoolRef.current = Array.isArray(spool) ? spool : [];
  }, [spool]);

  const resolveSpoolId = useCallback(value => {
    if (!value) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const numericValue = value.replace(/\D/g, '');
      return numericValue ? Number(numericValue) : null;
    }

    return (
      resolveSpoolId(value?.id) ||
      resolveSpoolId(value?.spoolId) ||
      resolveSpoolId(value?.spool) ||
      resolveSpoolId(value?.['@id'])
    );
  }, []);

  const resolveTargetDevice = useCallback(
    printJob => printJob?.device || storagedDevice?.id,
    [storagedDevice?.id],
  );

  const getPrintPayload = useCallback(content => {
    if (content === null || content === undefined) {
      return '';
    }

    if (typeof content !== 'string') {
      return JSON.stringify(content);
    }

    if (typeof atob === 'function') {
      try {
        return atob(content);
      } catch (e) {
        return content;
      }
    }

    return content;
  }, []);

  const loadOpenSpools = useCallback(() => {
    if (!storagedDevice?.id) {
      printActions.setReload(false);
      return Promise.resolve([]);
    }

    return printActions
      .getItems({
        'device.device': storagedDevice.id,
        'status.realStatus': 'open',
      })
      .catch(() => [])
      .finally(() => {
        printActions.setReload(false);
      });
  }, [printActions, storagedDevice?.id]);

  const removeSpoolFromQueue = useCallback(
    spoolId => {
      if (!spoolId) {
        const nextQueue = [...(spoolRef.current || [])];
        nextQueue.shift();
        spoolRef.current = nextQueue;
        printActions.setItems(nextQueue);
        return;
      }

      const nextQueue = (spoolRef.current || []).filter(
        item => resolveSpoolId(item) !== spoolId,
      );
      spoolRef.current = nextQueue;
      printActions.setItems(nextQueue);
    },
    [printActions, resolveSpoolId],
  );

  const getSpoolData = useCallback(
    async printJob => {
      const spoolId = resolveSpoolId(printJob);
      if (!spoolId) {
        return printJob || null;
      }

      try {
        return await printActions.get(spoolId);
      } catch (e) {
        return printJob || null;
      }
    },
    [printActions, resolveSpoolId],
  );

  const goPrint = useCallback(
    async printJob => {
      if (isPrintingRef.current) {
        return;
      }

      const spoolId = resolveSpoolId(printJob);
      if (!spoolId) {
        removeSpoolFromQueue(null);
        return;
      }

      isPrintingRef.current = true;
      const cielo = new CieloPrint();

      try {
        const data = await getSpoolData(printJob);
        if (!data?.file?.content) {
          removeSpoolFromQueue(spoolId);
          return;
        }

        const payload = getPrintPayload(data.file.content);
        const response = await cielo.print(payload);

        if (response?.success === false) {
          throw new Error(
            response?.result ||
              global.t?.t('orders', 'message', 'printProcessingError'),
          );
        }

        await printActions.makePrintDone(spoolId);
        removeSpoolFromQueue(spoolId);
      } catch (e) {
        printActions.setError(
          e?.message || global.t?.t('orders', 'message', 'printProcessingError'),
        );
        removeSpoolFromQueue(spoolId);
      } finally {
        isPrintingRef.current = false;
      }
    },
    [getPrintPayload, getSpoolData, printActions, removeSpoolFromQueue, resolveSpoolId],
  );

  useEffect(() => {
    if (storagedDevice?.id) {
      printActions.setReload(true);
    }
  }, [printActions, storagedDevice?.id]);

  useEffect(() => {
    if (!reload) {
      return;
    }

    loadOpenSpools();
  }, [loadOpenSpools, reload]);

  useEffect(() => {
    if (!storagedDevice?.id || websocketSummary?.connected === true) {
      return;
    }

    printActions.setReload(true);
    const intervalId = setInterval(() => {
      printActions.setReload(true);
    }, SOCKET_PRINT_POLL_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [printActions, storagedDevice?.id, websocketSummary?.connected]);

  useEffect(() => {
    if (print && print.length > 0) {
      for (const p of print) {
        printActions.addToQueue(() =>
          getData(p).finally(() => {
            if (resolveTargetDevice(p) === storagedDevice?.id) {
              printActions.setReload(true);
            }
          }),
        );
      }
      printActions.initQueue(() => {
        printActions.setPrint([]);
      });
    }
  }, [print, printActions, resolveTargetDevice, storagedDevice?.id]);

  useEffect(() => {
    if (!spoolRef.current?.length || isPrintingRef.current) {
      return;
    }

    goPrint(spoolRef.current[0]);
  }, [goPrint, spool]);

  useEffect(() => {
    if (!message || Object.keys(message).length === 0) {
      return;
    }

    if (message?.action === 'print' || message?.store === 'print') {
      printActions.setReload(true);
    }

    printActions.setMessage(null);
  }, [message, printActions]);

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

  const getData = async printJob => {
    if (printJob.printType == 'order') await printOrder(printJob);
    if (printJob.printType == 'cash-register') await printCashRegister(printJob);
    if (printJob.printType == 'purchasing-suggestion') {
      await printPurchasingSuggestion(printJob);
    }
    if (printJob.printType == 'inventory') await printInventory(printJob);
  };

  const printInventory = async printJob => {
    return await printActions.printInventory({
      device: resolveTargetDevice(printJob),
      people: currentCompany.id,
    });
  };

  const printPurchasingSuggestion = async printJob => {
    return await printActions.printPurchasingSuggestion({
      device: resolveTargetDevice(printJob),
      people: currentCompany.id,
    });
  };

  const printCashRegister = async printJob => {
    return await printActions.getCashRegisterPrint({
      device: resolveTargetDevice(printJob),
      people: currentCompany.id,
    });
  };

  const printOrder = async order => {
    return await printActions.printOrder({
      id: order.id,
      device: resolveTargetDevice(order),
    });
  };

  return null;
};

export default PrintService;
