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


export default function useDeviceDetailSaves(deps) {
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
    hasLocalPaymentGateway, paymentDeviceOptions, displayOptions, printerOptions, selectedPosOperationModeOption, pickerMode, packageVersion, appVersion, runtimeDeviceId, runtimeDeviceType, isEditingRuntimeDevice, resolveDeviceContext,
    loadMovementData, refreshCurrentConfig, loadCompanyConfigs, loadProductShowcases, ensureActiveTabData, ensureActiveTabDataRef, handleToggle, startEditAlias, cancelEditAlias, saveAlias, confirmRemoveDevice, saveDevicePaymentTarget,
    savePdvSettings, saveProductShowcaseConfig, savePaymentTypeConfigs, savePosOperationMode,
  } = deps;
  const saveLauncherMode = useCallback(async (override = {}) => {
    const nextAndroidLauncherEnabled =
      override.androidLauncherEnabled ?? androidLauncherEnabled;

    if (
      !isPdvDevice ||
      !currentCompany?.id ||
      !deviceString ||
      savingLauncherMode
    ) {
      return;
    }

    setSavingLauncherMode(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [DEVICE_ANDROID_LAUNCHER_ENABLED_CONFIG_KEY]: nextAndroidLauncherEnabled
            ? '1'
            : '0',
          'config-version': appVersion,
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar o launcher do device.',
      );
    } finally {
      setSavingLauncherMode(false);
    }
  }, [
    androidLauncherEnabled,
    appVersion,
    currentCompany?.id,
    deviceString,
    deviceType,
    isPdvDevice,
    refreshCurrentConfig,
    savingLauncherMode,
    showSystemError,
  ]);

  const saveDeviceAlertSoundConfig = useCallback(async (override = {}) => {
    const nextDeviceAlertSoundEnabled =
      override.deviceAlertSoundEnabled ?? deviceAlertSoundEnabled;
    const nextDeviceAlertSoundUrl =
      override.deviceAlertSoundUrl ?? deviceAlertSoundUrl;

    if (!currentCompany?.id || !deviceString || savingAlertSound) {
      return;
    }

    setSavingAlertSound(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [DEVICE_ALERT_SOUND_ENABLED_KEY]: nextDeviceAlertSoundEnabled ? '1' : '0',
          [DEVICE_ALERT_SOUND_URL_KEY]: String(nextDeviceAlertSoundUrl || '').trim(),
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar o som de alerta do device.',
      );
    } finally {
      setSavingAlertSound(false);
    }
  }, [
    currentCompany?.id,
    deviceAlertSoundEnabled,
    deviceAlertSoundUrl,
    deviceString,
    deviceType,
    refreshCurrentConfig,
    savingAlertSound,
    showSystemError,
  ]);

  const saveDeviceOrderVisibility = useCallback(async (override = {}) => {
    const nextDeviceOrderVisibility =
      override.deviceOrderVisibility ?? deviceOrderVisibility;

    if (!currentCompany?.id || !deviceString || savingOrderVisibility) {
      return;
    }

    setSavingOrderVisibility(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [DEVICE_ORDER_VISIBILITY_KEY]: nextDeviceOrderVisibility || DEVICE_ORDER_VISIBILITY_DEVICE,
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar a visibilidade dos pedidos.',
      );
    } finally {
      setSavingOrderVisibility(false);
    }
  }, [
    currentCompany?.id,
    deviceOrderVisibility,
    deviceString,
    deviceType,
    refreshCurrentConfig,
    savingOrderVisibility,
    showSystemError,
  ]);

  const saveDeviceDeliverySettings = useCallback(async (override = {}) => {
    const nextDeviceDeliveryEnabled =
      override.deviceDeliveryEnabled ?? deviceDeliveryEnabled;

    if (
      !currentCompany?.id ||
      !deviceString ||
      savingDeviceDeliverySettings
    ) {
      return;
    }

    setSavingDeviceDeliverySettings(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [POS_DELIVERY_ENABLED_CONFIG_KEY]: nextDeviceDeliveryEnabled ? '1' : '0',
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar a configuracao de entregas.',
      );
    } finally {
      setSavingDeviceDeliverySettings(false);
    }
  }, [
    currentCompany?.id,
    deviceDeliveryEnabled,
    deviceString,
    deviceType,
    refreshCurrentConfig,
    savingDeviceDeliverySettings,
    showSystemError,
  ]);

  const saveDeviceRuntimeDebugInfo = useCallback(async (override = {}) => {
    const nextDeviceRuntimeDebugInfoEnabled =
      override.deviceRuntimeDebugInfoEnabled ?? deviceRuntimeDebugInfoEnabled;

    if (!currentCompany?.id || !deviceString || savingRuntimeDebugInfo) {
      return;
    }

    setSavingRuntimeDebugInfo(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY]:
            nextDeviceRuntimeDebugInfoEnabled ? '1' : '0',
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar a exibicao das informacoes tecnicas.',
      );
    } finally {
      setSavingRuntimeDebugInfo(false);
    }
  }, [
    currentCompany?.id,
    deviceRuntimeDebugInfoEnabled,
    deviceString,
    deviceType,
    refreshCurrentConfig,
    savingRuntimeDebugInfo,
    showSystemError,
  ]);

  const saveDisplayPrintingConfig = useCallback(async (override = {}) => {
    const nextLinkedDisplayId = override.linkedDisplayId ?? linkedDisplayId;
    const nextDisplayPrinterId = override.displayPrinterId ?? displayPrinterId;
    const nextDisplayAllowPrinterChange =
      override.displayAllowPrinterChange ?? displayAllowPrinterChange;
    const nextDisplayAutoPrintProductEnabled =
      override.displayAutoPrintProductEnabled ?? displayAutoPrintProductEnabled;

    if (
      !isDisplayDevice ||
      !currentCompany?.id ||
      !deviceString ||
      savingDisplayPrintingConfig
    ) {
      return;
    }

    const normalizedDisplayId = String(nextLinkedDisplayId || '').trim();
    const normalizedPrinterId = normalizeDeviceId(nextDisplayPrinterId);

    if (
      nextDisplayAutoPrintProductEnabled &&
      (!normalizedDisplayId || !normalizedPrinterId)
    ) {
      return;
    }

    setSavingDisplayPrintingConfig(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [DISPLAY_DEVICE_LINK_CONFIG_KEY]: normalizedDisplayId,
          [DISPLAY_DEVICE_PRINTER_CONFIG_KEY]: normalizedPrinterId,
          [DISPLAY_ALLOW_PRINTER_CHANGE_CONFIG_KEY]:
            nextDisplayAllowPrinterChange ? '1' : '0',
          [DISPLAY_AUTO_PRINT_PRODUCT_CONFIG_KEY]:
            nextDisplayAutoPrintProductEnabled ? '1' : '0',
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar a configuracao de impressao.',
      );
    } finally {
      setSavingDisplayPrintingConfig(false);
    }
  }, [
    currentCompany?.id,
    deviceString,
    deviceType,
    displayAllowPrinterChange,
    displayAutoPrintProductEnabled,
    displayPrinterId,
    isDisplayDevice,
    linkedDisplayId,
    refreshCurrentConfig,
    savingDisplayPrintingConfig,
    showSystemError,
  ]);

  const sendCatalogRefreshCommand = useCallback(() => {
    if (!currentCompany?.id || !deviceString || sendingCatalogRefresh) {
      return;
    }

    confirm('Deseja limpar o cache de produtos deste device?', async () => {
      setSendingCatalogRefresh(true);
      try {
        await websocketActions.send({
          destination: deviceString,
          store: 'categories',
          command: 'clear-product-cache',
          companyId: currentCompany.id,
        });
      } catch (error) {
        showSystemError(
          error,
          'Nao foi possivel enviar o comando para limpar o cache de produtos.',
        );
      } finally {
        setSendingCatalogRefresh(false);
      }
    });
  }, [currentCompany?.id, deviceString, sendingCatalogRefresh, showSystemError, websocketActions]);

  // Totais derivados
  const productTotal = useMemo(
    () => products.reduce((s, p) => s + Number(p.order_product_total || 0), 0),
    [products],
  );

  const inflowTotal = inflowData?.total ?? productTotal;

  const wallets = useMemo(() => {
    if (!inflowData?.wallet) return [];
    return Object.values(inflowData.wallet).map(w => ({
      wallet:   w.wallet,
      total:    w.total || 0,
      payments: Object.values(w.payment || {}).filter(pt => (pt.inflow || 0) > 0),
    }));
  }, [inflowData]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(p =>
      String(p.product_name || '').toLowerCase().includes(term) ||
      String(p.product_sku  || '').toLowerCase().includes(term),
    );
  }, [products, search]);

  const accent = isPdvDevice
    ? (isOpen ? hex.success : hex.danger)
    : hex.info;
  const showPdvOperationTab =
    isPdvDevice && activePdvTab === PDV_TAB_OPERATION;
  const showPdvOrdersTab = isPdvDevice && activePdvTab === PDV_TAB_ORDERS;
  const showPdvDeviceTab = isPdvDevice && activePdvTab === PDV_TAB_DEVICE;
  const showPdvPaymentTypesTab =
    isPdvDevice && activePdvTab === PDV_TAB_PAYMENT_TYPES;
  const showPdvMovementTab =
    isPdvDevice && activePdvTab === PDV_TAB_MOVEMENT;
  const loadingActiveTabData = isPdvDevice && (
    (showPdvMovementTab && loadingMovementData) ||
    (!showPdvMovementTab && loadingConfigData) ||
    (showPdvOrdersTab && loadingCompanyDeviceConfigs)
  );
  const shouldShowOrderVisibility =
    !isDisplayDevice && (!isPdvDevice || showPdvOrdersTab);
  const shouldShowRemotePayment =
    shouldShowOrderVisibility &&
    (!hasLocalPaymentGateway || pdvGateway !== PAYMENT_GATEWAY_CIELO);
  const shouldShowDeviceBehavior = !isPdvDevice || showPdvDeviceTab;
  const shouldShowRemoteCommands =
    !isDisplayDevice && (!isPdvDevice || showPdvDeviceTab);

  const { renderProduct, renderHelpButton, renderSwitchRow, renderOptionButtons } =
    createDeviceDetailRenderers({ themeColors, palette: brandColors });


  return {
    saveLauncherMode,
    saveDeviceAlertSoundConfig,
    saveDeviceOrderVisibility,
    saveDeviceDeliverySettings,
    saveDeviceRuntimeDebugInfo,
    saveDisplayPrintingConfig,
    sendCatalogRefreshCommand,
    productTotal,
    inflowTotal,
    wallets,
    filteredProducts,
    accent,
    showPdvOperationTab,
    showPdvOrdersTab,
    showPdvDeviceTab,
    showPdvPaymentTypesTab,
    showPdvMovementTab,
    loadingActiveTabData,
    shouldShowOrderVisibility,
    shouldShowRemotePayment,
    shouldShowDeviceBehavior,
    shouldShowRemoteCommands,
  };
}
