import {Platform, StyleSheet} from 'react-native';

const withAlpha = (color, alphaHex) => {
  const raw = String(color || '').trim().replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw}${alphaHex}`;
  }

  if (/^[0-9a-fA-F]{8}$/.test(raw)) {
    return `#${raw.slice(0, 6)}${alphaHex}`;
  }

  return color || '#1B5587';
};

const createStyles = ({
  primaryColor,
  dockBackground,
  borderColor,
  inactiveText,
  activeBg,
  activeBorder,
  insets,
}) =>
  StyleSheet.create({
    host: {
      position: Platform.OS === 'web' ? 'fixed' : 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      backgroundColor: 'transparent',
      paddingBottom: Math.max(Number(insets?.bottom) || 0, 4),
    },
    dock: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 64,
      paddingHorizontal: 8,
      paddingTop: 8,
      paddingBottom: 8,
      borderWidth: 1,
      borderColor,
      borderRadius: 24,
      backgroundColor: dockBackground,
      overflow: 'hidden',
      ...(Platform.OS === 'android'
        ? {elevation: 10}
        : {
            shadowColor: '#0F172A',
            shadowOpacity: 0.12,
            shadowOffset: {width: 0, height: -6},
            shadowRadius: 14,
          }),
    },
    item: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      paddingHorizontal: 4,
      borderWidth: 1,
      borderColor: 'transparent',
      borderRadius: 18,
    },
    itemActive: {
      backgroundColor: activeBg,
      borderColor: activeBorder,
    },
    itemPressed: {
      opacity: 0.92,
      transform: [{scale: 0.99}],
    },
    itemDisabled: {
      opacity: 0.45,
    },
    iconWrap: {
      width: 24,
      height: 24,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
      backgroundColor: 'transparent',
    },
    iconWrapActive: {
      backgroundColor: withAlpha(primaryColor, '18'),
    },
    itemLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: inactiveText,
      textAlign: 'center',
    },
    itemLabelActive: {
      color: primaryColor,
      fontWeight: '800',
    },
  });

export default createStyles;
