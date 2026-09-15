const React = require('react');
const {useEffect, useRef, useState} = React;
const RN = require('react-native');
const Animated = RN.Animated;
const Text = RN.Text;
const View = RN.View;
const Platform = RN.Platform || {OS: 'native'};
const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const IS_WEB = Platform.OS === 'web';

const GAP_PX = 32;
const MS_PER_PX = 28;
const MIN_DURATION_MS = 4000;
const HOLD_MS = 1200;

/**
 * Single-line footer text. When content overflows the available width,
 * scrolls horizontally in a continuous loop. Short text stays static.
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
  const testID =
    (props && props.testID) || 'runtime-footer-marquee-text';

  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const animationRef = useRef(null);

  const shouldMarquee =
    !IS_WEB && containerWidth > 0 && contentWidth > containerWidth + 2;

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
          duration: duration,
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
