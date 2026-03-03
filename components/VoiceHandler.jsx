import { LinearGradient } from 'expo-linear-gradient';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const VoiceHandler = ({ onSpeechResult, disabled = false }) => {
    const [isListening, setIsListening] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const recognitionLangRef = useRef('ur-PK');
    const isListeningRef = useRef(false);
    const pulseLoopRef = useRef(null);

    useEffect(() => {
        isListeningRef.current = isListening;

        if (isListening) {
            pulseLoopRef.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.25, duration: 550, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 550, useNativeDriver: true }),
                ])
            );
            pulseLoopRef.current.start();
        } else {
            if (pulseLoopRef.current) {
                pulseLoopRef.current.stop();
            }
            Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        }
    }, [isListening]);

    useSpeechRecognitionEvent('result', (event) => {
        if (!isListeningRef.current) return;
        const transcript = event.results?.[0]?.transcript;
        if (transcript) {
            onSpeechResult(transcript);
        }
    });

    useSpeechRecognitionEvent('end', () => {
        setIsListening(false);
    });

    useSpeechRecognitionEvent('error', () => {
        setIsListening(false);
    });

    const requestPermissionAndStart = async () => {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
            Alert.alert('Permission Required', 'Soniya ko mic ki zaroorat hai. Please allow microphone access.');
            return false;
        }

        const langs = ['ur-PK', 'pa-PK', 'hi-IN', 'en-US'];
        for (const lang of langs) {
            try {
                await ExpoSpeechRecognitionModule.start({
                    lang,
                    interimResults: true,
                    continuous: false,
                });
                recognitionLangRef.current = lang;
                return true;
            } catch (_err) {
                // Try next language.
            }
        }

        Alert.alert('Voice Error', 'Voice recognition start nahi ho saka. Dobara try karein.');
        return false;
    };

    const handlePressIn = async () => {
        if (disabled || isListeningRef.current) return;
        const started = await requestPermissionAndStart();
        if (started) {
            setIsListening(true);
        }
    };

    const handlePressOut = () => {
        if (!isListeningRef.current) return;
        try {
            ExpoSpeechRecognitionModule.stop();
        } catch (_) { }
        setIsListening(false);
    };

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.pulseShadow,
                    { transform: [{ scale: pulseAnim }], opacity: isListening ? 0.35 : 0 },
                ]}
            />
            <TouchableOpacity
                activeOpacity={0.75}
                disabled={disabled}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                delayLongPress={100}
            >
                <LinearGradient
                    colors={
                        disabled
                            ? ['#64748b', '#475569']
                            : isListening
                                ? ['#ff1493', '#e0004a']
                                : ['#ff69b4', '#db7093']
                    }
                    style={styles.btn}
                >
                    <Text style={styles.btnText}>
                        {disabled
                            ? 'WAKE MODE ACTIVE'
                            : isListening
                                ? `🎙️ LISTENING (${recognitionLangRef.current})...`
                                : '🎤 HOLD TO SPEAK'}
                    </Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { alignItems: 'center', justifyContent: 'center' },
    pulseShadow: {
        position: 'absolute',
        width: 290,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ff1493',
    },
    btn: {
        paddingVertical: 18,
        paddingHorizontal: 45,
        borderRadius: 40,
        alignItems: 'center',
        shadowColor: '#ff69b4',
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 15,
        shadowOpacity: 0.5,
        elevation: 10,
    },
    btnText: { color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 2 },
});

export default VoiceHandler;
