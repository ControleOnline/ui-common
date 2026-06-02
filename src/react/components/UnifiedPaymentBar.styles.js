import {StyleSheet} from 'react-native';

const withAlpha = (hex, alpha) => {
  const normalized = String(hex || '').trim();
  if (
    !normalized.startsWith('#') ||
    (normalized.length !== 7 && normalized.length !== 4)
  ) {
    return hex;
  }

  if (normalized.length === 4) {
    const [r, g, b] = normalized.slice(1).split('');
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }

  return `${normalized}${alpha}`;
};

export const resolveActionPalette = (
  theme,
  variant = 'primary',
  disabled = false,
) => {
  const primaryColor = theme?.primary;
  const successColor = theme?.success;
  const surfaceColor = theme?.surface;
  const borderColor = theme?.cardBorder;
  const mutedColor = theme?.muted;

  const palettes = {
    primary: {
      backgroundColor: primaryColor,
      borderColor: primaryColor,
      textColor: theme?.onPrimary,
    },
    success: {
      backgroundColor: successColor,
      borderColor: successColor,
      textColor: '#FFFFFF',
    },
    outline: {
      backgroundColor: surfaceColor,
      borderColor,
      textColor: theme?.text,
    },
  };

  const palette = palettes[variant] || palettes.primary;

  if (!disabled) {
    return palette;
  }

  return {
    backgroundColor: withAlpha(palette.backgroundColor, '66'),
    borderColor: withAlpha(palette.borderColor, '66'),
    textColor: withAlpha(palette.textColor || mutedColor, 'B3'),
  };
};

const createStyles = theme =>
  StyleSheet.create({
    wrapper: {
      position: 'absolute',
      left: 12,
      right: 12,
      zIndex: 60,
    },
    card: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme?.cardBorder,
      backgroundColor: theme?.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      shadowColor: '#0F172A',
      shadowOpacity: 0.16,
      shadowRadius: 10,
      shadowOffset: {width: 0, height: 4},
      elevation: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    headerRowCompact: {
      justifyContent: 'flex-end',
    },
    title: {
      color: theme?.text,
      fontSize: 16,
      fontWeight: '800',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '800',
    },
    metricsRow: {
      marginTop: 12,
      width: '100%',
    },
    metricCard: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme?.cardBorder,
      backgroundColor: theme?.background,
      paddingHorizontal: 10,
      paddingVertical: 9,
    },
    metricCardSingle: {
      flex: 1,
      alignSelf: 'stretch',
    },
    metricLabel: {
      color: theme?.muted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    metricValue: {
      marginTop: 4,
      color: theme?.text,
      fontSize: 14,
      fontWeight: '800',
    },
    metricValueStrong: {
      color: theme?.primary,
    },
    actionsRow: {
      marginTop: 12,
      flexDirection: 'row',
      gap: 10,
    },
    actionsRowSingle: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    actionButton: {
      flex: 1,
      flexBasis: 0,
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
    },
    actionButtonSingle: {
      flex: 0,
      width: '100%',
      alignSelf: 'stretch',
    },
    actionLabel: {
      fontSize: 14,
      fontWeight: '800',
    },
  });

export default createStyles;
