import React from 'react';
import { ActivityIndicator, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/Feather';
import { colors } from '@controleonline/../../src/styles/colors';

import { withOpacity } from '@controleonline/../../src/styles/branding';

import styles from '../styles';
import {
  deliveryMethodOptions,
  sanitizeConfirmMethodInput,
  sanitizeRadiusInput,
  sanitizeTimeInput,
} from '../utils';

const resolveButtonPalette = (palette, accentColor) => {
  const primaryBackground =
    palette.buttonBackground || accentColor || palette.primary;
  const primaryBorder = palette.buttonBorder || primaryBackground;
  const primaryText = palette.buttonText || palette.white;
  const primaryIcon = palette.buttonIcon || primaryText;
  const secondaryBackground =
    palette.buttonBackgroundSecondary || palette.white;
  const secondaryBorder = palette.buttonBorderSecondary || palette.border;
  const secondaryText = palette.buttonTextSecondary || palette.textSecondary;
  const secondaryIcon = palette.buttonIconSecondary || secondaryText;
  const disabledBackground =
    palette.buttonDisabledBackground || secondaryBorder;
  const disabledText = palette.buttonDisabledText || secondaryText;

  return {
    primaryBackground,
    primaryBorder,
    primaryText,
    primaryIcon,
    secondaryBackground,
    secondaryBorder,
    secondaryText,
    secondaryIcon,
    disabledBackground,
    disabledText,
  };
};

// Aba isolada para configurações operacionais da loja.
export default function Food99SettingsTab({
  shadowStyle,
  accentColor,
  settingsSummaryRows,
  storeSettingsDraft,
  setStoreSettingsDraft,
  wallets,
  walletLoading,
  actionLoading,
  onQuickCreateWallet,
  onSave,
  palette = colors,
}) {
  const buttonPalette = resolveButtonPalette(palette, accentColor);

  return (
    <View style={[styles.panel, shadowStyle]}>
      <View style={styles.panelHeader}>
        <View>
          <Text style={styles.panelTitle}>Configuracoes operacionais</Text>
          <Text style={styles.panelSubtitle}>
            Ajuste raio, horario, metodo de entrega, confirmacao e carteira de repasse sem misturar isso com a conexão da loja.
          </Text>
        </View>
      </View>

      <View style={styles.statusRows}>
        {settingsSummaryRows.map(row => (
          <View
            key={row.label}
            style={[
              styles.statusRowItem,
              row.wide && styles.statusRowItemWide,
            ]}>
            <Text style={styles.statusRowLabel}>{row.label}</Text>
            <Text style={row.small ? styles.statusRowValueSmall : styles.statusRowValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.settingsForm}>
        <View style={styles.formField}>
          <Text style={styles.formLabel}>Raio de atendimento (km)</Text>
          <TextInput
            value={storeSettingsDraft.deliveryRadiusKm}
            onChangeText={value =>
              setStoreSettingsDraft(current => ({ ...current, deliveryRadiusKm: sanitizeRadiusInput(value) }))
            }
            placeholder="Ex.: 5"
            keyboardType="decimal-pad"
            style={styles.formInput}
            placeholderTextColor={palette.textSecondary}
          />
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formField, styles.formFieldHalf]}>
            <Text style={styles.formLabel}>Abertura (HH:mm)</Text>
            <TextInput
              value={storeSettingsDraft.openTime}
              onChangeText={value =>
                setStoreSettingsDraft(current => ({ ...current, openTime: sanitizeTimeInput(value) }))
              }
              placeholder="08:00"
              keyboardType="number-pad"
              maxLength={5}
              style={styles.formInput}
              placeholderTextColor={palette.textSecondary}
            />
          </View>

          <View style={[styles.formField, styles.formFieldHalf]}>
            <Text style={styles.formLabel}>Fechamento (HH:mm)</Text>
            <TextInput
              value={storeSettingsDraft.closeTime}
              onChangeText={value =>
                setStoreSettingsDraft(current => ({ ...current, closeTime: sanitizeTimeInput(value) }))
              }
              placeholder="22:00"
              keyboardType="number-pad"
              maxLength={5}
              style={styles.formInput}
              placeholderTextColor={palette.textSecondary}
            />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formField, styles.formFieldHalf]}>
            <Text style={styles.formLabel}>Metodo de entrega</Text>
            <View style={styles.optionGroup}>
              {deliveryMethodOptions.map(option => {
                const selected = String(storeSettingsDraft.deliveryMethod) === String(option.value);

                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() =>
                      setStoreSettingsDraft(current => ({ ...current, deliveryMethod: option.value }))
                    }
                    style={[
                      styles.optionChip,
                      {
                        borderColor: selected
                          ? buttonPalette.primaryBorder
                          : buttonPalette.secondaryBorder,
                        backgroundColor: selected
                          ? buttonPalette.primaryBackground
                          : buttonPalette.secondaryBackground,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.optionChipText,
                        {
                          color: selected
                            ? buttonPalette.primaryText
                            : buttonPalette.secondaryText,
                        },
                      ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.formField, styles.formFieldHalf]}>
            <Text style={styles.formLabel}>Metodo de confirmacao</Text>
            <TextInput
              value={storeSettingsDraft.confirmMethod}
              onChangeText={value =>
                setStoreSettingsDraft(current => ({ ...current, confirmMethod: sanitizeConfirmMethodInput(value) }))
              }
              placeholder="Ex.: 1"
              keyboardType="number-pad"
              maxLength={3}
              style={styles.formInput}
              placeholderTextColor={palette.textSecondary}
            />
          </View>
        </View>

        <View style={styles.formField}>
          <Text style={styles.formLabel}>ID da area de entrega (opcional)</Text>
          <TextInput
            value={storeSettingsDraft.deliveryAreaId}
            onChangeText={value =>
              setStoreSettingsDraft(current => ({ ...current, deliveryAreaId: value }))
            }
            placeholder="Usa automaticamente a primeira area quando vazio"
            style={styles.formInput}
            placeholderTextColor={palette.textSecondary}
          />
        </View>

        <View style={styles.formField}>
          <View style={styles.formFieldHeaderRow}>
            <Text style={styles.formLabel}>Carteira de repasse</Text>
            <TouchableOpacity
              onPress={onQuickCreateWallet}
              style={[
                styles.inlineAction,
                {
                  borderWidth: 1,
                  borderColor: buttonPalette.secondaryBorder,
                  backgroundColor: buttonPalette.secondaryBackground,
                },
              ]}>
              <Icon
                name="plus"
                size={14}
                color={buttonPalette.secondaryIcon}
              />
              <Text
                style={[
                  styles.inlineActionText,
                  { color: buttonPalette.secondaryText },
                ]}>
                Cadastro rapido
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={storeSettingsDraft.settlementWalletId}
              mode={Platform.OS === 'android' ? 'dropdown' : undefined}
              onValueChange={value =>
                setStoreSettingsDraft(current => ({ ...current, settlementWalletId: String(value || '') }))
              }
              enabled={!walletLoading && Array.isArray(wallets) && wallets.length > 0}
              style={styles.picker}>
              <Picker.Item
                label={
                  walletLoading
                    ? 'Carregando carteiras...'
                    : Array.isArray(wallets) && wallets.length === 0
                      ? 'Nenhuma carteira cadastrada'
                      : 'Selecione uma carteira'
                }
                value=""
              />
              {(Array.isArray(wallets) ? wallets : []).map(wallet => (
                <Picker.Item
                  key={wallet.id}
                  label={`${wallet.wallet || 'Carteira'} (#${wallet.id})`}
                  value={String(wallet.id)}
                />
              ))}
            </Picker>
          </View>
          <Text style={styles.formHint}>
            A carteira selecionada recebe o repasse semanal do 99Food e precisa pertencer a empresa ativa.
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              borderWidth: 1,
              borderColor: buttonPalette.primaryBorder,
              backgroundColor: buttonPalette.primaryBackground,
            },
            actionLoading === 'save-settings' && {
              borderColor: buttonPalette.secondaryBorder,
              backgroundColor: buttonPalette.disabledBackground,
            },
          ]}
          onPress={onSave}
          disabled={actionLoading === 'save-settings'}>
          {actionLoading === 'save-settings' ? (
            <ActivityIndicator
              size="small"
              color={buttonPalette.disabledText}
            />
          ) : (
            <>
              <Icon
                name="save"
                size={16}
                color={buttonPalette.primaryIcon}
              />
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: buttonPalette.primaryText },
                ]}>
                Salvar configuracoes
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
