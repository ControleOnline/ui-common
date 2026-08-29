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
export default function DeviceDetailPdvConfigSection(ctx) {
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
            <Icon name="credit-card" size={13} /> {'  '}Configuração do PDV
          </Text>

          <View style={styles.configCard}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.configTitle}>
                {tt('title', 'posOperationMode')}
              </Text>
              {renderHelpButton(
                tt('title', 'posOperationMode') || 'Modo de operacao',
                tt('description', 'posOperationModeDescription') ||
                  'Escolha o modo, a trava kiosk e a politica de ordem/caixa deste device.',
              )}
            </View>

            {renderOptionButtons({
              options: POS_OPERATION_MODE_OPTIONS.map(option => ({
                label: tt('option', option.translationKey),
                value: option.value,
              })),
              value: posOperationMode,
              optionColors: {
                buttonBackground: themeColors.buttonBackground,
                buttonBorder: themeColors.buttonBorder,
                buttonText: themeColors.buttonText,
                buttonBackgroundSecondary: themeColors.buttonBackgroundSecondary,
                buttonBorderSecondary: themeColors.buttonBorderSecondary,
                buttonTextSecondary: themeColors.buttonTextSecondary,
              },
              onChange: value => {
                const nextValue = resolvePosOperationMode({
                  [POS_OPERATION_MODE_CONFIG_KEY]: value,
                });
                setPosOperationMode(nextValue);
                savePosOperationMode({posOperationMode: nextValue});
              },
            })}

            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={productShowcaseId || ''}
                mode={pickerMode}
                enabled={!loadingProductShowcases && !savingProductShowcase}
                style={styles.picker}
                dropdownIconColor="#64748B"
                onValueChange={value => {
                  const nextValue = normalizeEntityId(value);
                  setProductShowcaseId(nextValue);
                  saveProductShowcaseConfig({productShowcaseId: nextValue});
                }}>
                <Picker.Item
                  label={
                    loadingProductShowcases
                      ? 'Carregando vitrines...'
                      : 'Sem vitrine vinculada'
                  }
                  value=""
                />
                {productShowcases.map(showcase => {
                  const showcaseId = normalizeEntityId(showcase);
                  return (
                    <Picker.Item
                      key={`pos-showcase-${showcaseId}`}
                      label={getProductShowcaseLabel(showcase)}
                      value={showcaseId}
                    />
                  );
                })}
              </Picker>
            </View>

            {renderSwitchRow({
              disabled: savingPosOperationMode,
              label: 'Modo Kiosk',
              value: androidKioskEnabled,
              valueLabel: androidKioskEnabled ? 'Ativo' : 'Inativo',
              onValueChange: nextValue => {
                setAndroidKioskEnabled(nextValue);
                savePosOperationMode({androidKioskEnabled: nextValue});
              },
            })}

            {renderOptionButtons({
              options: [
                {
                  label: global.t?.t('configs', 'option', 'none') || 'None',
                  value: POS_CHECK_ORDER_TYPE_NONE,
                },
                {
                  label: global.t?.t('orders', 'title', 'tab') || 'Tab',
                  value: POS_CHECK_ORDER_TYPE_TAB,
                },
                {
                  label: global.t?.t('orders', 'title', 'table') || 'Table',
                  value: POS_CHECK_ORDER_TYPE_TABLE,
                },
                {
                  label: global.t?.t('orders', 'title', 'stamp') || 'Stamp',
                  value: POS_CHECK_ORDER_TYPE_STAMP,
                  disabled: !loyaltyCouponsEnabled,
                  title: !loyaltyCouponsEnabled
                    ? 'Ative em Shop -> Cupom fidelidade\npara liberar Stamp'
                    : '',
                },
              ],
              value: checkOrderType,
              optionColors: {
                buttonBackground: themeColors.buttonBackground,
                buttonBorder: themeColors.buttonBorder,
                buttonText: themeColors.buttonText,
                buttonBackgroundSecondary: themeColors.buttonBackgroundSecondary,
                buttonBorderSecondary: themeColors.buttonBorderSecondary,
                buttonTextSecondary: themeColors.buttonTextSecondary,
              },
              onChange: value => {
                const nextCheckOrderType =
                  value === POS_CHECK_ORDER_TYPE_TAB
                    ? POS_CHECK_ORDER_TYPE_TAB
                    : value === POS_CHECK_ORDER_TYPE_TABLE
                      ? POS_CHECK_ORDER_TYPE_TABLE
                      : value === POS_CHECK_ORDER_TYPE_STAMP
                        ? loyaltyCouponsEnabled
                          ? POS_CHECK_ORDER_TYPE_STAMP
                          : POS_CHECK_ORDER_TYPE_NONE
                      : POS_CHECK_ORDER_TYPE_NONE;
                const nextCheckOrderManagementMode =
                  nextCheckOrderType === POS_CHECK_ORDER_TYPE_NONE
                    ? POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE
                    : checkOrderManagementMode;
                setCheckOrderType(nextCheckOrderType);
                if (nextCheckOrderType === POS_CHECK_ORDER_TYPE_NONE) {
                  setCheckOrderManagementMode(
                    POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE,
                  );
                }
                savePosOperationMode({
                  checkOrderType: nextCheckOrderType,
                  checkOrderManagementMode: nextCheckOrderManagementMode,
                });
              },
            })}

            {checkOrderType !== POS_CHECK_ORDER_TYPE_NONE &&
              renderOptionButtons({
                options: [
                  {
                    label:
                      global.t?.t(
                        'configs',
                        'option',
                        'manageLinkedOrders',
                      ) || 'Open and close tabs/tables/stamps',
                    value: POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE,
                  },
                  {
                    label:
                      global.t?.t(
                        'configs',
                        'option',
                        'existingLinkedOrdersOnly',
                      ) || 'Use open tabs/tables/stamps only',
                    value: POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY,
                  },
                ],
                value: checkOrderManagementMode,
                onChange: value => {
                  const nextValue =
                    value === POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY
                      ? POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY
                      : POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE;
                  setCheckOrderManagementMode(nextValue);
                  savePosOperationMode({checkOrderManagementMode: nextValue});
                },
              })}

            {posOperationMode === POS_OPERATION_MODE_COUNTER && (
              <>
                {renderSwitchRow({
                  disabled: savingPosOperationMode,
                  label: 'Impressao automatica',
                  value: counterAutoPrintEnabled,
                  valueLabel: counterAutoPrintEnabled ? 'Sim' : 'Nao',
                  onValueChange: nextValue => {
                    setCounterAutoPrintEnabled(nextValue);
                    savePosOperationMode({counterAutoPrintEnabled: nextValue});
                  },
                })}

                {counterAutoPrintEnabled &&
                  renderOptionButtons({
                    options: [
                      {label: 'Pedido', value: POS_PRINT_MODE_ORDER},
                      {label: 'Fichas', value: POS_PRINT_MODE_FORM},
                    ],
                    value: counterPrintMode,
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
                        value === POS_PRINT_MODE_FORM
                          ? POS_PRINT_MODE_FORM
                          : POS_PRINT_MODE_ORDER;
                      setCounterPrintMode(nextValue);
                      savePosOperationMode({counterPrintMode: nextValue});
                    },
                  })}

                {renderOptionButtons({
                  options: [
                    {
                      label: 'Abertura e fechamento de caixa',
                      value: POS_CASH_MANAGEMENT_MODE_CASH_REGISTER,
                    },
                    {
                      label: 'Fechamento diario',
                      value: POS_CASH_MANAGEMENT_MODE_DAILY,
                    },
                  ],
                  value: counterCashManagementMode,
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
                      value === POS_CASH_MANAGEMENT_MODE_DAILY
                        ? POS_CASH_MANAGEMENT_MODE_DAILY
                        : POS_CASH_MANAGEMENT_MODE_CASH_REGISTER;
                    setCounterCashManagementMode(nextValue);
                    savePosOperationMode({counterCashManagementMode: nextValue});
                  },
                })}
              </>
            )}
          </View>

          <View style={styles.configCard}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.configTitle, {color: brandColors.text}]}>
                {tt('title', 'androidLauncherMode') || 'Launcher / home app'}
              </Text>
              {renderHelpButton(
                tt('title', 'androidLauncherMode') || 'Launcher / home app',
                tt('description', 'androidLauncherDescription') ||
                  'Quando ativado, o device volta para a app ao usar home ou apps recentes. O voltar continua seguindo a tela.',
              )}
            </View>

            {renderSwitchRow({
              disabled: savingLauncherMode,
              label: 'Modo launcher?',
              value: androidLauncherEnabled,
              valueLabel: androidLauncherEnabled ? 'Ativo' : 'Inativo',
              onValueChange: nextValue => {
                setAndroidLauncherEnabled(nextValue);
                saveLauncherMode({androidLauncherEnabled: nextValue});
              },
            })}
            <Text style={[styles.deviceString, {color: brandColors.textSecondary}]}>
              Salva automaticamente
            </Text>
          </View>

          <View style={styles.configCard}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.configTitle}>Gateway e impressora</Text>
              {renderHelpButton(
                'Gateway e impressora',
                'Escolha o gateway usado pelo PDV e se ele pode aparecer como destino de impressao.',
              )}
            </View>

            {renderOptionButtons({
              options: [
                {label: 'Nenhum', value: ''},
                {label: 'Infinite Pay', value: 'infinite-pay'},
                {label: 'Cielo', value: 'cielo'},
              ],
              value: pdvGateway || '',
              optionColors: {
                buttonBackground: themeColors.buttonBackground,
                buttonBorder: themeColors.buttonBorder,
                buttonText: themeColors.buttonText,
                buttonBackgroundSecondary: themeColors.buttonBackgroundSecondary,
                buttonBorderSecondary: themeColors.buttonBorderSecondary,
                buttonTextSecondary: themeColors.buttonTextSecondary,
              },
              onChange: value => {
                const nextValue = String(value || '');
                setPdvGateway(nextValue);
                savePdvSettings({pdvGateway: nextValue});
              },
            })}

            {renderSwitchRow({
              disabled: savingPdvSettings,
              label: 'Impressora',
              value: pdvPrinterEnabled,
              valueLabel: pdvPrinterEnabled ? 'Sim' : 'Nao',
              onValueChange: nextValue => {
                setPdvPrinterEnabled(nextValue);
                savePdvSettings({pdvPrinterEnabled: nextValue});
              },
            })}
            <Text style={styles.deviceString}>Salva automaticamente</Text>
          </View>
        </View>
    </>
  );
}
