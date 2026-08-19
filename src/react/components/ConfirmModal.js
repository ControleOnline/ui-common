import React, {useMemo} from 'react';
import {Modal, View, Text, TouchableOpacity} from 'react-native';
import {useStore} from '@store';
import createStyles from './ConfirmModal.styles';

export const ConfirmModal = ({visible, title, message, onConfirm, onCancel}) => {
  const themeStore = useStore('theme');
  const themeColors = themeStore?.getters?.colors || {};

  const palette = useMemo(
    () => ({
      modalOverlay: themeColors.modalOverlay,
      modalBackground: themeColors.modalBackground,
      modalBorder: themeColors.modalBorder,
      modalHeaderText: themeColors.modalHeaderText,
      modalText: themeColors.modalText,
      buttonBackground: themeColors.buttonBackground,
      buttonBorder: themeColors.buttonBorder,
      buttonText: themeColors.buttonText,
      buttonTextSecondary: themeColors.buttonTextSecondary,
    }),
    [
      themeColors.modalOverlay,
      themeColors.modalBackground,
      themeColors.modalBorder,
      themeColors.modalHeaderText,
      themeColors.modalText,
      themeColors.buttonBackground,
      themeColors.buttonBorder,
      themeColors.buttonText,
      themeColors.buttonTextSecondary,
    ],
  );

  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>
                {global.t?.t('confirmModal', 'button', 'cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>
                {global.t?.t('confirmModal', 'button', 'confirm')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
