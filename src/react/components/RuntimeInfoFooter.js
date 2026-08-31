import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Platform,
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
import RuntimeFooterMarqueeText from './RuntimeFooterMarqueeText';

const ROTATION_INTERVAL_MS = 4000;
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
  const peopleStore = useStore('people');
  const configsStore = useStore('configs');
  const currentCompany = peopleStore?.getters?.currentCompany || {};
  const storeDefaultCompany = peopleStore?.getters?.defaultCompany || {};
  const companyConfigs = configsStore?.getters?.items;
  const companyFooterText = useMemo(() => {
    const candidates = [
      getRuntimeFooterText(currentCompany),
      getRuntimeFooterText(storeDefaultCompany),
      getRuntimeFooterText(defaultCompany),
      getRuntimeFooterText(null, companyConfigs),
      getRuntimeFooterText(null, deviceConfigItem?.configs),
    ];
    return candidates.find(Boolean) || '';
  }, [
    companyConfigs,
    currentCompany?.configs,
    defaultCompany?.configs,
    deviceConfigItem?.configs,
    storeDefaultCompany?.configs,
  ]);
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
  const bottomInset =
    Platform.OS === 'web'
      ? 0
      : Math.max(Number(insets.bottom) || 0, 16);

  useEffect(() => {
    if (!shouldRotate || rotationEntries.length <= 1) {
      setActiveIndex(0);
      return undefined;
    }

    let timeoutId;
    let cancelled = false;

    const scheduleTransition = () => {
      timeoutId = setTimeout(() => {
        if (cancelled) {
          return;
        }
        setActiveIndex(current => (current + 1) % rotationEntries.length);
        scheduleTransition();
      }, ROTATION_INTERVAL_MS);
    };

    scheduleTransition();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [rotationEntries.length, shouldRotate]);

  if (rotationEntries.length === 0 && !showDebugInfo) {
    return null;
  }

  const displayedText = (
    shouldRotate
      ? rotationEntries[activeIndex]
      : inlineText
  ) || primaryText || device?.id || '';
  const backgroundColor = colors?.footerBackground;
  const borderColor = colors?.footerBorder;
  const textColor =
    colors?.footerText ||
    colors?.textSecondary ||
    colors?.text ||
    '#0f172a';
  const loadingColor = colors?.footerLink || colors?.primary || textColor;
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
          <RuntimeFooterMarqueeText
            text={
              showDebugInfo
                ? inlineText || primaryText || device?.id || '--'
                : displayedText
            }
            color={textColor}
            opacity={1}
            style={styles.primaryText}
            testID="runtime-footer-primary-text"
          />
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
