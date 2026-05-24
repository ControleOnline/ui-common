import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {api} from '@controleonline/ui-common/src/api';
import {
  decodeNetworkPrinterPayload,
  printOnNetworkPrinter,
} from '@controleonline/ui-common/src/react/services/NetworkPrinterService';
import {
  DEFAULT_NETWORK_PRINTER_PORT,
  DISPLAY_DEVICE_TYPE,
  PDV_DEVICE_TYPE,
  getManagedPrinterDevices,
  getPrinterHost,
  NETWORK_PRINTER_PORT_CONFIG_KEY,
  normalizePrinterPort,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {isWebRuntimeDevice} from '@controleonline/ui-common/src/react/utils/deviceRuntime';
import {
  isLocalCieloPrintCapableDeviceConfig,
  normalizeDeviceId,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {
  forgetTrackedSpool,
  hasTrackedSpool,
  pruneTrackedSpools,
  rememberTrackedSpool,
} from '@controleonline/ui-common/src/react/utils/spoolAckTracker';
import {PRINT_JOB_TYPE_SPOOL} from '@controleonline/ui-common/src/react/print/jobs';
import {printOnLocalCielo} from '@controleonline/ui-common/src/react/print/providers/local';
import {executeRemotePrintRequest} from '@controleonline/ui-common/src/react/print/providers/remote';
import {useStore} from '@store';

const SOCKET_PRINT_POLL_INTERVAL_DISCONNECTED = 10000;
const SOCKET_PRINT_POLL_DELAY_CONNECTED = 60000;
const SPOOL_ACK_RETRY_DELAY_MS = 10000;

const normalizeDeviceType = value => String(value || '').trim().toUpperCase();

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
  const websocketStore = useStore('websocket');
  const websocketGetters = websocketStore.getters;

  const {item: storagedDevice} = deviceGetters;
  const {reload, print, items: spool, message, messages} = printGetters;
  const {currentCompany} = peopleGetters;
  const {item: runtimeDeviceConfig, items: companyDeviceConfigs = []} = deviceConfigGetters;
  const {summary: websocketSummary} = websocketGetters;

  const isPrintingRef = useRef(false);
  const spoolRef = useRef([]);
  // Once the device prints locally, only the backend ack may remain pending.
  const pendingAckSpoolsRef = useRef(new Map());
  const connectedPollTimeoutRef = useRef(null);
  const ackRetryTimeoutRef = useRef(null);
  const [lastPrintCommandAt, setLastPrintCommandAt] = useState(null);

  const markPrintCommand = useCallback(() => {
    setLastPrintCommandAt(Date.now());
  }, []);

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

  const clearAckRetry = useCallback(() => {
    if (ackRetryTimeoutRef.current) {
      clearTimeout(ackRetryTimeoutRef.current);
      ackRetryTimeoutRef.current = null;
    }
  }, []);

  const scheduleAckRetry = useCallback(() => {
    clearAckRetry();
    ackRetryTimeoutRef.current = setTimeout(() => {
      printActions.setReload(true);
    }, SPOOL_ACK_RETRY_DELAY_MS);
  }, [clearAckRetry, printActions]);

  const hasPendingSpoolAck = useCallback(
    spoolId => hasTrackedSpool(pendingAckSpoolsRef.current, spoolId),
    [],
  );

  const rememberPendingSpoolAck = useCallback(
    spoolId => {
      rememberTrackedSpool(pendingAckSpoolsRef.current, spoolId, {
        printedAt: Date.now(),
      });
    },
    [],
  );

  const forgetPendingSpoolAck = useCallback(
    spoolId => {
      forgetTrackedSpool(pendingAckSpoolsRef.current, spoolId);
      if (pendingAckSpoolsRef.current.size === 0) {
        clearAckRetry();
      }
    },
    [clearAckRetry],
  );

  const syncPendingSpoolAcks = useCallback(
    openSpools => {
      const openSpoolIds = (Array.isArray(openSpools) ? openSpools : []).map(
        spoolItem => resolveSpoolId(spoolItem),
      );
      pruneTrackedSpools(pendingAckSpoolsRef.current, openSpoolIds);
      if (pendingAckSpoolsRef.current.size === 0) {
        clearAckRetry();
      }
    },
    [clearAckRetry, resolveSpoolId],
  );

  const finalizeSpoolAck = useCallback(
    async spoolId => {
      if (!spoolId) {
        return false;
      }

      await printActions.makePrintDone(spoolId);
      forgetPendingSpoolAck(spoolId);
      return true;
    },
    [forgetPendingSpoolAck, printActions],
  );

  const runtimeDeviceType = useMemo(
    () =>
      normalizeDeviceType(
        runtimeDeviceConfig?.type ||
          runtimeDeviceConfig?.device?.type ||
          storagedDevice?.type,
      ),
    [runtimeDeviceConfig?.device?.type, runtimeDeviceConfig?.type, storagedDevice?.type],
  );

  const canUseLocalCieloPrint = useMemo(
    () => isLocalCieloPrintCapableDeviceConfig(runtimeDeviceConfig),
    [runtimeDeviceConfig],
  );

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

  const isWebDevice = useMemo(
    () => isWebRuntimeDevice(storagedDevice),
    [storagedDevice],
  );

  const spoolDeviceIds = useMemo(() => {
    if (!storagedDevice?.id) {
      return [];
    }

    if (isWebDevice) {
      return [];
    }

    if (runtimeDeviceType === PDV_DEVICE_TYPE) {
      const deviceId = normalizeDeviceId(storagedDevice.id);
      return Array.from(
        new Set(
          [
            ...(canUseLocalCieloPrint ? [deviceId] : []),
            ...managedPrinterDeviceIds,
          ].filter(Boolean),
        ),
      );
    }

    if (runtimeDeviceType === DISPLAY_DEVICE_TYPE) {
      return managedPrinterDeviceIds;
    }

    return [];
  }, [
    isWebDevice,
    canUseLocalCieloPrint,
    managedPrinterDeviceIds,
    runtimeDeviceType,
    storagedDevice?.id,
  ]);

  const shouldHandleSpool = useMemo(
    () => spoolDeviceIds.length > 0,
    [spoolDeviceIds],
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
    if (!currentCompany?.id) {
      return;
    }

    printActions
      .ensurePrintDependenciesLoaded({
        companyId: currentCompany.id,
      })
      .catch(() => {});
  }, [currentCompany?.id, printActions]);

  const loadOpenSpools = useCallback(async () => {
    if (!shouldHandleSpool) {
      pendingAckSpoolsRef.current.clear();
      clearAckRetry();
      printActions.setItems([]);
      printActions.setReload(false);
      return [];
    }

    const deviceIds = Array.from(new Set(spoolDeviceIds.filter(Boolean)));

    if (deviceIds.length === 0) {
      pendingAckSpoolsRef.current.clear();
      clearAckRetry();
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

      syncPendingSpoolAcks(mergedSpools);
      printActions.setItems(mergedSpools);
      return mergedSpools;
    } finally {
      printActions.setReload(false);
    }
  }, [
    clearAckRetry,
    printActions,
    resolveSpoolId,
    shouldHandleSpool,
    spoolDeviceIds,
    syncPendingSpoolAcks,
  ]);

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
        payload: decodeNetworkPrinterPayload(spoolData?.file?.content),
      });

      return true;
    },
    [resolveManagedPrinter],
  );

  const processResolvedSpool = useCallback(
    async ({printJob, spoolData, removeFromQueue = false}) => {
      const spoolId = resolveSpoolId(spoolData || printJob);
      if (spoolId && hasPendingSpoolAck(spoolId)) {
        try {
          await finalizeSpoolAck(spoolId);
          if (removeFromQueue) {
            removeSpoolFromQueue(spoolId);
          }
          return {spoolId, printed: true, ackPending: false};
        } catch (ackError) {
          scheduleAckRetry();
          return {
            spoolId,
            printed: true,
            ackPending: true,
            error: ackError?.message || '',
          };
        }
      }

      if (!spoolData?.file?.content) {
        if (removeFromQueue) {
          removeSpoolFromQueue(spoolId);
        }
        return {spoolId, printed: false};
      }

      const managedPrinterPrinted = await printManagedSpool(printJob, spoolData);

      if (!managedPrinterPrinted) {
        if (!canUseLocalCieloPrint) {
          throw new Error(
            global.t?.t('orders', 'message', 'localPrintUnavailable') ||
              'Este equipamento nao pode imprimir localmente. Configure uma impressora de rede.',
          );
        }

        await printOnLocalCielo(spoolData.file.content);
      }

      if (spoolId) {
        rememberPendingSpoolAck(spoolId);
        try {
          await finalizeSpoolAck(spoolId);
        } catch (ackError) {
          scheduleAckRetry();
          return {
            spoolId,
            printed: true,
            ackPending: true,
            error: ackError?.message || '',
          };
        }
      }

      if (removeFromQueue) {
        removeSpoolFromQueue(spoolId);
      }

      return {spoolId, printed: true};
    },
    [
      finalizeSpoolAck,
      hasPendingSpoolAck,
      canUseLocalCieloPrint,
      printManagedSpool,
      removeSpoolFromQueue,
      rememberPendingSpoolAck,
      resolveSpoolId,
      scheduleAckRetry,
    ],
  );

  const resolveRequestedTargetDevice = useCallback(
    printJob =>
      normalizeDeviceId(
        printJob?.targetPrinterDevice ||
          printJob?.device?.device ||
          printJob?.device ||
          storagedDevice?.id,
      ),
    [storagedDevice?.id],
  );

  const resolveRequestedTargetDeviceType = useCallback(
    printJob =>
      normalizeDeviceType(
        printJob?.targetPrinterType ||
          printJob?.deviceType ||
          printJob?.type ||
          storagedDevice?.type,
      ),
    [storagedDevice?.type],
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

      try {
        const data = await getSpoolData(printJob);
        await processResolvedSpool({
          printJob,
          spoolData: data,
          removeFromQueue: true,
        });
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
      getSpoolData,
      printActions,
      processResolvedSpool,
      removeSpoolFromQueue,
      resolveSpoolId,
    ],
  );

  const executePrintRequest = useCallback(
    async printJob => {
      const requestKey = String(printJob?.requestKey || '').trim();
      const normalizedPrintType = String(
        printJob?.type || printJob?.printType || '',
      )
        .trim()
        .toLowerCase();

      if (requestKey) {
        printActions.setActiveRequestKey(requestKey);
      }

      printActions.setLastCompletedRequest(null);

      try {
        if (normalizedPrintType === PRINT_JOB_TYPE_SPOOL) {
          const spoolData = await getSpoolData({
            spoolId: printJob?.spoolId,
            id: printJob?.spoolId,
          });
          const result = await processResolvedSpool({
            printJob,
            spoolData,
            removeFromQueue: false,
          });

          printActions.setLastCompletedRequest({
            requestKey,
            status: 'success',
            completedAt: Date.now(),
            ackPending: result?.ackPending === true,
            spoolId: result?.spoolId || null,
            targetDeviceId: normalizeDeviceId(spoolData?.device?.device),
          });
          return;
        }

        const targetDeviceId = resolveRequestedTargetDevice(printJob);
        const targetDeviceType = resolveRequestedTargetDeviceType(printJob);

        if (!targetDeviceId) {
          throw new Error(
            global.t?.t('orders', 'title', 'selectPrinter') ||
              'Selecione a impressora.',
          );
        }

        await executeRemotePrintRequest({
          printActions,
          printJob: {
            ...printJob,
            type: normalizedPrintType,
          },
          targetDeviceId,
          targetDeviceType,
          currentCompanyId: printJob?.companyId || currentCompany?.id,
        });

        if (
          shouldHandleSpool &&
          spoolDeviceIds.includes(normalizeDeviceId(targetDeviceId))
        ) {
          markPrintCommand();
          printActions.setReload(true);
        }

        printActions.setLastCompletedRequest({
          requestKey,
          status: 'success',
          completedAt: Date.now(),
          targetDeviceId,
        });
      } catch (e) {
        const errorMessage =
          e?.message || global.t?.t('orders', 'message', 'printProcessingError');
        printActions.setError(errorMessage);
        printActions.setLastCompletedRequest({
          requestKey,
          status: 'error',
          completedAt: Date.now(),
          error: errorMessage,
        });
      } finally {
        if (requestKey) {
          printActions.setActiveRequestKey('');
        }
      }
    },
    [
      currentCompany?.id,
      getSpoolData,
      markPrintCommand,
      printActions,
      processResolvedSpool,
      resolveRequestedTargetDevice,
      resolveRequestedTargetDeviceType,
      shouldHandleSpool,
      spoolDeviceIds,
    ],
  );

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
    if (!shouldHandleSpool || websocketSummary?.connected === true) {
      return;
    }

    printActions.setReload(true);
    const intervalId = setInterval(() => {
      printActions.setReload(true);
    }, SOCKET_PRINT_POLL_INTERVAL_DISCONNECTED);

    return () => {
      clearInterval(intervalId);
    };
  }, [printActions, shouldHandleSpool, websocketSummary?.connected]);

  useEffect(() => {
    if (connectedPollTimeoutRef.current) {
      clearTimeout(connectedPollTimeoutRef.current);
      connectedPollTimeoutRef.current = null;
    }

    if (!shouldHandleSpool || !websocketSummary?.connected || !lastPrintCommandAt) {
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
    lastPrintCommandAt,
    printActions,
    shouldHandleSpool,
    websocketSummary?.connected,
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
  }, [
    executePrintRequest,
    print,
    printActions,
  ]);

  useEffect(() => {
    if (!spoolRef.current?.length || isPrintingRef.current) {
      return;
    }

    goPrint(spoolRef.current[0]);
  }, [goPrint, spool]);

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

  return null;
};

export default PrintService;
