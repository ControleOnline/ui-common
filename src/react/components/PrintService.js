import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {api} from '@controleonline/ui-common/src/api';
import {printOnNetworkPrinter} from '@controleonline/ui-common/src/react/services/NetworkPrinterService';
import {
  DEFAULT_NETWORK_PRINTER_PORT,
  getManagedPrinterDevices,
  getPrinterHost,
  NETWORK_PRINTER_PORT_CONFIG_KEY,
  normalizePrinterPort,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {normalizeDeviceId} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {CieloPrint} from '@controleonline/ui-orders/src/react/services/Cielo/Print';
import {useStore} from '@store';

const SOCKET_PRINT_POLL_INTERVAL = 60000;

const extractCollectionMembers = data => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.member)) {
    return data.member;
  }

  if (Array.isArray(data?.['hydra:member'])) {
    return data['hydra:member'];
  }

  return [];
};

const PrintService = () => {
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const printStore = useStore('print');
  const printGetters = printStore.getters;
  const printActions = printStore.actions;
  const deviceStore = useStore('device');
  const deviceGetters = deviceStore.getters;
  const deviceConfigStore = useStore('device_config');
  const deviceConfigGetters = deviceConfigStore.getters;
  const deviceConfigActions = deviceConfigStore.actions;
  const websocketStore = useStore('websocket');
  const websocketGetters = websocketStore.getters;

  const {item: storagedDevice} = deviceGetters;
  const {reload, print, items: spool, message, messages} = printGetters;
  const {currentCompany} = peopleGetters;
  const {items: companyDeviceConfigs = []} = deviceConfigGetters;
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
    printJob =>
      normalizeDeviceId(
        printJob?.device?.device || printJob?.device || storagedDevice?.id,
      ),
    [storagedDevice?.id],
  );

  const getLocalPrintPayload = useCallback(content => {
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

  const managedPrinters = useMemo(
    () =>
      getManagedPrinterDevices({
        deviceConfigs: companyDeviceConfigs,
        companyId: currentCompany?.id,
        managerDeviceId: storagedDevice?.id,
      }),
    [companyDeviceConfigs, currentCompany?.id, storagedDevice?.id],
  );

  const managedPrinterDeviceIds = useMemo(
    () =>
      Array.from(
        new Set(
          managedPrinters
            .map(printer => normalizeDeviceId(printer?.device))
            .filter(Boolean),
        ),
      ),
    [managedPrinters],
  );

  const resolveManagedPrinter = useCallback(
    printJob => {
      const targetDeviceId = resolveTargetDevice(printJob);
      return (
        managedPrinters.find(
          printer => normalizeDeviceId(printer?.device) === targetDeviceId,
        ) || null
      );
    },
    [managedPrinters, resolveTargetDevice],
  );

  useEffect(() => {
    if (!currentCompany?.id || !storagedDevice?.id) {
      return;
    }

    deviceConfigActions
      .getItems({people: `/people/${currentCompany.id}`})
      .catch(() => {});
  }, [currentCompany?.id, deviceConfigActions, storagedDevice?.id]);

  const loadOpenSpools = useCallback(async () => {
    if (!storagedDevice?.id) {
      printActions.setReload(false);
      return [];
    }

    const deviceIds = Array.from(
      new Set([storagedDevice.id, ...managedPrinterDeviceIds].filter(Boolean)),
    );

    if (deviceIds.length === 0) {
      printActions.setItems([]);
      printActions.setReload(false);
      return [];
    }

    try {
      const spoolCollections = await Promise.all(
        deviceIds.map(deviceId =>
          api
            .fetch('spools', {
              params: {
                'device.device': deviceId,
                'status.realStatus': 'open',
              },
            })
            .then(extractCollectionMembers)
            .catch(() => []),
        ),
      );

      const mergedSpools = [];
      const spoolIds = new Set();

      spoolCollections.flat().forEach(item => {
        const spoolId = resolveSpoolId(item);
        const spoolKey = spoolId ? String(spoolId) : JSON.stringify(item);

        if (!spoolIds.has(spoolKey)) {
          spoolIds.add(spoolKey);
          mergedSpools.push(item);
        }
      });

      mergedSpools.sort((left, right) => {
        const leftId = resolveSpoolId(left) || 0;
        const rightId = resolveSpoolId(right) || 0;
        return leftId - rightId;
      });

      printActions.setItems(mergedSpools);
      return mergedSpools;
    } finally {
      printActions.setReload(false);
    }
  }, [managedPrinterDeviceIds, printActions, resolveSpoolId, storagedDevice?.id]);

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

  const printManagedSpool = useCallback(
    async (printJob, spoolData) => {
      const managedPrinter = resolveManagedPrinter(spoolData || printJob);
      if (!managedPrinter) {
        return false;
      }

      const printerHost = getPrinterHost(managedPrinter);
      const printerPort = normalizePrinterPort(
        managedPrinter?.configs?.[NETWORK_PRINTER_PORT_CONFIG_KEY] ||
          DEFAULT_NETWORK_PRINTER_PORT,
      );

      await printOnNetworkPrinter({
        host: printerHost,
        port: printerPort,
        payload: spoolData?.file?.content,
      });

      return true;
    },
    [resolveManagedPrinter],
  );

  const printInventory = useCallback(
    async printJob =>
      await printActions.printInventory({
        device: resolveTargetDevice(printJob),
        people: currentCompany.id,
      }),
    [currentCompany?.id, printActions, resolveTargetDevice],
  );

  const printPurchasingSuggestion = useCallback(
    async printJob =>
      await printActions.printPurchasingSuggestion({
        device: resolveTargetDevice(printJob),
        people: currentCompany.id,
      }),
    [currentCompany?.id, printActions, resolveTargetDevice],
  );

  const printCashRegister = useCallback(
    async printJob =>
      await printActions.getCashRegisterPrint({
        device: resolveTargetDevice(printJob),
        people: currentCompany.id,
      }),
    [currentCompany?.id, printActions, resolveTargetDevice],
  );

  const printOrder = useCallback(
    async order => {
      const normalizedQueueIds = (Array.isArray(order?.queueIds)
        ? order.queueIds
        : []
      )
        .map(item => String(item || '').replace(/\D+/g, '').trim())
        .filter(Boolean);
      const normalizedOrderProductQueueIds = (
        Array.isArray(order?.orderProductQueueIds)
          ? order.orderProductQueueIds
          : []
      )
        .map(item => String(item || '').replace(/\D+/g, '').trim())
        .filter(Boolean);

      return await printActions.printOrder({
        id: order.id,
        device: resolveTargetDevice(order),
        ...(normalizedQueueIds.length > 0
          ? {queueIds: normalizedQueueIds}
          : {}),
        ...(normalizedOrderProductQueueIds.length > 0
          ? {orderProductQueueIds: normalizedOrderProductQueueIds}
          : {}),
      });
    },
    [printActions, resolveTargetDevice],
  );

  const printOrderProduct = useCallback(
    async orderProductPrint => {
      const normalizedOrderProductQueueIds = (
        Array.isArray(orderProductPrint?.orderProductQueueIds)
          ? orderProductPrint.orderProductQueueIds
          : []
      )
        .map(item => String(item || '').replace(/\D+/g, '').trim())
        .filter(Boolean);

      const orderProductId = String(
        orderProductPrint?.orderProductId || orderProductPrint?.id || '',
      )
        .replace(/\D+/g, '')
        .trim();

      if (!orderProductId) {
        throw new Error(
          global.t?.t('orders', 'message', 'printProcessingError'),
        );
      }

      return await printActions.printOrderProduct({
        id: orderProductId,
        device: resolveTargetDevice(orderProductPrint),
        ...(normalizedOrderProductQueueIds.length > 0
          ? {orderProductQueueIds: normalizedOrderProductQueueIds}
          : {}),
      });
    },
    [printActions, resolveTargetDevice],
  );

  const getData = useCallback(
    async printJob => {
      if (printJob.printType === 'order') await printOrder(printJob);
      if (printJob.printType === 'order-product') {
        await printOrderProduct(printJob);
      }
      if (printJob.printType === 'cash-register') {
        await printCashRegister(printJob);
      }
      if (printJob.printType === 'purchasing-suggestion') {
        await printPurchasingSuggestion(printJob);
      }
      if (printJob.printType === 'inventory') await printInventory(printJob);
    },
    [
      printCashRegister,
      printInventory,
      printOrder,
      printOrderProduct,
      printPurchasingSuggestion,
    ],
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

        const managedPrinterPrinted = await printManagedSpool(printJob, data);

        if (!managedPrinterPrinted) {
          const payload = getLocalPrintPayload(data.file.content);
          const response = await cielo.print(payload);

          if (response?.success === false) {
            throw new Error(
              response?.result ||
                global.t?.t('orders', 'message', 'printProcessingError'),
            );
          }
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
    [
      getLocalPrintPayload,
      getSpoolData,
      printActions,
      printManagedSpool,
      removeSpoolFromQueue,
      resolveSpoolId,
    ],
  );

  useEffect(() => {
    if (storagedDevice?.id) {
      printActions.setReload(true);
    }
  }, [managedPrinterDeviceIds, printActions, storagedDevice?.id]);

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
            const targetDeviceId = resolveTargetDevice(p);
            if (
              targetDeviceId === normalizeDeviceId(storagedDevice?.id) ||
              managedPrinterDeviceIds.includes(targetDeviceId)
            ) {
              printActions.setReload(true);
            }
          }),
        );
      }
      printActions.initQueue(() => {
        printActions.setPrint([]);
      });
    }
  }, [
    getData,
    managedPrinterDeviceIds,
    print,
    printActions,
    resolveTargetDevice,
    storagedDevice?.id,
  ]);

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

  return null;
};

export default PrintService;
