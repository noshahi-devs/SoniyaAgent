import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

export const initSoniyaVoice = () => {
    // expo-speech doesn't require explicit init, but we can check available voices if needed
    console.log("Soniya Voice Initialized");
};

export const soniyaSpeak = (text, onStart, onEnd) => {
    if (text) {
        Speech.stop();
        // Bolne se pehle ek halka sa vibration
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        Speech.speak(text, {
            language: 'en-IN',
            pitch: 1.1,
            rate: 1.0,
            onStart: () => {
                if (onStart) onStart();
            },
            onDone: () => {
                if (onEnd) onEnd();
            },
            onError: (err) => {
                console.log("Speech Error:", err);
                if (onEnd) onEnd();
            }
        });
    }
};