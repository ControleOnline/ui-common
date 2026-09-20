import {Platform, StyleSheet} from 'react-native';

const resolveWebShadowColor = shadowColor => {
  if (typeof shadowColor !== 'string') {
    return 'rgba(0, 0, 0, 0.12)';
  }

  const normalized = shadowColor.trim();
  if (!normalized) {
    return 'rgba(0, 0, 0, 0.12)';
  }

  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    return `${normalized[0]}${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}1f`;
  }

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return `${normalized}1f`;
  }

  if (/^#[0-9a-f]{4}$/i.test(normalized) || /^#[0-9a-f]{8}$/i.test(normalized)) {
    return normalized;
  }

  return normalized;
};

const createStyles = ({
  activeBackground,
  dockBackground,
  dockBorder,
  dockShadow,
  activeBorder,
  useModernWebChromeProps = false,
}) =>
  StyleSheet.create({
    host: {
      position: Platform.OS === 'web' ? 'fixed' : 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      backgroundColor: 'transparent',
      alignItems: 'stretch',
    },
    hostPointerEventsBoxNone: {
      pointerEvents: 'box-none',
    },
    stack: {
      width: '100%',
      alignItems: 'stretch',
    },
    dock: {
      // app-community#828: column — buttons on top, runtime footer below.
      // row was crushing nav buttons against the footer strip on the sides.
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      minHeight: 64,
      paddingHorizontal: 8,
      paddingTop: 6,
      paddingBottom: 8,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: dockBorder,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      backgroundColor: dockBackground,
      overflow: 'visible',
      ...(Platform.OS === 'android'
        ? {elevation: 10}
        : Platform.OS === 'web' && useModernWebChromeProps
          ? {
              boxShadow: `0px -6px 14px ${resolveWebShadowColor(dockShadow)}`,
            }
        : {
            shadowColor: dockShadow,
            shadowOpacity: 0.12,
            shadowOffset: {width: 0, height: -6},
            shadowRadius: 14,
          }),
    },
    footerSlot: {
      // Strip below the nav buttons (#384): text after buttons, same dock chrome
      width: '100%',
      minHeight: 24,
      paddingHorizontal: 4,
      paddingTop: 2,
      paddingBottom: 2,
      flexShrink: 0,
      zIndex: 1,
    },
    itemsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      minHeight: 52,
      flexShrink: 0,
    },
    item: {
      flex: 1,
      minWidth: 56,
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
      backgroundColor: activeBackground,
      borderColor: activeBorder,
    },
    itemPressed: {
      transform: [{scale: 0.99}],
    },
    itemDisabled: {},
    iconWrap: {
      width: 24,
      height: 24,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
      backgroundColor: 'transparent',
    },
    itemLabel: {
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

export default createStyles;
