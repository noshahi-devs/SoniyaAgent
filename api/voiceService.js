import * as Haptics from 'expo-haptics';
import Tts from 'react-native-tts';

export const initSoniyaVoice = () => {
    Tts.getInitStatus().then(() => {
        Tts.setDefaultLanguage('en-IN');
        Tts.setDefaultRate(0.45, true);
        Tts.setDefaultPitch(1.1);
    });
};

export const soniyaSpeak = (text) => {
    if (text) {
        Tts.stop();
        // Bolne se pehle ek halka sa vibration
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Tts.speak(text);
    }
};