import React, {useMemo} from 'react';
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
  formatRuntimeFooterIdentifier,
  getRuntimeFooterDebugInfo,
  getRuntimeFooterPrimaryText,
  getRuntimeFooterRotationEntries,
  getRuntimeFooterTickerText,
  getRuntimeFooterText,
} from '@controleonline/ui-common/src/react/utils/runtimeFooter';
import styles from './RuntimeInfoFooter.styles';
import RuntimeFooterMarqueeText from './RuntimeFooterMarqueeText';
import resolveHomeFooterSpacing from './RuntimeInfoFooter.home.spacing';

const COMPACT_BREAKPOINT = 720;
const MAX_INLINE_TEXT_LENGTH = 84;
const FALLBACK_TEXT_COLOR = '#0f172a';

const normalizeColor = value =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

/** Prefer theme colors, but never render text the same as the footer background. */
const resolveVisibleFooterTextColor = colors => {
  const candidates = [
    colors?.footerText,
    colors?.textSecondary,
    colors?.text,
    FALLBACK_TEXT_COLOR,
  ];
  const background = normalizeColor(
    colors?.footerBackground || colors?.navigationBackground || '',
  );

  for (const candidate of candidates) {
    const normalized = normalizeColor(candidate);
    if (!normalized) {
      continue;
    }
    if (background && normalized === background) {
      continue;
    }
    return candidate;
  }

  return FALLBACK_TEXT_COLOR;
};

const RuntimeInfoFooter = ({
  appVersion,
  mainCompany,
  device,
  colors,
  useModernWebChromeProps = false,
  appearance = 'legacy',
}) => {
  const {width} = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
  const storeMainCompany = peopleStore?.getters?.mainCompany || {};
  const companyConfigs = configsStore?.getters?.items;
  const companyFooterText = useMemo(() => {
    const candidates = [
      getRuntimeFooterText(currentCompany),
      getRuntimeFooterText(storeMainCompany),
      getRuntimeFooterText(mainCompany),
      getRuntimeFooterText(null, companyConfigs),
      getRuntimeFooterText(null, deviceConfigItem?.configs),
    ];
    return candidates.find(Boolean) || '';
  }, [
    companyConfigs,
    currentCompany?.configs,
    mainCompany?.configs,
    deviceConfigItem?.configs,
    storeMainCompany?.configs,
  ]);
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
  // Ticker: the text written by the user (company footer) comes first, then the
  // system text (e.g. "web • MANAGER (ip) / v1.10.x"). Both scroll together,
  // right to left, in a continuous loop (no more alternating between them).
  const inlineText = useMemo(
    () => getRuntimeFooterTickerText({companyFooterText, primaryText}),
    [companyFooterText, primaryText],
  );
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

  if (rotationEntries.length === 0 && !showDebugInfo) {
    return null;
  }

  const displayedText =
    inlineText || primaryText || formatRuntimeFooterIdentifier(device?.id) || '';
  const backgroundColor = colors?.footerBackground;
  const homeSpacing = resolveHomeFooterSpacing(appearance, Platform.OS, insets.bottom);
  const borderColor = colors?.footerBorder;
  const textColor = resolveVisibleFooterTextColor(colors);
  const loadingColor = colors?.footerLink || colors?.primary || textColor;
  const shellProps = useModernWebChromeProps ? {} : {pointerEvents: 'none'};
  const shellStyle = useModernWebChromeProps
    ? [styles.shell, {pointerEvents: 'none'}]
    : styles.shell;

  return (
    <View {...shellProps} style={[shellStyle, homeSpacing && {
      paddingBottom: homeSpacing.safeAreaBottom, backgroundColor,
    }]}>
      <View
        testID="runtime-info-footer"
        style={[
          styles.container,
          showDebugInfo ? styles.containerExpanded : null,
          {
            backgroundColor,
            borderTopColor: borderColor,
            paddingBottom: homeSpacing ? homeSpacing.contentPadding : bottomInset,
            ...(homeSpacing && !showDebugInfo ? {paddingTop: homeSpacing.contentPadding} : {}),
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
                ? inlineText || primaryText || formatRuntimeFooterIdentifier(device?.id) || '--'
                : displayedText
            }
            color={textColor}
            opacity={1}
            continuous
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
