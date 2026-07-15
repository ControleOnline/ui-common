import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {toast, Toasts} from '@backpackapp-io/react-native-toast';
import styles from './AnimatedModal.styles';
import {
  TOAST_EXTRA_INSETS,
  TOAST_MODAL_COUNT_KEY,
  TOAST_PROVIDER_KEYS,
} from './toastConfig';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

const incrementModalToastDepth = () => {
  const currentDepth = Number(global?.[TOAST_MODAL_COUNT_KEY] || 0);
  global[TOAST_MODAL_COUNT_KEY] = currentDepth + 1;
};

const decrementModalToastDepth = () => {
  const currentDepth = Number(global?.[TOAST_MODAL_COUNT_KEY] || 0);
  global[TOAST_MODAL_COUNT_KEY] = Math.max(0, currentDepth - 1);
};

/**
 * Modal com overlay aparecendo na hora e apenas o conteúdo subindo de baixo.
 */
export default function AnimatedModal({
  visible,
  onRequestClose,
  children,
  style,
}) {
  const [showing, setShowing] = useState(visible);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setShowing(true);
      slideY.setValue(SCREEN_HEIGHT);
      overlayOpacity.setValue(0);

      Animated.parallel([
        Animated.spring(slideY, {
          toValue: 0,
          damping: 24,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, overlayOpacity, slideY]);

  useEffect(() => {
    if (!visible && showing) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowing(false);
        setKeyboardHeight(0);
        onRequestClose?.();
      });
    }
  }, [visible, showing, overlayOpacity, slideY, onRequestClose]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    const showSub = Keyboard.addListener('keyboardDidShow', event => {
      setKeyboardHeight(event?.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!showing) {
      return undefined;
    }

    incrementModalToastDepth();
    return () => {
      decrementModalToastDepth();
    };
  }, [showing]);

  const overlayStyle = [
    styles.overlay,
    style,
    Platform.OS === 'android' ? {paddingBottom: keyboardHeight} : null,
  ];

  const normalizedChildren = React.Children.toArray(children).map(child => {
    if (typeof child === 'string' || typeof child === 'number') {
      const text = String(child).trim();
      if (!text || text === '.') return null;
      return <Text>{text}</Text>;
    }
    return child;
  });

  return (
    <Modal
      visible={showing}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={onRequestClose}>
      <GestureHandlerRootView style={styles.gestureRoot}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={overlayStyle}>
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              styles.overlayBg,
              {opacity: overlayOpacity},
            ]}
          />
          <Animated.View
            style={[styles.content, {transform: [{translateY: slideY}]}]}>
            {normalizedChildren}
          </Animated.View>
          <Toasts
            providerKey={TOAST_PROVIDER_KEYS.MODAL}
            extraInsets={TOAST_EXTRA_INSETS}
            onToastPress={currentToast => toast.dismiss(currentToast.id)}
          />
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
