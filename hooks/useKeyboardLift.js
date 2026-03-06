import { useEffect } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';

const KEYBOARD_TOP_SPACING = 2;

export const useKeyboardLift = ({
  translateY,
  inputTranslateY,
  staticTranslateY,
  insetBottom,
  onVisibilityChange
}) => {
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const activeInputTranslateY = inputTranslateY || translateY;

    const onKeyboardShow = (event) => {
      const keyboardHeight = event?.endCoordinates?.height || 0;
      const overlap = keyboardHeight - insetBottom;
      const lift = Math.max(0, overlap + KEYBOARD_TOP_SPACING);
      const isAndroid = Platform.OS === 'android';
      onVisibilityChange?.(true);

      if (activeInputTranslateY) {
        if (isAndroid) {
          activeInputTranslateY.setValue(0);
        } else {
          Animated.timing(activeInputTranslateY, {
            toValue: -lift,
            duration: event?.duration || 220,
            useNativeDriver: true
          }).start();
        }
      }
      if (staticTranslateY) {
        if (isAndroid) {
          staticTranslateY.setValue(lift);
        } else {
          staticTranslateY.setValue(0);
        }
      }
    };

    const onKeyboardHide = (event) => {
      const isAndroid = Platform.OS === 'android';
      onVisibilityChange?.(false);

      if (activeInputTranslateY) {
        if (isAndroid) {
          activeInputTranslateY.setValue(0);
        } else {
          Animated.timing(activeInputTranslateY, {
            toValue: 0,
            duration: event?.duration || 180,
            useNativeDriver: true
          }).start();
        }
      }
      if (staticTranslateY) {
        if (isAndroid) {
          staticTranslateY.setValue(0);
        } else {
          staticTranslateY.setValue(0);
        }
      }
    };

    const showSub = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [translateY, inputTranslateY, staticTranslateY, insetBottom, onVisibilityChange]);
};
