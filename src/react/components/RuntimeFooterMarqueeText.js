const React = require('react');
const {useEffect, useRef, useState} = React;
const RN = require('react-native');
const Animated = RN.Animated;
const Easing = RN.Easing;
const Text = RN.Text;
const View = RN.View;
const Platform = RN.Platform || {OS: 'native'};
const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const IS_WEB = Platform.OS === 'web';

const GAP_PX = 32;
const MS_PER_PX = 28;
const MIN_DURATION_MS = 4000;
const HOLD_MS = 1200;
// Continuous ticker (right -> left): constant, readable speed.
const TICKER_MS_PER_PX = 20;
const TICKER_MIN_DURATION_MS = 3000;
// Native Text is measured with the parent width as the maximum, so a row as
// narrow as the container would truncate the text (and the measured content
// width). The ticker row is therefore much wider than any footer; the
// container clips it (overflow: hidden).
const TICKER_ROW_WIDTH_PX = 20000;

/**
 * Single-line footer text. When content overflows the available width,
 * scrolls horizontally in a continuous loop. Short text stays static.
 *
 * `continuous` turns it into a ticker (marquee): the text ALWAYS scrolls from
 * right to left in a seamless loop (repeated copies fill the width), on web
 * (CSS keyframes) and native (Animated loop with the native driver).
 * On web, avoids Animated opacity/transform issues that hid the label.
 * RN Web also needs intrinsic sizing because Text can collapse to width 0
 * inside a flex row.
 *
 * IMPORTANT: do not use destructuring defaults on require('react-native')
 * — Metro web export fails with "Property name expected type of string
 * but got undefined" (staging Deploy).
 */
const RuntimeFooterMarqueeText = props => {
  const text = props && props.text;
  const color = props && props.color;
  const style = props && props.style;
  const continuous = !!(props && props.continuous);
  const testID =
    (props && props.testID) || 'runtime-footer-marquee-text';

  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const animationRef = useRef(null);

  const shouldMarquee = continuous
    ? containerWidth > 0 && contentWidth > 0
    : !IS_WEB && containerWidth > 0 && contentWidth > containerWidth + 2;

  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
    translateX.stopAnimation();
    translateX.setValue(0);

    // On web the continuous ticker uses CSS keyframes (see render below).
    if (!shouldMarquee || (continuous && IS_WEB)) {
      return undefined;
    }

    const distance = contentWidth + GAP_PX;
    const duration = continuous
      ? Math.max(Math.round(distance * TICKER_MS_PER_PX), TICKER_MIN_DURATION_MS)
      : Math.max(Math.round(distance * MS_PER_PX), MIN_DURATION_MS);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(continuous ? 0 : HOLD_MS),
        Animated.timing(translateX, {
          toValue: -distance,
          duration: duration,
          easing: continuous && Easing ? Easing.linear : undefined,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 0,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );
    animationRef.current = loop;
    loop.start();
    return () => {
      loop.stop();
      animationRef.current = null;
      translateX.stopAnimation();
    };
  }, [shouldMarquee, continuous, contentWidth, containerWidth, text, translateX]);

  const handleContainerLayout = event => {
    const nextWidth = Math.round(
      (event &&
        event.nativeEvent &&
        event.nativeEvent.layout &&
        event.nativeEvent.layout.width) ||
        0,
    );
    setContainerWidth(current => (current === nextWidth ? current : nextWidth));
  };

  const handleTextLayout = event => {
    const nextWidth = Math.round(
      (event &&
        event.nativeEvent &&
        event.nativeEvent.layout &&
        event.nativeEvent.layout.width) ||
        0,
    );
    setContentWidth(current => (current === nextWidth ? current : nextWidth));
  };

  const textStyle = [
    style,
    {
      color: color,
      flexShrink: 0,
      flexGrow: 0,
      // primaryText carries `flex: 1` (flexBasis 0 on native), which collapsed
      // the Text to width 0 inside the row on Android. Force intrinsic sizing.
      // Yoga gives `flex` precedence over flexGrow/flexBasis, so the inherited
      // `flex: 1` must be overridden explicitly or the Text stays at width 0.
      flex: 0,
      flexBasis: 'auto',
      minWidth: 0,
      minHeight: 14,
    },
  ];

  if (IS_WEB) {
    textStyle.push({
      display: 'inline-block',
      width: 'auto',
      maxWidth: 'none',
      whiteSpace: 'nowrap',
      flexBasis: 'auto',
    });
  }

  textStyle.push(shouldMarquee ? {textAlign: 'left'} : {textAlign: 'center'});

  if (continuous) {
    // Enough copies so the row is always wider than the container + one cycle:
    // the loop restarts (translateX 0) with no visible gap.
    const distance = contentWidth + GAP_PX;
    const copies = shouldMarquee
      ? Math.max(2, Math.ceil(containerWidth / distance) + 1)
      : 1;
    const durationMs = Math.max(
      Math.round(distance * TICKER_MS_PER_PX),
      TICKER_MIN_DURATION_MS,
    );

    const copyNodes = [];
    for (let index = 0; index < copies; index += 1) {
      copyNodes.push(
        React.createElement(
          Text,
          {
            key: 'ticker-copy-' + index,
            numberOfLines: 1,
            ellipsizeMode: 'clip',
            accessible: index === 0,
            importantForAccessibility: index === 0 ? 'auto' : 'no',
            onLayout: index === 0 ? handleTextLayout : undefined,
            testID: index === 0 ? undefined : 'runtime-footer-ticker-copy',
            style: textStyle.concat([
              {textAlign: 'left', marginRight: GAP_PX},
              IS_WEB ? {whiteSpace: 'nowrap'} : null,
            ]),
          },
          text,
        ),
      );
    }

    const rowStyle = {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      alignItems: 'center',
      alignSelf: 'flex-start',
      opacity: 1,
    };
    if (!IS_WEB) {
      rowStyle.width = TICKER_ROW_WIDTH_PX;
    }
    if (IS_WEB && shouldMarquee) {
      rowStyle.animationKeyframes = [
        {
          '0%': {transform: [{translateX: 0}]},
          '100%': {transform: [{translateX: -distance}]},
        },
      ];
      rowStyle.animationDuration = durationMs + 'ms';
      rowStyle.animationIterationCount = 'infinite';
      rowStyle.animationTimingFunction = 'linear';
    }

    return React.createElement(
      View,
      {
        testID: testID,
        style: {
          flex: 1,
          overflow: 'hidden',
          justifyContent: 'center',
          opacity: 1,
        },
        onLayout: handleContainerLayout,
      },
      React.createElement(
        IS_WEB ? View : Animated.View,
        {
          testID: 'runtime-footer-ticker-row',
          style: IS_WEB
            ? rowStyle
            : [rowStyle, {transform: [{translateX: translateX}]}],
        },
        copyNodes,
      ),
    );
  }

  const content = React.createElement(
    Text,
    {
      numberOfLines: 1,
      ellipsizeMode: IS_WEB ? 'tail' : 'clip',
      onLayout: handleTextLayout,
      style: textStyle,
    },
    text,
  );

  if (IS_WEB) {
    return React.createElement(
      View,
      {
        testID: testID,
        style: {
          flex: 1,
          overflow: 'hidden',
          justifyContent: 'center',
          opacity: 1,
        },
        onLayout: handleContainerLayout,
      },
      content,
    );
  }

  return React.createElement(
    View,
    {
      testID: testID,
      style: {flex: 1, overflow: 'hidden', justifyContent: 'center'},
      onLayout: handleContainerLayout,
    },
    React.createElement(
      Animated.View,
      {
        style: {
          flexDirection: 'row',
          alignItems: 'center',
          opacity: 1,
          transform: [{translateX: translateX}],
          justifyContent: shouldMarquee ? 'flex-start' : 'center',
          alignSelf: shouldMarquee ? 'flex-start' : 'stretch',
        },
      },
      content,
      shouldMarquee
        ? React.createElement(
            Text,
            {
              numberOfLines: 1,
              ellipsizeMode: 'clip',
              accessible: false,
              importantForAccessibility: 'no',
              style: textStyle.concat([{marginLeft: GAP_PX}]),
            },
            text,
          )
        : null,
    ),
  );
};

module.exports = RuntimeFooterMarqueeText;
module.exports.default = RuntimeFooterMarqueeText;
