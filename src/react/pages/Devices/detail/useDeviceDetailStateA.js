import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useStore } from '@store';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import packageJson from '@package';
import {
  canDisplayChangePrinter, DEVICE_ANDROID_KIOSK_ENABLED_CONFIG_KEY, DEVICE_ANDROID_LAUNCHER_ENABLED_CONFIG_KEY,
  DISPLAY_AUTO_PRINT_PRODUCT_CONFIG_KEY, DISPLAY_ALLOW_PRINTER_CHANGE_CONFIG_KEY, DEVICE_ALERT_SOUND_ENABLED_KEY,
  DEVICE_ALERT_SOUND_URL_KEY, DEVICE_ORDER_VISIBILITY_COMPANY, DEVICE_ORDER_VISIBILITY_DEVICE, DEVICE_ORDER_VISIBILITY_KEY,
  DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY, isPosAutoPrintEnabled, isPosCashRegisterOpen, isTruthyValue, parseConfigsObject,
  POS_AUTO_PRINT_ENABLED_CONFIG_KEY, POS_CASH_MANAGEMENT_MODE_CASH_REGISTER, POS_CASH_MANAGEMENT_MODE_CONFIG_KEY,
  POS_CASH_MANAGEMENT_MODE_DAILY, POS_CHECK_ORDER_MANAGEMENT_MODE_CONFIG_KEY, POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY,
  POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE, POS_CHECK_ORDER_TYPE_CONFIG_KEY, POS_CHECK_ORDER_TYPE_NONE, POS_CHECK_ORDER_TYPE_TAB,
  POS_CHECK_ORDER_TYPE_TABLE, POS_CHECK_ORDER_TYPE_STAMP, POS_DELIVERY_ENABLED_CONFIG_KEY, POS_OPERATION_MODE_COUNTER,
  POS_OPERATION_MODE_CONFIG_KEY, POS_OPERATION_MODE_OPTIONS, POS_PRODUCT_SHOWCASE_CONFIG_KEY, POS_PRINT_MODE_FORM,
  POS_PRINT_MODE_ORDER, getPosOperationModeOption, isAndroidKioskEnabled, isAndroidLauncherEnabled, isPosDeliveryEnabled,
  resolvePosCheckOrderManagementMode, resolvePosCheckOrderType, resolvePosCheckOrderTypeForShop, resolveDeviceOrderVisibility,
  resolvePosCashManagementMode, resolvePosOperationMode, resolvePosPrintMode,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  filterDeviceConfigsByCompany, getCompanyPaymentDeviceOptions, getPaymentGatewayFromConfigs, getPaymentGatewayLabel,
  isPaymentCapableDeviceConfig, isPdvPrinterEnabled, normalizeDeviceId, normalizeEntityId, PAYMENT_TYPE_IDS_CONFIG_KEY,
  PAYMENT_GATEWAY_CIELO, PDV_PRINTER_ENABLED_CONFIG_KEY, ORDER_PAYMENT_DEVICE_CONFIG_KEY, POS_GATEWAY_CONFIG_KEY,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import { normalizeBooleanConfig, SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY } from '@controleonline/ui-common/src/react/utils/shopConfig';
import { getPrinterOptionValue, getDeviceTypeLabel, getPrinterLabel, getPrinterOptions } from '@controleonline/ui-common/src/react/utils/printerDevices';
import { hex, DISPLAY_DEVICE_TYPE, PDV_DEVICE_TYPE, DISPLAY_DEVICE_LINK_CONFIG_KEY, DISPLAY_DEVICE_PRINTER_CONFIG_KEY,
  PDV_TAB_OPERATION, PDV_TAB_ORDERS, PDV_TAB_DEVICE, PDV_TAB_PAYMENT_TYPES, PDV_TAB_MOVEMENT, PDV_DETAIL_TABS, tt,
} from './deviceDetailConstants';
import { paymentIcon, formatApiError, getDisplayLabel, getProductShowcaseLabel, getIsOpen, confirm } from './deviceDetailHelpers';
import { api } from '@controleonline/ui-common/src/api';
import { buildDeviceAliasStoreUpdates } from '@controleonline/ui-common/src/react/utils/deviceAliasSync';
import { createDeviceDetailRenderers } from './DeviceDetailRenderers';
import { Alert, Platform } from 'react-native';


export default function useDeviceDetailStateA() {
  const route      = useRoute();
  const navigation = useNavigation();
  const {
    deviceId: routeDeviceId,
  } = route.params || {};
  const deviceId = useMemo(
    () => normalizeEntityId(routeDeviceId),
    [routeDeviceId],
  );

  const invoiceStore      = useStore('invoice');
  const deviceConfigStore = useStore('device_config');
  const deviceStore       = useStore('device');
  const displayStore      = useStore('displays');
  const peopleStore       = useStore('people');
  const printerStore      = useStore('printer');
  const themeStore        = useStore('theme');
  const websocketStore    = useStore('websocket');
  const messageApi = useMessage() || {};

  const { currentCompany }      = peopleStore.getters;
  const { item: runtimeDevice } = deviceStore.getters;
  const { item: runtimeDeviceConfig } = deviceConfigStore.getters;
  const { items: displays = [], isLoading: isLoadingDisplays } = displayStore.getters;
  const { items: printers = [], isLoading: isLoadingPrinters } = printerStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const websocketActions = websocketStore.actions;
  const runtimeCompanyConfigs = useMemo(
    () => parseConfigsObject(currentCompany?.configs),
    [currentCompany?.configs],
  );
  const showSystemError = useCallback(
    (error, fallback) => {
      messageApi.showError?.(formatApiError(error, fallback));
    },
    [messageApi],
  );
  const loyaltyCouponsEnabled = useMemo(
    () => {
      const hasLoyaltyCouponsEnabledKey = Object.prototype.hasOwnProperty.call(
        runtimeCompanyConfigs || {},
        SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY,
      );

      return hasLoyaltyCouponsEnabledKey
        ? normalizeBooleanConfig(
            runtimeCompanyConfigs?.[SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY],
          )
        : true;
    },
    [runtimeCompanyConfigs],
  );

  const currentDevice =
    deviceId &&
    normalizeEntityId(runtimeDevice?.id || runtimeDevice?.['@id']) === deviceId
      ? runtimeDevice
      : {};
  const currentDeviceConfig =
    deviceId &&
    normalizeEntityId(
      runtimeDeviceConfig?.device?.id ||
        runtimeDeviceConfig?.device?.['@id'] ||
        runtimeDeviceConfig?.deviceId ||
        runtimeDeviceConfig?.device?.deviceId,
    ) === deviceId
      ? runtimeDeviceConfig
      : {};
  const deviceString = String(
    currentDevice?.device || currentDeviceConfig?.device?.device || '',
  ).trim();
  const deviceType = String(
    currentDevice?.type ||
      currentDevice?.deviceType ||
      currentDeviceConfig?.type ||
      currentDeviceConfig?.device?.type ||
      '',
  )
    .trim()
    .toUpperCase();
  const normalizedInitialConfigs = useMemo(
    () => parseConfigsObject(currentDeviceConfig?.configs),
    [currentDeviceConfig?.configs],
  );
  const initialAlias = String(
    currentDevice?.alias || currentDeviceConfig?.device?.alias || currentDevice?.device || '',
  ).trim();
  const isDisplayDevice = deviceType === DISPLAY_DEVICE_TYPE;
  const isPdvDevice = deviceType === PDV_DEVICE_TYPE;

  const actionsRef = useRef({});
  const stampAutoDisableSignatureRef = useRef('');
  actionsRef.current = {
    invoiceActions:      invoiceStore.actions,
    deviceConfigActions: deviceConfigStore.actions,
    deviceActions:       deviceStore.actions,
  };

  const brandColors = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, colors),
    [themeColors, currentCompany?.id],
  );

  const [products,      setProducts]      = useState([]);
  const [productShowcases, setProductShowcases] = useState([]);
  const [companyDeviceConfigs, setCompanyDeviceConfigs] = useState([]);
  const [inflowData,    setInflowData]    = useState(null);
  const [configs,       setConfigs]       = useState(normalizedInitialConfigs || {});
  const [loadingConfigData, setLoadingConfigData] = useState(false);
  const [loadingCompanyDeviceConfigs, setLoadingCompanyDeviceConfigs] =
    useState(false);
  const [loadingMovementData, setLoadingMovementData] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activePdvTab, setActivePdvTab] = useState(PDV_TAB_OPERATION);
  const [savingPaymentTarget, setSavingPaymentTarget] = useState(false);
  const [savingPdvSettings, setSavingPdvSettings] = useState(false);
  const [savingPaymentTypes, setSavingPaymentTypes] = useState(false);
  const [savingPosOperationMode, setSavingPosOperationMode] = useState(false);
  const [savingProductShowcase, setSavingProductShowcase] = useState(false);
  const [savingLauncherMode, setSavingLauncherMode] = useState(false);
  const [savingAlertSound, setSavingAlertSound] = useState(false);
  const [savingOrderVisibility, setSavingOrderVisibility] = useState(false);
  const [savingDeviceDeliverySettings, setSavingDeviceDeliverySettings] =
    useState(false);
  const [savingRuntimeDebugInfo, setSavingRuntimeDebugInfo] = useState(false);
  const [sendingCatalogRefresh, setSendingCatalogRefresh] = useState(false);
  const [loadingProductShowcases, setLoadingProductShowcases] = useState(false);
  const [search,        setSearch]        = useState('');
  const [devicePaymentTarget, setDevicePaymentTarget] = useState(
    normalizeDeviceId(normalizedInitialConfigs?.[ORDER_PAYMENT_DEVICE_CONFIG_KEY]),
  );
  const [pdvGateway, setPdvGateway] = useState(
    getPaymentGatewayFromConfigs(normalizedInitialConfigs),
  );
  const [pdvPrinterEnabled, setPdvPrinterEnabled] = useState(
    isPdvPrinterEnabled(normalizedInitialConfigs),
  );
  const [posOperationMode, setPosOperationMode] = useState(
    resolvePosOperationMode(normalizedInitialConfigs),
  );
  const [productShowcaseId, setProductShowcaseId] = useState(
    normalizeEntityId(normalizedInitialConfigs?.[POS_PRODUCT_SHOWCASE_CONFIG_KEY]),
  );
  const [androidKioskEnabled, setAndroidKioskEnabled] = useState(
    isAndroidKioskEnabled(normalizedInitialConfigs),
  );
  const [androidLauncherEnabled, setAndroidLauncherEnabled] = useState(
    isAndroidLauncherEnabled(normalizedInitialConfigs),
  );
  const [counterAutoPrintEnabled, setCounterAutoPrintEnabled] = useState(
    isPosAutoPrintEnabled(normalizedInitialConfigs),
  );
  const [counterPrintMode, setCounterPrintMode] = useState(
    resolvePosPrintMode(normalizedInitialConfigs),
  );
  const [counterCashManagementMode, setCounterCashManagementMode] = useState(
    resolvePosCashManagementMode(normalizedInitialConfigs),
  );
  const [checkOrderType, setCheckOrderType] = useState(
    resolvePosCheckOrderTypeForShop(
      normalizedInitialConfigs,
      runtimeCompanyConfigs,
    ),
  );
  const [checkOrderManagementMode, setCheckOrderManagementMode] = useState(
    resolvePosCheckOrderManagementMode(normalizedInitialConfigs),
  );
  const [deviceOrderVisibility, setDeviceOrderVisibility] = useState(
    resolveDeviceOrderVisibility(normalizedInitialConfigs),
  );
  const [deviceDeliveryEnabled, setDeviceDeliveryEnabled] = useState(
    isPosDeliveryEnabled(normalizedInitialConfigs),
  );
  const [deviceAlertSoundEnabled, setDeviceAlertSoundEnabled] = useState(
    isTruthyValue(normalizedInitialConfigs?.[DEVICE_ALERT_SOUND_ENABLED_KEY]),
  );
  const [deviceAlertSoundUrl, setDeviceAlertSoundUrl] = useState(
    String(normalizedInitialConfigs?.[DEVICE_ALERT_SOUND_URL_KEY] || ''),
  );
  const [deviceRuntimeDebugInfoEnabled, setDeviceRuntimeDebugInfoEnabled] =
    useState(
      isTruthyValue(
        normalizedInitialConfigs?.[DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY],
      ),
    );
  const [linkedDisplayId, setLinkedDisplayId] = useState(
    normalizeEntityId(normalizedInitialConfigs?.[DISPLAY_DEVICE_LINK_CONFIG_KEY]),
  );
  const [displayPrinterId, setDisplayPrinterId] = useState(
    normalizeDeviceId(normalizedInitialConfigs?.[DISPLAY_DEVICE_PRINTER_CONFIG_KEY]),
  );
  const [displayAllowPrinterChange, setDisplayAllowPrinterChange] = useState(
    canDisplayChangePrinter(normalizedInitialConfigs),
  );
  const [displayAutoPrintProductEnabled, setDisplayAutoPrintProductEnabled] =
    useState(
      isTruthyValue(
        normalizedInitialConfigs?.[DISPLAY_AUTO_PRINT_PRODUCT_CONFIG_KEY],
      ),
    );
  const [savingDisplayPrintingConfig, setSavingDisplayPrintingConfig] = useState(false);
  const [hasLoadedCurrentConfig, setHasLoadedCurrentConfig] = useState(false);
  const [hasLoadedCompanyConfigs, setHasLoadedCompanyConfigs] = useState(false);
  const [hasLoadedMovementData, setHasLoadedMovementData] = useState(false);
  const hasLoadedCurrentConfigRef = useRef(false);
  const hasLoadedCompanyConfigsRef = useRef(false);
  const hasLoadedMovementDataRef = useRef(false);
  const hasInitializedPdvTabRef = useRef(false);

  // Edição inline do alias
  const [alias,        setAlias]        = useState(initialAlias || '');
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasInput,   setAliasInput]   = useState(alias);
  const [savingAlias,  setSavingAlias]  = useState(false);
  const [removingDevice, setRemovingDevice] = useState(false);
  const aliasInputRef = useRef(null);
  const skipAliasSyncFromStoreRef = useRef(false);

  useEffect(() => {
    if (editingAlias) {
      return;
    }

    if (skipAliasSyncFromStoreRef.current) {
      skipAliasSyncFromStoreRef.current = false;
      return;
    }

    setAlias(initialAlias || '');
    setAliasInput(initialAlias || '');
  }, [editingAlias, initialAlias]);

  useEffect(() => {
    hasLoadedCurrentConfigRef.current = hasLoadedCurrentConfig;
  }, [hasLoadedCurrentConfig]);

  useEffect(() => {
    hasLoadedCompanyConfigsRef.current = hasLoadedCompanyConfigs;
  }, [hasLoadedCompanyConfigs]);

  useEffect(() => {
    hasLoadedMovementDataRef.current = hasLoadedMovementData;
  }, [hasLoadedMovementData]);

  const isOpen = useMemo(() => getIsOpen(configs), [configs]);
  const hasLocalPaymentGateway = useMemo(
    () =>
      isPaymentCapableDeviceConfig({
        configs,
        type: deviceType,
        device: {type: deviceType},
      }),
    [configs, deviceType],
  );
  const paymentDeviceOptions = useMemo(
    () =>
      getCompanyPaymentDeviceOptions(
        filterDeviceConfigsByCompany(companyDeviceConfigs, currentCompany?.id),
      ).filter(
        option => option.deviceId !== deviceString,
      ),
    [companyDeviceConfigs, currentCompany?.id, deviceString],
  );
  const displayOptions = useMemo(
    () =>
      (Array.isArray(displays) ? displays : [])
        .filter(option => {
          const companyId = normalizeEntityId(option?.company?.id || option?.company);
          const currentCompanyId = normalizeEntityId(currentCompany?.id);
          return !currentCompanyId || !companyId || companyId === currentCompanyId;
        })
        .sort((left, right) =>
          String(left?.display || '').localeCompare(String(right?.display || '')),
        ),
    [currentCompany?.id, displays],
  );
  const printerOptions = useMemo(
    () =>
      getPrinterOptions({
        printers,
        deviceConfigs: companyDeviceConfigs,
        companyId: currentCompany?.id,
      }),
    [companyDeviceConfigs, currentCompany?.id, printers],
  );
  const selectedPosOperationModeOption = useMemo(
    () => getPosOperationModeOption(posOperationMode),
    [posOperationMode],
  );
  const pickerMode = Platform.OS === 'android' ? 'dropdown' : undefined;
  const packageVersion = packageJson?.version || packageJson?.default?.version;
  const appVersion = packageVersion || runtimeDevice?.appVersion || '';
  const runtimeDeviceId = useMemo(
    () => normalizeDeviceId(runtimeDevice?.id || runtimeDevice?.device),
    [runtimeDevice?.device, runtimeDevice?.id],
  );
  const runtimeDeviceType = useMemo(
    () =>
      String(runtimeDevice?.type || runtimeDevice?.deviceType || '')
        .trim()
        .toUpperCase(),
    [runtimeDevice?.deviceType, runtimeDevice?.type],
  );

  return {
    navigation,
    deviceId,
    deviceConfigStore,
    messageApi,
    websocketActions,
    runtimeCompanyConfigs,
    showSystemError,
    loyaltyCouponsEnabled,
    currentDevice,
    currentDeviceConfig,
    deviceString,
    deviceType,
    normalizedInitialConfigs,
    initialAlias,
    isDisplayDevice,
    isPdvDevice,
    actionsRef,
    stampAutoDisableSignatureRef,
    brandColors,
    products,
    setProducts,
    productShowcases,
    setProductShowcases,
    companyDeviceConfigs,
    setCompanyDeviceConfigs,
    inflowData,
    setInflowData,
    configs,
    setConfigs,
    loadingConfigData,
    setLoadingConfigData,
    loadingCompanyDeviceConfigs,
    setLoadingCompanyDeviceConfigs,
    loadingMovementData,
    setLoadingMovementData,
    actionLoading,
    setActionLoading,
    activePdvTab,
    setActivePdvTab,
    savingPaymentTarget,
    setSavingPaymentTarget,
    savingPdvSettings,
    setSavingPdvSettings,
    savingPaymentTypes,
    setSavingPaymentTypes,
    savingPosOperationMode,
    setSavingPosOperationMode,
    savingProductShowcase,
    setSavingProductShowcase,
    savingLauncherMode,
    setSavingLauncherMode,
    savingAlertSound,
    setSavingAlertSound,
    savingOrderVisibility,
    setSavingOrderVisibility,
    savingDeviceDeliverySettings,
    setSavingDeviceDeliverySettings,
    savingRuntimeDebugInfo,
    setSavingRuntimeDebugInfo,
    sendingCatalogRefresh,
    setSendingCatalogRefresh,
    loadingProductShowcases,
    setLoadingProductShowcases,
    search,
    setSearch,
    devicePaymentTarget,
    setDevicePaymentTarget,
    pdvGateway,
    setPdvGateway,
    pdvPrinterEnabled,
    setPdvPrinterEnabled,
    posOperationMode,
    setPosOperationMode,
    productShowcaseId,
    setProductShowcaseId,
    androidKioskEnabled,
    setAndroidKioskEnabled,
    androidLauncherEnabled,
    setAndroidLauncherEnabled,
    counterAutoPrintEnabled,
    setCounterAutoPrintEnabled,
    counterPrintMode,
    setCounterPrintMode,
    counterCashManagementMode,
    setCounterCashManagementMode,
    checkOrderType,
    setCheckOrderType,
    checkOrderManagementMode,
    setCheckOrderManagementMode,
    deviceOrderVisibility,
    setDeviceOrderVisibility,
    deviceDeliveryEnabled,
    setDeviceDeliveryEnabled,
    deviceAlertSoundEnabled,
    setDeviceAlertSoundEnabled,
    deviceAlertSoundUrl,
    setDeviceAlertSoundUrl,
    deviceRuntimeDebugInfoEnabled,
    setDeviceRuntimeDebugInfoEnabled,
    linkedDisplayId,
    setLinkedDisplayId,
    displayPrinterId,
    setDisplayPrinterId,
    displayAllowPrinterChange,
    setDisplayAllowPrinterChange,
    displayAutoPrintProductEnabled,
    setDisplayAutoPrintProductEnabled,
    savingDisplayPrintingConfig,
    setSavingDisplayPrintingConfig,
    hasLoadedCurrentConfig,
    setHasLoadedCurrentConfig,
    hasLoadedCompanyConfigs,
    setHasLoadedCompanyConfigs,
    hasLoadedMovementData,
    setHasLoadedMovementData,
    hasLoadedCurrentConfigRef,
    hasLoadedCompanyConfigsRef,
    hasLoadedMovementDataRef,
    hasInitializedPdvTabRef,
    alias,
    setAlias,
    editingAlias,
    setEditingAlias,
    aliasInput,
    setAliasInput,
    savingAlias,
    setSavingAlias,
    removingDevice,
    setRemovingDevice,
    aliasInputRef,
    skipAliasSyncFromStoreRef,
    isOpen,
    hasLocalPaymentGateway,
    paymentDeviceOptions,
    displayOptions,
    printerOptions,
    selectedPosOperationModeOption,
    pickerMode,
    packageVersion,
    appVersion,
    runtimeDeviceId,
    runtimeDeviceType,
    currentCompany,
  };
}
