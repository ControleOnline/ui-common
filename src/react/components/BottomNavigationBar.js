import React, {useLayoutEffect, useMemo} from 'react';
import {Pressable, Text, View} from 'react-native';
import LegacyIcon from 'react-native-vector-icons/Feather';
import HomeIcon from '@controleonline/../../src/components/HomeIcon';
import {useTheme} from './DefaultProvider';
import RuntimeInfoFooter from './RuntimeInfoFooter';
import {resolveMenuRouteParams} from '../utils/menuNavigation';
import createStyles from './BottomNavigationBar.styles';
import softenStyles from './BottomNavigationBar.soft.styles';
import {resolveHomepagePalette} from '@controleonline/../../src/styles/homepagePalette';

const BottomNavigationBar = ({
  navigation,
  items = [],
  activeRouteName,
  disabled = false,
  colors = {},
  testID = 'bottom-navigation',
  useModernWebChromeProps = false,
  appearance = 'soft',
  placement = 'overlay',
}) => {
  const Icon = appearance === 'soft' ? HomeIcon : LegacyIcon;
  colors = appearance === 'soft' ? resolveHomepagePalette(colors) : colors;
  const theme = useTheme?.() || {};
  const runtimeFooter = theme?.runtimeFooter || null;
  const registerBottomNavigation =
    theme?.bottomChrome?.registerBottomNavigation || null;
  const activeBackground = colors.navigationActiveBackground;
  const activeBorder = colors.navigationActiveBorder;
  const activeIcon = colors.navigationActiveIcon;
  const activeText = colors.navigationActiveText;
  const dockBackground = colors.navigationBackground;
  const dockBorder = colors.navigationBorder;
  const dockShadow = colors.navigationShadow;
  const inactiveIcon = colors.navigationIcon;
  const inactiveText = colors.navigationText;

  const styles = useMemo(
    () =>
      softenStyles(createStyles({
        activeBackground,
        dockBackground,
        dockBorder,
        dockShadow,
        activeBorder,
        useModernWebChromeProps,
      }), colors, appearance),
    [
      activeBackground,
      activeBorder,
      dockBackground,
      dockBorder,
      dockShadow,
      useModernWebChromeProps,
      appearance,
    ],
  );

  const resolveItemColors = ({isActive, isDisabled}) => {
    if (isActive) {
      return {
        iconColor: activeIcon,
        textColor: activeText,
      };
    }

    if (isDisabled) {
      return {
        iconColor: colors.navigationDisabledIcon,
        textColor: colors.navigationDisabledText,
      };
    }

    return {
      iconColor: inactiveIcon,
      textColor: inactiveText,
    };
  };

  const resolveItemStateStyles = ({isActive, isDisabled}) => [
    styles.item,
    isActive && styles.itemActive,
    isDisabled && styles.itemDisabled,
    isDisabled && {
      backgroundColor: colors.navigationDisabledBackground,
      borderColor: colors.navigationDisabledBorder,
    },
  ];

  const resolvePressedStyles = ({pressed, isDisabled}) =>
    pressed && !isDisabled
      ? [
          styles.itemPressed,
        ]
      : [];

  useLayoutEffect(() => {
    if (typeof registerBottomNavigation !== 'function') {
      return undefined;
    }

    return registerBottomNavigation();
  }, [registerBottomNavigation]);

  const routeItems = Array.isArray(items) ? items : [];
  const knownRoute = routeItems.some(item => item?.route === activeRouteName);
  const effectiveActiveRoute = knownRoute ? activeRouteName : '';

  const navigateTo = item => {
    try {
      navigation?.navigate?.(item?.route, resolveMenuRouteParams(item?.routeParams));
    } catch {
      // Keep the footer stable if a route is unavailable in the current app flavor.
    }
  };

  const hostProps = useModernWebChromeProps
    ? {}
    : {pointerEvents: 'box-none'};
  const hostStyle = useModernWebChromeProps
    ? [styles.host, styles.hostPointerEventsBoxNone]
    : styles.host;
  const footerProps = {
    appearance,
    appVersion: runtimeFooter?.appVersion,
    colors: appearance === 'soft'
      ? {...runtimeFooter?.colors, footerBackground: colors.footerBackground, footerText: colors.footerText}
      : runtimeFooter?.colors || {},
    mainCompany: runtimeFooter?.mainCompany,
    device: runtimeFooter?.device,
    useModernWebChromeProps,
  };

  return (
    <View {...hostProps} style={[hostStyle, placement === 'inline' ? {position: 'relative', flexShrink: 0, zIndex: 0} : null]}>
      <View style={styles.stack}>
        <View style={styles.dock} testID={testID}>
          <View style={styles.itemsRow}>
            {routeItems.map(item => {
              const isActive = effectiveActiveRoute === item.route;
              const isDisabled = disabled || item.disabled;
              const iconSize = item.iconSize || 18;
              const {iconColor, textColor} = resolveItemColors({
                isActive,
                isDisabled,
              });

              return (
                <Pressable
                  key={item.route}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{selected: isActive, disabled: Boolean(isDisabled)}}
                  disabled={isDisabled}
                  onPress={() => navigateTo(item)}
                  style={({pressed}) => [
                    ...resolveItemStateStyles({isActive, isDisabled}),
                    ...resolvePressedStyles({pressed, isDisabled}),
                  ]}>
                  <View style={styles.iconWrap}>
                    <Icon color={iconColor} name={item.icon} size={iconSize} />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.itemLabel,
                      {
                        color: textColor,
                      },
                    ]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {/* app-community#384: texto do rodapé DEPOIS dos botões (não antes) */}
          {runtimeFooter ? (
            <View style={styles.footerSlot} testID="bottom-navigation-footer-slot">
              <RuntimeInfoFooter {...footerProps} />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

export default BottomNavigationBar;
