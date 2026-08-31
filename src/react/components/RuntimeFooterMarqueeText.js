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
  const resolvedOpacity =
    typeof opacity === 'number' ? opacity : Platform.OS === 'web' ? 1 : opacity;

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
    setContentWidth(prev => (prev === nextWidth ? prev : nextWidth));
  };

  const textStyle = [
    style,
    {
      color,
      flex: undefined,
      flexShrink: 0,
      flexGrow: 0,
    },
    shouldMarquee ? {textAlign: 'left'} : {textAlign: 'center'},
  ];

  return React.createElement(
    View,
    {
      testID,
      style: {flex: 1, overflow: 'hidden', justifyContent: 'center'},
      onLayout: handleContainerLayout,
    },
    React.createElement(
      Animated.View,
      {
        style: {
          flexDirection: 'row',
          alignItems: 'center',
          opacity: resolvedOpacity,
          transform: [{translateX}],
          alignSelf: shouldMarquee ? 'flex-start' : 'stretch',
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
