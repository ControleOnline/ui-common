import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {
  buildSourceDeviceOptions,
  listCopyableConfigKeys,
} from '@controleonline/ui-common/src/react/utils/copyDeviceConfigs';
import styles from './CopyDeviceConfigModal.styles';

const tt = (type, key) => global.t?.t('configs', type, key);

export default function CopyDeviceConfigModal({
  visible,
  onClose,
  onConfirm,
  companyDeviceConfigs = [],
  companyId,
  destinationDeviceString,
  destinationAlias,
  loading = false,
  confirming = false,
}) {
  const [selectedDeviceString, setSelectedDeviceString] = useState(null);

  const options = useMemo(
    () =>
      buildSourceDeviceOptions({
        companyDeviceConfigs,
        companyId,
        destinationDeviceString,
      }),
    [companyDeviceConfigs, companyId, destinationDeviceString],
  );

  const selected = useMemo(
    () => options.find(o => o.deviceString === selectedDeviceString) || null,
    [options, selectedDeviceString],
  );

  const selectedKeys = useMemo(() => {
    if (!selected) {
      return [];
    }
    const keys = new Set();
    selected.configs.forEach(row => {
      listCopyableConfigKeys(row?.configs).forEach(k => keys.add(k));
    });
    return Array.from(keys).sort();
  }, [selected]);

  const selectedTypes = useMemo(() => {
    if (!selected) {
      return [];
    }
    return Array.from(
      new Set(
        selected.configs
          .map(row => String(row?.type || '').trim().toUpperCase())
          .filter(Boolean),
      ),
    ).sort();
  }, [selected]);

  const handleClose = () => {
    if (confirming) {
      return;
    }
    setSelectedDeviceString(null);
    onClose?.();
  };

  const handleConfirm = () => {
    if (!selected || confirming) {
      return;
    }
    onConfirm?.(selected);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card} testID="copy-device-config-modal">
          <View style={styles.header}>
            <Text style={styles.title}>
              {tt('device_action', 'copyConfigTitle') || 'Copiar configurações'}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              disabled={confirming}
              accessibilityLabel="Fechar">
              <Icon name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.message} testID="copy-device-config-hint">
            {tt('device_action', 'copyConfigHint') ||
              `Escolha o device origem. As configurações serão aplicadas em "${
                destinationAlias || destinationDeviceString || 'destino'
              }" (identidade do destino não muda).`}
          </Text>

          {loading ? (
            <ActivityIndicator style={styles.loader} color="#0EA5E9" />
          ) : options.length === 0 ? (
            <Text style={styles.empty}>
              {tt('device_action', 'copyConfigEmpty') ||
                'Nenhum outro device na empresa para copiar.'}
            </Text>
          ) : (
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {options.map(option => {
                const isSelected = option.deviceString === selectedDeviceString;
                return (
                  <TouchableOpacity
                    key={option.deviceString}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => setSelectedDeviceString(option.deviceString)}
                    disabled={confirming}
                    activeOpacity={0.8}
                    testID={`copy-device-config-option-${option.deviceString}`}>
                    <View style={styles.optionTextBlock}>
                      <Text style={styles.optionAlias} numberOfLines={1}>
                        {option.alias}
                      </Text>
                      <Text style={styles.optionMeta} numberOfLines={1}>
                        {option.deviceString}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Icon name="check-circle" size={18} color="#0EA5E9" />
                    ) : (
                      <Icon name="circle" size={18} color="#CBD5E1" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {selected ? (
            <View style={styles.preview} testID="copy-device-config-preview">
              <Text style={styles.previewTitle}>
                {tt('device_action', 'copyConfigPreview') ||
                  'Será sobrescrito no destino:'}
              </Text>
              <Text style={styles.previewLine}>
                Tipos: {selectedTypes.join(', ') || '—'}
              </Text>
              <Text style={styles.previewLine} numberOfLines={4}>
                Chaves: {selectedKeys.length ? selectedKeys.join(', ') : '(vazio)'}
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.cancelButton}
              disabled={confirming}>
              <Text style={styles.cancelText}>
                {tt('device_action', 'cancel') || 'Cancelar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={[
                styles.confirmButton,
                (!selected || confirming) && styles.confirmDisabled,
              ]}
              disabled={!selected || confirming}
              testID="copy-device-config-confirm">
              {confirming ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmText}>
                  {tt('device_action', 'copyConfigConfirm') ||
                    'Copiar e sobrescrever'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
