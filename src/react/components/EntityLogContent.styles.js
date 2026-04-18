import { StyleSheet } from 'react-native';

const withAlpha = (hexColor, alphaHex) => {
  const normalized = String(hexColor || '').trim();
  if (!/^#([A-Fa-f0-9]{6})$/.test(normalized)) {
    return hexColor || '#2563EB';
  }

  return `${normalized}${alphaHex}`;
};

const createStyles = palette => {
  const accent = palette?.accent || '#2563EB';

  return StyleSheet.create({
    modalSheetRoot: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'transparent',
    },
    modalSheetBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15, 23, 42, 0.46)',
    },
    modalSheetWrap: {
      width: '100%',
      justifyContent: 'flex-end',
    },
    modalCard: {
      width: '100%',
      maxHeight: '86%',
      minHeight: 320,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 14,
    },
    eyebrow: {
      color: accent,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    title: {
      color: palette.textPrimary,
      fontSize: 24,
      fontWeight: '900',
    },
    subtitle: {
      color: palette.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 4,
    },
    closeButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      gap: 12,
      paddingBottom: 20,
    },
    stateBox: {
      minHeight: 120,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 18,
    },
    stateTitle: {
      color: palette.textPrimary,
      fontSize: 16,
      fontWeight: '800',
      textAlign: 'center',
    },
    stateText: {
      color: palette.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 19,
    },
    branchCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceSoft,
      overflow: 'hidden',
    },
    branchHeader: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      backgroundColor: withAlpha(accent, '10'),
    },
    branchHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    branchTitleWrap: {
      flex: 1,
    },
    branchTitle: {
      color: palette.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    branchMeta: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 3,
    },
    branchBody: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 12,
    },
    entityStateCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 14,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    entityStateText: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    entitySummaryCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 12,
    },
    entitySummaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    entitySummaryBody: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      flexWrap: 'wrap',
    },
    entityPreviewImage: {
      width: 88,
      height: 88,
      borderRadius: 14,
      backgroundColor: palette.surfaceSoft,
    },
    entitySummaryGrid: {
      flex: 1,
      minWidth: 180,
      gap: 8,
    },
    entitySummaryField: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceSoft,
      paddingHorizontal: 10,
      paddingVertical: 9,
      gap: 4,
    },
    entitySummaryLabel: {
      color: palette.textSecondary,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    entitySummaryValue: {
      color: palette.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
    },
    entityStateErrorText: {
      color: '#DC2626',
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 18,
    },
    relationSection: {
      gap: 8,
    },
    sectionTitle: {
      color: accent,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    relationButton: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 12,
      paddingVertical: 11,
      gap: 2,
    },
    relationButtonHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    relationButtonLabel: {
      color: palette.textPrimary,
      fontSize: 14,
      fontWeight: '700',
      flex: 1,
    },
    relationButtonMeta: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 18,
    },
    relationCollectionWrap: {
      gap: 8,
    },
    nestedWrap: {
      borderLeftWidth: 2,
      borderLeftColor: withAlpha(accent, '33'),
      marginLeft: 8,
      paddingLeft: 12,
      gap: 10,
    },
    logList: {
      gap: 10,
    },
    logCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 10,
    },
    logMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      flexWrap: 'wrap',
    },
    logMetaLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
      flex: 1,
    },
    actionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
    },
    actionText: {
      fontSize: 12,
      fontWeight: '800',
    },
    logDate: {
      color: palette.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    logUser: {
      color: palette.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    changeRow: {
      gap: 6,
    },
    changeLabel: {
      color: accent,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    changeValuesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    changeValueBox: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: palette.surfaceSoft,
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: palette.border,
    },
    changeValueTitle: {
      color: palette.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    changeValueText: {
      color: palette.textPrimary,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },
    arrowWrap: {
      width: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyInlineText: {
      color: palette.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
  });
};

export const buildEntityLogPalette = theme => ({
  accent: theme?.accentInfo || theme?.primary || '#2563EB',
  border: theme?.border || '#E2E8F0',
  surface: theme?.modalBg || '#FFFFFF',
  surfaceSoft: theme?.cardBgSoft || '#F8FAFC',
  textPrimary: theme?.textPrimary || '#0F172A',
  textSecondary: theme?.textSecondary || '#64748B',
});

export default createStyles;
