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


export default function useDeviceDetailActions(deps) {
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
    loadMovementData, refreshCurrentConfig, loadCompanyConfigs, loadProductShowcases, ensureActiveTabData, ensureActiveTabDataRef,
  } = deps;
  const handleToggle = useCallback(() => {
    if (!isPdvDevice) {
      return;
    }

    const msg = isOpen ? 'Deseja fechar o caixa?' : 'Deseja abrir o caixa?';
    confirm(msg, async () => {
      setActionLoading(true);
      try {
        const action = isOpen
          ? actionsRef.current.invoiceActions.closeCashRegister
          : actionsRef.current.invoiceActions.openCashRegister;
        await action({ device: deviceString, provider: currentCompany.id });
        await refreshCurrentConfig();
        if (activePdvTab === PDV_TAB_MOVEMENT || hasLoadedMovementData) {
          await loadMovementData();
        }
      } catch (error) {
        showSystemError(
          error,
          'Nao foi possivel atualizar o caixa deste device.',
        );
      } finally {
        setActionLoading(false);
      }
    });
  }, [
    activePdvTab,
    currentCompany?.id,
    deviceString,
    hasLoadedMovementData,
    isOpen,
    isPdvDevice,
    loadMovementData,
    refreshCurrentConfig,
    showSystemError,
  ]);

  const startEditAlias = useCallback(() => {
    setAliasInput(alias);
    setEditingAlias(true);
    setTimeout(() => aliasInputRef.current?.focus(), 80);
  }, [alias]);

  const cancelEditAlias = useCallback(() => {
    setEditingAlias(false);
    setAliasInput(alias);
  }, [alias]);

  const saveAlias = useCallback(async () => {
    const trimmed = aliasInput.trim();
    if (!trimmed || trimmed === alias || !deviceId) {
      cancelEditAlias();
      return;
    }
    setSavingAlias(true);
    try {
      const savedDevice = await actionsRef.current.deviceActions.save({
        id: deviceId,
        alias: trimmed,
      });
      const nextAlias = String(savedDevice?.alias || trimmed).trim();

      const { mergedDevice, nextDeviceConfig } = buildDeviceAliasStoreUpdates({
        deviceId,
        nextAlias,
        runtimeDevice,
        runtimeDeviceConfig,
        savedDevice,
        normalizeEntityId,
      });
      actionsRef.current.deviceActions.setItem?.(mergedDevice);
      if (nextDeviceConfig && actionsRef.current.deviceConfigActions?.setItem) {
        actionsRef.current.deviceConfigActions.setItem(nextDeviceConfig);
      }

      skipAliasSyncFromStoreRef.current = true;
      setAlias(nextAlias);
      setAliasInput(nextAlias);
      setEditingAlias(false);
    } catch (error) {
      showSystemError(error, 'Nao foi possivel salvar o nome do device.');
      cancelEditAlias();
    } finally {
      setSavingAlias(false);
    }
  }, [aliasInput, alias, deviceId, cancelEditAlias, showSystemError]);

  const confirmRemoveDevice = useCallback(() => {
    if (!deviceId || removingDevice) {
      return;
    }
    Alert.alert(
      'Excluir device',
      `Tem certeza que deseja excluir o device "${alias || deviceString || deviceId}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setRemovingDevice(true);
            try {
              await actionsRef.current.deviceActions.remove(deviceId);
              navigation.navigate('DevicesIndex');
            } catch (error) {
              showSystemError(error, 'Não foi possível excluir o device.');
            } finally {
              setRemovingDevice(false);
            }
          },
        },
      ],
    );
  }, [deviceId, removingDevice, alias, deviceString, navigation, showSystemError]);

  const saveDevicePaymentTarget = useCallback(async (override = {}) => {
    const nextDevicePaymentTarget =
      override.devicePaymentTarget ?? devicePaymentTarget;

    if (!currentCompany?.id || !deviceString) {
      return;
    }

    setSavingPaymentTarget(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [ORDER_PAYMENT_DEVICE_CONFIG_KEY]: nextDevicePaymentTarget || '',
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar o device de pagamento.',
      );
    } finally {
      setSavingPaymentTarget(false);
    }
  }, [currentCompany?.id, devicePaymentTarget, deviceString, deviceType, refreshCurrentConfig, showSystemError]);

  const savePdvSettings = useCallback(async (override = {}) => {
    const nextPdvGateway = override.pdvGateway ?? pdvGateway;
    const nextPdvPrinterEnabled =
      override.pdvPrinterEnabled ?? pdvPrinterEnabled;

    if (
      !isPdvDevice ||
      !currentCompany?.id ||
      !deviceString ||
      savingPdvSettings
    ) {
      return;
    }

    setSavingPdvSettings(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [POS_GATEWAY_CONFIG_KEY]: nextPdvGateway || '',
          [PDV_PRINTER_ENABLED_CONFIG_KEY]: nextPdvPrinterEnabled ? '1' : '0',
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar as configuracoes de pagamento do PDV.',
      );
    } finally {
      setSavingPdvSettings(false);
    }
  }, [
    currentCompany?.id,
    deviceString,
    deviceType,
    isPdvDevice,
    pdvGateway,
    pdvPrinterEnabled,
    refreshCurrentConfig,
    savingPdvSettings,
    showSystemError,
  ]);

  const saveProductShowcaseConfig = useCallback(async (override = {}) => {
    const nextProductShowcaseId =
      override.productShowcaseId ?? productShowcaseId;

    if (!currentCompany?.id || !deviceString || savingProductShowcase) {
      return;
    }

    setSavingProductShowcase(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [POS_PRODUCT_SHOWCASE_CONFIG_KEY]: nextProductShowcaseId || '',
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar a vitrine deste PDV.',
      );
    } finally {
      setSavingProductShowcase(false);
    }
  }, [
    currentCompany?.id,
    deviceString,
    deviceType,
    productShowcaseId,
    refreshCurrentConfig,
    savingProductShowcase,
    showSystemError,
  ]);

  const savePaymentTypeConfigs = useCallback(
    async nextSelectedPaymentTypeIds => {
      if (
        !currentCompany?.id ||
        !deviceString ||
        savingPaymentTypes
      ) {
        return;
      }

      setSavingPaymentTypes(true);
      try {
        const nextConfigs = appendScreenMetrics({
          ...(configs || {}),
          [PAYMENT_TYPE_IDS_CONFIG_KEY]: nextSelectedPaymentTypeIds,
          'config-version': appVersion,
        });

        await actionsRef.current.deviceConfigActions.addDeviceConfigs({
          device: deviceString,
          configs: JSON.stringify(nextConfigs),
          people: '/people/' + currentCompany.id,
          type: deviceType,
        });

        actionsRef.current.deviceConfigActions.setItem({
          ...(currentDeviceConfig || {}),
          configs: nextConfigs,
          device:
            currentDeviceConfig?.device ||
            currentDevice ||
            {device: deviceString, type: deviceType},
          people:
            currentDeviceConfig?.people ||
            `/people/${currentCompany.id}`,
          type:
            currentDeviceConfig?.type ||
            deviceType,
        });
        setConfigs(nextConfigs);
      } catch (error) {
        showSystemError(
          error,
          'Nao foi possivel salvar os tipos de pagamento do device.',
        );
      } finally {
        setSavingPaymentTypes(false);
      }
    },
    [
      currentCompany?.id,
      appVersion,
      configs,
      currentDevice,
      currentDeviceConfig,
      deviceString,
      deviceType,
      savingPaymentTypes,
      showSystemError,
    ],
  );

  const savePosOperationMode = useCallback(async (override = {}) => {
    const nextPosOperationMode =
      override.posOperationMode ?? posOperationMode;
    const nextAndroidKioskEnabled =
      override.androidKioskEnabled ?? androidKioskEnabled;
    const nextCheckOrderType =
      override.checkOrderType ?? checkOrderType;
    const nextCheckOrderManagementMode =
      override.checkOrderManagementMode ?? checkOrderManagementMode;
    const nextCounterAutoPrintEnabled =
      override.counterAutoPrintEnabled ?? counterAutoPrintEnabled;
    const nextCounterPrintMode =
      override.counterPrintMode ?? counterPrintMode;
    const nextCounterCashManagementMode =
      override.counterCashManagementMode ?? counterCashManagementMode;

    if (
      !isPdvDevice ||
      !currentCompany?.id ||
      !deviceString ||
      savingPosOperationMode
    ) {
      return;
    }

    setSavingPosOperationMode(true);
    try {
      const nextOperationConfigs = {
        [POS_OPERATION_MODE_CONFIG_KEY]: nextPosOperationMode,
        [DEVICE_ANDROID_KIOSK_ENABLED_CONFIG_KEY]: nextAndroidKioskEnabled
          ? '1'
          : '0',
        [POS_CHECK_ORDER_TYPE_CONFIG_KEY]: nextCheckOrderType,
        [POS_CHECK_ORDER_MANAGEMENT_MODE_CONFIG_KEY]:
          nextCheckOrderType === POS_CHECK_ORDER_TYPE_NONE
            ? POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE
            : nextCheckOrderManagementMode,
      };

      if (nextPosOperationMode === POS_OPERATION_MODE_COUNTER) {
        nextOperationConfigs[POS_AUTO_PRINT_ENABLED_CONFIG_KEY] =
          nextCounterAutoPrintEnabled ? '1' : '0';
        nextOperationConfigs['print-mode'] = nextCounterPrintMode;
        nextOperationConfigs[POS_CASH_MANAGEMENT_MODE_CONFIG_KEY] =
          nextCounterCashManagementMode;
      }

      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify(nextOperationConfigs),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar a operacao do PDV.',
      );
    } finally {
      setSavingPosOperationMode(false);
    }
  }, [
    currentCompany?.id,
    checkOrderManagementMode,
    checkOrderType,
    counterAutoPrintEnabled,
    counterCashManagementMode,
    counterPrintMode,
    deviceString,
    deviceType,
    androidKioskEnabled,
    isPdvDevice,
    posOperationMode,
    refreshCurrentConfig,
    savingPosOperationMode,
    showSystemError,
  ]);

  useEffect(() => {
    if (!isPdvDevice || !currentCompany?.id || !deviceString) {
      return;
    }

    const rawCheckOrderType = resolvePosCheckOrderType(configs);
    const nextCheckOrderType = resolvePosCheckOrderTypeForShop(
      configs,
      runtimeCompanyConfigs,
    );

    if (
      rawCheckOrderType !== POS_CHECK_ORDER_TYPE_STAMP ||
      nextCheckOrderType !== POS_CHECK_ORDER_TYPE_NONE ||
      savingPosOperationMode
    ) {
      stampAutoDisableSignatureRef.current = '';
      return;
    }

    const signature = [
      currentCompany?.id,
      deviceString,
      rawCheckOrderType,
      loyaltyCouponsEnabled ? '1' : '0',
      String(configs?.['config-version'] || ''),
    ].join(':');

    if (stampAutoDisableSignatureRef.current === signature) {
      return;
    }

    stampAutoDisableSignatureRef.current = signature;

    setCheckOrderType(POS_CHECK_ORDER_TYPE_NONE);
    setCheckOrderManagementMode(POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE);
    savePosOperationMode({
      checkOrderType: POS_CHECK_ORDER_TYPE_NONE,
      checkOrderManagementMode: POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE,
    });
  }, [
    configs,
    currentCompany?.id,
    deviceString,
    isPdvDevice,
    loyaltyCouponsEnabled,
    savePosOperationMode,
    savingPosOperationMode,
    runtimeCompanyConfigs,
  ]);

  return {
    handleToggle,
    startEditAlias,
    cancelEditAlias,
    saveAlias,
    confirmRemoveDevice,
    saveDevicePaymentTarget,
    savePdvSettings,
    saveProductShowcaseConfig,
    savePaymentTypeConfigs,
    savePosOperationMode,
  };
}
