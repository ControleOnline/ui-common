import { StyleSheet } from 'react-native';

const createStyles = themeColors =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 6,
      backgroundColor: themeColors.appBg,
    },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: themeColors.borderSoft,
      backgroundColor: themeColors.cardBg,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 8,
    },
    title: {
      color: themeColors.textPrimary,
      fontSize: 12,
      lineHeight: 14,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    currentDateWrap: {
      alignItems: 'flex-end',
      justifyContent: 'center',
      flexShrink: 1,
    },
    currentDateLabel: {
      color: themeColors.textSecondary,
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    currentDateValue: {
      color: themeColors.textPrimary,
      fontSize: 12,
      lineHeight: 14,
      fontWeight: '900',
      textAlign: 'right',
    },
    chipsRow: {
      paddingRight: 2,
      gap: 8,
    },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.cardBgSoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    chipActive: {
      borderColor: themeColors.accent,
      backgroundColor: themeColors.isLight ? themeColors.panelBg : themeColors.accent,
    },
    chipText: {
      color: themeColors.textSecondary,
      fontSize: 12,
      lineHeight: 14,
      fontWeight: '800',
    },
    chipTextActive: {
      color: themeColors.isLight ? themeColors.accent : themeColors.pillTextDark,
    },
    customRangeWrap: {
      marginTop: 10,
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
