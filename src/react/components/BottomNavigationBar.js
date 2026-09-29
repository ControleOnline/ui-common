import React, {useLayoutEffect, useMemo} from 'react';
import {Platform, Pressable, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {useTheme} from './DefaultProvider';
import RuntimeInfoFooter from './RuntimeInfoFooter';
import {resolveMenuRouteParams} from '../utils/menuNavigation';
import createStyles from './BottomNavigationBar.styles';

const BottomNavigationBar = ({
  navigation,
  items = [],
  activeRouteName,
  disabled = false,
  colors = {},
  testID = 'bottom-navigation',
  useModernWebChromeProps = false,
}) => {
  const theme = useTheme?.() || {};
  const insets = useSafeAreaInsets();
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
      createStyles({
        activeBackground,
        dockBackground,
        dockBorder,
        dockShadow,
        activeBorder,
        useModernWebChromeProps,
      }),
    [
      activeBackground,
      activeBorder,
      dockBackground,
      dockBorder,
      dockShadow,
      useModernWebChromeProps,
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
  const effectiveActiveRoute = knownRoute
    ? activeRouteName
    : routeItems[0]?.route || '';

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
    appVersion: runtimeFooter?.appVersion,
    colors: runtimeFooter?.colors || {},
    mainCompany: runtimeFooter?.mainCompany,
    device: runtimeFooter?.device,
    useModernWebChromeProps,
    embedded: true,
  };

  // app-community#936: lift the whole dock above the system inset (native).
  // Padding the dock with insets.bottom painted empty chrome under the device
  // line; offsetting host.bottom keeps the strip flush and leaves the gesture
  // area transparent outside the dock.
  const hostBottomOffset =
    Platform.OS === 'web' ? 0 : Math.max(Number(insets?.bottom) || 0, 0);
  const dockPaddingBottom = Platform.OS === 'web' ? 8 : 4;

  return (
    <View
      {...hostProps}
      style={[hostStyle, hostBottomOffset ? {bottom: hostBottomOffset} : null]}>
      <View style={styles.stack}>
        <View
          style={[styles.dock, {paddingBottom: dockPaddingBottom}]}
          testID={testID}>
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
