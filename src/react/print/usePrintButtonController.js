import {useCallback, useEffect, useMemo, useRef} from 'react';
import {useStore} from '@store';
import {
  canDisplayChangePrinter,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {isWebRuntimeDevice} from '@controleonline/ui-common/src/react/utils/deviceRuntime';
import {
  getDeviceTypeLabel,
  normalizeDeviceType,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {normalizeDeviceId} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {
  PRINT_CONTEXT_DEVICE,
  PRINT_CONTEXT_DISPLAY,
  PRINT_JOB_TYPE_SPOOL,
  buildPrintRequestKey,
  buildPrintSelectionKey,
  normalizePrintJob,
} from '@controleonline/ui-common/src/react/print/jobs';
import {
  resolveConfiguredPrinterValue,
  resolvePrintDeviceConfig,
  resolvePrintSelectionValue,
  resolvePrinterOptions,
  resolvePrinterSelectionValue,
  resolveSelectedPrinter,
} from '@controleonline/ui-common/src/react/print/selection';

const resolveCurrentItemId = storeGetters =>
  storeGetters?.item?.['@id']
    ? String(storeGetters.item['@id']).split('/').pop()
    : null;

const resolveRuntimeDeviceType = ({
  runtimeDeviceConfig = null,
  currentDevice = null,
}) => {
  if (isWebRuntimeDevice(currentDevice)) {
    return 'WEB';
  }

  return normalizeDeviceType(
    runtimeDeviceConfig?.type ||
      runtimeDeviceConfig?.device?.type ||
      currentDevice?.type,
  );
};

export const usePrintButtonController = ({
  job = null,
  printType = '',
  store = '',
  printerSelection = {},
  onSuccess = null,
  onError = null,
} = {}) => {
  const currentStore = useStore(store || 'print');
  const peopleStore = useStore('people');
  const deviceStore = useStore('device');
  const deviceConfigStore = useStore('device_config');
  const printStore = useStore('print');
  const printerStore = useStore('printer');

  const storeGetters = currentStore?.getters || {};
  const storeActions = currentStore?.actions || {};
  const {currentCompany} = peopleStore.getters;
  const {item: currentDevice} = deviceStore.getters;
  const {item: runtimeDeviceConfig, items: companyDeviceConfigs = []} =
    deviceConfigStore.getters;
  const {items: printers = [], isLoading: isLoadingPrinters} =
    printerStore.getters;
  const {
    selections = {},
    selectorModalKey = '',
    activeRequestKey = '',
    lastCompletedRequest = null,
  } = printStore.getters;
  const printActions = printStore.actions;

  const completionRef = useRef('');
  const currentItemId = useMemo(
    () => resolveCurrentItemId(storeGetters),
    [storeGetters],
  );
  const normalizedJob = useMemo(
    () =>
      normalizePrintJob({
        job,
        fallbackType: printType,
        fallbackId: currentItemId,
      }),
    [currentItemId, job, printType],
  );

  const currentDeviceId = useMemo(
    () => normalizeDeviceId(currentDevice?.id || currentDevice?.device),
    [currentDevice?.device, currentDevice?.id],
  );
  const runtimeDeviceType = useMemo(
    () =>
      resolveRuntimeDeviceType({
        runtimeDeviceConfig,
        currentDevice,
      }),
    [currentDevice, runtimeDeviceConfig],
  );

  const contextType = useMemo(() => {
    if (normalizedJob?.type === PRINT_JOB_TYPE_SPOOL) {
      return 'spool';
    }

    if (printerSelection?.context === PRINT_CONTEXT_DISPLAY) {
      return PRINT_CONTEXT_DISPLAY;
    }

    return PRINT_CONTEXT_DEVICE;
  }, [normalizedJob?.type, printerSelection?.context]);

  const displayId = useMemo(
    () =>
      String(
        printerSelection?.displayId ||
          printerSelection?.display?.id ||
          printerSelection?.display?.['@id'] ||
          '',
      )
        .replace(/\D+/g, '')
        .trim(),
    [printerSelection?.display, printerSelection?.displayId],
  );

  const effectiveDeviceConfig = useMemo(
    () =>
      resolvePrintDeviceConfig({
        contextType,
        companyDeviceConfigs,
        currentCompanyId: currentCompany?.id,
        currentDeviceId,
        displayId,
        runtimeDeviceConfig,
      }),
    [
      companyDeviceConfigs,
      contextType,
      currentCompany?.id,
      currentDeviceId,
      displayId,
      runtimeDeviceConfig,
    ],
  );

  const contextDeviceId = useMemo(
    () =>
      normalizeDeviceId(
        effectiveDeviceConfig?.device?.device ||
          effectiveDeviceConfig?.device?.id ||
          currentDeviceId,
      ),
    [
      currentDeviceId,
      effectiveDeviceConfig?.device?.device,
      effectiveDeviceConfig?.device?.id,
    ],
  );

  const configuredPrinterValue = useMemo(
    () => resolveConfiguredPrinterValue(effectiveDeviceConfig),
    [effectiveDeviceConfig],
  );
  const allowDisplayPrinterChange = useMemo(
    () =>
      contextType !== PRINT_CONTEXT_DISPLAY ||
      canDisplayChangePrinter(effectiveDeviceConfig?.configs),
    [contextType, effectiveDeviceConfig?.configs],
  );

  const selectionKey = useMemo(
    () =>
      buildPrintSelectionKey({
        companyId: currentCompany?.id,
        contextType,
        deviceId: contextDeviceId,
        displayId,
      }),
    [contextDeviceId, contextType, currentCompany?.id, displayId],
  );

  const transientPrinterValue = selections?.[selectionKey] || '';
  const printerOptions = useMemo(
    () =>
      resolvePrinterOptions({
        printers,
        companyDeviceConfigs,
        currentCompanyId: currentCompany?.id,
      }),
    [companyDeviceConfigs, currentCompany?.id, printers],
  );
  const selectedPrinterValue = useMemo(
    () =>
      resolvePrintSelectionValue({
        transientPrinterValue: allowDisplayPrinterChange
          ? transientPrinterValue
          : '',
        configuredPrinterValue,
        printerOptions,
        currentDeviceId,
        runtimeDeviceType,
      }),
    [
      configuredPrinterValue,
      currentDeviceId,
      printerOptions,
      runtimeDeviceType,
      transientPrinterValue,
      allowDisplayPrinterChange,
    ],
  );

  const selectedPrinter = useMemo(
    () =>
      resolveSelectedPrinter({
        printerOptions,
        selectedPrinterValue,
        currentDevice,
        runtimeDeviceType,
      }),
    [currentDevice, printerOptions, runtimeDeviceType, selectedPrinterValue],
  );

  const requestKey = useMemo(
    () =>
      buildPrintRequestKey({
        type: normalizedJob?.type,
        id: normalizedJob?.id,
        orderId: normalizedJob?.orderId,
        orderProductId: normalizedJob?.orderProductId,
        orderProductQueueId: normalizedJob?.orderProductQueueId,
        spoolId: normalizedJob?.spoolId,
        selectionKey,
      }),
    [
      normalizedJob?.id,
      normalizedJob?.orderId,
      normalizedJob?.orderProductId,
      normalizedJob?.orderProductQueueId,
      normalizedJob?.spoolId,
      normalizedJob?.type,
      selectionKey,
    ],
  );

  const isRequestLoading = activeRequestKey === requestKey && requestKey !== '';
  const canSelectPrinter =
    printerSelection?.enabled === true &&
    allowDisplayPrinterChange &&
    normalizedJob?.type !== PRINT_JOB_TYPE_SPOOL &&
    printerOptions.length >= 2;
  const isModalVisible =
    selectionKey !== '' &&
    selectorModalKey === selectionKey &&
    canSelectPrinter;

  const selectedPrinterLabel = useMemo(() => {
    if (!selectedPrinter) {
      return '';
    }

    return `${selectedPrinter.alias || selectedPrinter.device} • ${getDeviceTypeLabel(
      selectedPrinter?.type,
    )}`;
  }, [selectedPrinter]);

  useEffect(() => {
    if (!lastCompletedRequest?.requestKey || lastCompletedRequest.requestKey !== requestKey) {
      return;
    }

    const completionKey = [
      lastCompletedRequest.requestKey,
      lastCompletedRequest.status || '',
      lastCompletedRequest.completedAt || '',
    ].join(':');
    if (completionRef.current === completionKey) {
      return;
    }

    completionRef.current = completionKey;

    if (lastCompletedRequest?.status === 'success') {
      onSuccess?.(lastCompletedRequest);
    } else {
      onError?.(lastCompletedRequest);
    }

    if (transientPrinterValue && selectionKey) {
      printActions.clearSelection(selectionKey);
    }
  }, [
    lastCompletedRequest,
    onError,
    onSuccess,
    printActions,
    requestKey,
    selectionKey,
    transientPrinterValue,
  ]);

  const setError = useCallback(
    message => {
      if (typeof storeActions?.setError === 'function') {
        storeActions.setError(message);
        return;
      }

      printActions.setError(message);
    },
    [printActions, storeActions],
  );

  const handleSelectPrinter = useCallback(
    printer => {
      const nextValue = resolvePrinterSelectionValue(printer);
      if (!nextValue || !selectionKey) {
        return;
      }

      printActions.setSelection({
        key: selectionKey,
        value: nextValue,
      });
      printActions.setSelectorModalKey('');
    },
    [printActions, selectionKey],
  );

  const handlePrint = useCallback(() => {
    if (!normalizedJob || isRequestLoading) {
      return;
    }

    if (normalizedJob.type !== PRINT_JOB_TYPE_SPOOL && !selectedPrinter?.device) {
      if (canSelectPrinter) {
        printActions.setSelectorModalKey(selectionKey);
        return;
      }

      setError(global.t?.t('orders', 'title', 'selectPrinter') || 'Selecione a impressora.');
      return;
    }

    printActions.requestPrint({
      ...normalizedJob,
      requestKey,
      selectionKey,
      configuredPrinterValue,
      contextType,
      displayId,
      currentDeviceId,
      currentDeviceType: runtimeDeviceType,
      targetPrinterValue: selectedPrinterValue,
      targetPrinterDevice: selectedPrinter?.device || '',
      targetPrinterType: selectedPrinter?.type || runtimeDeviceType,
      targetPrinterLabel: selectedPrinter?.alias || selectedPrinter?.device || '',
      companyId: currentCompany?.id || null,
    });
  }, [
    canSelectPrinter,
    configuredPrinterValue,
    contextType,
    currentCompany?.id,
    currentDeviceId,
    displayId,
    isRequestLoading,
    normalizedJob,
    printActions,
    requestKey,
    runtimeDeviceType,
    selectedPrinter?.alias,
    selectedPrinter?.device,
    selectedPrinter?.type,
    selectedPrinterValue,
    selectionKey,
    setError,
  ]);

  const closePrinterModal = useCallback(() => {
    if (isLoadingPrinters) {
      return;
    }

    printActions.setSelectorModalKey('');
  }, [isLoadingPrinters, printActions]);

  const openPrinterModal = useCallback(() => {
    if (!canSelectPrinter || !selectionKey) {
      return;
    }

    printActions.setSelectorModalKey(selectionKey);
  }, [canSelectPrinter, printActions, selectionKey]);

  return {
    canSelectPrinter,
    closePrinterModal,
    currentDeviceId,
    currentDeviceType: runtimeDeviceType,
    displayId,
    handlePrint,
    handleSelectPrinter,
    isModalVisible,
    isRequestLoading,
    isWebRuntime: runtimeDeviceType === 'WEB',
    normalizedJob,
    openPrinterModal,
    printerOptions,
    requestKey,
    selectedPrinter,
    selectedPrinterLabel,
    selectedPrinterValue,
    setError,
  };
};
