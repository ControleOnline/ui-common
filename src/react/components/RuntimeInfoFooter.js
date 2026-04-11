import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {colors as runtimeColors} from '@controleonline/../../src/styles/colors';
import {
  getRuntimeFooterPrimaryText,
  getRuntimeFooterText,
} from '@controleonline/ui-common/src/react/utils/runtimeFooter';

const ROTATION_INTERVAL_MS = 6000;
const COMPACT_BREAKPOINT = 720;
const MAX_INLINE_TEXT_LENGTH = 84;

const RuntimeInfoFooter = ({appVersion, defaultCompany, device, colors}) => {
  const {width} = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const primaryText = useMemo(
    () => getRuntimeFooterPrimaryText({device, appVersion}),
    [appVersion, device],
  );
  const companyFooterText = useMemo(
    () => getRuntimeFooterText(defaultCompany),
    [defaultCompany?.configs],
  );

  const entries = useMemo(
    () => [primaryText, companyFooterText].filter(Boolean),
    [companyFooterText, primaryText],
  );
  const inlineText = useMemo(() => entries.join('  •  '), [entries]);
  const shouldRotate =
    entries.length > 1 &&
    (width < COMPACT_BREAKPOINT || inlineText.length > MAX_INLINE_TEXT_LENGTH);

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

  if (entries.length === 0) {
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
        {
          backgroundColor,
          borderTopColor: borderColor,
        },
      ]}>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        minimumFontScale={0.85}
        style={[
          styles.text,
          {
            color: textColor,
          },
        ]}>
        {displayedText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  text: {
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default RuntimeInfoFooter;
