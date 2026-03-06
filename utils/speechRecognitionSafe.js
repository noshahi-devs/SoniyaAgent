let nativeModule = null;
let eventHook = () => {};
let initError = null;

try {
    const speechRecognition = require('expo-speech-recognition');
    nativeModule = speechRecognition?.ExpoSpeechRecognitionModule ?? null;
    if (typeof speechRecognition?.useSpeechRecognitionEvent === 'function') {
        eventHook = speechRecognition.useSpeechRecognitionEvent;
    }
} catch (error) {
    initError = error;
}

const deniedPermission = {
    granted: false,
    canAskAgain: false,
    expires: 'never',
    status: 'denied',
};

const fallbackModule = {
    start: () => {},
    stop: () => {},
    abort: () => {},
    requestPermissionsAsync: async () => deniedPermission,
    getPermissionsAsync: async () => deniedPermission,
    isRecognitionAvailable: () => false,
};

export const ExpoSpeechRecognitionModule = nativeModule || fallbackModule;
export const useSpeechRecognitionEvent = eventHook;
export const speechRecognitionInitError = initError;

export const isSpeechRecognitionAvailable = () => {
    if (!nativeModule || initError) return false;
    if (typeof nativeModule.isRecognitionAvailable !== 'function') {
        return true;
    }
    try {
        return Boolean(nativeModule.isRecognitionAvailable());
    } catch (_err) {
        return false;
    }
};
