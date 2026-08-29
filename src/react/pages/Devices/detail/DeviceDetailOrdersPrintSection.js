import React from 'react';
import {Text, View} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/Feather';
import styles from '../../DeviceDetailPage.styles';
import {
  DEVICE_ORDER_VISIBILITY_COMPANY,
  DEVICE_ORDER_VISIBILITY_DEVICE,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  normalizeEntityId,
  normalizeDeviceId,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {getDisplayLabel} from './deviceDetailHelpers';
import {tt} from './deviceDetailConstants';

/**
 * Pedidos do device + impressão de preparo (DISPLAY).
 * Extraído de DeviceDetailScreen (app-community#382 / hotfix #645).
 */
export default function DeviceDetailOrdersPrintSection(ctx) {
  const {
    themeColors,
    renderHelpButton,
    renderOptionButtons,
    renderSwitchRow,
    orderVisibility,
    setOrderVisibility,
    saveDeviceOrderVisibility,
    deliveryEnabled,
    setDeliveryEnabled,
    saveDeviceDeliverySettings,
    savingDeliverySettings,
    displayAutoPrintProduct,
    setDisplayAutoPrintProduct,
    displayAllowPrinterChange,
    setDisplayAllowPrinterChange,
    saveDisplayPrintingConfig,
    savingDisplayPrinting,
    linkedDisplayId,
    setLinkedDisplayId,
    displayOptions,
    printerOptions,
    pickerMode,
    isDisplayDevice,
  } = ctx;

  const printerLabel = option => {
    const id = normalizeDeviceId(option?.device || option);
    const name = String(option?.name || option?.deviceName || option?.label || '').trim();
    return name ? `${name} (${id})` : `Impressora ${id || '--'}`;
  };

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
            value: orderVisibility,
            optionColors: {
              buttonBackground: themeColors.buttonBackground,
              buttonBorder: themeColors.buttonBorder,
              buttonText: themeColors.buttonText,
              buttonBackgroundSecondary: themeColors.buttonBackgroundSecondary,
              buttonBorderSecondary: themeColors.buttonBorderSecondary,
              buttonTextSecondary: themeColors.buttonTextSecondary,
            },
            onChange: value => {
              const nextValue = value || DEVICE_ORDER_VISIBILITY_DEVICE;
              setOrderVisibility(nextValue);
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
            disabled: savingDeliverySettings,
            label: tt('label', 'deliveryEnabled') || 'Trabalhar com delivery',
            value: deliveryEnabled,
            valueLabel: deliveryEnabled ? 'Ativo' : 'Inativo',
            onValueChange: nextValue => {
              setDeliveryEnabled(nextValue);
              saveDeviceDeliverySettings({deviceDeliveryEnabled: nextValue});
            },
          })}
        </View>
      </View>

      {isDisplayDevice && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Icon name="printer" size={13} /> {'  '}Impressão de Preparo
          </Text>

          <View style={styles.configCard}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.configTitle}>
                Display vinculado e impressora da fila
              </Text>
              {renderHelpButton(
                'Display vinculado e impressora da fila',
                'Este bloco é usado na impressão automática disparada pelo app DISPLAY.',
              )}
            </View>

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
                <Picker.Item label="Nenhum display vinculado" value="" />
                {(displayOptions || []).map(option => {
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
                selectedValue=""
                mode={pickerMode}
                style={styles.picker}
                dropdownIconColor="#64748B"
                onValueChange={() => {}}>
                <Picker.Item label="Nenhuma impressora configurada" value="" />
                {(printerOptions || []).map(option => {
                  const printerId = normalizeDeviceId(option?.device || option);
                  return (
                    <Picker.Item
                      key={`printer-option-${printerId}`}
                      label={printerLabel(option)}
                      value={printerId}
                    />
                  );
                })}
              </Picker>
            </View>

            {renderSwitchRow({
              disabled: savingDisplayPrinting,
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
              disabled: savingDisplayPrinting,
              label: 'Imprimir produtos automaticamente',
              value: displayAutoPrintProduct,
              valueLabel: displayAutoPrintProduct ? 'Ativo' : 'Inativo',
              onValueChange: nextValue => {
                setDisplayAutoPrintProduct(nextValue);
                saveDisplayPrintingConfig({
                  displayAutoPrintProductEnabled: nextValue,
                });
              },
            })}
          </View>
        </View>
      )}
    </>
  );
}
