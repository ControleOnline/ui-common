import React, {useEffect, useMemo, useState} from 'react';
import {Text, View, useWindowDimensions} from 'react-native';
import {useStore} from '@store';
import {colors as runtimeColors} from '@controleonline/../../src/styles/colors';
import {
  DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY,
  isTruthyValue,
  parseConfigsObject,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  getRuntimeFooterPrimaryText,
  getRuntimeFooterText,
} from '@controleonline/ui-common/src/react/utils/runtimeFooter';
import styles from './RuntimeInfoFooter.styles';

const ROTATION_INTERVAL_MS = 6000;
const COMPACT_BREAKPOINT = 720;
const MAX_INLINE_TEXT_LENGTH = 84;

const RuntimeInfoFooter = ({appVersion, defaultCompany, device, colors}) => {
  const {width} = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const deviceConfigStore = useStore('device_config');
  const runtimeDebugStore = useStore('runtime_debug');
  const deviceConfigItem = deviceConfigStore?.getters?.item || {};
  const runtimeDebugSummary = runtimeDebugStore?.getters?.summary || {};

  const primaryText = useMemo(
    () => getRuntimeFooterPrimaryText({device, appVersion}),
    [appVersion, device],
  );
  const companyFooterText = useMemo(
    () => getRuntimeFooterText(defaultCompany),
    [defaultCompany?.configs],
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

  const entries = useMemo(
    () => [primaryText, companyFooterText].filter(Boolean),
    [companyFooterText, primaryText],
  );
  const inlineText = useMemo(() => entries.join('  •  '), [entries]);
  const shouldRotate =
    !showDebugInfo &&
    entries.length > 1 &&
    (width < COMPACT_BREAKPOINT || inlineText.length > MAX_INLINE_TEXT_LENGTH);
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
  const socketIndicatorColor = socketEntry?.indicatorColor || '#EF4444';

  useEffect(() => {
    if (!shouldRotate || entries.length <= 1) {
      setActiveIndex(0);
      return;
    }

    const intervalId = setInterval(() => {
      setActiveIndex(current => (current + 1) % entries.length);
    }, ROTATION_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [entries.length, shouldRotate]);

  if (entries.length === 0 && !showDebugInfo) {
    return null;
  }

  const displayedText = shouldRotate ? entries[activeIndex] : inlineText;
  const backgroundColor = colors?.background || runtimeColors.background;
  const borderColor = colors?.border || runtimeColors.border;
  const textColor = colors?.textSecondary || runtimeColors.textSecondary;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        showDebugInfo ? styles.containerExpanded : null,
        {
          backgroundColor,
          borderTopColor: borderColor,
        },
      ]}>
      <View style={styles.primaryRow}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: socketIndicatorColor,
            },
          ]}
        />
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          minimumFontScale={0.85}
          style={[
            styles.primaryText,
            {
              color: textColor,
            },
          ]}>
          {showDebugInfo ? inlineText || primaryText || device?.id || '--' : displayedText}
        </Text>
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
  );
};

export default RuntimeInfoFooter;
