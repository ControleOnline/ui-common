import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {PDV_DEVICE_TYPE} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {
  findDeviceConfigByType,
  isCurrentDeviceGroup,
} from '../currentDevice';
import {withOpacity} from '@controleonline/../../src/styles/branding';
import {
  getDeviceConfigType,
  isManagedNetworkDeviceType,
  normalizeDeviceId,
  getDeviceListIdentifier,
  getDeviceTypeAccent,
  getDeviceBadgeLabel,
  getDeviceIconName,
  getDeviceItemTypeLabel,
  getPrinterConnectivityMeta,
  getPosStatusLabel,
  getPosOperationModeLabel,
  isPdvPrinterEnabled,
  isPosDeviceOpen,
  parseConfigsObject,
  tt,
} from './deviceListHelpers';
import styles from '../../Devices.styles';

export default function DeviceGroupCard({
  item: deviceGroup,
  brandColors,
  creatingPdv,
  goToDetail,
  handleCreateCurrentPdv,
  networkConnectivityByDevice,
  queryTypes = [],
  runtimeDeviceIdentifier,
  runtimeDeviceType,
  showCurrentPdvSetup,
}) {
        const isCurrentDevice = isCurrentDeviceGroup({
          deviceGroup,
          runtimeDeviceIdentifier,
        });
        const sessionConfig = isCurrentDevice
          ? findDeviceConfigByType(deviceGroup, runtimeDeviceType)
          : null;
        const filteredTypeConfig =
          queryTypes.length === 1
            ? findDeviceConfigByType(deviceGroup, queryTypes[0])
            : null;
        const primaryConfig =
          sessionConfig ||
          filteredTypeConfig ||
          deviceGroup.deviceConfigs[0] ||
          null;
        const normalizedType = primaryConfig
          ? getDeviceConfigType(primaryConfig)
          : runtimeDeviceType || 'DEVICE';
        const isManagedNetwork =
          primaryConfig && isManagedNetworkDeviceType(normalizedType);
        const isPdv = normalizedType === PDV_DEVICE_TYPE;
        const alias =
          deviceGroup.device?.alias ||
          deviceGroup.device?.device ||
          'Dispositivo';
        const deviceIdentifier = primaryConfig
          ? getDeviceListIdentifier(primaryConfig)
          : String(deviceGroup.device?.device || runtimeDeviceIdentifier).trim();
        const deviceKey = normalizeDeviceId(
          deviceGroup.device?.device ||
            deviceGroup.device?.id ||
            deviceGroup.key,
        );
        const accent = getDeviceTypeAccent(normalizedType);
        const metaChips = [];

        if (isPdv && primaryConfig) {
          const posOperationModeLabel = getPosOperationModeLabel(
            primaryConfig?.configs,
          );

          if (posOperationModeLabel) {
            metaChips.push(posOperationModeLabel);
          }

          metaChips.push(
            `Impressora ${isPdvPrinterEnabled(primaryConfig) ? 'Sim' : 'Nao'}`,
          );
          metaChips.push(getPosStatusLabel(primaryConfig));
        }

        if (isManagedNetwork) {
          metaChips.push(
            getPrinterConnectivityMeta(
              networkConnectivityByDevice?.[deviceKey]?.status,
            ).label,
          );
        }

        return (
          <View
            testID={`device-group-${deviceGroup.key}`}
            accessibilityLabel={
              isCurrentDevice
                ? `${alias}, ${tt('device_label', 'currentDevice') || 'Este dispositivo'}`
                : alias
            }
            style={[
              styles.deviceCard,
              isCurrentDevice && styles.deviceCardCurrent,
            ]}>
            <View style={styles.cardLeft}>
              <View
                style={[
                  styles.iconBox,
                  {backgroundColor: withOpacity(accent, 0.1)},
                ]}>
                <Icon
                  name={getDeviceIconName(normalizedType)}
                  size={18}
                  color={accent}
                />
              </View>
              <View style={styles.cardTextWrap}>
                {isCurrentDevice ? (
                  <View
                    testID="current-device-badge"
                    style={styles.currentDeviceBadge}>
                    <Icon
                      name="crosshair"
                      size={11}
                      color={
                        brandColors.badgeSelectedText ||
                        brandColors.cardSelectedText ||
                        brandColors.primary
                      }
                    />
                    <Text style={styles.currentDeviceBadgeText}>
                      {tt('device_label', 'currentDevice') ||
                        'Este dispositivo'}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.deviceTitle} numberOfLines={1}>
                  {alias}
                </Text>
                <Text style={styles.deviceSub} numberOfLines={1}>
                  {deviceIdentifier}
                </Text>

                <View style={styles.deviceConfigRow}>
                  {deviceGroup.deviceConfigs.map(deviceConfig => {
                    const configType = getDeviceConfigType(deviceConfig);
                    const configAccent = getDeviceTypeAccent(configType);
                    const isSessionConfig =
                      isCurrentDevice &&
                      runtimeDeviceType &&
                      configType === runtimeDeviceType;

                    return (
                      <TouchableOpacity
                        key={String(deviceConfig.id)}
                        testID={`device-config-${deviceConfig.id}`}
                        dataSet={{
                          sessionConfig: isSessionConfig ? 'true' : 'false',
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${getDeviceItemTypeLabel(configType)}${
                          isSessionConfig ? ', Em uso nesta sessao' : ''
                        }`}
                        activeOpacity={0.82}
                        style={[
                          styles.deviceConfigChip,
                          {
                            backgroundColor: withOpacity(configAccent, 0.1),
                            borderColor: withOpacity(configAccent, 0.45),
                          },
                          isSessionConfig && styles.deviceConfigChipActive,
                        ]}
                        onPress={() => goToDetail(deviceConfig)}>
                        <View
                          style={[
                            styles.dot,
                            {backgroundColor: configAccent},
                          ]}
                        />
                        <Text
                          style={[
                            styles.deviceConfigChipText,
                            {color: configAccent},
                          ]}>
                          {getDeviceBadgeLabel(configType, deviceConfig)}
                        </Text>
                        {isSessionConfig ? (
                          <Text style={styles.deviceConfigChipActiveText}>
                            {tt('device_label', 'inUse') || 'Em uso'}
                          </Text>
                        ) : null}
                        <Icon
                          name="chevron-right"
                          size={13}
                          color={configAccent}
                        />
                      </TouchableOpacity>
                    );
                  })}

                  {isCurrentDevice && showCurrentPdvSetup ? (
                    <TouchableOpacity
                      testID="configure-current-device-pdv"
                      accessibilityRole="button"
                      accessibilityLabel={
                        tt('device_action', 'configureCurrentAsPdv') ||
                        'Configurar este dispositivo como PDV'
                      }
                      activeOpacity={0.82}
                      disabled={creatingPdv}
                      style={[
                        styles.deviceConfigCreateChip,
                        creatingPdv &&
                          styles.currentPdvSetupButtonDisabled,
                      ]}
                      onPress={handleCreateCurrentPdv}>
                      <Icon
                        name="plus-circle"
                        size={15}
                        color={brandColors.buttonText || brandColors.white}
                      />
                      <Text style={styles.deviceConfigCreateChipText}>
                        {creatingPdv
                          ? tt('device_action', 'configuringPdv') ||
                            'Configurando...'
                          : tt('device_action', 'configureAsPdv') ||
                            'Configurar como PDV'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {metaChips.length > 0 ? (
                  <View style={styles.deviceMetaRow}>
                    {metaChips.map(chipLabel => (
                      <View key={chipLabel} style={styles.deviceMetaChip}>
                        <Text style={styles.deviceMetaChipText}>
                          {chipLabel}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        );
      
}
