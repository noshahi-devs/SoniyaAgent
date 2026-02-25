import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
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
import { soniyaSpeak } from './api/voiceService';
import SoniyaAvatar from './components/SoniyaAvatar';
import SplashScreen from './components/SplashScreen';
import VoiceHandler from './components/VoiceHandler';

export default function App() {
    const [isReady, setIsReady] = useState(false);
    const [soniyaWords, setSoniyaWords] = useState("Soniya: Loading...");
    const [mood, setMood] = useState("CALM");
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Settings States
    const [showSettings, setShowSettings] = useState(false);
    const [voiceResponse, setVoiceResponse] = useState(true);
    const [hapticsEnabled, setHapticsEnabled] = useState(true);
    const [midnightMode, setMidnightMode] = useState(false);
    const [viewType, setViewType] = useState('FULL'); // FULL, HALF, CLOSEUP
    const [userInputText, setUserInputText] = useState('');

    const greetings = [
        "Soniya: Hello Jaani! Aaj hum kis baaray mein baat karein?",
        "Soniya: Salaam! Main Soniya hoon, kaho kya haal hai?",
        "Soniya: Noshahi Developers ki janib se salaam! Main haazir hoon.",
        "Soniya: Hi! Aapki AI dost haazir hai, kuch help chahiye?",
        "Soniya: Assalam-o-Alaikum! Kaho aaj kya naya seekhna hai?",
        "Soniya: Hello! Soniya present hai, hukam karein mere dost!"
    ];

    useEffect(() => {
        if (isReady) {
            const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
            setSoniyaWords(randomGreeting);
        }
    }, [isReady]);

    // Background Animation Values
    const orb1Pos = useRef(new Animated.Value(0)).current;
    const orb2Pos = useRef(new Animated.Value(0)).current;
    const orb3Pos = useRef(new Animated.Value(0)).current;

    // Check for Live Updates
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
        onFetchUpdateAsync();

        // Start Background Animations
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
        createFloatingAnim(orb3Pos, 7000, 50).start();
    }, []);

    const resetChat = () => {
        clearChatHistory();
        setSoniyaWords("Soniya: Memory refresh ho gayi hai, Jaani! Ab hum naye siray se baat kar saktay hain.");
        setMood("HAPPY");
    };

    if (!isReady) return <SplashScreen onFinish={() => setIsReady(true)} />;

    const handleUserSpeech = async (text) => {
        const result = await askSoniya(text);
        setSoniyaWords(result.text);
        setMood(result.mood);

        if (voiceResponse) {
            soniyaSpeak(result.text,
                () => setIsSpeaking(true),
                () => setIsSpeaking(false)
            );
        }
    };

    return (
        <SafeAreaProvider>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={midnightMode ? ['#050111', '#1a044d', '#050111'] : ['#080315', '#1a0a2e', '#050111']}
                style={styles.mainWrapper}
            >
                {/* Decorative Neon Orbs for Depth & Animation */}
                <Animated.View style={[
                    styles.orb, styles.orb1,
                    {
                        backgroundColor: midnightMode ? '#4b0082' : '#ff1493',
                        transform: [{ translateY: orb1Pos }, { scale: 1.5 }]
                    }
                ]} />
                <Animated.View style={[
                    styles.orb, styles.orb2,
                    {
                        backgroundColor: midnightMode ? '#1a044d' : '#00ffff',
                        transform: [{ translateX: orb2Pos }, { scale: 1.2 }]
                    }
                ]} />
                <Animated.View style={[
                    styles.orb, styles.orb3,
                    {
                        backgroundColor: midnightMode ? '#4b0082' : '#8a2be2',
                        transform: [{ translateY: orb3Pos }, { scale: 1.3 }]
                    }
                ]} />

                <SafeAreaView style={styles.container}>

                    {/* Header with Profile Icon */}
                    <View style={styles.header}>
                        <View style={styles.headerRow}>
                            <View style={styles.topBar}>
                                <View style={styles.statusDot} />
                                <Text style={styles.brand}>Noshahi Developers Inc.</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.profileBtn}>
                                <Ionicons name="person-circle-outline" size={32} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.appName}>SONIYA <Text style={styles.v1}>PRO</Text></Text>
                    </View>

                    <View style={styles.avatarSpace}>
                        <SoniyaAvatar mood={mood} isSpeaking={isSpeaking} viewType={viewType} />
                    </View>

                    <View style={styles.contentContainer}>
                        <BlurView intensity={40} tint="dark" style={styles.chatBoxLayer}>
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ padding: 25 }}
                            >
                                <Text style={styles.speechText}>
                                    {soniyaWords}
                                </Text>
                            </ScrollView>
                        </BlurView>
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                        style={styles.keyboardView}
                    >
                        <View style={styles.footerInner}>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Type a message..."
                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                    value={userInputText}
                                    onChangeText={setUserInputText}
                                    placeholderStyle={{ fontWeight: '400' }}
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
                                    <View style={styles.sendIconBg}>
                                        <Ionicons name="send" size={18} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.voiceWrapper}>
                                <VoiceHandler onSpeechResult={handleUserSpeech} />
                                <Text style={styles.footerBrand}>AI Companion • Version 1.0.8</Text>
                            </View>
                        </View>
                    </KeyboardAvoidingView>

                    {/* Settings Modal */}
                    <Modal
                        visible={showSettings}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setShowSettings(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <BlurView intensity={90} tint="dark" style={styles.modalContent}>
                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={styles.settingsScrollContent}
                                >
                                    <View style={styles.modalHeader}>
                                        <Text style={styles.modalTitle}>SONIYA SETTINGS</Text>
                                        <TouchableOpacity onPress={() => setShowSettings(false)}>
                                            <Ionicons name="close" size={28} color="#fff" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.settingItem}>
                                        <View>
                                            <Text style={styles.settingLabel}>Voice Response</Text>
                                            <Text style={styles.settingDesc}>Soniya will speak back to you</Text>
                                        </View>
                                        <Switch
                                            value={voiceResponse}
                                            onValueChange={setVoiceResponse}
                                            trackColor={{ false: '#767577', true: '#ff69b4' }}
                                        />
                                    </View>

                                    <View style={styles.settingItem}>
                                        <View>
                                            <Text style={styles.settingLabel}>Haptic Feedback</Text>
                                            <Text style={styles.settingDesc}>Touch & voice vibrations</Text>
                                        </View>
                                        <Switch
                                            value={hapticsEnabled}
                                            onValueChange={setHapticsEnabled}
                                            trackColor={{ false: '#767577', true: '#ff69b4' }}
                                        />
                                    </View>

                                    <View style={styles.settingItem}>
                                        <View>
                                            <Text style={styles.settingLabel}>Midnight Mode</Text>
                                            <Text style={styles.settingDesc}>Deep & poetic AI personality</Text>
                                        </View>
                                        <Switch
                                            value={midnightMode}
                                            onValueChange={setMidnightMode}
                                            trackColor={{ false: '#767577', true: '#4b0082' }}
                                        />
                                    </View>

                                    <View style={styles.settingItem}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.settingLabel}>Body View</Text>
                                            <Text style={styles.settingDesc}>Current: {viewType}</Text>
                                        </View>
                                        <View style={styles.viewToggle}>
                                            {['FULL', 'HALF', 'CLOSEUP'].map((v) => (
                                                <TouchableOpacity
                                                    key={v}
                                                    onPress={() => setViewType(v)}
                                                    style={[styles.miniToggle, viewType === v && styles.miniToggleActive]}
                                                >
                                                    <Text style={[styles.miniToggleText, viewType === v && styles.miniToggleTextActive]}>{v[0]}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    <TouchableOpacity onPress={resetChat} style={styles.resetBtn}>
                                        <LinearGradient
                                            colors={['#ff69b4', '#ff1493']}
                                            style={styles.resetGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <Ionicons name="refresh" size={20} color="#fff" />
                                            <Text style={styles.resetBtnText}>Refresh Soniya's Memory</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>

                                    <View style={styles.profileSection}>
                                        <Text style={styles.profileTitle}>Your Developer</Text>
                                        <View style={styles.devCard}>
                                            <Ionicons name="code-working" size={24} color="#ff69b4" />
                                            <View style={styles.devInfo}>
                                                <Text style={styles.devName}>Nabeel Noshahi</Text>
                                                <Text style={styles.devRole}>Lead Mobile Developer</Text>
                                            </View>
                                        </View>
                                    </View>
                                </ScrollView>
                            </BlurView>
                        </View>
                    </Modal>

                </SafeAreaView>
            </LinearGradient>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    mainWrapper: { flex: 1 },
    container: { flex: 1 },
    header: { marginTop: 10, paddingHorizontal: 25 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    topBar: { flexDirection: 'row', alignItems: 'center' },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80', marginRight: 8, shadowColor: '#4ade80', shadowRadius: 5, shadowOpacity: 0.8 },
    brand: { color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 3, fontWeight: '700' },
    profileBtn: { padding: 5 },
    appName: { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: 1, textAlign: 'left', marginTop: 2 },
    v1: { color: '#ff69b4', fontSize: 18 },

    avatarSpace: { flex: 4, justifyContent: 'flex-end', overflow: 'hidden' },

    contentContainer: {
        flex: 3,
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    chatBoxLayer: {
        flex: 1,
        borderRadius: 35,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,105,180,0.15)',
        backgroundColor: 'rgba(255,255,255,0.04)',
        elevation: 10,
        shadowColor: '#ff69b4',
        shadowOffset: { width: 0, height: 5 },
        shadowRadius: 15,
        shadowOpacity: 0.1
    },
    speechText: {
        color: '#fff',
        fontSize: 18,
        textAlign: 'center',
        lineHeight: 26,
        fontWeight: '600',
        textShadowColor: 'rgba(255, 105, 180, 0.4)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },

    keyboardView: { width: '100%' },
    footerInner: { paddingBottom: 20, alignItems: 'center' },
    footerBrand: { color: 'rgba(255,255,255,0.2)', fontSize: 10, marginTop: 10, letterSpacing: 2, fontWeight: '600' },

    // Modal Styles
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalContent: {
        height: '75%',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        overflow: 'hidden',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 105, 180, 0.3)',
    },
    settingsScrollContent: {
        padding: 30,
        paddingBottom: 50,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    modalTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 4, textShadowColor: '#ff69b4', textShadowRadius: 15 },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 20,
        borderRadius: 25
    },
    settingLabel: { color: '#fff', fontSize: 18, fontWeight: '700' },
    settingDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 },

    profileSection: { marginTop: 20 },
    profileTitle: { color: '#ff69b4', fontSize: 12, fontWeight: '800', letterSpacing: 3, marginBottom: 15 },
    devCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        padding: 20,
        borderRadius: 30
    },
    devInfo: { marginLeft: 15 },
    devName: { color: '#fff', fontSize: 17, fontWeight: '700' },
    devRole: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },

    viewToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, padding: 4 },
    miniToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    miniToggleActive: { backgroundColor: '#ff69b4' },
    miniToggleText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800' },
    miniToggleTextActive: { color: '#fff' },

    resetBtn: { marginTop: 10, borderRadius: 20, overflow: 'hidden' },
    resetGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, gap: 10 },
    resetBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },

    // Input Styles
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
        gap: 10
    },
    textInput: {
        flex: 1,
        height: 54,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 27,
        paddingHorizontal: 22,
        color: '#fff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,105,180,0.25)'
    },
    sendBtn: {
        width: 54,
        height: 54,
        backgroundColor: '#ff69b4',
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#ff69b4',
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        shadowOpacity: 0.4
    },
    sendIconBg: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    voiceWrapper: {
        alignItems: 'center',
        paddingVertical: 5
    },

    // Background Orbs
    orb: {
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: 200,
        opacity: 0.15,
    },
    orb1: {
        top: -100,
        right: -100,
        backgroundColor: '#ff1493', // Neon Pink
        transform: [{ scale: 2 }],
        shadowColor: '#ff1493',
        shadowRadius: 150,
        shadowOpacity: 1,
    },
    orb2: {
        bottom: '30%',
        left: -150,
        backgroundColor: '#00ffff', // Neon Cyan
        transform: [{ scale: 1.5 }],
        shadowColor: '#00ffff',
        shadowRadius: 150,
        shadowOpacity: 1,
    },
    orb3: {
        top: '20%',
        right: -200,
        backgroundColor: '#8a2be2', // Neon Violet
        transform: [{ scale: 1.8 }],
        shadowColor: '#8a2be2',
        shadowRadius: 150,
        shadowOpacity: 1,
    },
});