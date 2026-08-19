import {StyleSheet} from 'react-native';

/**
 * Theme-aware styles for ConfirmModal.
 * Colors must come from themeStore.getters.colors (canonical tokens only).
 */
const createStyles = palette =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: palette.modalOverlay,
    },
    card: {
      backgroundColor: palette.modalBackground,
      padding: 20,
      borderRadius: 10,
      width: '80%',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.modalBorder,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
      color: palette.modalHeaderText,
    },
    message: {
      fontSize: 14,
      marginBottom: 20,
      color: palette.modalText,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    cancelButton: {
      padding: 10,
    },
    cancelButtonText: {
      color: palette.buttonTextSecondary,
    },
    confirmButton: {
      padding: 10,
      backgroundColor: palette.buttonBackground,
      borderRadius: 5,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.buttonBorder,
    },
    confirmButtonText: {
      color: palette.buttonText,
    },
  });

export default createStyles;
