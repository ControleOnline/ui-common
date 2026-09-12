const React = require('react');
const {useEffect, useRef, useState} = React;
const {Animated, Platform, Text, View} = require('react-native');
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const GAP_PX = 32;
const MS_PER_PX = 28;
const MIN_DURATION_MS = 4000;
const HOLD_MS = 1200;

/**
 * Single-line footer text. When content overflows the available width,
 * scrolls horizontally in a continuous loop. Short text stays static.
 *
 * RN Web: Text + numberOfLines inside a flex row often collapses to width 0
 * (text in DOM, box 0px — invisible). Force intrinsic width on web.
 */
const RuntimeFooterMarqueeText = ({
  text,
  color,
  style,
  opacity,
  testID = 'runtime-footer-marquee-text',
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const animationRef = useRef(null);

  const shouldMarquee =
    containerWidth > 0 && contentWidth > containerWidth + 2;
  // Never bind Animated.Value to opacity — RN Web leaves the label invisible
  // mid-transition (observed opacity ~0.12 with text present in DOM).
  const resolvedOpacity = 1;

  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
    translateX.stopAnimation();
    translateX.setValue(0);

    if (!shouldMarquee) {
      return undefined;
    }

    const distance = contentWidth + GAP_PX;
    const duration = Math.max(Math.round(distance * MS_PER_PX), MIN_DURATION_MS);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(HOLD_MS),
        Animated.timing(translateX, {
          toValue: -distance,
          duration,
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
  }, [shouldMarquee, contentWidth, containerWidth, text, translateX]);

  const handleContainerLayout = event => {
    const nextWidth = Math.round(event?.nativeEvent?.layout?.width || 0);
    setContainerWidth(prev => (prev === nextWidth ? prev : nextWidth));
  };

  const handleTextLayout = event => {
    const nextWidth = Math.round(event?.nativeEvent?.layout?.width || 0);
    if (nextWidth > 0) {
      setContentWidth(prev => (prev === nextWidth ? prev : nextWidth));
    }
  };

  // RN Web collapses Text width to 0 inside flex rows unless intrinsic sizing is forced.
  const webTextFix =
    Platform.OS === 'web'
      ? {
          display: 'inline-block',
          width: 'auto',
          maxWidth: 'none',
          whiteSpace: 'nowrap',
          flexBasis: 'auto',
        }
      : null;

  const textStyle = [
    style,
    {
      color,
      flex: undefined,
      flexShrink: 0,
      flexGrow: 0,
      minHeight: 14,
    },
    webTextFix,
    shouldMarquee ? {textAlign: 'left'} : {textAlign: 'center'},
  ];

  return React.createElement(
    View,
    {
      testID,
      style: {
        flex: 1,
        minWidth: 0,
        minHeight: 14,
        overflow: 'hidden',
        justifyContent: 'center',
        alignSelf: 'stretch',
      },
      onLayout: handleContainerLayout,
    },
    React.createElement(
      Animated.View,
      {
        style: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: shouldMarquee ? 'flex-start' : 'center',
          opacity: resolvedOpacity,
          transform: [{translateX}],
          alignSelf: shouldMarquee ? 'flex-start' : 'stretch',
          width: shouldMarquee ? undefined : '100%',
        },
      },
      React.createElement(
        Text,
        {
          numberOfLines: 1,
          ellipsizeMode: 'clip',
          onLayout: handleTextLayout,
          style: textStyle,
        },
        text,
      ),
      shouldMarquee
        ? React.createElement(
            Text,
            {
              numberOfLines: 1,
              ellipsizeMode: 'clip',
              accessible: false,
              importantForAccessibility: 'no',
              style: [...textStyle, {marginLeft: GAP_PX}],
            },
            text,
          )
        : null,
    ),
  );
};

module.exports = RuntimeFooterMarqueeText;
module.exports.default = RuntimeFooterMarqueeText;
