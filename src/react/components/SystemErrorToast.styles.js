import {StyleSheet} from 'react-native';

/**
 * Theme-aware styles for SystemErrorToast.
 * Colors must come from themeStore.getters.colors (canonical tokens only).
 */
const createStyles = palette =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 2,
    },
    header: {
      paddingTop: 1,
    },
    iconWrap: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: palette.toastDangerBackground,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      borderWidth: 1,
      borderColor: palette.toastDangerBorder,
    },
    copyWrap: {
      flex: 1,
      minWidth: 0,
      paddingTop: 2,
    },
    text: {
      color: palette.toastDangerText,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 20,
    },
  });

export default createStyles;
