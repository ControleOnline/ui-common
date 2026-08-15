import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {useStore, useStores} from '@store';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY,
  isTruthyValue,
  parseConfigsObject,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  getRuntimeFooterDebugInfo,
  getRuntimeFooterPrimaryText,
  getRuntimeFooterRotationEntries,
  getRuntimeFooterText,
  getRuntimeFooterTextLines,
} from '@controleonline/ui-common/src/react/utils/runtimeFooter';
import styles from './RuntimeInfoFooter.styles';

const ROTATION_INTERVAL_MS = 4000;
const FADE_DURATION_MS = 260;
const COMPACT_BREAKPOINT = 720;
const MAX_INLINE_TEXT_LENGTH = 84;

const RuntimeInfoFooter = ({
  appVersion,
  defaultCompany,
  device,
  colors,
  useModernWebChromeProps = false,
}) => {
  const {width} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const fadeOpacity = useRef(new Animated.Value(1)).current;
  const allStores = useStores(state => state);
  const deviceConfigStore = useStore('device_config');
  const runtimeDebugStore = useStore('runtime_debug');
  const deviceConfigItem = deviceConfigStore?.getters?.item || {};
  const runtimeDebugSummary = runtimeDebugStore?.getters?.summary || {};

  const footerDebugInfo = useMemo(
    () =>
      getRuntimeFooterDebugInfo({
        device,
        appVersion,
        deviceConfig: deviceConfigItem,
      }),
    [appVersion, device, deviceConfigItem],
  );
  const primaryText = useMemo(
    () =>
      footerDebugInfo.primaryText ||
      getRuntimeFooterPrimaryText({
        device,
        appVersion,
        deviceConfig: deviceConfigItem,
      }),
    [appVersion, device, deviceConfigItem, footerDebugInfo.primaryText],
  );
  const companyFooterText = useMemo(
    () => getRuntimeFooterText(defaultCompany),
    [defaultCompany?.configs],
  );
  const footerTextLines = useMemo(
    () => getRuntimeFooterTextLines(companyFooterText),
    [companyFooterText],
  );
  const deviceConfigs = useMemo(
    () => parseConfigsObject(deviceConfigItem?.configs),
    [deviceConfigItem?.configs],
  );
  const showDebugInfo = useMemo(
    () =>
      isTruthyValue(
        deviceConfigs?.[DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY],
      ),
    [deviceConfigs],
  );

  const rotationEntries = useMemo(
    () =>
      getRuntimeFooterRotationEntries({
        companyFooterText,
        primaryText,
      }),
    [companyFooterText, primaryText],
  );
  const inlineText = useMemo(
    () => [primaryText, ...footerTextLines].filter(Boolean).join('  •  '),
    [footerTextLines, primaryText],
  );
  // Always rotate when there is more than one entry (e.g. 1 footer line + primaryText).
  // Do not fall back to concatenated inlineText in that case.
  const shouldRotate =
    !showDebugInfo && rotationEntries.length > 1;
  const footerEntries = useMemo(
    () =>
      Object.values(runtimeDebugSummary?.entries || {})
        .filter(entry => entry && Array.isArray(entry.lines) && entry.lines.length > 0)
        .sort((left, right) => {
          const leftOrder = Number(left?.order || 100);
          const rightOrder = Number(right?.order || 100);
          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }

          const leftTime = Date.parse(left?.updatedAt || '');
          const rightTime = Date.parse(right?.updatedAt || '');
          if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
            return rightTime - leftTime;
          }

          if (Number.isFinite(rightTime)) {
            return 1;
          }

          if (Number.isFinite(leftTime)) {
            return -1;
          }

          return 0;
        }),
    [runtimeDebugSummary?.entries],
  );
  const socketEntry = useMemo(
    () => footerEntries.find(entry => entry?.key === 'socket') || null,
    [footerEntries],
  );
  const debugLines = useMemo(
    () => footerEntries.flatMap(entry => entry?.lines || []),
    [footerEntries],
  );
  const socketIndicatorColor = useMemo(() => {
    const indicatorTone = String(socketEntry?.indicatorTone || '').trim();
    if (!indicatorTone) {
      return undefined;
    }

    if (indicatorTone === 'success') {
      return colors?.success;
    }

    if (indicatorTone === 'warning') {
      return colors?.warning;
    }

    if (indicatorTone === 'error') {
      return colors?.error;
    }

    return undefined;
  }, [colors?.error, colors?.success, colors?.warning, socketEntry?.indicatorTone]);
  const hasStoreLoading = useMemo(
    () =>
      Object.values(allStores || {}).some(
        store =>
          store?.getters?.isLoading === true ||
          store?.getters?.isSaving === true,
      ),
    [allStores],
  );
  const bottomInset = Math.max(Number(insets.bottom) || 0, 16);

  useEffect(() => {
    if (!shouldRotate || rotationEntries.length <= 1) {
      setActiveIndex(0);
      fadeOpacity.stopAnimation();
      fadeOpacity.setValue(1);
      return;
    }

    let timeoutId;
    let cancelled = false;

    const scheduleTransition = () => {
      timeoutId = setTimeout(() => {
        Animated.timing(fadeOpacity, {
          toValue: 0,
          duration: FADE_DURATION_MS,
          useNativeDriver: true,
        }).start(({finished}) => {
          if (!finished || cancelled) {
            return;
          }

          setActiveIndex(current => (current + 1) % rotationEntries.length);

          Animated.timing(fadeOpacity, {
            toValue: 1,
            duration: FADE_DURATION_MS,
            useNativeDriver: true,
          }).start(({finished: fadeInFinished}) => {
            if (fadeInFinished && !cancelled) {
              scheduleTransition();
            }
          });
        });
      }, ROTATION_INTERVAL_MS);
    };

    fadeOpacity.setValue(1);
    scheduleTransition();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      fadeOpacity.stopAnimation();
    };
  }, [fadeOpacity, rotationEntries.length, shouldRotate]);

  if (rotationEntries.length === 0 && !showDebugInfo) {
    return null;
  }

  const displayedText = shouldRotate
    ? rotationEntries[activeIndex]
    : inlineText;
  const backgroundColor = colors?.footerBackground;
  const borderColor = colors?.footerBorder;
  const textColor = colors?.footerText;
  const loadingColor = colors?.footerLink;
  const shellProps = useModernWebChromeProps ? {} : {pointerEvents: 'none'};
  const shellStyle = useModernWebChromeProps
    ? [styles.shell, {pointerEvents: 'none'}]
    : styles.shell;

  return (
    <View {...shellProps} style={shellStyle}>
      <View
        testID="runtime-info-footer"
        style={[
          styles.container,
          showDebugInfo ? styles.containerExpanded : null,
          {
            backgroundColor,
            borderTopColor: borderColor,
            paddingBottom: bottomInset,
          },
        ]}>
        <View style={styles.primaryRow}>
          <View style={styles.statusDotWrap}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: socketIndicatorColor,
                },
              ]}
            />
          </View>
          <Animated.Text
            numberOfLines={1}
            ellipsizeMode="tail"
            minimumFontScale={0.85}
            style={[
              styles.primaryText,
              {
                opacity: showDebugInfo ? 1 : fadeOpacity,
              },
              {
                color: textColor,
              },
            ]}>
            {showDebugInfo ? inlineText || primaryText || device?.id || '--' : displayedText}
          </Animated.Text>
          <View style={styles.loadingWrap}>
            {hasStoreLoading && (
              <ActivityIndicator color={loadingColor} size="small" />
            )}
          </View>
        </View>

        {showDebugInfo &&
          debugLines.map((line, index) => (
            <Text
              key={`runtime-debug-line-${index}`}
              numberOfLines={1}
              ellipsizeMode="tail"
              minimumFontScale={0.82}
              style={[
                styles.debugText,
                {
                  color: textColor,
                },
              ]}>
              {line}
            </Text>
          ))}
      </View>
    </View>
  );
};

export default RuntimeInfoFooter;
