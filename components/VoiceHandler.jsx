import { LinearGradient } from 'expo-linear-gradient';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const VoiceHandler = ({ onSpeechResult, disabled = false, onListenStart, onListenEnd }) => {
    const AUTO_SILENCE_MS = 1200;
    const MAX_LISTEN_MS = 10000;
    const [isListening, setIsListening] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const idleAnim = useRef(new Animated.Value(0)).current;
    const recognitionLangRef = useRef('ur-PK');
    const isListeningRef = useRef(false);
    const startInProgressRef = useRef(false);
    const latestTranscriptRef = useRef('');
    const pulseLoopRef = useRef(null);
    const stopRequestedRef = useRef(false);
    const stopTimeoutRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const maxListenTimerRef = useRef(null);

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
            if (pulseLoopRef.current) pulseLoopRef.current.stop();
            Animated.timing(pulseAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
        }
    }, [isListening, pulseAnim]);

    useEffect(() => {
        return () => {
            if (stopTimeoutRef.current) {
                clearTimeout(stopTimeoutRef.current);
                stopTimeoutRef.current = null;
            }
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
            if (maxListenTimerRef.current) {
                clearTimeout(maxListenTimerRef.current);
                maxListenTimerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(idleAnim, { toValue: 1, duration: 1300, useNativeDriver: true }),
                Animated.timing(idleAnim, { toValue: 0, duration: 1300, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => {
            loop.stop();
        };
    }, [idleAnim]);

    const clearSpeechTimers = () => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
        if (maxListenTimerRef.current) {
            clearTimeout(maxListenTimerRef.current);
            maxListenTimerRef.current = null;
        }
    };

    const extractTranscript = (event) => {
        const results = event?.results;
        if (Array.isArray(results) && results.length) {
            const last = results[results.length - 1];
            if (typeof last?.transcript === 'string') return last.transcript;
        }
        if (typeof event?.transcript === 'string') return event.transcript;
        return '';
    };

    const finalizeListening = () => {
        if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
        }
        clearSpeechTimers();
        stopRequestedRef.current = false;
        const text = latestTranscriptRef.current.trim();
        latestTranscriptRef.current = '';
        isListeningRef.current = false;
        setIsListening(false);
        onListenEnd?.();
        if (text) onSpeechResult(text);
    };

    useSpeechRecognitionEvent('result', (event) => {
        if (!isListeningRef.current) return;
        const transcript = extractTranscript(event);
        if (transcript) {
            latestTranscriptRef.current = transcript;

            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
            silenceTimerRef.current = setTimeout(() => {
                if (isListeningRef.current && !startInProgressRef.current) {
                    stopListening(true);
                }
            }, AUTO_SILENCE_MS);
        }
    });

    useSpeechRecognitionEvent('end', () => {
        if (!isListeningRef.current && !stopRequestedRef.current) return;
        finalizeListening();
    });

    useSpeechRecognitionEvent('error', () => {
        latestTranscriptRef.current = '';
        stopRequestedRef.current = false;
        if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
        }
        isListeningRef.current = false;
        setIsListening(false);
        onListenEnd?.();
    });

    const requestPermissionAndStart = async () => {
        const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission Required', 'Soniya ko mic ki zaroorat hai. Please allow microphone access.');
            return false;
        }

        const langs = ['ur-PK', 'pa-PK', 'hi-IN', 'en-US'];
        for (const lang of langs) {
            try {
                try {
                    await ExpoSpeechRecognitionModule.stop();
                } catch (_err) {
                    // Ignore stop failures when there is no active session.
                }

                await ExpoSpeechRecognitionModule.start({
                    lang,
                    interimResults: true,
                    continuous: true,
                    maxAlternatives: 1,
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

    const startListening = async () => {
        if (disabled || isListeningRef.current || startInProgressRef.current) return;

        startInProgressRef.current = true;
        stopRequestedRef.current = false;
        latestTranscriptRef.current = '';
        const started = await requestPermissionAndStart();
        startInProgressRef.current = false;

        if (started) {
            onListenStart?.();
            isListeningRef.current = true;
            setIsListening(true);

            clearSpeechTimers();
            maxListenTimerRef.current = setTimeout(() => {
                if (isListeningRef.current && !startInProgressRef.current) {
                    stopListening(true);
                }
            }, MAX_LISTEN_MS);
            return;
        }

        onListenEnd?.();
    };

    const stopListening = (fromAutoSilence = false) => {
        if (!isListeningRef.current || startInProgressRef.current) return;
        stopRequestedRef.current = true;
        try {
            ExpoSpeechRecognitionModule.stop();
        } catch (_err) {
            finalizeListening();
        }

        if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
        }
        stopTimeoutRef.current = setTimeout(() => {
            if (stopRequestedRef.current) {
                finalizeListening();
            }
        }, fromAutoSilence ? 420 : 550);
    };

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.pulseShadow,
                    { transform: [{ scale: pulseAnim }], opacity: isListening ? 0.35 : 0 },
                ]}
            />
            <Animated.View
                style={[
                    styles.ambientWrap,
                    !isListening && {
                        transform: [{
                            scale: idleAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 1.05]
                            })
                        }],
                        opacity: idleAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.82, 1]
                        })
                    }
                ]}
            >
                <TouchableOpacity
                    activeOpacity={0.78}
                    disabled={disabled}
                    onPress={isListening ? stopListening : startListening}
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
                                ? 'PLEASE WAIT'
                                : isListening
                                    ? `LISTENING... AUTO SEND (${recognitionLangRef.current})`
                                    : 'TAP TO SPEAK'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { alignItems: 'center', justifyContent: 'center' },
    ambientWrap: {
        shadowColor: '#ff69b4',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 16,
        shadowOpacity: 0.6
    },
    pulseShadow: {
        position: 'absolute',
        width: 290,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ff1493',
    },
    btn: {
        paddingVertical: 18,
        paddingHorizontal: 42,
        borderRadius: 40,
        alignItems: 'center',
        shadowColor: '#ff69b4',
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 15,
        shadowOpacity: 0.5,
        elevation: 10,
    },
    btnText: { color: 'white', fontWeight: '900', fontSize: 15, letterSpacing: 1.3 },
});

export default VoiceHandler;
