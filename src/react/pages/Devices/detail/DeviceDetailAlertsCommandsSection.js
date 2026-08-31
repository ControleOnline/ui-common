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
export default function DeviceDetailAlertsCommandsSection(ctx) {
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
          <Icon name="volume-2" size={13} /> {'  '}Aviso Sonoro
        </Text>

        <View style={styles.configCard}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.configTitle}>Alerta via websocket</Text>
            {renderHelpButton(
              'Alerta via websocket',
              'Quando habilitado, este device toca o audio configurado ao receber o evento order.created de um novo pedido em preparo.',
            )}
          </View>

          {renderSwitchRow({
            disabled: savingAlertSound,
            label: 'Aviso sonoro habilitado',
            value: deviceAlertSoundEnabled,
            valueLabel: deviceAlertSoundEnabled ? 'Ativo' : 'Inativo',
            onValueChange: nextValue => {
              setDeviceAlertSoundEnabled(nextValue);
              saveDeviceAlertSoundConfig({
                deviceAlertSoundEnabled: nextValue,
              });
            },
          })}

          <View style={styles.textInputWrap}>
            <Text style={styles.textInputLabel}>URL do audio</Text>
            <TextInput
              style={styles.textInput}
              value={deviceAlertSoundUrl}
              onChangeText={setDeviceAlertSoundUrl}
              placeholder="https://exemplo.com/alerta.mp3"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={saveDeviceAlertSoundConfig}
              onBlur={saveDeviceAlertSoundConfig}
            />
          </View>
        </View>
      </View>
      )}

      {shouldShowDeviceBehavior && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Icon name="activity" size={13} /> {'  '}Rodapé do Sistema
        </Text>

        <View style={styles.configCard}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.configTitle}>Debug do socket no rodapé</Text>
            {renderHelpButton(
              'Debug do socket no rodapé',
              'Quando habilitado, este device troca a bolinha discreta do socket pelos detalhes de debug publicados pelos serviços do runtime no rodapé global do sistema.',
            )}
          </View>

          {renderSwitchRow({
            disabled: savingRuntimeDebugInfo,
            label: 'Exibir debug detalhado',
            value: deviceRuntimeDebugInfoEnabled,
            valueLabel: deviceRuntimeDebugInfoEnabled ? 'Ativo' : 'Inativo',
            onValueChange: nextValue => {
              setDeviceRuntimeDebugInfoEnabled(nextValue);
              saveDeviceRuntimeDebugInfo({
                deviceRuntimeDebugInfoEnabled: nextValue,
              });
            },
          })}
        </View>
      </View>
      )}

      {shouldShowRemotePayment && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Icon name="credit-card" size={13} /> {'  '}Pagamento Remoto
          </Text>

          <View style={styles.configCard}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.configTitle}>Device preferencial para pagamento</Text>
              {renderHelpButton(
                'Device preferencial para pagamento',
                'Esse destino funciona como fallback desta origem quando a empresa não definiu uma ordem padrão no configurador geral. Quando a empresa tiver devices padrão para pagamento remoto, essa ordem global tem prioridade.',
              )}
            </View>

            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={devicePaymentTarget || ''}
                mode={pickerMode}
                style={styles.picker}
                dropdownIconColor="#64748B"
                onValueChange={value => {
                  const nextValue = value || '';
                  setDevicePaymentTarget(nextValue);
                  saveDevicePaymentTarget({
                    devicePaymentTarget: nextValue,
                  });
                }}>
                <Picker.Item
                  label="Usar devices padrão da empresa"
                  value=""
                />
                {paymentDeviceOptions.map(option => (
                  <Picker.Item
                    key={option.deviceId}
                    label={`${option.alias} (${option.gatewayLabel})`}
                    value={option.deviceId}
                  />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      )}

      {shouldShowRemoteCommands && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Icon name="refresh-cw" size={13} /> {'  '}Comandos Remotos
          </Text>

          <View style={styles.configCard}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.configTitle}>Catálogo do PDV</Text>
              {renderHelpButton(
                'Catálogo do PDV',
                'Limpa o cache local de produtos e categorias deste device. O recarregamento acontece no próximo uso do PDV.',
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.configButton,
                {
                  backgroundColor: themeColors.buttonBackground,
                  borderColor: themeColors.buttonBackground,
                },
                sendingCatalogRefresh && {opacity: 0.6},
              ]}
              activeOpacity={0.85}
              disabled={sendingCatalogRefresh}
              onPress={sendCatalogRefreshCommand}>
              <Icon name="trash-2" size={16} color={themeColors.buttonIcon} />
              <Text
                style={[
                  styles.configButtonText,
                  {color: themeColors.buttonText},
                ]}>
                {sendingCatalogRefresh ? 'Limpando cache...' : 'Limpar cache de produtos'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}
