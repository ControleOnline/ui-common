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


export default function useDeviceDetailStateB(deps) {
  const {
    navigation, deviceId, deviceConfigStore, messageApi, websocketActions, runtimeCompanyConfigs, showSystemError, loyaltyCouponsEnabled, currentDevice, currentDeviceConfig, deviceString, deviceType,
    normalizedInitialConfigs, initialAlias, isDisplayDevice, isPdvDevice, actionsRef, stampAutoDisableSignatureRef, brandColors, products, setProducts, productShowcases, setProductShowcases, companyDeviceConfigs,
    setCompanyDeviceConfigs, inflowData, setInflowData, configs, setConfigs, loadingConfigData, setLoadingConfigData, loadingCompanyDeviceConfigs, setLoadingCompanyDeviceConfigs, loadingMovementData, setLoadingMovementData, actionLoading,
    setActionLoading, activePdvTab, setActivePdvTab, savingPaymentTarget, setSavingPaymentTarget, savingPdvSettings, setSavingPdvSettings, savingPaymentTypes, setSavingPaymentTypes, savingPosOperationMode, setSavingPosOperationMode, savingProductShowcase,
    setSavingProductShowcase, savingLauncherMode, setSavingLauncherMode, savingAlertSound, setSavingAlertSound, savingOrderVisibility, setSavingOrderVisibility, savingDeviceDeliverySettings, setSavingDeviceDeliverySettings, savingRuntimeDebugInfo, setSavingRuntimeDebugInfo, sendingCatalogRefresh,
    setSendingCatalogRefresh, loadingProductShowcases, setLoadingProductShowcases, search, setSearch, devicePaymentTarget, setDevicePaymentTarget, pdvGateway, setPdvGateway, pdvPrinterEnabled, setPdvPrinterEnabled, posOperationMode,
    setPosOperationMode, productShowcaseId, setProductShowcaseId, androidKioskEnabled, setAndroidKioskEnabled, androidLauncherEnabled, setAndroidLauncherEnabled, counterAutoPrintEnabled, setCounterAutoPrintEnabled, counterPrintMode, setCounterPrintMode, counterCashManagementMode,
    setCounterCashManagementMode, checkOrderType, setCheckOrderType, checkOrderManagementMode, setCheckOrderManagementMode, deviceOrderVisibility, setDeviceOrderVisibility, deviceDeliveryEnabled, setDeviceDeliveryEnabled, deviceAlertSoundEnabled, setDeviceAlertSoundEnabled, deviceAlertSoundUrl,
    setDeviceAlertSoundUrl, deviceRuntimeDebugInfoEnabled, setDeviceRuntimeDebugInfoEnabled, linkedDisplayId, setLinkedDisplayId, displayPrinterId, setDisplayPrinterId, displayAllowPrinterChange, setDisplayAllowPrinterChange, displayAutoPrintProductEnabled, setDisplayAutoPrintProductEnabled, savingDisplayPrintingConfig,
    setSavingDisplayPrintingConfig, hasLoadedCurrentConfig, setHasLoadedCurrentConfig, hasLoadedCompanyConfigs, setHasLoadedCompanyConfigs, hasLoadedMovementData, setHasLoadedMovementData, hasLoadedCurrentConfigRef, hasLoadedCompanyConfigsRef, hasLoadedMovementDataRef, hasInitializedPdvTabRef, alias,
    setAlias, editingAlias, setEditingAlias, aliasInput, setAliasInput, savingAlias, setSavingAlias, removingDevice, setRemovingDevice, aliasInputRef, skipAliasSyncFromStoreRef, isOpen,
    hasLocalPaymentGateway, paymentDeviceOptions, displayOptions, printerOptions, selectedPosOperationModeOption, pickerMode, packageVersion, appVersion, runtimeDeviceId, runtimeDeviceType,
  } = deps;

  const isEditingRuntimeDevice = useMemo(
    () =>
      !!runtimeDeviceId &&
      runtimeDeviceId === normalizeDeviceId(deviceString) &&
      runtimeDeviceType === deviceType,
    [deviceString, deviceType, runtimeDeviceId, runtimeDeviceType],
  );

  const resolveDeviceContext = useCallback(async () => {
    if (deviceString && deviceType) {
      return {
        deviceData: null,
        deviceString,
        deviceType,
      };
    }

    if (!deviceId) {
      return {
        deviceData: null,
        deviceString: '',
        deviceType: '',
      };
    }

    const fetchedDevice = await actionsRef.current.deviceActions
      .get(deviceId)
      .catch(() => null);

    return {
      deviceData: fetchedDevice,
      deviceString: String(fetchedDevice?.device || '').trim(),
      deviceType: String(fetchedDevice?.type || fetchedDevice?.deviceType || '')
        .trim()
        .toUpperCase(),
    };
  }, [deviceId, deviceString, deviceType]);

  return {
    isEditingRuntimeDevice,
    resolveDeviceContext,
  };
}
