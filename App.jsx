import { Ionicons } from '@expo/vector-icons';
import * as Battery from 'expo-battery';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    AppState,
    Dimensions,
    ImageBackground,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { askSoniya, clearChatHistory } from './api/gemini';
import { initSoniyaVoice, soniyaSpeak } from './api/voiceService';
import SoniyaAvatar from './components/SoniyaAvatar';
import SplashScreen from './components/SplashScreen';
import VoiceHandler from './components/VoiceHandler';

const BACKGROUND_IMG = require('./assets/images/bg.jpg');
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const WAKE_WORDS = ['soniya', 'jaan', 'jaani', 'malangni'];
const QUICK_WAKE_REPLIES = [
    'Jee Nabeel, main yahin hoon.',
    'Ji Nabeel, sun rahi hoon bolo.',
    'Nabeel, aap ki Soniya hazir hai.'
];

export default function App() {
    const [isReady, setIsReady] = useState(false);
    const [soniyaWords, setSoniyaWords] = useState("Soniya: Loading...");
    const [mood, setMood] = useState("CALM");
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Profile & Settings States
    const [showSettings, setShowSettings] = useState(false);
    const [userName, setUserName] = useState('Nabeel');
    const [voiceResponse, setVoiceResponse] = useState(true);
    const [alwaysListenEnabled, setAlwaysListenEnabled] = useState(false);
    const [autoEnableOnCharging, setAutoEnableOnCharging] = useState(false);
    const [isCharging, setIsCharging] = useState(false);
    const [wakeLang, setWakeLang] = useState('ur-PK');
    const [isWakeListening, setIsWakeListening] = useState(false);
    const [midnightMode, setMidnightMode] = useState(false);
    const [viewType, setViewType] = useState('FULL');
    const [vibe, setVibe] = useState('CHILL'); // CHILL, ENERGETIC
    const [userInputText, setUserInputText] = useState('');
    const [appState, setAppState] = useState(AppState.currentState);

    const wakeRestartTimerRef = useRef(null);
    const lastWakeHitRef = useRef(0);
    const isSpeakingRef = useRef(false);

    const greetings = [
        `Soniya: Assalam-o-Alaikum ${userName}, main aaj bhi aap ke saath hoon.`,
        `Soniya: ${userName}, aap ka din kaisa ja raha hai? Main sun rahi hoon.`,
        `Soniya: Salaam ${userName}, dil halka karna ho to mujh se baat karein.`,
        `Soniya: ${userName}, aap meri priority chat ho, bolo kya baat hai.`,
        `Soniya: ${userName}, main pyar se guide karungi, bas bolo.`,
    ];

    useEffect(() => {
        if (isReady) {
            const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
            setSoniyaWords(randomGreeting);
        }
    }, [isReady]);

    const orb1Pos = useRef(new Animated.Value(0)).current;
    const orb2Pos = useRef(new Animated.Value(0)).current;

    async function onFetchUpdateAsync() {
        try {
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
            }
        } catch (e) { console.log(e); }
    }

    useEffect(() => {
        if (!__DEV__) onFetchUpdateAsync();
        initSoniyaVoice();

        const createFloatingAnim = (val, duration, distance) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(val, { toValue: distance, duration, useNativeDriver: true }),
                    Animated.timing(val, { toValue: 0, duration, useNativeDriver: true }),
                ])
            );
        };

        createFloatingAnim(orb1Pos, 8000, 40).start();
        createFloatingAnim(orb2Pos, 10000, -30).start();
    }, []);

    useEffect(() => {
        isSpeakingRef.current = isSpeaking;
    }, [isSpeaking]);

    useEffect(() => {
        const stateSub = AppState.addEventListener('change', setAppState);
        let batterySub = null;

        Battery.getBatteryStateAsync()
            .then((state) => {
                setIsCharging(state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL);
            })
            .catch(() => {});

        batterySub = Battery.addBatteryStateListener(({ batteryState }) => {
            setIsCharging(batteryState === Battery.BatteryState.CHARGING || batteryState === Battery.BatteryState.FULL);
        });

        return () => {
            stateSub.remove();
            batterySub?.remove?.();
        };
    }, []);

    useEffect(() => {
        if (autoEnableOnCharging) {
            setAlwaysListenEnabled(isCharging);
        }
    }, [autoEnableOnCharging, isCharging]);

    const stopWakeListening = useCallback(async () => {
        if (wakeRestartTimerRef.current) {
            clearTimeout(wakeRestartTimerRef.current);
            wakeRestartTimerRef.current = null;
        }
        try {
            await ExpoSpeechRecognitionModule.stop();
        } catch (_err) {
            // Ignore stop errors.
        }
        setIsWakeListening(false);
    }, []);

    const startWakeListening = useCallback(async () => {
        if (!alwaysListenEnabled || appState !== 'active' || isSpeakingRef.current) return;

        const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!permission.granted) {
            setAlwaysListenEnabled(false);
            return;
        }

        const langs = ['pa-PK', 'ur-PK', 'hi-IN', 'en-US'];
        for (const lang of langs) {
            try {
                await ExpoSpeechRecognitionModule.start({
                    lang,
                    interimResults: true,
                    continuous: true,
                    requiresOnDeviceRecognition: false,
                });
                setWakeLang(lang);
                setIsWakeListening(true);
                return;
            } catch (_err) {
                // Try next language.
            }
        }

        setIsWakeListening(false);
    }, [alwaysListenEnabled, appState]);

    useEffect(() => {
        if (alwaysListenEnabled && appState === 'active') {
            startWakeListening();
        } else {
            stopWakeListening();
        }
    }, [alwaysListenEnabled, appState, startWakeListening, stopWakeListening]);

    useSpeechRecognitionEvent('end', () => {
        setIsWakeListening(false);
        if (!alwaysListenEnabled || appState !== 'active' || isSpeakingRef.current) return;
        wakeRestartTimerRef.current = setTimeout(() => {
            startWakeListening();
        }, 500);
    });

    useSpeechRecognitionEvent('error', () => {
        setIsWakeListening(false);
    });

    useSpeechRecognitionEvent('result', (event) => {
        if (!alwaysListenEnabled || appState !== 'active') return;
        const transcript = event.results?.[0]?.transcript?.trim();
        if (!transcript) return;

        const lower = transcript.toLowerCase();
        const hasWakeWord = WAKE_WORDS.some((word) => lower.includes(word));
        if (!hasWakeWord || isSpeakingRef.current) return;

        const now = Date.now();
        if (now - lastWakeHitRef.current < 3500) return;
        lastWakeHitRef.current = now;

        const quickReply = QUICK_WAKE_REPLIES[Math.floor(Math.random() * QUICK_WAKE_REPLIES.length)];
        setMood('HAPPY');
        setSoniyaWords(`Soniya: ${quickReply}`);

        if (voiceResponse) {
            soniyaSpeak(
                quickReply,
                () => setIsSpeaking(true),
                () => {
                    setIsSpeaking(false);
                    if (alwaysListenEnabled && appState === 'active') {
                        startWakeListening();
                    }
                }
            );
        }
    });

    useEffect(() => {
        return () => {
            if (wakeRestartTimerRef.current) {
                clearTimeout(wakeRestartTimerRef.current);
            }
        };
    }, []);

    const resetChat = () => {
        clearChatHistory();
        setSoniyaWords(`Soniya: Memory refresh ho gayi hai, ${userName}! Ab hum naye siray se baat kar saktay hain.`);
        setMood("HAPPY");
        setShowSettings(false);
    };

    const handleUserSpeech = useCallback(async (text) => {
        if (!text || text.trim() === "" || isSpeaking) return;
        setIsSpeaking(true);
        setMood('HAPPY');
        setSoniyaWords("...");
        try {
            // Include userName and vibe in the context indirectly by prepending to user text if needed, 
            // or we could modify askSoniya to accept more params. For now, let's keep it simple.
            const enhancedPrompt = `(User Name: ${userName}, Vibe: ${vibe}) ${text}`;
            const result = await askSoniya(enhancedPrompt);

            if (result && result.text) {
                setSoniyaWords(result.text);
                setMood(result.mood);
                if (voiceResponse) {
                    if (alwaysListenEnabled) {
                        await stopWakeListening();
                    }
                    soniyaSpeak(
                        result.text,
                        () => setIsSpeaking(true),
                        () => {
                            setIsSpeaking(false);
                            if (alwaysListenEnabled && appState === 'active') {
                                startWakeListening();
                            }
                        }
                    );
                }
            } else {
                setSoniyaWords(`Maaf karna ${userName}, mujhe kuch samajh nahi aaya.`);
                setMood('SAD');
            }
        } catch (error) {
            console.error("Speech Handler Error:", error);
            setSoniyaWords("Connection mein kuch masla hai, Jaani.");
            setMood('SAD');
        } finally {
            setIsSpeaking(false);
        }
    }, [voiceResponse, isSpeaking, userName, vibe, alwaysListenEnabled, appState, startWakeListening, stopWakeListening]);

    if (!isReady) return <SplashScreen onFinish={() => setIsReady(true)} />;

    return (
        <SafeAreaProvider>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <ImageBackground
                source={BACKGROUND_IMG}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
            >
                <LinearGradient
                    colors={midnightMode ? ['rgba(5,1,17,0.7)', 'rgba(26,4,77,0.85)'] : ['rgba(2,0,10,0.5)', 'rgba(60,10,120,0.7)']}
                    style={StyleSheet.absoluteFill}
                />

                <View style={StyleSheet.absoluteFill}>
                    <Animated.View style={[styles.orb, styles.orb1, { backgroundColor: midnightMode ? '#4b0082' : '#ff00ff', transform: [{ translateY: orb1Pos }, { scale: 1.8 }] }]} />
                    <Animated.View style={[styles.orb, styles.orb2, { backgroundColor: '#00ffff', transform: [{ translateX: orb2Pos }, { scale: 1.5 }] }]} />
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <SafeAreaView style={styles.container}>
                        <View style={styles.header}>
                            <View style={styles.headerRow}>
                                <View style={styles.topBar}>
                                    <View style={styles.statusDot} />
                                    <Text style={styles.brand}>Noshahi Developers Inc.</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.profileBtn}>
                                    <View style={styles.profileIconWrapper}>
                                        <Ionicons name="person" size={20} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.appName}>SONIYA <Text style={styles.v1}>PRO</Text></Text>
                        </View>

                        <View style={styles.stageArea}>
                            <View style={styles.avatarLayer}>
                                <SoniyaAvatar mood={mood} isSpeaking={isSpeaking} viewType={viewType} />
                            </View>

                            <View style={styles.controlsOverlay}>
                                <BlurView intensity={45} tint="dark" style={styles.speechPanel}>
                                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                                        <Text style={styles.speechText}>{soniyaWords}</Text>
                                    </ScrollView>
                                </BlurView>

                                <View style={styles.footerInner}>
                                    <View style={styles.inputContainer}>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder={`Baat karein ${userName}...`}
                                            placeholderTextColor="rgba(255,255,255,0.4)"
                                            value={userInputText}
                                            onChangeText={setUserInputText}
                                            onSubmitEditing={() => {
                                                if (userInputText.trim()) {
                                                    handleUserSpeech(userInputText);
                                                    setUserInputText('');
                                                }
                                            }}
                                        />
                                        <TouchableOpacity
                                            style={styles.sendBtn}
                                            onPress={() => {
                                                if (userInputText.trim()) {
                                                    handleUserSpeech(userInputText);
                                                    setUserInputText('');
                                                }
                                            }}
                                        >
                                            <LinearGradient colors={['#ff69b4', '#ff1493']} style={styles.sendIconBg}>
                                                <Ionicons name="send" size={18} color="#fff" />
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </View>
                                    <VoiceHandler onSpeechResult={handleUserSpeech} disabled={alwaysListenEnabled} />
                                    <Text style={styles.wakeStatus}>
                                        {alwaysListenEnabled
                                            ? `Wake mode ON (${wakeLang}) • ${isWakeListening ? 'Listening' : 'Reconnecting'}`
                                            : 'Wake mode OFF'}
                                    </Text>
                                    <Text style={styles.footerBrand}>Powered by NDI - Soniya v1.2.0</Text>
                                </View>
                            </View>
                        </View>
                    </SafeAreaView>
                </KeyboardAvoidingView>

                <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
                    <View style={styles.modalOverlay}>
                        <BlurView intensity={100} tint="dark" style={styles.modalContent}>
                            <LinearGradient
                                colors={['rgba(255,105,180,0.1)', 'transparent']}
                                style={StyleSheet.absoluteFill}
                            />
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.settingsScrollContent}>
                                <View style={styles.modalHeader}>
                                    <View>
                                        <Text style={styles.modalTitle}>SONIYA&apos;S PROFILE</Text>
                                        <Text style={styles.modalSubtitle}>Configure your AI Experience</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.closeModalBtn}>
                                        <Ionicons name="close" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>

                                {/* User Profile Section */}
                                <View style={styles.userCard}>
                                    <View style={styles.userAvatar}>
                                        <Ionicons name="person" size={30} color="#ff69b4" />
                                    </View>
                                    <View style={styles.userInfo}>
                                        <Text style={styles.userLabel}>Your Name</Text>
                                        <TextInput
                                            style={styles.userNameInput}
                                            value={userName}
                                            onChangeText={setUserName}
                                            placeholder="Enter your name"
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                        />
                                    </View>
                                </View>

                                <Text style={styles.sectionTitle}>PREFERENCES</Text>

                                <View style={styles.settingItem}>
                                    <View style={styles.settingTextGroup}>
                                        <View style={styles.iconCircle}><Ionicons name="volume-medium" size={18} color="#fff" /></View>
                                        <View>
                                            <Text style={styles.settingLabel}>Voice Response</Text>
                                            <Text style={styles.settingDesc}>Natural Hindi/Urdu audio</Text>
                                        </View>
                                    </View>
                                    <Switch value={voiceResponse} onValueChange={setVoiceResponse} trackColor={{ false: '#333', true: '#ff69b4' }} />
                                </View>

                                <View style={styles.settingItem}>
                                    <View style={styles.settingTextGroup}>
                                        <View style={[styles.iconCircle, { backgroundColor: '#22c55e' }]}><Ionicons name="mic" size={18} color="#fff" /></View>
                                        <View>
                                            <Text style={styles.settingLabel}>Always Listen</Text>
                                            <Text style={styles.settingDesc}>Wake words: Soniya, Jaan, Jaani, Malangni</Text>
                                        </View>
                                    </View>
                                    <Switch value={alwaysListenEnabled} onValueChange={setAlwaysListenEnabled} trackColor={{ false: '#333', true: '#22c55e' }} />
                                </View>

                                <View style={styles.settingItem}>
                                    <View style={styles.settingTextGroup}>
                                        <View style={[styles.iconCircle, { backgroundColor: '#f59e0b' }]}><Ionicons name="battery-charging" size={18} color="#fff" /></View>
                                        <View>
                                            <Text style={styles.settingLabel}>Auto Enable on Charging</Text>
                                            <Text style={styles.settingDesc}>Charging par wake mode auto ON ho jayega</Text>
                                        </View>
                                    </View>
                                    <Switch value={autoEnableOnCharging} onValueChange={setAutoEnableOnCharging} trackColor={{ false: '#333', true: '#f59e0b' }} />
                                </View>

                                <View style={styles.settingItem}>
                                    <View style={styles.settingTextGroup}>
                                        <View style={[styles.iconCircle, { backgroundColor: '#4b0082' }]}><Ionicons name="moon" size={18} color="#fff" /></View>
                                        <View>
                                            <Text style={styles.settingLabel}>Midnight Vibe</Text>
                                            <Text style={styles.settingDesc}>Poetic and Deep personality</Text>
                                        </View>
                                    </View>
                                    <Switch value={midnightMode} onValueChange={setMidnightMode} trackColor={{ false: '#333', true: '#4b0082' }} />
                                </View>

                                <View style={styles.settingItem}>
                                    <View style={styles.settingTextGroup}>
                                        <View style={[styles.iconCircle, { backgroundColor: '#00ffff' }]}><Ionicons name="flash" size={18} color="#fff" /></View>
                                        <View>
                                            <Text style={styles.settingLabel}>Response Vibe</Text>
                                            <Text style={styles.settingDesc}>{vibe === 'CHILL' ? 'Calm & Friendly' : 'Fast & Energetic'}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => setVibe(vibe === 'CHILL' ? 'ENERGETIC' : 'CHILL')} style={styles.vibeToggle}>
                                        <Text style={styles.vibeText}>{vibe}</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.settingItem}>
                                    <View style={styles.settingTextGroup}>
                                        <View style={[styles.iconCircle, { backgroundColor: '#ffd700' }]}><Ionicons name="camera" size={18} color="#fff" /></View>
                                        <View>
                                            <Text style={styles.settingLabel}>Camera View</Text>
                                            <Text style={styles.settingDesc}>Current: {viewType}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.viewToggle}>
                                        {['FULL', 'HALF', 'CLOSEUP'].map((v) => (
                                            <TouchableOpacity key={v} onPress={() => setViewType(v)} style={[styles.miniToggle, viewType === v && styles.miniToggleActive]}>
                                                <Text style={[styles.miniToggleText, viewType === v && styles.miniToggleTextActive]}>{v[0]}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <TouchableOpacity onPress={resetChat} style={styles.resetBtn}>
                                    <LinearGradient colors={['#ff69b4', '#ff1493']} style={styles.resetGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                        <Ionicons name="refresh" size={20} color="#fff" /><Text style={styles.resetBtnText}>Clear History & Reset</Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                <View style={styles.profileSection}>
                                    <Text style={styles.profileTitle}>SYSTEM INFO</Text>
                                    <View style={styles.devCard}>
                                        <Ionicons name="shield-check" size={24} color="#ff69b4" />
                                        <View style={styles.devInfo}>
                                            <Text style={styles.devName}>Noshahi Developers Inc.</Text>
                                            <Text style={styles.devRole}>Authorized Premium Build • 2026</Text>
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>
                        </BlurView>
                    </View>
                </Modal>
            </ImageBackground>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, position: 'relative' },
    header: { marginTop: 10, paddingHorizontal: 25, zIndex: 5 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    topBar: { flexDirection: 'row', alignItems: 'center' },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80', marginRight: 8, shadowColor: '#4ade80', shadowRadius: 5, shadowOpacity: 0.8 },
    brand: { color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 3, fontWeight: '700' },
    profileBtn: { padding: 5 },
    profileIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,105,180,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    appName: { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: 1, textAlign: 'left', marginTop: 2 },
    v1: { color: '#ff69b4', fontSize: 18 },
    stageArea: { flex: 1, justifyContent: 'flex-end' },
    avatarLayer: { ...StyleSheet.absoluteFillObject, zIndex: 2, justifyContent: 'flex-end' },
    controlsOverlay: { zIndex: 6, paddingHorizontal: 16, paddingBottom: 14 },
    speechPanel: {
        maxHeight: SCREEN_HEIGHT * 0.2,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,105,180,0.2)',
        backgroundColor: 'rgba(4,8,24,0.45)',
        marginBottom: 10
    },
    speechText: { color: '#fff', fontSize: 18, textAlign: 'center', lineHeight: 26, fontWeight: '600' },
    footerInner: { alignItems: 'center', width: '100%' },
    wakeStatus: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 8, fontWeight: '700', letterSpacing: 0.3 },
    footerBrand: { color: 'rgba(255,255,255,0.2)', fontSize: 10, marginTop: 10, letterSpacing: 2, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { height: '85%', borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden', borderTopWidth: 1, borderTopColor: 'rgba(255, 105, 180, 0.3)' },
    settingsScrollContent: { padding: 25, paddingBottom: 50 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
    modalTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 2 },
    modalSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
    closeModalBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: 20, borderRadius: 30, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,105,180,0.2)' },
    userAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,105,180,0.1)', justifyContent: 'center', alignItems: 'center' },
    userInfo: { marginLeft: 15, flex: 1 },
    userLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
    userNameInput: { color: '#fff', fontSize: 20, fontWeight: '700', paddingVertical: 0 },
    sectionTitle: { color: '#ff1493', fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 15, marginLeft: 5 },
    settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.05)', padding: 18, borderRadius: 25 },
    settingTextGroup: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ff69b4', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    settingLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
    settingDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
    vibeToggle: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15 },
    vibeText: { color: '#00ffff', fontSize: 10, fontWeight: '900' },
    profileSection: { marginTop: 20 },
    profileTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 3, marginBottom: 15 },
    devCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', padding: 15, borderRadius: 25 },
    devInfo: { marginLeft: 15 },
    devName: { color: '#fff', fontSize: 15, fontWeight: '700' },
    devRole: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
    viewToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, padding: 4 },
    miniToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    miniToggleActive: { backgroundColor: '#ff69b4' },
    miniToggleText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800' },
    miniToggleTextActive: { color: '#fff' },
    resetBtn: { marginTop: 20, borderRadius: 25, overflow: 'hidden', elevation: 5 },
    resetGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
    resetBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 5, gap: 10 },
    textInput: { flex: 1, height: 52, backgroundColor: 'rgba(2,8,22,0.58)', borderRadius: 26, paddingHorizontal: 20, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,105,180,0.3)' },
    sendBtn: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    sendIconBg: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    orb: { position: 'absolute', width: 500, height: 500, borderRadius: 250, opacity: 0.15 },
    orb1: { top: -100, right: -100, shadowColor: '#ff00ff', shadowRadius: 100, shadowOpacity: 0.8 },
    orb2: { bottom: '10%', left: -150, shadowColor: '#00ffff', shadowRadius: 100, shadowOpacity: 0.8 },
});

