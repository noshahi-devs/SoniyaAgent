import { Animated, Keyboard, Platform } from 'react-native';
import { useEffect } from 'react';

export const useKeyboardLift = ({ controlsTranslateY, insetBottom }) => {
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (event) => {
      const keyboardHeight = event?.endCoordinates?.height || 0;
      const overlap = keyboardHeight - insetBottom;
      const lift = Math.max(0, overlap + 12);

      Animated.timing(controlsTranslateY, {
        toValue: -lift,
        duration: event?.duration || 220,
        useNativeDriver: true
      }).start();
    };

    const onKeyboardHide = (event) => {
      Animated.timing(controlsTranslateY, {
        toValue: 0,
        duration: event?.duration || 180,
        useNativeDriver: true
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [controlsTranslateY, insetBottom]);
};
