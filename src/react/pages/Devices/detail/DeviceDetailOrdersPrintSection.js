import React from 'react';
import { Text, View, Switch, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/Feather';
import styles from '../../DeviceDetailPage.styles';
import {
  POS_OPERATION_MODE_OPTIONS,
  POS_OPERATION_MODE_COUNTER,
  POS_PRINT_MODE_ORDER,
  POS_PRINT_MODE_FORM,
  POS_CHECK_ORDER_TYPE_NONE,
  POS_CHECK_ORDER_TYPE_TAB,
  POS_CHECK_ORDER_TYPE_TABLE,
  POS_CHECK_ORDER_TYPE_STAMP,
  POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE,
  POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY,
  POS_CASH_MANAGEMENT_MODE_CASH_REGISTER,
  POS_CASH_MANAGEMENT_MODE_DAILY,
  POS_OPERATION_MODE_CONFIG_KEY,
  DEVICE_ORDER_VISIBILITY_COMPANY,
  DEVICE_ORDER_VISIBILITY_DEVICE,
  resolvePosOperationMode,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import { normalizeEntityId } from '@controleonline/ui-common/src/react/utils/paymentDevices';
import { getProductShowcaseLabel } from './deviceDetailHelpers';
import { tt } from './deviceDetailConstants';

/**
 * Extracted from DeviceDetailScreen for modularization (≤500 lines).
 * Refs: app-community#382
 */
export default function DeviceDetailOrdersPrintSection(ctx) {
  const {
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
    counterCashManagementMode, setCounterCashManagementMode,
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
    displayAutoPrintProduct, setDisplayAutoPrintProduct,
    displayAllowPrinterChange, setDisplayAllowPrinterChange,
    saveDisplayPrintingConfig, savingDisplayPrinting,
    linkedDisplayId, setLinkedDisplayId,
    isDisplayDevice, isPdvDevice,
    styles: _styles,
  } = ctx;

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Icon name="list" size={13} /> {'  '}Pedidos do Device
        </Text>

          <View style={styles.configCard}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.configTitle}>Escopo da listagem no PDV</Text>
              {renderHelpButton(
                'Escopo da listagem',
                'Define se este device mostra apenas os pedidos criados nele ou todos os pedidos da empresa.',
              )}
            </View>

            {renderOptionButtons({
              options: [
                {
                  label: 'Somente deste device',
                  value: DEVICE_ORDER_VISIBILITY_DEVICE,
                },
                {
                  label: 'Todos da empresa',
                  value: DEVICE_ORDER_VISIBILITY_COMPANY,
                },
              ],
              value: deviceOrderVisibility,
              optionColors: {
                buttonBackground: themeColors.buttonBackground,
                buttonBorder: themeColors.buttonBorder,
                buttonText: themeColors.buttonText,
                buttonBackgroundSecondary: themeColors.buttonBackgroundSecondary,
                buttonBorderSecondary: themeColors.buttonBorderSecondary,
                buttonTextSecondary: themeColors.buttonTextSecondary,
              },
              onChange: value => {
                const nextValue =
                  value || DEVICE_ORDER_VISIBILITY_DEVICE;
                setDeviceOrderVisibility(nextValue);
                saveDeviceOrderVisibility({deviceOrderVisibility: nextValue});
              },
            })}
          </View>

          <View style={styles.configCard}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.configTitle}>
                {tt('title', 'deliveryOnDevice') || 'Delivery neste equipamento'}
              </Text>
              {renderHelpButton(
                tt('title', 'deliveryOnDevice') || 'Delivery neste equipamento',
                tt('description', 'deliveryOnDeviceDescription') ||
                  'Ative quando este equipamento precisa operar pedidos com cliente, endereço e observações de entrega.',
              )}
            </View>

            {renderSwitchRow({
              disabled: savingDeviceDeliverySettings,
              label: tt('label', 'deliveryEnabled') ||
                'Trabalhar com delivery',
              value: deviceDeliveryEnabled,
              valueLabel: deviceDeliveryEnabled ? 'Ativo' : 'Inativo',
              onValueChange: nextValue => {
                setDeviceDeliveryEnabled(nextValue);
                saveDeviceDeliverySettings({
                  deviceDeliveryEnabled: nextValue,
                });
              },
            })}
          </View>
        </View>
      )}

      {isDisplayDevice && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Icon name="printer" size={13} /> {'  '}Impressão de Preparo
          </Text>

          <View style={styles.configCard}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.configTitle}>Display vinculado e impressora da fila</Text>
              {renderHelpButton(
                'Display vinculado e impressora da fila',
                'Este bloco é usado na impressão automática disparada pelo app DISPLAY. O device DISPLAY precisa apontar qual display representa e qual impressora deve receber a cópia separada por fila.',
              )}
            </View>

            {(isLoadingDisplays || isLoadingPrinters) ? (
              <StateStore
                compact
                loading="Carregando displays e impressoras..."
              />
            ) : (
              <>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={linkedDisplayId || ''}
                    mode={pickerMode}
                    style={styles.picker}
                    dropdownIconColor="#64748B"
                    onValueChange={value => {
                      const nextValue = String(value || '').trim();
                      setLinkedDisplayId(nextValue);
                      saveDisplayPrintingConfig({linkedDisplayId: nextValue});
                    }}>
                    <Picker.Item
                      label="Nenhum display vinculado"
                      value=""
                    />
                    {displayOptions.map(option => {
                      const optionId = normalizeEntityId(option);
                      return (
                        <Picker.Item
                          key={`display-option-${optionId}`}
                          label={getDisplayLabel(option)}
                          value={optionId}
                        />
                      );
                    })}
                  </Picker>
                </View>

                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={displayPrinterId || ''}
                    mode={pickerMode}
                    style={styles.picker}
                    dropdownIconColor="#64748B"
                    onValueChange={value => {
                      const nextValue = normalizeDeviceId(value);
                      setDisplayPrinterId(nextValue);
                      saveDisplayPrintingConfig({
                        displayPrinterId: nextValue,
                      });
                    }}>
                    <Picker.Item
                      label="Nenhuma impressora configurada"
                      value=""
                    />
                    {printerOptions.map(option => {
                      const printerId = normalizeDeviceId(option?.device);
                      const printerValue = getPrinterOptionValue(option);
                      const printerTypeLabel = getDeviceTypeLabel(
                        option?.type,
                      );
                      return (
                        <Picker.Item
                          key={`printer-option-${printerValue || printerId}`}
                          label={`${getPrinterLabel(option)} (${printerTypeLabel} • ${printerId})`}
                          value={printerValue || printerId}
                        />
                      );
                    })}
                  </Picker>
                </View>

                {renderSwitchRow({
                  disabled: savingDisplayPrintingConfig,
                  label: 'Pode trocar de impressora?',
                  value: displayAllowPrinterChange,
                  valueLabel: displayAllowPrinterChange ? 'Sim' : 'Nao',
                  onValueChange: nextValue => {
                    setDisplayAllowPrinterChange(nextValue);
                    saveDisplayPrintingConfig({
                      displayAllowPrinterChange: nextValue,
                    });
                  },
                })}

                {renderSwitchRow({
                  disabled: savingDisplayPrintingConfig,
                  label: 'Imprimir produtos automaticamente',
                  value: displayAutoPrintProductEnabled,
                  valueLabel: displayAutoPrintProductEnabled
                    ? 'Ativo'
                    : 'Inativo',
                  onValueChange: nextValue => {
                    setDisplayAutoPrintProductEnabled(nextValue);
                    saveDisplayPrintingConfig({
                      displayAutoPrintProductEnabled: nextValue,
                    });
                  },
                })}
              </>
            )}
          </View>
        </View>
      )}
    </>
  );
}
