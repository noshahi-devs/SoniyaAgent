import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    ExpoSpeechRecognitionModule,
    isSpeechRecognitionAvailable,
    useSpeechRecognitionEvent
} from '../utils/speechRecognitionSafe';

const AUTO_SILENCE_MS = 1700;
const MAX_LISTEN_MS = 14000;
const SIGNAL_BAR_MAX_HEIGHT = 22;

const VoiceHandler = ({ onSpeechResult, disabled = false, onListenStart, onListenEnd, variant = 'COMPACT' }) => {
    const [isListening, setIsListening] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState('');
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
    const hasShownUnavailableAlertRef = useRef(false);
    const speechRecognitionAvailable = useMemo(() => isSpeechRecognitionAvailable(), []);

    const notifyUnavailable = useCallback(() => {
        if (hasShownUnavailableAlertRef.current) return;
        hasShownUnavailableAlertRef.current = true;
        Alert.alert(
            'Voice Unavailable',
            'Speech recognition runtime ready nahi hai. Dev build/install ke baad dobara try karein.'
        );
    }, []);

    const clearSpeechTimers = useCallback(() => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
        if (maxListenTimerRef.current) {
            clearTimeout(maxListenTimerRef.current);
            maxListenTimerRef.current = null;
        }
    }, []);

    const finalizeListening = useCallback((emitResult = true) => {
        if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
        }
        clearSpeechTimers();
        stopRequestedRef.current = false;
        startInProgressRef.current = false;
        const text = latestTranscriptRef.current.trim();
        latestTranscriptRef.current = '';
        setLiveTranscript('');
        isListeningRef.current = false;
        setIsListening(false);
        setIsStarting(false);
        onListenEnd?.();
        if (emitResult && text) onSpeechResult(text);
    }, [clearSpeechTimers, onListenEnd, onSpeechResult]);

    const stopListening = useCallback((fromAutoSilence = false, emitResult = true) => {
        if (startInProgressRef.current) {
            stopRequestedRef.current = true;
            return;
        }
        if (!isListeningRef.current) return;

        stopRequestedRef.current = true;
        try {
            ExpoSpeechRecognitionModule.stop();
        } catch (_err) {
            finalizeListening(emitResult);
            return;
        }

        if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
        }
        stopTimeoutRef.current = setTimeout(() => {
            if (stopRequestedRef.current) {
                finalizeListening(emitResult);
            }
        }, fromAutoSilence ? 420 : 550);
    }, [finalizeListening]);

    const extractTranscript = useCallback((event) => {
        const results = event?.results;
        if (Array.isArray(results) && results.length) {
            const last = results[results.length - 1];
            if (typeof last?.transcript === 'string') return last.transcript;
        }
        if (typeof event?.transcript === 'string') return event.transcript;
        return '';
    }, []);

    const requestPermissionAndStart = useCallback(async () => {
        if (!speechRecognitionAvailable) {
            notifyUnavailable();
            return false;
        }

        const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission Required', 'Soniya ko mic ki zaroorat hai. Please allow microphone access.');
            return false;
        }

        const langs = ['ur-PK', 'pa-PK', 'hi-IN', 'en-US'];
        for (const lang of langs) {
            try {
                try {
                    ExpoSpeechRecognitionModule.abort?.();
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
    }, [notifyUnavailable, speechRecognitionAvailable]);

    const startListening = useCallback(async () => {
        if (disabled || isListeningRef.current || startInProgressRef.current) return;
        if (!speechRecognitionAvailable) {
            notifyUnavailable();
            return;
        }

        setIsStarting(true);
        startInProgressRef.current = true;
        stopRequestedRef.current = false;
        latestTranscriptRef.current = '';
        setLiveTranscript('');

        const started = await requestPermissionAndStart();
        startInProgressRef.current = false;

        if (!started) {
            setIsStarting(false);
            onListenEnd?.();
            return;
        }

        if (disabled || stopRequestedRef.current) {
            try {
                ExpoSpeechRecognitionModule.abort?.();
                ExpoSpeechRecognitionModule.stop();
            } catch (_err) {
                // Ignore close failures during cancelled startup.
            }
            finalizeListening(false);
            return;
        }

        onListenStart?.();
        isListeningRef.current = true;
        setIsListening(true);
        setIsStarting(false);

        clearSpeechTimers();
        maxListenTimerRef.current = setTimeout(() => {
            if (isListeningRef.current && !startInProgressRef.current) {
                stopListening(true);
            }
        }, MAX_LISTEN_MS);
    }, [
        clearSpeechTimers,
        disabled,
        finalizeListening,
        notifyUnavailable,
        onListenEnd,
        onListenStart,
        requestPermissionAndStart,
        speechRecognitionAvailable,
        stopListening
    ]);

    useEffect(() => {
        isListeningRef.current = isListening;

        if (isListening || isStarting) {
            pulseLoopRef.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.14, duration: 650, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 0.98, duration: 650, useNativeDriver: true }),
                ])
            );
            pulseLoopRef.current.start();
        } else {
            if (pulseLoopRef.current) pulseLoopRef.current.stop();
            Animated.timing(pulseAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
        }
    }, [isListening, isStarting, pulseAnim]);

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

            try {
                ExpoSpeechRecognitionModule.abort?.();
                ExpoSpeechRecognitionModule.stop();
            } catch (_err) {
                // Ignore cleanup stop failures.
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

    useEffect(() => {
        if (!disabled) return;

        if (startInProgressRef.current) {
            stopRequestedRef.current = true;
            return;
        }

        if (isListeningRef.current) {
            stopListening(false, false);
        }
    }, [disabled, stopListening]);

    useSpeechRecognitionEvent('result', (event) => {
        if (!isListeningRef.current) return;
        const transcript = extractTranscript(event);
        if (transcript) {
            latestTranscriptRef.current = transcript;
            setLiveTranscript(transcript.trim());

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
        finalizeListening(true);
    });

    useSpeechRecognitionEvent('error', () => {
        latestTranscriptRef.current = '';
        setLiveTranscript('');
        stopRequestedRef.current = false;
        if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
        }
        clearSpeechTimers();
        startInProgressRef.current = false;
        isListeningRef.current = false;
        setIsListening(false);
        setIsStarting(false);
        onListenEnd?.();
    });

    const voiceState = useMemo(() => {
        if (!speechRecognitionAvailable) {
            return {
                label: 'OFFLINE',
                title: 'Voice runtime unavailable',
                subtitle: 'Speech package is runtime mein ready nahi hai.',
                preview: 'Dev build install karke dobara try karein.',
                buttonColors: ['#334155', '#1e293b', '#0f172a'],
                cardColors: ['rgba(15,23,42,0.96)', 'rgba(30,41,59,0.92)', 'rgba(15,23,42,0.96)'],
                glowColor: 'rgba(100,116,139,0.45)',
                ringColor: 'rgba(148,163,184,0.45)',
                badgeColor: 'rgba(148,163,184,0.18)',
                icon: 'cloud-offline-outline',
                hint: 'Voice unavailable',
            };
        }

        if (isListening) {
            return {
                label: 'LIVE',
                title: 'AI voice core is listening',
                subtitle: `Boliye, short silence ke baad auto send hoga (${recognitionLangRef.current}).`,
                preview: 'Aap ki awaaz real time capture ho rahi hai.',
                buttonColors: ['#fb7185', '#ec4899', '#7c3aed'],
                cardColors: ['rgba(56,12,62,0.95)', 'rgba(91,22,85,0.9)', 'rgba(18,14,42,0.96)'],
                glowColor: 'rgba(244,114,182,0.52)',
                ringColor: 'rgba(244,114,182,0.5)',
                badgeColor: 'rgba(244,114,182,0.18)',
                icon: 'radio',
                hint: 'Tap to stop',
            };
        }

        if (isStarting) {
            return {
                label: 'BOOTING',
                title: 'AI voice core activating',
                subtitle: 'Mic aur recognition engine ready ho rahe hain.',
                preview: 'Ek second dein, voice channel boot ho raha hai.',
                buttonColors: ['#38bdf8', '#6366f1', '#8b5cf6'],
                cardColors: ['rgba(8,25,52,0.96)', 'rgba(23,37,84,0.92)', 'rgba(44,15,88,0.96)'],
                glowColor: 'rgba(96,165,250,0.52)',
                ringColor: 'rgba(96,165,250,0.5)',
                badgeColor: 'rgba(96,165,250,0.18)',
                icon: 'flash',
                hint: 'Starting',
            };
        }

        if (disabled) {
            return {
                label: 'BUSY',
                title: 'Soniya is busy right now',
                subtitle: 'Current reply complete hone dein, phir dobara tap karein.',
                preview: 'Jab system free hoga tab yeh button foran kaam karega.',
                buttonColors: ['#475569', '#334155', '#1e293b'],
                cardColors: ['rgba(15,23,42,0.96)', 'rgba(30,41,59,0.92)', 'rgba(17,24,39,0.96)'],
                glowColor: 'rgba(148,163,184,0.34)',
                ringColor: 'rgba(148,163,184,0.32)',
                badgeColor: 'rgba(148,163,184,0.15)',
                icon: 'hourglass-outline',
                hint: 'Please wait',
            };
        }

        return {
            label: 'READY',
            title: 'Tap and speak to Soniya',
            subtitle: 'AI-powered voice input fast aur hands-free message bhejta hai.',
            preview: 'Button tap karein, boliye, aur silence ke baad message auto send ho jayega.',
            buttonColors: ['#67e8f9', '#6366f1', '#ec4899'],
            cardColors: ['rgba(7,16,42,0.97)', 'rgba(22,24,72,0.92)', 'rgba(67,14,84,0.96)'],
            glowColor: 'rgba(103,232,249,0.48)',
            ringColor: 'rgba(103,232,249,0.46)',
            badgeColor: 'rgba(103,232,249,0.16)',
            icon: 'mic',
            hint: 'Tap to speak',
        };
    }, [disabled, isListening, isStarting, speechRecognitionAvailable]);

    const ringScale = isListening || isStarting
        ? pulseAnim.interpolate({
            inputRange: [0.98, 1.14],
            outputRange: [1, 1.2]
        })
        : idleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.08]
        });

    const glowOpacity = isListening || isStarting
        ? pulseAnim.interpolate({
            inputRange: [0.98, 1.14],
            outputRange: [0.34, 0.6]
        })
        : idleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.18, 0.28]
        });

    const signalBars = [
        {
            scaleY: idleAnim.interpolate({ inputRange: [0, 1], outputRange: [8 / SIGNAL_BAR_MAX_HEIGHT, 14 / SIGNAL_BAR_MAX_HEIGHT] }),
            translateY: idleAnim.interpolate({ inputRange: [0, 1], outputRange: [(SIGNAL_BAR_MAX_HEIGHT - 8) / 2, (SIGNAL_BAR_MAX_HEIGHT - 14) / 2] })
        },
        {
            scaleY: idleAnim.interpolate({ inputRange: [0, 1], outputRange: [14 / SIGNAL_BAR_MAX_HEIGHT, 22 / SIGNAL_BAR_MAX_HEIGHT] }),
            translateY: idleAnim.interpolate({ inputRange: [0, 1], outputRange: [(SIGNAL_BAR_MAX_HEIGHT - 14) / 2, 0] })
        },
        {
            scaleY: idleAnim.interpolate({ inputRange: [0, 1], outputRange: [10 / SIGNAL_BAR_MAX_HEIGHT, 18 / SIGNAL_BAR_MAX_HEIGHT] }),
            translateY: idleAnim.interpolate({ inputRange: [0, 1], outputRange: [(SIGNAL_BAR_MAX_HEIGHT - 10) / 2, (SIGNAL_BAR_MAX_HEIGHT - 18) / 2] })
        }
    ];
    const previewText = liveTranscript
        ? `"${liveTranscript}"`
        : voiceState.preview;
    const handlePress = isListening
        ? () => stopListening(false, true)
        : startListening;
    const isCompactVariant = variant !== 'AI';
    const compactButtonLabel = !speechRecognitionAvailable
        ? 'VOICE OFF'
        : isListening
            ? 'LISTENING'
            : isStarting
                ? 'STARTING'
                : disabled
                    ? 'PLEASE WAIT'
                    : 'TAP TO SPEAK';

    if (isCompactVariant) {
        return (
            <View style={styles.compactContainer}>
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.compactGlow,
                        {
                            backgroundColor: voiceState.glowColor,
                            opacity: glowOpacity,
                            transform: [{ scale: ringScale }]
                        }
                    ]}
                />
                <TouchableOpacity
                    activeOpacity={0.9}
                    disabled={disabled && !isListening}
                    onPress={handlePress}
                    style={styles.compactButtonTouch}
                    accessibilityRole="button"
                    accessibilityLabel={voiceState.title}
                >
                    <LinearGradient colors={voiceState.buttonColors} style={styles.compactButton}>
                        <Ionicons name={voiceState.icon} size={18} color="#fff" />
                        <Text style={styles.compactButtonText}>{compactButtonLabel}</Text>
                    </LinearGradient>
                </TouchableOpacity>
                {!!liveTranscript && (
                    <Text numberOfLines={1} style={styles.compactTranscript}>
                        {liveTranscript}
                    </Text>
                )}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.cardGlow,
                    {
                        backgroundColor: voiceState.glowColor,
                        opacity: glowOpacity,
                        transform: [{ scale: ringScale }]
                    }
                ]}
            />
            <LinearGradient colors={voiceState.cardColors} style={styles.voiceCard}>
                <View style={styles.topRow}>
                    <View style={[styles.aiBadge, { backgroundColor: voiceState.badgeColor }]}>
                        <Ionicons name="hardware-chip-outline" size={13} color="#9be7ff" />
                        <Text style={styles.aiBadgeText}>AI VOICE CORE</Text>
                    </View>
                    <View style={[styles.stateBadge, { borderColor: voiceState.ringColor, backgroundColor: voiceState.badgeColor }]}>
                        <View style={[styles.stateDot, { backgroundColor: voiceState.ringColor }]} />
                        <Text style={styles.stateBadgeText}>{voiceState.label}</Text>
                    </View>
                </View>

                <View style={styles.mainRow}>
                    <View style={styles.orbStage}>
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.orbRing,
                                {
                                    borderColor: voiceState.ringColor,
                                    transform: [{ scale: ringScale }]
                                }
                            ]}
                        />
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.orbHalo,
                                {
                                    backgroundColor: voiceState.glowColor,
                                    opacity: glowOpacity
                                }
                            ]}
                        />
                        <TouchableOpacity
                            activeOpacity={0.9}
                            disabled={disabled && !isListening}
                            onPress={handlePress}
                            style={styles.orbTouch}
                            accessibilityRole="button"
                            accessibilityLabel={voiceState.title}
                        >
                            <LinearGradient colors={voiceState.buttonColors} style={styles.orbButton}>
                                <Ionicons name={voiceState.icon} size={30} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.copyBlock}>
                        <Text style={styles.voiceTitle}>{voiceState.title}</Text>
                        <Text style={styles.voiceSubtitle}>{voiceState.subtitle}</Text>

                        <View style={styles.signalRow}>
                            {signalBars.map((bar, idx) => (
                                <View key={`signal-${idx}`} style={styles.signalBarTrack}>
                                    <Animated.View
                                        style={[
                                            styles.signalBar,
                                            {
                                                opacity: isListening || isStarting ? 1 : 0.7,
                                                transform: [
                                                    { translateY: bar.translateY },
                                                    { scaleY: bar.scaleY }
                                                ]
                                            }
                                        ]}
                                    />
                                </View>
                            ))}
                            <Text style={styles.signalText}>{voiceState.hint}</Text>
                        </View>

                        <View style={styles.previewCard}>
                            <Ionicons
                                name={liveTranscript ? 'chatbubble-ellipses-outline' : 'sparkles-outline'}
                                size={14}
                                color={liveTranscript ? '#67e8f9' : '#f9a8d4'}
                            />
                            <Text numberOfLines={2} style={[styles.previewText, liveTranscript && styles.previewTextActive]}>
                                {previewText}
                            </Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    compactContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8
    },
    compactGlow: {
        position: 'absolute',
        width: 190,
        height: 56,
        borderRadius: 28
    },
    compactButtonTouch: {
        borderRadius: 24,
        overflow: 'hidden'
    },
    compactButton: {
        minWidth: 168,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)'
    },
    compactButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.8
    },
    compactTranscript: {
        marginTop: 6,
        maxWidth: 220,
        color: 'rgba(255,255,255,0.72)',
        fontSize: 11,
        textAlign: 'center'
    },
    container: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8
    },
    cardGlow: {
        position: 'absolute',
        width: '94%',
        height: 152,
        borderRadius: 32,
    },
    voiceCard: {
        width: '100%',
        borderRadius: 28,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        overflow: 'hidden'
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10
    },
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        gap: 6
    },
    aiBadgeText: {
        color: '#e0f2fe',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1
    },
    stateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        gap: 6
    },
    stateDot: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    stateBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.6
    },
    mainRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    orbStage: {
        width: 108,
        height: 108,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16
    },
    orbRing: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 1.5
    },
    orbHalo: {
        position: 'absolute',
        width: 86,
        height: 86,
        borderRadius: 43
    },
    orbTouch: {
        width: 82,
        height: 82,
        borderRadius: 41,
        overflow: 'hidden'
    },
    orbButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    copyBlock: {
        flex: 1
    },
    voiceTitle: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '900'
    },
    voiceSubtitle: {
        color: 'rgba(255,255,255,0.72)',
        fontSize: 12,
        lineHeight: 18,
        marginTop: 4
    },
    signalRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginTop: 12,
        marginBottom: 12,
        gap: 5
    },
    signalBarTrack: {
        width: 4,
        height: SIGNAL_BAR_MAX_HEIGHT,
        justifyContent: 'flex-end',
        overflow: 'hidden'
    },
    signalBar: {
        width: 4,
        height: SIGNAL_BAR_MAX_HEIGHT,
        borderRadius: 999,
        backgroundColor: '#8be9ff'
    },
    signalText: {
        color: '#dbeafe',
        fontSize: 11,
        fontWeight: '800',
        marginLeft: 6,
        letterSpacing: 0.4
    },
    previewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)'
    },
    previewText: {
        flex: 1,
        color: 'rgba(255,255,255,0.72)',
        fontSize: 12,
        lineHeight: 18
    },
    previewTextActive: {
        color: '#fff',
        fontWeight: '700'
    },
});

export default VoiceHandler;
