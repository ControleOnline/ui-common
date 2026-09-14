import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import StateStore from '@controleonline/ui-common/src/react/components/StateStore';

import Icon from 'react-native-vector-icons/Feather';
import styles from '../../DeviceDetailPage.styles';

import DeviceDetailHeader from './DeviceDetailHeader';
import CopyDeviceConfigModal from '@controleonline/ui-common/src/react/components/CopyDeviceConfigModal';
import useDeviceDetailCopyConfig from './useDeviceDetailCopyConfig';
import DeviceDetailPdvConfigSection from './DeviceDetailPdvConfigSection';
import DeviceDetailOrdersPrintSection from './DeviceDetailOrdersPrintSection';
import DeviceDetailAlertsCommandsSection from './DeviceDetailAlertsCommandsSection';
import DeviceDetailMovementSections from './DeviceDetailMovementSections';
import DeviceDetailPaymentSection from './DeviceDetailPaymentSection';

import { PDV_TAB_PAYMENT_TYPES, PDV_DETAIL_TABS, tt } from './deviceDetailConstants';

import createDeviceDetailContext from './createDeviceDetailContext';
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
  const detailCtx = createDeviceDetailContext(state, loaders, actions, saves);
  const {
    accent, alias, aliasInput, aliasInputRef, deviceId, deviceString,
    editingAlias, removingDevice, savingAlias, themeColors, brandColors,
    setAliasInput, confirmRemoveDevice, saveAlias, startEditAlias,
    loadingActiveTabData, isPdvDevice, activePdvTab, setActivePdvTab,
    showPdvOperationTab, showPdvOrdersTab, shouldShowOrderVisibility,
    shouldShowDeviceBehavior, shouldShowRemotePayment, shouldShowRemoteCommands,
    actionsRef, currentCompany, loadCompanyConfigs, messageApi,
    refreshCurrentConfig, showSystemError, companyDeviceConfigs,
    loadingCompanyDeviceConfigs,
  } = detailCtx;

  const {
    copyModalVisible,
    copyingConfig,
    openCopyConfigModal,
    closeCopyConfigModal,
    handleCopyConfigConfirm,
  } = useDeviceDetailCopyConfig({
    actionsRef,
    alias,
    currentCompanyId: currentCompany?.id,
    deviceString,
    loadCompanyConfigs,
    messageApi,
    refreshCurrentConfig,
    showSystemError,
  });

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
          onCopyConfig={openCopyConfigModal}
          copyingConfig={copyingConfig}
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
          <DeviceDetailPdvConfigSection {...detailCtx} />
        )}

        {(showPdvOrdersTab || shouldShowOrderVisibility || detailCtx.isDisplayDevice) && (
          <DeviceDetailOrdersPrintSection {...detailCtx} />
        )}
        {(shouldShowDeviceBehavior || shouldShowRemotePayment || shouldShowRemoteCommands) && (
          <DeviceDetailAlertsCommandsSection {...detailCtx} />
        )}
        <DeviceDetailPaymentSection {...detailCtx} />

      </ScrollView>
          <CopyDeviceConfigModal
        visible={copyModalVisible}
        onClose={closeCopyConfigModal}
        onConfirm={handleCopyConfigConfirm}
        companyDeviceConfigs={companyDeviceConfigs}
        companyId={currentCompany?.id}
        destinationDeviceString={deviceString}
        destinationAlias={alias}
        loading={loadingCompanyDeviceConfigs}
        confirming={copyingConfig}
      />
    </SafeAreaView>
  );
};

export default DeviceDetailScreen;
