import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors } from '@controleonline/../../src/styles/colors';

import { withOpacity } from '@controleonline/../../src/styles/branding';

import styles from '../styles';

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

// Aba dedicada ao vínculo da loja e ao status operacional remoto.
export default function Food99StoreTab({
  shadowStyle,
  accentColor,
  statusRows,
  lastMenuPublishState,
  publicationTone,
  publishStateLabel,
  lastMenuTaskMessage,
  lastErrorMessage,
  actionLoading,
  connected,
  needsReconnect,
  isOnline,
  onRefresh,
  onConnect,
  onToggleStatus,
  onSyncOrders,
  onSyncTodayHistory,
  manualShopId,
  setManualShopId,
  onManualBind,
  onDisconnect,
  palette = colors,
}) {
  const buttonPalette = resolveButtonPalette(palette, accentColor);

  return (
    <>
      <View style={[styles.panel, shadowStyle]}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Status da loja</Text>
          <TouchableOpacity
            style={[
              styles.inlineAction,
              {
                borderWidth: 1,
                borderColor: buttonPalette.secondaryBorder,
                backgroundColor: buttonPalette.secondaryBackground,
              },
            ]}
            onPress={onRefresh}
            disabled={actionLoading === 'refresh'}>
            <Icon
              name="refresh-cw"
              size={14}
              color={buttonPalette.secondaryIcon}
            />
            <Text
              style={[
                styles.inlineActionText,
                { color: buttonPalette.secondaryText },
              ]}>
              Atualizar
            </Text>
          </TouchableOpacity>
        </View>

        {!!lastMenuPublishState && (
          <View style={[styles.infoBanner, { backgroundColor: withOpacity(publicationTone, 0.12) }]}>
            <Icon
              name={
                lastMenuPublishState === 'failed'
                  ? 'alert-triangle'
                  : lastMenuPublishState === 'published'
                    ? 'check-circle'
                    : 'clock'
              }
              size={14}
              color={publicationTone}
            />
            <Text style={[styles.infoBannerText, { color: publicationTone }]}>
              {publishStateLabel}
              {lastMenuTaskMessage ? ` • ${lastMenuTaskMessage}` : ''}
            </Text>
          </View>
        )}

        {!!lastErrorMessage && lastMenuPublishState !== 'failed' && (
          <View style={styles.errorBanner}>
            <Icon name="alert-circle" size={14} color={palette.error} />
            <Text style={styles.errorBannerText}>{lastErrorMessage}</Text>
          </View>
        )}

        {needsReconnect && (
          <View style={[styles.infoBanner, { backgroundColor: withOpacity(palette.warning, 0.12) }]}>
            <Icon name="alert-triangle" size={14} color={palette.warning} />
            <Text style={[styles.infoBannerText, { color: palette.warning }]}>
              A conexão remota da loja caiu. Refaça a reconexão para restaurar os webhooks.
            </Text>
          </View>
        )}

        <View style={styles.statusRows}>
          {statusRows.map(row => (
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

        <View style={styles.actionRow}>
          {!connected ? (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  borderWidth: 1,
                  borderColor: buttonPalette.primaryBorder,
                  backgroundColor: buttonPalette.primaryBackground,
                },
                actionLoading === 'connect' && {
                  borderColor: buttonPalette.secondaryBorder,
                  backgroundColor: buttonPalette.disabledBackground,
                },
              ]}
              onPress={onConnect}
              disabled={actionLoading === 'connect'}>
              {actionLoading === 'connect' ? (
                <ActivityIndicator
                  size="small"
                  color={buttonPalette.disabledText}
                />
              ) : (
                <>
                  <Icon
                    name="link-2"
                    size={16}
                    color={buttonPalette.primaryIcon}
                  />
                  <Text
                    style={[
                      styles.primaryButtonText,
                      { color: buttonPalette.primaryText },
                    ]}>
                    Integrar loja
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.formRow}>
              {needsReconnect && (
                <TouchableOpacity
                  style={[
                    styles.secondaryActionButton,
                    {
                      flex: 1,
                      borderColor: buttonPalette.secondaryBorder,
                      backgroundColor: buttonPalette.secondaryBackground,
                    },
                  ]}
                  onPress={onConnect}
                  disabled={actionLoading === 'connect'}>
                  {actionLoading === 'connect' ? (
                    <ActivityIndicator
                      size="small"
                      color={buttonPalette.disabledText}
                    />
                  ) : (
                    <>
                      <Icon
                        name="refresh-cw"
                        size={15}
                        color={buttonPalette.secondaryIcon}
                      />
                      <Text
                        style={[
                          styles.secondaryActionButtonText,
                          { color: buttonPalette.secondaryText },
                        ]}>
                        Reconectar loja
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    flex: 1,
                    borderWidth: 1,
                    borderColor: buttonPalette.primaryBorder,
                    backgroundColor: buttonPalette.primaryBackground,
                  },
                  (actionLoading === 'online' || actionLoading === 'offline') && {
                    borderColor: buttonPalette.secondaryBorder,
                    backgroundColor: buttonPalette.disabledBackground,
                  },
                ]}
                onPress={onToggleStatus}
                disabled={actionLoading === 'online' || actionLoading === 'offline'}>
                {actionLoading === 'online' || actionLoading === 'offline' ? (
                  <ActivityIndicator
                    size="small"
                    color={buttonPalette.disabledText}
                  />
                ) : (
                  <>
                    <Icon
                      name={isOnline ? 'pause-circle' : 'play-circle'}
                      size={16}
                      color={buttonPalette.primaryIcon}
                    />
                    <Text
                      style={[
                        styles.primaryButtonText,
                        { color: buttonPalette.primaryText },
                      ]}>
                      {isOnline ? 'Colocar offline' : 'Colocar online'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {connected && (
          <View style={styles.formRow}>
            <TouchableOpacity
              style={[
                styles.secondaryActionButton,
                {
                  flex: 1,
                  borderColor: buttonPalette.secondaryBorder,
                  backgroundColor: buttonPalette.secondaryBackground,
                },
              ]}
              onPress={onSyncOrders}
              disabled={actionLoading === 'sync-orders'}>
              {actionLoading === 'sync-orders' ? (
                <ActivityIndicator
                  size="small"
                  color={buttonPalette.disabledText}
                />
              ) : (
                <>
                  <Icon
                    name="refresh-cw"
                    size={15}
                    color={buttonPalette.secondaryIcon}
                  />
                  <Text
                    style={[
                      styles.secondaryActionButtonText,
                      { color: buttonPalette.secondaryText },
                    ]}>
                    Sincronizar pedidos
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryActionButton,
                {
                  flex: 1,
                  borderColor: buttonPalette.secondaryBorder,
                  backgroundColor: buttonPalette.secondaryBackground,
                },
              ]}
              onPress={onSyncTodayHistory}
              disabled={actionLoading === 'sync-history'}>
              {actionLoading === 'sync-history' ? (
                <ActivityIndicator
                  size="small"
                  color={buttonPalette.disabledText}
                />
              ) : (
                <>
                  <Icon
                    name="clock"
                    size={15}
                    color={buttonPalette.secondaryIcon}
                  />
                  <Text
                    style={[
                      styles.secondaryActionButtonText,
                      { color: buttonPalette.secondaryText },
                    ]}>
                    Histórico de hoje
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={[styles.panel, shadowStyle]}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelTitle}>Conexao da loja</Text>
            <Text style={styles.panelSubtitle}>
              Separei o vínculo manual e a desconexão para não misturar com as configurações operacionais.
            </Text>
          </View>
        </View>

        {!connected ? (
          <>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Conectar manualmente por shop_id</Text>
              <TextInput
                value={manualShopId}
                onChangeText={setManualShopId}
                placeholder="Informe o shop_id da 99Food"
                style={styles.formInput}
                placeholderTextColor={palette.textSecondary}
              />
            </View>

            <View style={styles.formRow}>
              <TouchableOpacity
                style={[
                  styles.secondaryActionButton,
                  {
                    borderColor: buttonPalette.secondaryBorder,
                    backgroundColor: buttonPalette.secondaryBackground,
                  },
                ]}
                onPress={onManualBind}
                disabled={actionLoading === 'bind-manual'}>
                {actionLoading === 'bind-manual' ? (
                  <ActivityIndicator
                    size="small"
                    color={buttonPalette.disabledText}
                  />
                ) : (
                  <>
                    <Icon
                      name="link"
                      size={15}
                      color={buttonPalette.secondaryIcon}
                    />
                    <Text
                      style={[
                        styles.secondaryActionButtonText,
                        { color: buttonPalette.secondaryText },
                      ]}>
                      Vincular shop_id
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.formRow}>
            <TouchableOpacity
              style={[styles.secondaryActionButton, styles.dangerActionButton]}
              onPress={onDisconnect}
              disabled={actionLoading === 'disconnect'}>
              {actionLoading === 'disconnect' ? (
                <ActivityIndicator size="small" color={palette.error} />
              ) : (
                <>
                  <Icon name="unlink" size={15} color={palette.error} />
                  <Text style={[styles.secondaryActionButtonText, { color: palette.error }]}>Desconectar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}
