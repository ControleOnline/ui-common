import {Platform, StyleSheet} from 'react-native';

const createStyles = ({
  activeBackground,
  dockBackground,
  dockBorder,
  dockShadow,
  activeBorder,
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
    stack: {
      width: '100%',
      alignItems: 'stretch',
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
      borderBottomWidth: 0,
      borderColor: dockBorder,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      backgroundColor: dockBackground,
      overflow: 'hidden',
      ...(Platform.OS === 'android'
        ? {elevation: 10}
        : {
            shadowColor: dockShadow,
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
