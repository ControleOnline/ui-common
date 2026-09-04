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


export default function useDeviceDetailLoaders(deps) {
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
    hasLocalPaymentGateway, paymentDeviceOptions, displayOptions, printerOptions, selectedPosOperationModeOption, pickerMode, packageVersion, appVersion, runtimeDeviceId, runtimeDeviceType, isEditingRuntimeDevice, resolveDeviceContext, currentCompany,
  } = deps;
  const loadMovementData = useCallback(async () => {
    if (!isPdvDevice) {
      setProducts([]);
      setInflowData(null);
      setHasLoadedMovementData(false);
      return;
    }

    if (!currentCompany?.id) return;
    const resolvedContext = await resolveDeviceContext();
    const nextDeviceString = resolvedContext?.deviceString || deviceString;
    if (!nextDeviceString) return;
    setLoadingMovementData(true);
    try {
      const [cashData, inflowRaw] = await Promise.all([
        actionsRef.current.invoiceActions.getCashRegister({
          device:   nextDeviceString,
          provider: currentCompany.id,
        }),
        actionsRef.current.invoiceActions.getInflow({
          'device.device': nextDeviceString,
          receiver:        currentCompany.id,
        }),
      ]);

      setProducts(Array.isArray(cashData) ? cashData : []);

      // getInflow retorna data['member'] = [{ payments: {...} }]
      const member = Array.isArray(inflowRaw) ? inflowRaw : [];
      setInflowData(member[0]?.payments || null);
    } catch {
      setProducts([]);
      setInflowData(null);
    } finally {
      setLoadingMovementData(false);
      setHasLoadedMovementData(true);
    }
  }, [currentCompany?.id, deviceString, isPdvDevice, resolveDeviceContext]);

  const refreshCurrentConfig = useCallback(async () => {
    if (!currentCompany?.id) return;
    setLoadingConfigData(true);
    try {
      const resolvedContext = await resolveDeviceContext();
      const nextDeviceString = resolvedContext?.deviceString || deviceString;
      const nextDeviceType = resolvedContext?.deviceType || deviceType;
      if (!nextDeviceString || !nextDeviceType) {
        applyCurrentDeviceConfig([], {
          deviceId,
          deviceString: nextDeviceString,
          deviceType: nextDeviceType,
        });
        return;
      }

      const items = await actionsRef.current.deviceConfigActions.getItems({
        'device.device': nextDeviceString,
        people: `/people/${currentCompany.id}`,
        type: nextDeviceType,
      });
      const scopedItems = filterDeviceConfigsByCompany(items, currentCompany?.id);
      const selectedDeviceConfig = scopedItems.find(d => {
        const currentConfigType = String(d?.type || d?.device?.type || '')
          .trim()
          .toUpperCase();
        const nextDeviceId = normalizeEntityId(
          d?.device?.id ||
            d?.device?.['@id'] ||
            d?.deviceId ||
            d?.device?.deviceId,
        );

        return (
          (deviceId && nextDeviceId === deviceId) ||
          (d?.device?.device === nextDeviceString &&
            currentConfigType === nextDeviceType)
        );
      });

      if (selectedDeviceConfig) {
        actionsRef.current.deviceConfigActions.setItem({
          ...selectedDeviceConfig,
          configs: parseConfigsObject(selectedDeviceConfig.configs),
        });
      }

      applyCurrentDeviceConfig(
        selectedDeviceConfig ? [selectedDeviceConfig] : scopedItems,
        {
          deviceId,
          deviceString: nextDeviceString,
          deviceType: nextDeviceType,
        },
      );
    } catch {
      applyCurrentDeviceConfig([], {deviceId});
    } finally {
      setLoadingConfigData(false);
      setHasLoadedCurrentConfig(true);
    }
  }, [
    applyCurrentDeviceConfig,
    currentCompany?.id,
    deviceString,
    deviceType,
    deviceId,
    resolveDeviceContext,
  ]);

  const loadCompanyConfigs = useCallback(async () => {
    if (!currentCompany?.id) return;

    setLoadingCompanyDeviceConfigs(true);
    try {
      const items = await actionsRef.current.deviceConfigActions.getItems({
        people: `/people/${currentCompany.id}`,
      });
      const scopedItems = filterDeviceConfigsByCompany(items, currentCompany?.id);
      setCompanyDeviceConfigs(Array.isArray(scopedItems) ? scopedItems : []);
    } catch {
      setCompanyDeviceConfigs([]);
    } finally {
      setLoadingCompanyDeviceConfigs(false);
      setHasLoadedCompanyConfigs(true);
    }
  }, [currentCompany?.id]);

  const loadProductShowcases = useCallback(async () => {
    if (!currentCompany?.id || !isPdvDevice) {
      setProductShowcases([]);
      return;
    }

    setLoadingProductShowcases(true);
    try {
      const response = await api.fetch('/product_showcases', {
        params: {
          company: `/people/${currentCompany.id}`,
          integrationKey: 'pos',
          active: 1,
          'order[name]': 'ASC',
        },
      });
      const items =
        response?.member ||
        response?.['hydra:member'] ||
        response?.items ||
        response;
      setProductShowcases(Array.isArray(items) ? items : []);
    } catch {
      setProductShowcases([]);
    } finally {
      setLoadingProductShowcases(false);
    }
  }, [currentCompany?.id, isPdvDevice]);

  const ensureActiveTabData = useCallback(async ({ force = false } = {}) => {
    if (!currentCompany?.id) {
      return;
    }

    if (!isPdvDevice) {
      await Promise.all([
        refreshCurrentConfig(),
        loadCompanyConfigs(),
      ]);
      return;
    }

    if (activePdvTab === PDV_TAB_MOVEMENT) {
      if (!force && hasLoadedMovementDataRef.current) {
        return;
      }
      await loadMovementData();
      return;
    }

    if (activePdvTab === PDV_TAB_ORDERS) {
      const pendingLoads = [];
      if (force || !hasLoadedCurrentConfigRef.current) {
        pendingLoads.push(refreshCurrentConfig());
      }
      if (force || !hasLoadedCompanyConfigsRef.current) {
        pendingLoads.push(loadCompanyConfigs());
      }

      if (pendingLoads.length > 0) {
        await Promise.all(pendingLoads);
      }
      return;
    }

    if (force || !hasLoadedCurrentConfig) {
      await refreshCurrentConfig();
    }

    if (activePdvTab === PDV_TAB_OPERATION) {
      await loadProductShowcases();
    }
  }, [
    activePdvTab,
    currentCompany?.id,
    isPdvDevice,
    loadCompanyConfigs,
    loadMovementData,
    loadProductShowcases,
    refreshCurrentConfig,
  ]);

  useEffect(() => {
    setHasLoadedCurrentConfig(false);
    setHasLoadedCompanyConfigs(false);
    setHasLoadedMovementData(false);
    hasInitializedPdvTabRef.current = false;
    setProducts([]);
    setInflowData(null);
    setCompanyDeviceConfigs([]);
  }, [currentCompany?.id, deviceString, deviceType]);

  const ensureActiveTabDataRef = useRef(ensureActiveTabData);
  useEffect(() => {
    ensureActiveTabDataRef.current = ensureActiveTabData;
  }, [ensureActiveTabData]);

  useFocusEffect(
    useCallback(() => {
      ensureActiveTabDataRef.current({ force: true });
    }, []),
  );

  useEffect(() => {
    if (!isPdvDevice) {
      return;
    }

    if (!hasInitializedPdvTabRef.current) {
      hasInitializedPdvTabRef.current = true;
      return;
    }

    ensureActiveTabDataRef.current();
  }, [activePdvTab, isPdvDevice]);

  useFocusEffect(
    useCallback(() => {
      if (!isDisplayDevice || !currentCompany?.id) {
        return;
      }

      displayStore.actions
        .getItems({
          company: currentCompany.id,
        })
        .catch(() => {});
      printerStore.actions
        .getPrinters({people: currentCompany.id})
        .catch(() => {});
    }, [
      currentCompany?.id,
      displayStore.actions,
      isDisplayDevice,
      printerStore.actions,
    ]),
  );

  return {
    loadMovementData,
    refreshCurrentConfig,
    loadCompanyConfigs,
    loadProductShowcases,
    ensureActiveTabData,
    ensureActiveTabDataRef,
  };
}
