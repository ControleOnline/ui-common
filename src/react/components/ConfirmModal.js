import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import styles from './ConfirmModal.styles';

export const ConfirmModal = ({ visible, title, message, onConfirm, onCancel }) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
              <Text>{global.t?.t('confirmModal', 'button', 'cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>{global.t?.t('confirmModal', 'button', 'confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
