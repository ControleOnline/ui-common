import React, {useLayoutEffect, useMemo} from 'react';
import {Pressable, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {useTheme} from './DefaultProvider';
import RuntimeInfoFooter from './RuntimeInfoFooter';
import {resolveMenuRouteParams} from '@controleonline/ui-layout/src/react/utils/menuNavigation';
import createStyles from './BottomNavigationBar.styles';

const BottomNavigationBar = ({
  navigation,
  items = [],
  activeRouteName,
  disabled = false,
  colors = {},
  testID = 'bottom-navigation',
}) => {
  const theme = useTheme?.() || {};
  const runtimeFooter = theme?.runtimeFooter || null;
  const registerBottomNavigation =
    theme?.bottomChrome?.registerBottomNavigation || null;
  const primaryColor = colors.primary || '#1B5587';
  const dockBackground =
    colors['toolbar-background'] || colors.background || '#F8FBFF';
  const borderColor = colors['toolbar-border'] || colors.border || '#D1DDE9';
  const inactiveText =
    colors['toolbar-text-muted'] || colors.textSecondary || '#64748B';
  const activeBg = `${primaryColor}1A`;
  const activeBorder = `${primaryColor}55`;

  const styles = useMemo(
    () =>
      createStyles({
        primaryColor,
        dockBackground,
        borderColor,
        inactiveText,
        activeBg,
        activeBorder,
      }),
    [
      activeBg,
      activeBorder,
      borderColor,
      dockBackground,
      inactiveText,
      primaryColor,
    ],
  );

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

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <View style={styles.stack}>
        <View accessibilityRole="navigation" style={styles.dock} testID={testID}>
          {routeItems.map(item => {
            const isActive = effectiveActiveRoute === item.route;
            const isDisabled = disabled || item.disabled;
            const iconSize = item.iconSize || 18;
            const iconColor = isActive ? primaryColor : inactiveText;

            return (
              <Pressable
                key={item.route}
                accessibilityRole="button"
                disabled={isDisabled}
                onPress={() => navigateTo(item)}
                style={({pressed}) => [
                  styles.item,
                  isActive && styles.itemActive,
                  pressed && !isDisabled && styles.itemPressed,
                  isDisabled && styles.itemDisabled,
                ]}>
                <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                  <Icon color={iconColor} name={item.icon} size={iconSize} />
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.itemLabel, isActive && styles.itemLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {runtimeFooter && (
          <RuntimeInfoFooter
            appVersion={runtimeFooter.appVersion}
            colors={runtimeFooter.colors || colors}
            defaultCompany={runtimeFooter.defaultCompany}
            device={runtimeFooter.device}
          />
        )}
      </View>
    </View>
  );
};

export default BottomNavigationBar;
