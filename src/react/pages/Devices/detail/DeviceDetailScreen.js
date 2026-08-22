import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import {Picker} from '@react-native-picker/picker';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import StateStore from '@controleonline/ui-common/src/react/components/StateStore';
import PaymentTypesByWalletTab from '@controleonline/ui-common/src/react/pages/SettingsPage/PaymentTypesByWalletTab';
import { appendScreenMetrics } from '@controleonline/ui-common/src/react/utils/screenMetrics';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import Icon from 'react-native-vector-icons/Feather';
import styles from '../../DeviceDetailPage.styles';
import packageJson from '@package';
import DefaultTooltip from '@controleonline/ui-default/src/react/components/help/DefaultTooltip';

import {
  canDisplayChangePrinter,
  DEVICE_ANDROID_KIOSK_ENABLED_CONFIG_KEY,
  DEVICE_ANDROID_LAUNCHER_ENABLED_CONFIG_KEY,
  DISPLAY_AUTO_PRINT_PRODUCT_CONFIG_KEY,
  DISPLAY_ALLOW_PRINTER_CHANGE_CONFIG_KEY,
  DEVICE_ALERT_SOUND_ENABLED_KEY,
  DEVICE_ALERT_SOUND_URL_KEY,
  DEVICE_ORDER_VISIBILITY_COMPANY,
  DEVICE_ORDER_VISIBILITY_DEVICE,
  DEVICE_ORDER_VISIBILITY_KEY,
  DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY,
  isPosAutoPrintEnabled,
  isPosCashRegisterOpen,
  isTruthyValue,
  parseConfigsObject,
  POS_AUTO_PRINT_ENABLED_CONFIG_KEY,
  POS_CASH_MANAGEMENT_MODE_CASH_REGISTER,
  POS_CASH_MANAGEMENT_MODE_CONFIG_KEY,
  POS_CASH_MANAGEMENT_MODE_DAILY,
  POS_CHECK_ORDER_MANAGEMENT_MODE_CONFIG_KEY,
  POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY,
  POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE,
  POS_CHECK_ORDER_TYPE_CONFIG_KEY,
  POS_CHECK_ORDER_TYPE_NONE,
  POS_CHECK_ORDER_TYPE_TAB,
  POS_CHECK_ORDER_TYPE_TABLE,
  POS_CHECK_ORDER_TYPE_STAMP,
  POS_DELIVERY_ENABLED_CONFIG_KEY,
  POS_OPERATION_MODE_COUNTER,
  POS_OPERATION_MODE_CONFIG_KEY,
  POS_OPERATION_MODE_OPTIONS,
  POS_PRODUCT_SHOWCASE_CONFIG_KEY,
  POS_PRINT_MODE_FORM,
  POS_PRINT_MODE_ORDER,
  getPosOperationModeOption,
  isAndroidKioskEnabled,
  isAndroidLauncherEnabled,
  isPosDeliveryEnabled,
  resolvePosCheckOrderManagementMode,
  resolvePosCheckOrderType,
  resolvePosCheckOrderTypeForShop,
  resolveDeviceOrderVisibility,
  resolvePosCashManagementMode,
  resolvePosOperationMode,
  resolvePosPrintMode,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';

import {
  filterDeviceConfigsByCompany,
  getCompanyPaymentDeviceOptions,
  getPaymentGatewayFromConfigs,
  getPaymentGatewayLabel,
  isPaymentCapableDeviceConfig,
  isPdvPrinterEnabled,
  normalizeDeviceId,
  normalizeEntityId,
  PAYMENT_TYPE_IDS_CONFIG_KEY,
  PAYMENT_GATEWAY_CIELO,
  PDV_PRINTER_ENABLED_CONFIG_KEY,
  ORDER_PAYMENT_DEVICE_CONFIG_KEY,
  POS_GATEWAY_CONFIG_KEY,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {
  normalizeBooleanConfig,
  SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY,
} from '@controleonline/ui-common/src/react/utils/shopConfig';

import {
  getPrinterOptionValue,
  getDeviceTypeLabel,
  getPrinterLabel,
  getPrinterOptions,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import { buildDeviceAliasStoreUpdates } from '@controleonline/ui-common/src/react/utils/deviceAliasSync';
import { createDeviceDetailRenderers } from './DeviceDetailRenderers';
import DeviceDetailHeader from './DeviceDetailHeader';
import DeviceDetailPdvConfigSection from './DeviceDetailPdvConfigSection';
import DeviceDetailOrdersPrintSection from './DeviceDetailOrdersPrintSection';
import DeviceDetailAlertsCommandsSection from './DeviceDetailAlertsCommandsSection';
import DeviceDetailMovementSections from './DeviceDetailMovementSections';
import DeviceDetailPaymentSection from './DeviceDetailPaymentSection';

import { inlineStyle_667_12, inlineStyle_1301_61 } from '../../DeviceDetailPage.styles';

import {
  hex,
  DISPLAY_DEVICE_TYPE,
  PDV_DEVICE_TYPE,
  DISPLAY_DEVICE_LINK_CONFIG_KEY,
  DISPLAY_DEVICE_PRINTER_CONFIG_KEY,
  PDV_TAB_OPERATION,
  PDV_TAB_ORDERS,
  PDV_TAB_DEVICE,
  PDV_TAB_PAYMENT_TYPES,
  PDV_TAB_MOVEMENT,
  PDV_DETAIL_TABS,
  tt,
} from './deviceDetailConstants';
import {
  paymentIcon,
  formatApiError,
  getDisplayLabel,
  getProductShowcaseLabel,
  getIsOpen,
  confirm,
  getDeviceSwitchProps,
} from './deviceDetailHelpers';
import OptionButtonChip from './OptionButtonChip';


import useDeviceDetailStateA from './useDeviceDetailStateA';
import useDeviceDetailStateB from './useDeviceDetailStateB';
import useDeviceDetailLoaders from './useDeviceDetailLoaders';
import useDeviceDetailActions from './useDeviceDetailActions';
import useDeviceDetailSaves from './useDeviceDetailSaves';

const DeviceDetailScreen = () => {
  const stateA = useDeviceDetailStateA();
  const stateB = useDeviceDetailStateB(stateA);
  const state = { ...stateA, ...stateB };
  const loaders = useDeviceDetailLoaders(state);
  const actions = useDeviceDetailActions({ ...state, ...loaders });
  const saves = useDeviceDetailSaves({ ...state, ...loaders, ...actions });
  const {
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
    isEditingRuntimeDevice,
    resolveDeviceContext,
    applyCurrentDeviceConfig,
    loadMovementData,
    refreshCurrentConfig,
    loadCompanyConfigs,
    loadProductShowcases,
    ensureActiveTabData,
    ensureActiveTabDataRef,
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
    shouldShowRemoteCommands
  } = { ...state, ...loaders, ...actions, ...saves };

  const detailCtx = {
    themeColors, brandColors, palette,
    renderHelpButton, renderOptionButtons, renderSwitchRow, renderProduct,
    posOperationMode, setPosOperationMode, savePosOperationMode, savingPosOperationMode,
    productShowcaseId, setProductShowcaseId, saveProductShowcaseConfig,
    productShowcases, loadingProductShowcases, savingProductShowcase, pickerMode,
    counterAutoPrintEnabled, setCounterAutoPrintEnabled,
    counterPrintMode, setCounterPrintMode,
    checkOrderType, setCheckOrderType,
    checkOrderManagementMode, setCheckOrderManagementMode,
    cashManagementMode, setCashManagementMode,
    androidKioskEnabled, setAndroidKioskEnabled,
    androidLauncherEnabled, setAndroidLauncherEnabled,
    saveLauncherMode, savingLauncherMode,
    orderVisibility, setOrderVisibility, saveDeviceOrderVisibility, savingOrderVisibility,
    shouldShowOrderVisibility,
    deliveryEnabled, setDeliveryEnabled, saveDeviceDeliverySettings, savingDeliverySettings,
    deviceAlertSoundEnabled, setDeviceAlertSoundEnabled, deviceAlertSoundUrl, setDeviceAlertSoundUrl,
    saveDeviceAlertSoundConfig, savingAlertSound,
    runtimeDebugInfoEnabled, setRuntimeDebugInfoEnabled, saveDeviceRuntimeDebugInfo, savingRuntimeDebugInfo,
    devicePaymentTarget, setDevicePaymentTarget, saveDevicePaymentTarget, savingPaymentTarget,
    paymentDeviceOptions, displayOptions, printerOptions,
    pdvGateway, setPdvGateway, pdvPrinterEnabled, setPdvPrinterEnabled, savePdvSettings, savingPdvSettings,
    hasLocalPaymentGateway, loyaltyCouponsEnabled,
    sendCatalogRefreshCommand, sendingCatalogRefresh,
    showPdvMovementTab, showPdvPaymentTypesTab, showPdvOperationTab,
    inflowData, productTotal, wallets, filteredProducts, search, setSearch,
    loadingMovementData, deviceId, savePaymentTypeConfigs, savingPaymentTypes,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <DeviceDetailHeader
          accent={accent}
          alias={alias}
          aliasInput={aliasInput}
          aliasInputRef={aliasInputRef}
          deviceId={deviceId}
          deviceString={deviceString}
          editingAlias={editingAlias}
          removingDevice={removingDevice}
          savingAlias={savingAlias}
          themeColors={themeColors}
          onAliasChange={setAliasInput}
          onConfirmRemove={confirmRemoveDevice}
          onSaveAlias={saveAlias}
          onStartEdit={startEditAlias}
        />

        {loadingActiveTabData && (
          <StateStore
            compact
            loading="Carregando dados do device..."
          />
        )}

        {isPdvDevice && (
          <View style={styles.tabsBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContent}>
              {PDV_DETAIL_TABS.map(tab => {
                const active = activePdvTab === tab.key;
                const tabButtonColors = active
                  ? {
                      backgroundColor: themeColors.buttonBackground,
                      borderColor: themeColors.buttonBorder,
                      iconColor: themeColors.buttonIcon,
                      textColor: themeColors.buttonText,
                    }
                  : {
                      backgroundColor: themeColors.buttonBackgroundSecondary,
                      borderColor: themeColors.buttonBorderSecondary,
                      iconColor: themeColors.buttonIconSecondary,
                      textColor: themeColors.buttonTextSecondary,
                    };

                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.tabButton,
                      {
                        backgroundColor: tabButtonColors.backgroundColor,
                        borderColor: tabButtonColors.borderColor,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setActivePdvTab(tab.key)}>
                    <Icon
                      name={tab.icon}
                      size={14}
                      color={tabButtonColors.iconColor}
                    />
                    <Text
                      style={[
                        styles.tabButtonText,
                        {color: tabButtonColors.textColor},
                      ]}>
                      {tt('tab', tab.labelKey) ||
                        (tab.key === PDV_TAB_PAYMENT_TYPES
                          ? 'Pagamentos'
                          : tab.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <DeviceDetailMovementSections {...detailCtx} />

        {showPdvOperationTab && (
          <>
            <DeviceDetailPdvConfigSection {...detailCtx} />
            <DeviceDetailOrdersPrintSection {...detailCtx} />
            <DeviceDetailAlertsCommandsSection {...detailCtx} />
          </>
        )}

        <DeviceDetailPaymentSection {...detailCtx} />

      </ScrollView>
    </SafeAreaView>
  );
};

export default DeviceDetailScreen;
