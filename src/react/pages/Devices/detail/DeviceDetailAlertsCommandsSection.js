import React from 'react';
import { Text, View, TextInput, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/Feather';
import styles from '../../DeviceDetailPage.styles';

export default function DeviceDetailAlertsCommandsSection(ctx) {
  const {
    themeColors,
    renderHelpButton,
    renderSwitchRow,
    pickerMode,
    deviceAlertSoundEnabled,
    setDeviceAlertSoundEnabled,
    deviceAlertSoundUrl,
    setDeviceAlertSoundUrl,
    saveDeviceAlertSoundConfig,
    savingAlertSound,
    deviceRuntimeDebugInfoEnabled,
    setDeviceRuntimeDebugInfoEnabled,
    saveDeviceRuntimeDebugInfo,
    savingRuntimeDebugInfo,
    devicePaymentTarget,
    setDevicePaymentTarget,
    saveDevicePaymentTarget,
    paymentDeviceOptions,
    sendCatalogRefreshCommand,
    sendingCatalogRefresh,
    shouldShowDeviceBehavior = true,
    shouldShowRemotePayment = true,
    shouldShowRemoteCommands = true,
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

      {shouldShowDeviceBehavior && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Icon name="activity" size={13} /> {'  '}Rodape do Sistema
          </Text>

          <View style={styles.configCard}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.configTitle}>Debug do socket no rodape</Text>
              {renderHelpButton(
                'Debug do socket no rodape',
                'Quando habilitado, este device troca a bolinha discreta do socket pelos detalhes de debug publicados pelos servicos do runtime no rodape global do sistema.',
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
                'Esse destino funciona como fallback desta origem quando a empresa nao definiu uma ordem padrao no configurador geral.',
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
                  label="Usar devices padrao da empresa"
                  value=""
                />
                {(paymentDeviceOptions || []).map(option => (
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
              <Text style={styles.configTitle}>Catalogo do PDV</Text>
              {renderHelpButton(
                'Catalogo do PDV',
                'Limpa o cache local de produtos e categorias deste device. O recarregamento acontece no proximo uso do PDV.',
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
