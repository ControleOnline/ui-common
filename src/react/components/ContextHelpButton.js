import React, {useMemo, useState} from 'react';
import {Modal, Text, TouchableOpacity, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import styles from './ContextHelpButton.styles';

const normalizeLines = value => {
  if (Array.isArray(value)) {
    return value.map(item => String(item ?? '').trim()).filter(Boolean);
  }

  return String(value ?? '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
};

const ContextHelpButton = ({
  title = '',
  message = '',
  iconName = 'help-circle-outline',
  iconColor = '#0EA5E9',
  iconSize = 16,
  accessibilityLabel = '',
}) => {
  const [visible, setVisible] = useState(false);
  const lines = useMemo(() => normalizeLines(message), [message]);
  const label = String(title || accessibilityLabel || 'Ajuda').trim();

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <MaterialCommunityIcons name={iconName} size={iconSize} color={iconColor} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>{label}</Text>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
              >
                <MaterialCommunityIcons name="close" size={16} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              {lines.map((line, index) => (
                <Text key={`${label}-${index}-${line}`} style={styles.message}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default ContextHelpButton;
