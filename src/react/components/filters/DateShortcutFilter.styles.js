import { StyleSheet } from 'react-native';

const createStyles = themeColors =>
  StyleSheet.create({
    customLabel: {
      color: themeColors.textPrimary,
      fontSize: 12,
      lineHeight: 14,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    currentDateValue: {
      color: themeColors.textPrimary,
      fontSize: 12,
      lineHeight: 14,
      fontWeight: '800',
    },
    customRangeWrap: {
      marginTop: 4,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: themeColors.borderSoft,
      gap: 10,
    },
    customInputsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    customInput: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.cardBgSoft,
      color: themeColors.textPrimary,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      lineHeight: 16,
      fontWeight: '700',
    },
    validationText: {
      color: themeColors.danger,
      fontSize: 12,
      lineHeight: 14,
      fontWeight: '700',
    },
    customActionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
    },
    secondaryButton: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.panelBg,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    secondaryButtonText: {
      color: themeColors.textPrimary,
      fontSize: 12,
      lineHeight: 14,
      fontWeight: '800',
    },
    primaryButton: {
      borderRadius: 999,
      backgroundColor: themeColors.accent,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    primaryButtonText: {
      color: themeColors.pillTextDark,
      fontSize: 12,
      lineHeight: 14,
      fontWeight: '900',
    },
  });

export default createStyles;
