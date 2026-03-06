import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as Battery from 'expo-battery';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    AppState,
    Dimensions,
    Image,
    ImageBackground,
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
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { askSoniya, clearChatHistory } from './api/gemini';
import { processLocalMemoryCommand } from './api/localMemory';
import { getSoniyaVoices, initSoniyaVoice, setPreferredVoice, soniyaSpeak } from './api/voiceService';
import SoniyaAvatar from './components/SoniyaAvatar';
import SplashScreen from './components/SplashScreen';
import VoiceHandler from './components/VoiceHandler';
import { useKeyboardLift } from './hooks/useKeyboardLift';
import { useUiSettingsStorage } from './hooks/useUiSettingsStorage';
import {
    ExpoSpeechRecognitionModule,
    isSpeechRecognitionAvailable,
    useSpeechRecognitionEvent
} from './utils/speechRecognitionSafe';

const BACKGROUND_SCENES = [
    {
        image: require('./assets/images/bg.jpg'),
        day: ['rgba(10,8,26,0.42)', 'rgba(95,26,160,0.62)'],
        night: ['rgba(2,1,12,0.62)', 'rgba(24,8,60,0.8)']
    },
    {
        image: require('./assets/images/bg_aurora.jpg'),
        day: ['rgba(5,24,48,0.4)', 'rgba(44,128,196,0.54)'],
        night: ['rgba(2,10,26,0.62)', 'rgba(10,40,82,0.8)']
    },
    {
        image: require('./assets/images/bg_rose.jpg'),
        day: ['rgba(30,8,34,0.4)', 'rgba(176,54,122,0.56)'],
        night: ['rgba(16,2,20,0.64)', 'rgba(70,14,68,0.8)']
    },
    {
        image: require('./assets/images/bg_midnight.jpg'),
        day: ['rgba(6,12,34,0.44)', 'rgba(52,78,172,0.58)'],
        night: ['rgba(1,4,16,0.66)', 'rgba(12,18,66,0.82)']
    },
    {
        image: require('./assets/images/bg_ocean.jpg'),
        day: ['rgba(4,24,30,0.38)', 'rgba(16,146,154,0.52)'],
        night: ['rgba(2,12,18,0.62)', 'rgba(6,52,70,0.78)']
    }
];
const COMPANY_LOGO = require('./assets/images/icon.png');
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MANUAL_WAKE_WORDS = ['soniya', 'sonia'];
const MOOD_OPTIONS = ['Happy', 'Sad', 'Serious', 'Lovely', 'Romantic', 'Calm', 'Playful'];
const SETTINGS_STORAGE_KEY = '@soniya_ui_settings_v1';
const DEFAULT_PERSONA_MOOD = 'Romantic';
const DEFAULT_VOICE_RATE = 1.0;
const DEFAULT_VOICE_HANDLER_VARIANT = 'COMPACT';
const VOICE_HANDLER_VARIANTS = ['COMPACT', 'AI'];
const VOICE_HANDLER_LABELS = {
    COMPACT: 'Mini',
    AI: 'AI Panel'
};
const BG_SWITCH_MS = 45000;
const BG_FADE_MS = 6200;
const INPUT_LINE_HEIGHT = 20;
const MAX_VISIBLE_INPUT_LINES = 3;
const MIN_INPUT_HEIGHT = 52;
const MAX_INPUT_HEIGHT = MIN_INPUT_HEIGHT + (INPUT_LINE_HEIGHT * (MAX_VISIBLE_INPUT_LINES - 1));
const TITLE_MAIN = 'SONIYA';
const TITLE_PRO = 'Agent';
const AVATAR_IDLE_DELAY_MS = 12000;
const AVATAR_IDLE_ROTATE_MIN_MS = 32000;
const AVATAR_IDLE_ROTATE_MAX_MS = 42000;
const AVATAR_STYLE_VARIANTS = ['CLASSIC', 'ELEGANT', 'CASUAL', 'OFFICE'];
const AVATAR_STYLE_LABELS = {
    CLASSIC: 'Classic look on hai.',
    ELEGANT: 'Elegant suit look activate kar di hai.',
    CASUAL: 'Casual stylish look switch kar di hai.',
    OFFICE: 'Office professional look set kar di hai.'
};
const AVATAR_IDLE_ACTIVITIES = ['PHONE', 'READING', 'RELAX', 'SLEEP', 'OFFICE'];
const AVATAR_MANUAL_ACTIVITIES = ['PHONE', 'READING', 'RELAX', 'OFFICE'];
const AVATAR_ACTIVITY_LABELS = {
    PHONE: 'mobile mode',
    READING: 'reading mode',
    RELAX: 'relax mode',
    SLEEP: 'sleep mode',
    OFFICE: 'office work mode'
};
const AVATAR_ACTIVITY_HINTS = [
    { mode: 'PHONE', keys: ['phone', 'mobile', 'cell', 'scroll', 'reel'] },
    { mode: 'READING', keys: ['read', 'reading', 'book', 'study', 'parh'] },
    { mode: 'RELAX', keys: ['relax', 'sofa', 'chill', 'rest'] },
    { mode: 'SLEEP', keys: ['sleep', 'sleeping', 'so jao', 'so ja', 'sona'] },
    { mode: 'OFFICE', keys: ['office', 'work', 'laptop', 'meeting', 'desk'] }
];
const BG_SCENE_HINTS = [
    { index: 0, keys: ['default', 'classic', 'romantic', 'purple'] },
    { index: 1, keys: ['aurora', 'sky', 'cyan', 'blue'] },
    { index: 2, keys: ['rose', 'pink'] },
    { index: 3, keys: ['midnight', 'night', 'dark'] },
    { index: 4, keys: ['ocean', 'sea', 'teal'] }
];
const USER_MANUAL_COMMANDS = {
    EN: [
        { title: 'Auto Mode', trigger: '"Auto mode on" / "Auto mode off"', result: 'Avatar auto switching start/stop.' },
        { title: 'Pose / Activity', trigger: '"mode change" / "pose change" / "mobile mode" / "office mode"', result: 'Avatar activity instantly change.' },
        { title: 'Dress Change', trigger: '"dress change" / "style change" / "new look"', result: 'Avatar dress style tone change.' },
        { title: 'Background Change', trigger: '"background change" / "bg change" / "ocean background"', result: 'Scene background instantly change.' },
        { title: 'Voice Settings', trigger: 'Profile > Voice Speed / Voice Style', result: 'Speech speed and voice persona control.' },
        { title: 'Always Listen', trigger: 'Profile > Always Listen toggle', result: 'Wake listening continuous mode.' },
        { title: 'Camera View', trigger: 'Profile > Camera View', result: 'FULL / HALF / CLOSEUP switch.' }
    ],
    UR: [
        { title: 'Auto Mode', trigger: '"Auto mode on" / "Auto mode off"', result: 'Avatar ka auto switching on/off ho jata hai.' },
        { title: 'Pose / Activity', trigger: '"mode change" / "pose change" / "mobile mode" / "office mode"', result: 'Avatar ka mode foran change ho jata hai.' },
        { title: 'Dress Change', trigger: '"dress change" / "style change" / "new look"', result: 'Avatar ka dress style tone change hota hai.' },
        { title: 'Background Change', trigger: '"background change" / "bg change" / "ocean background"', result: 'Scene background foran change hota hai.' },
        { title: 'Voice Settings', trigger: 'Profile > Voice Speed / Voice Style', result: 'Awaaz ki speed aur voice selection control hoti hai.' },
        { title: 'Always Listen', trigger: 'Profile > Always Listen toggle', result: 'Wake listening continuously active rehti hai.' },
        { title: 'Camera View', trigger: 'Profile > Camera View', result: 'FULL / HALF / CLOSEUP view switch hota hai.' }
    ]
};
const LOADING_LINES = [
    'Soniya: Heartbeat sync ho rahi hai...',
    'Soniya: Jaani main ap ke liye tayyar ho rahi hun...',
    'Soniya: Neural charm activate ho raha hai...',
    'Soniya: Main tayyar hoon, bas ek minute...',
    'Soniya: Jaani ma aa rahi hun...',
    'Soniya: Aap ke vibes ko feel kar rahi hoon...',
    'Soniya: AI soul warm-up mode...',
    'Soniya: Connection aur emotions align ho rahe hain...'
];
const THINKING_LINES = [
    'Soniya: Aap ki baat mehsoos karke reply bana rahi hoon...',
    'Soniya: Dil aur logic dono se soch rahi hoon...',
    'Soniya: Best jawab craft ho raha hai...',
    'Soniya: Ek pyara sa smart reply tayyar ho raha hai...',
    'Soniya: Main focus mode mein hoon, bas aa rahi hoon...'
];
const RESPONSE_EMOJI_POOLS = {
    HAPPY: ['😊', '💖', '✨', '🥰', '🌸', '💫'],
    SAD: ['🤍', '🌙', '💭', '🫶', '✨'],
    CALM: ['🙂', '🌿', '✨', '💙'],
    DEFAULT: ['✨', '😊', '💬', '🌟']
};
const TITLE_COLOR_STOPS = ['#6EE7F9', '#A5B4FC', '#F9A8D4', '#FCD34D', '#86EFAC', '#60A5FA'];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const pickNonRepeating = (items, lastIndexRef) => {
    if (!items.length) return '';
    if (items.length === 1) return items[0];

    let idx = Math.floor(Math.random() * items.length);
    if (idx === lastIndexRef.current) {
        idx = (idx + 1) % items.length;
    }
    lastIndexRef.current = idx;
    return items[idx];
};

function AppContent() {
    const insets = useSafeAreaInsets();
    const [isReady, setIsReady] = useState(false);
    const [soniyaWords, setSoniyaWords] = useState(
        () => LOADING_LINES[Math.floor(Math.random() * LOADING_LINES.length)]
    );
    const [mood, setMood] = useState("CALM");
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isThinking, setIsThinking] = useState(false);

    // Profile & Settings States
    const [showSettings, setShowSettings] = useState(false);
    const [showManual, setShowManual] = useState(false);
    const [manualLang, setManualLang] = useState('EN');
    const [userName, setUserName] = useState('Nabeel Khalil');
    const [voiceResponse, setVoiceResponse] = useState(true);
    const [alwaysListenEnabled, setAlwaysListenEnabled] = useState(false);
    const [autoEnableOnCharging, setAutoEnableOnCharging] = useState(false);
    const [isCharging, setIsCharging] = useState(false);
    const [wakeLang, setWakeLang] = useState('ur-PK');
    const [isWakeListening, setIsWakeListening] = useState(false);
    const [midnightMode, setMidnightMode] = useState(false);
    const [viewType, setViewType] = useState('FULL');
    const [avatarStyle, setAvatarStyle] = useState('CLASSIC');
    const [avatarActivity, setAvatarActivity] = useState('CHAT');
    const [autoAvatarMode, setAutoAvatarMode] = useState(true);
    const [vibe, setVibe] = useState('CHILL'); // CHILL, ENERGETIC
    const [personaMood, setPersonaMood] = useState(DEFAULT_PERSONA_MOOD);
    const [voiceRate, setVoiceRate] = useState(DEFAULT_VOICE_RATE);
    const [voiceOptions, setVoiceOptions] = useState([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState('');
    const [voiceHandlerVariant, setVoiceHandlerVariant] = useState(DEFAULT_VOICE_HANDLER_VARIANT);
    const [userInputText, setUserInputText] = useState('');
    const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
    const [isInputScrollable, setIsInputScrollable] = useState(false);
    const [bgCurrentIndex, setBgCurrentIndex] = useState(0);
    const [bgNextIndex, setBgNextIndex] = useState(1);
    const [appState, setAppState] = useState(AppState.currentState);
    const inputTranslateY = useRef(new Animated.Value(0)).current;
    const staticUiTranslateY = useRef(new Animated.Value(0)).current;
    const sendPulse = useRef(new Animated.Value(0)).current;
    const bgFade = useRef(new Animated.Value(0)).current;
    const bgDrift = useRef(new Animated.Value(0)).current;
    const titleColorPhase = useRef(new Animated.Value(0)).current;
    const titleMotionPhase = useRef(new Animated.Value(0)).current;
    const titleGlow = useRef(new Animated.Value(0)).current;

    const wakeRestartTimerRef = useRef(null);
    const bgCycleTimerRef = useRef(null);
    const wakeTranscriptRef = useRef('');
    const autoListenModeRef = useRef('idle');
    const isManualListeningRef = useRef(false);
    const isSpeakingRef = useRef(false);
    const isThinkingRef = useRef(false);
    const bgCurrentIndexRef = useRef(0);
    const lastLoadingLineRef = useRef(-1);
    const lastThinkingLineRef = useRef(-1);
    const avatarIdleStartTimerRef = useRef(null);
    const avatarIdleRotateTimerRef = useRef(null);
    const lastAvatarIdleIndexRef = useRef(-1);
    const inputBaseContentHeightRef = useRef(0);

    const heartFloat = useRef(new Animated.Value(0)).current;
    const butterflyFloat = useRef(new Animated.Value(0)).current;
    const sparkleFloat = useRef(new Animated.Value(0)).current;
    const balloonFloat = useRef(new Animated.Value(0)).current;
    const heartSway = useRef(new Animated.Value(0)).current;
    const butterflySway = useRef(new Animated.Value(0)).current;
    const sparkleSway = useRef(new Animated.Value(0)).current;
    const balloonSway = useRef(new Animated.Value(0)).current;
    const decorPulse = useRef(new Animated.Value(0)).current;
    const speechRecognitionAvailable = useMemo(() => isSpeechRecognitionAvailable(), []);

    const adjustVoiceRate = useCallback((delta) => {
        setVoiceRate((prev) => Number(clamp(prev + delta, 0.6, 1.4).toFixed(2)));
    }, []);

    const pickVoice = useCallback((voiceId) => {
        setSelectedVoiceId(voiceId);
        setPreferredVoice(voiceId);
    }, []);

    const getNextThinkingLine = useCallback(
        () => pickNonRepeating(THINKING_LINES, lastThinkingLineRef),
        []
    );

    const getNextLoadingLine = useCallback(
        () => pickNonRepeating(LOADING_LINES, lastLoadingLineRef),
        []
    );

    const clearAvatarIdleTimers = useCallback(() => {
        if (avatarIdleStartTimerRef.current) {
            clearTimeout(avatarIdleStartTimerRef.current);
            avatarIdleStartTimerRef.current = null;
        }
        if (avatarIdleRotateTimerRef.current) {
            clearTimeout(avatarIdleRotateTimerRef.current);
            avatarIdleRotateTimerRef.current = null;
        }
    }, []);

    const switchAvatarToChat = useCallback(() => {
        clearAvatarIdleTimers();
        setAvatarActivity('CHAT');
    }, [clearAvatarIdleTimers]);

    const runAvatarIdleStep = useCallback(() => {
        const next = pickNonRepeating(AVATAR_IDLE_ACTIVITIES, lastAvatarIdleIndexRef) || 'RELAX';
        setAvatarActivity(next);
    }, []);

    const getNextAvatarIdleDelay = useCallback(
        () => AVATAR_IDLE_ROTATE_MIN_MS + Math.floor(Math.random() * (AVATAR_IDLE_ROTATE_MAX_MS - AVATAR_IDLE_ROTATE_MIN_MS + 1)),
        []
    );

    const startAvatarIdleCycle = useCallback(() => {
        if (isSpeakingRef.current || isThinkingRef.current) return;
        const scheduleNext = () => {
            if (avatarIdleRotateTimerRef.current) {
                clearTimeout(avatarIdleRotateTimerRef.current);
            }
            avatarIdleRotateTimerRef.current = setTimeout(() => {
                if (isSpeakingRef.current || isThinkingRef.current) {
                    scheduleNext();
                    return;
                }
                runAvatarIdleStep();
                scheduleNext();
            }, getNextAvatarIdleDelay());
        };
        scheduleNext();
    }, [runAvatarIdleStep, getNextAvatarIdleDelay]);

    const scheduleAvatarIdleCycle = useCallback((delayMs = AVATAR_IDLE_DELAY_MS) => {
        clearAvatarIdleTimers();
        avatarIdleStartTimerRef.current = setTimeout(() => {
            startAvatarIdleCycle();
        }, delayMs);
    }, [clearAvatarIdleTimers, startAvatarIdleCycle]);

    const cycleAvatarStyle = useCallback(() => {
        let applied = AVATAR_STYLE_VARIANTS[0];
        setAvatarStyle((prev) => {
            const idx = AVATAR_STYLE_VARIANTS.indexOf(prev);
            const next = AVATAR_STYLE_VARIANTS[(idx + 1) % AVATAR_STYLE_VARIANTS.length];
            applied = next;
            return next;
        });
        return applied;
    }, []);

    const cycleAvatarActivity = useCallback(() => {
        let applied = AVATAR_MANUAL_ACTIVITIES[0];
        setAvatarActivity((prev) => {
            const idx = AVATAR_MANUAL_ACTIVITIES.indexOf(prev);
            const next = AVATAR_MANUAL_ACTIVITIES[(idx + 1) % AVATAR_MANUAL_ACTIVITIES.length];
            applied = next;
            return next;
        });
        return applied;
    }, []);

    const switchBackgroundScene = useCallback((requestedIndex = null) => {
        const normalizedRequested = Number.isInteger(requestedIndex) && requestedIndex >= 0
            ? requestedIndex % BACKGROUND_SCENES.length
            : null;
        const next = normalizedRequested ?? ((bgCurrentIndexRef.current + 1) % BACKGROUND_SCENES.length);

        setBgNextIndex(next);
        bgFade.stopAnimation();
        Animated.timing(bgFade, {
            toValue: 1,
            duration: BG_FADE_MS,
            useNativeDriver: true
        }).start(({ finished }) => {
            if (!finished) return;
            setBgCurrentIndex(next);
            bgCurrentIndexRef.current = next;
            bgFade.setValue(0);
        });
    }, [bgFade]);

    const tryHandleVisualCommand = useCallback((rawText) => {
        const text = String(rawText || '').trim();
        if (!text) return null;
        const lower = text.toLowerCase();

        const wantsAutoModeOn =
            /\bauto\s*mode\b.*\b(on|enable|start|shuru|chalu)\b/.test(lower)
            || /\bauto\s+on\b/.test(lower);
        const wantsAutoModeOff =
            /\bauto\s*mode\b.*\b(off|disable|stop|band|bnd)\b/.test(lower)
            || /\bauto\s+off\b/.test(lower);
        const wantsWakeFromSleep =
            (lower.includes('wake up')
                || lower.includes('wake')
                || lower.includes('uth jao')
                || lower.includes('utho')
                || lower.includes('uttho')
                || lower.includes('jag jao')
                || lower.includes('jago'))
            && (avatarActivity === 'SLEEP' || lower.includes('sleep') || lower.includes('so'));
        const wantsBackground =
            /\b(background|bg|scene|wallpaper|manzar)\b/.test(lower)
            && /\b(change|badal|badlo|tabdeel|switch|next|shuffle)\b/.test(lower);
        const hasDressKeyword =
            /\b(dress|clothes|outfit|style|look|hair|hairstyle|suite|suit)\b/.test(lower)
            || lower.includes('kapr');
        const wantsDress =
            hasDressKeyword
            && /\b(change|badal|badlo|tabdeel|switch|new|next|shuffle)\b/.test(lower);
        const hasModeKeyword = /\b(mode|activity|pose)\b/.test(lower);
        let requestedMode = '';
        for (const hint of AVATAR_ACTIVITY_HINTS) {
            if (hint.keys.some((key) => lower.includes(key))) {
                requestedMode = hint.mode;
                break;
            }
        }
        const wantsMode =
            (hasModeKeyword && /\b(change|badal|badlo|tabdeel|switch|next|show)\b/.test(lower))
            || (requestedMode && /\b(change|badal|badlo|tabdeel|switch|show|jao|ban)\b/.test(lower))
            || (requestedMode && hasModeKeyword);
        const wantsRefreshLook =
            /\b(new|nayi|nai)\b.*\b(look|style|ban)\b/.test(lower)
            || /\b(ready|tayyar)\b.*\b(new|nayi|look|style)\b/.test(lower);

        if (!wantsBackground && !wantsDress && !wantsRefreshLook && !wantsMode && !wantsAutoModeOn && !wantsAutoModeOff && !wantsWakeFromSleep) {
            return null;
        }

        if (wantsAutoModeOn) {
            setAutoAvatarMode(true);
            scheduleAvatarIdleCycle(1800);
            return {
                handled: true,
                mood: 'HAPPY',
                text: 'Auto mode ON kar diya hai, ab main soft transition ke sath thori dair baad pose switch karti rahungi.'
            };
        }

        if (wantsAutoModeOff) {
            setAutoAvatarMode(false);
            clearAvatarIdleTimers();
            return {
                handled: true,
                mood: 'HAPPY',
                text: 'Auto mode OFF kar diya hai. Ab sirf aap ke command par pose switch hoga.'
            };
        }

        if (wantsWakeFromSleep) {
            setAvatarActivity('CHAT');
            if (autoAvatarMode) {
                scheduleAvatarIdleCycle(AVATAR_IDLE_DELAY_MS + 2500);
            }
            return {
                handled: true,
                mood: 'HAPPY',
                text: 'Theek hai Jani, main sleep mode se uth gayi hoon.'
            };
        }

        if (wantsMode && requestedMode === 'SLEEP') {
            if (avatarActivity === 'SLEEP') {
                setAvatarActivity('CHAT');
                if (autoAvatarMode) {
                    scheduleAvatarIdleCycle(AVATAR_IDLE_DELAY_MS + 2500);
                }
                return {
                    handled: true,
                    mood: 'HAPPY',
                    text: 'Done Jani, main sleep mode se uth kar ready ho gayi hoon.'
                };
            }

            setAvatarActivity('SLEEP');
            if (autoAvatarMode) {
                scheduleAvatarIdleCycle(AVATAR_IDLE_DELAY_MS + 4500);
            }
            return {
                handled: true,
                mood: 'HAPPY',
                text: 'Theek hai Jani, main sleep mode mein chali gayi hoon.'
            };
        }

        switchAvatarToChat();

        if (wantsBackground) {
            let requestedIndex = null;
            for (const candidate of BG_SCENE_HINTS) {
                if (candidate.keys.some((key) => lower.includes(key))) {
                    requestedIndex = candidate.index;
                    break;
                }
            }
            switchBackgroundScene(requestedIndex);
        }

        if (wantsMode) {
            const nextMode = requestedMode || cycleAvatarActivity();
            if (requestedMode) {
                setAvatarActivity(requestedMode);
            }
            if (autoAvatarMode) {
                scheduleAvatarIdleCycle(AVATAR_IDLE_DELAY_MS + 5000);
            }
            return {
                handled: true,
                mood: 'HAPPY',
                text: `Theek hai Jani, ab main ${AVATAR_ACTIVITY_LABELS[nextMode] || 'activity mode'} mein aa gayi hoon.`
            };
        }

        if (wantsDress || wantsRefreshLook) {
            const nextStyle = cycleAvatarStyle();
            if (autoAvatarMode) {
                scheduleAvatarIdleCycle();
            }
            return {
                handled: true,
                mood: 'HAPPY',
                text: `Bilkul Jani, ${AVATAR_STYLE_LABELS[nextStyle] || 'look change kar di hai.'}`
            };
        }

        if (autoAvatarMode) {
            scheduleAvatarIdleCycle();
        }
        return {
            handled: true,
            mood: 'HAPPY',
            text: 'Done Jani, background change kar diya hai.'
        };
    }, [avatarActivity, autoAvatarMode, scheduleAvatarIdleCycle, clearAvatarIdleTimers, switchAvatarToChat, switchBackgroundScene, cycleAvatarStyle, cycleAvatarActivity]);

    const titleColorAt = useCallback((offset) => {
        const shifted = Animated.modulo(Animated.add(titleColorPhase, offset), 1);
        return shifted.interpolate({
            inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
            outputRange: TITLE_COLOR_STOPS
        });
    }, [titleColorPhase]);

    const decorateResponseForDisplay = useCallback((text, moodHint = 'HAPPY') => {
        const clean = String(text || '').trim();
        if (!clean) return clean;

        const normalizedMood = String(moodHint || 'DEFAULT').toUpperCase();
        const pool = RESPONSE_EMOJI_POOLS[normalizedMood] || RESPONSE_EMOJI_POOLS.DEFAULT;
        const first = pool[Math.floor(Math.random() * pool.length)];
        let second = pool[Math.floor(Math.random() * pool.length)];
        if (pool.length > 1 && second === first) {
            second = pool[(pool.indexOf(second) + 1) % pool.length];
        }

        return `${first} ${clean} ${second}`;
    }, []);

    const hydrateVoiceSettings = useCallback(async () => {
        await initSoniyaVoice(selectedVoiceId);
        const voices = await getSoniyaVoices();
        setVoiceOptions(voices.slice(0, 10));

        if (!selectedVoiceId && voices.length) {
            setSelectedVoiceId(voices[0].id);
            setPreferredVoice(voices[0].id);
        }
    }, [selectedVoiceId]);

    const applyStoredSettings = useCallback((stored) => {
        if (stored.personaMood !== undefined) setPersonaMood(stored.personaMood);
        if (stored.voiceRate !== undefined) setVoiceRate(stored.voiceRate);
        if (stored.selectedVoiceId !== undefined) setSelectedVoiceId(stored.selectedVoiceId);
        if (stored.voiceResponse !== undefined) setVoiceResponse(stored.voiceResponse);
        if (stored.alwaysListenEnabled !== undefined) setAlwaysListenEnabled(stored.alwaysListenEnabled);
        if (stored.autoAvatarMode !== undefined) setAutoAvatarMode(stored.autoAvatarMode);
        if (stored.voiceHandlerVariant !== undefined) setVoiceHandlerVariant(stored.voiceHandlerVariant);
    }, []);

    const persistedUiSettings = useMemo(() => ({
        personaMood,
        voiceRate,
        selectedVoiceId,
        voiceResponse,
        alwaysListenEnabled,
        autoAvatarMode,
        voiceHandlerVariant
    }), [personaMood, voiceRate, selectedVoiceId, voiceResponse, alwaysListenEnabled, autoAvatarMode, voiceHandlerVariant]);

    const manualCommands = useMemo(
        () => USER_MANUAL_COMMANDS[manualLang] || USER_MANUAL_COMMANDS.EN,
        [manualLang]
    );

    useUiSettingsStorage({
        storageKey: SETTINGS_STORAGE_KEY,
        clamp,
        applySettings: applyStoredSettings,
        currentSettings: persistedUiSettings
    });

    const greetings = useMemo(() => [
        `Soniya: Assalam-o-Alaikum ${userName}, main aaj bhi aap ke saath hoon.`,
        `Soniya: ${userName}, aap ka din kaisa ja raha hai? Main sun rahi hoon.`,
        `Soniya: Salaam ${userName}, dil halka karna ho to mujh se baat karein.`,
        `Soniya: ${userName}, aap meri priority chat ho, bolo kya baat hai.`,
        `Soniya: ${userName}, main pyar se guide karungi, bas bolo.`,
        'Soniya: Hello Jaani, main yahan hoon aap ke liye, kya chal raha hai?',
        `Soniya: ${userName}, aap ki awaz sun ke accha lag raha hai, kya baat karni hai?`,
        'Jaani ooyee....',
        'Mrshadoo gal te sunoon....',
    ], [userName]);

    useEffect(() => {
        if (isReady) {
            const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
            setSoniyaWords(randomGreeting);
            return;
        }
        setSoniyaWords(getNextLoadingLine());
    }, [isReady, greetings, getNextLoadingLine]);

    const orb1Pos = useRef(new Animated.Value(0)).current;
    const orb2Pos = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        hydrateVoiceSettings();

        const createFloatingAnim = (val, duration, distance) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(val, { toValue: distance, duration, useNativeDriver: true }),
                    Animated.timing(val, { toValue: 0, duration, useNativeDriver: true }),
                ])
            );
        };

        const createSwayAnim = (val, duration, distance) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(val, { toValue: distance, duration, useNativeDriver: true }),
                    Animated.timing(val, { toValue: -distance, duration, useNativeDriver: true }),
                    Animated.timing(val, { toValue: 0, duration: Math.round(duration * 0.6), useNativeDriver: true }),
                ])
            );
        };

        createFloatingAnim(orb1Pos, 8000, 40).start();
        createFloatingAnim(orb2Pos, 10000, -30).start();
        createFloatingAnim(heartFloat, 5200, -54).start();
        createFloatingAnim(butterflyFloat, 6200, -46).start();
        createFloatingAnim(sparkleFloat, 5600, -62).start();
        createFloatingAnim(balloonFloat, 7000, -58).start();
        createSwayAnim(heartSway, 6400, 14).start();
        createSwayAnim(butterflySway, 7000, 18).start();
        createSwayAnim(sparkleSway, 6800, 10).start();
        createSwayAnim(balloonSway, 7600, 16).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(decorPulse, { toValue: 1, duration: 2600, useNativeDriver: true }),
                Animated.timing(decorPulse, { toValue: 0, duration: 2600, useNativeDriver: true }),
            ])
        ).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(sendPulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
                Animated.timing(sendPulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
            ])
        ).start();
    }, [hydrateVoiceSettings]);

    useEffect(() => {
        isSpeakingRef.current = isSpeaking;
    }, [isSpeaking]);

    useEffect(() => {
        isThinkingRef.current = isThinking;
    }, [isThinking]);

    useEffect(() => {
        if (!autoAvatarMode) {
            clearAvatarIdleTimers();
            return;
        }
        if (isSpeaking || isThinking) {
            switchAvatarToChat();
            return;
        }
        scheduleAvatarIdleCycle();
    }, [autoAvatarMode, isSpeaking, isThinking, clearAvatarIdleTimers, switchAvatarToChat, scheduleAvatarIdleCycle]);

    useEffect(() => {
        return () => {
            clearAvatarIdleTimers();
        };
    }, [clearAvatarIdleTimers]);

    useEffect(() => {
        bgCurrentIndexRef.current = bgCurrentIndex;
    }, [bgCurrentIndex]);

    useEffect(() => {
        if (showSettings) {
            hydrateVoiceSettings();
        }
    }, [showSettings, hydrateVoiceSettings]);

    useEffect(() => {
        titleColorPhase.setValue(0);
        titleMotionPhase.setValue(0);
        const colorLoop = Animated.loop(
            Animated.timing(titleColorPhase, {
                toValue: 1,
                duration: 6200,
                useNativeDriver: false
            })
        );
        const motionLoop = Animated.loop(
            Animated.timing(titleMotionPhase, {
                toValue: 1,
                duration: 6200,
                useNativeDriver: true
            })
        );
        const glowLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(titleGlow, { toValue: 1, duration: 1500, useNativeDriver: true }),
                Animated.timing(titleGlow, { toValue: 0, duration: 1500, useNativeDriver: true }),
            ])
        );

        colorLoop.start();
        motionLoop.start();
        glowLoop.start();
        return () => {
            colorLoop.stop();
            motionLoop.stop();
            glowLoop.stop();
        };
    }, [titleColorPhase, titleMotionPhase, titleGlow]);

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(bgDrift, { toValue: 1, duration: 22000, useNativeDriver: true }),
                Animated.timing(bgDrift, { toValue: 0, duration: 22000, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => {
            loop.stop();
        };
    }, [bgDrift]);

    useEffect(() => {
        let cancelled = false;

        const scheduleNext = () => {
            bgCycleTimerRef.current = setTimeout(() => {
                const next = (bgCurrentIndexRef.current + 1) % BACKGROUND_SCENES.length;
                setBgNextIndex(next);
                Animated.timing(bgFade, {
                    toValue: 1,
                    duration: BG_FADE_MS,
                    useNativeDriver: true
                }).start(({ finished }) => {
                    if (!finished || cancelled) return;
                    setBgCurrentIndex(next);
                    bgCurrentIndexRef.current = next;
                    bgFade.setValue(0);
                    scheduleNext();
                });
            }, BG_SWITCH_MS);
        };

        scheduleNext();
        return () => {
            cancelled = true;
            if (bgCycleTimerRef.current) {
                clearTimeout(bgCycleTimerRef.current);
                bgCycleTimerRef.current = null;
            }
            bgFade.stopAnimation();
        };
    }, [bgFade]);

    useEffect(() => {
        if (!userInputText) {
            setInputHeight(MIN_INPUT_HEIGHT);
            setIsInputScrollable(false);
        }
    }, [userInputText]);

    useEffect(() => {
        if (Platform.OS === 'web') {
            return () => {};
        }
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

    useEffect(() => {
        if (!speechRecognitionAvailable && alwaysListenEnabled) {
            setAlwaysListenEnabled(false);
        }
    }, [speechRecognitionAvailable, alwaysListenEnabled]);

    const extractTranscript = (event) => {
        const results = event?.results;
        if (Array.isArray(results) && results.length > 0) {
            const last = results[results.length - 1];
            if (typeof last?.transcript === 'string') {
                return last.transcript.trim();
            }
        }
        if (typeof event?.transcript === 'string') {
            return event.transcript.trim();
        }
        return '';
    };

    const stripWakeWord = (text) => {
        const normalized = text.trim();
        if (!normalized) return '';
        const pattern = new RegExp(`\\b(${MANUAL_WAKE_WORDS.join('|')})\\b`, 'ig');
        return normalized.replace(pattern, '').replace(/\s{2,}/g, ' ').trim();
    };

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
        autoListenModeRef.current = 'idle';
        wakeTranscriptRef.current = '';
        setIsWakeListening(false);
    }, []);

    const startWakeListening = useCallback(async () => {
        if (!speechRecognitionAvailable) {
            autoListenModeRef.current = 'idle';
            setIsWakeListening(false);
            return;
        }

        if (!alwaysListenEnabled || appState !== 'active' || isSpeakingRef.current || isThinkingRef.current || isManualListeningRef.current) {
            return;
        }

        const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!permission.granted) {
            setAlwaysListenEnabled(false);
            return;
        }

        const langs = ['pa-PK', 'ur-PK', 'hi-IN', 'en-US'];
        for (const lang of langs) {
            try {
                wakeTranscriptRef.current = '';
                autoListenModeRef.current = 'auto';
                await ExpoSpeechRecognitionModule.start({
                    lang,
                    interimResults: true,
                    continuous: false,
                    maxAlternatives: 1,
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
    }, [speechRecognitionAvailable, alwaysListenEnabled, appState]);

    useEffect(() => {
        if (alwaysListenEnabled && appState === 'active') {
            startWakeListening();
        } else {
            stopWakeListening();
        }
    }, [alwaysListenEnabled, appState, startWakeListening, stopWakeListening]);

    useSpeechRecognitionEvent('end', () => {
        if (isManualListeningRef.current) return;
        if (autoListenModeRef.current === 'processing') {
            autoListenModeRef.current = 'idle';
            return;
        }
        if (autoListenModeRef.current !== 'auto') return;

        autoListenModeRef.current = 'idle';
        setIsWakeListening(false);

        const transcript = stripWakeWord(wakeTranscriptRef.current);
        wakeTranscriptRef.current = '';

        if (transcript && !isSpeakingRef.current && !isThinkingRef.current) {
            handleUserSpeech(transcript);
            return;
        }

        if (!alwaysListenEnabled || appState !== 'active') return;
        wakeRestartTimerRef.current = setTimeout(() => {
            startWakeListening();
        }, 180);
    });

    useSpeechRecognitionEvent('error', () => {
        if (isManualListeningRef.current) return;
        if (autoListenModeRef.current === 'processing') {
            autoListenModeRef.current = 'idle';
            return;
        }
        autoListenModeRef.current = 'idle';
        setIsWakeListening(false);

        if (!alwaysListenEnabled || appState !== 'active' || isSpeakingRef.current || isThinkingRef.current) return;
        wakeRestartTimerRef.current = setTimeout(() => {
            startWakeListening();
        }, 260);
    });

    useSpeechRecognitionEvent('result', (event) => {
        if (isManualListeningRef.current) return;
        if (!alwaysListenEnabled || appState !== 'active') return;
        if (autoListenModeRef.current !== 'auto') return;
        const transcript = extractTranscript(event);
        if (!transcript) return;
        wakeTranscriptRef.current = transcript;

        const stripped = stripWakeWord(transcript);
        if (!stripped || isSpeakingRef.current || isThinkingRef.current) return;

        wakeTranscriptRef.current = '';
        autoListenModeRef.current = 'processing';
        setIsWakeListening(false);
        try {
            ExpoSpeechRecognitionModule.stop();
        } catch (_err) {
            // Ignore stop failures and continue with response.
        }
        handleUserSpeech(stripped);
    });

    useEffect(() => {
        return () => {
            if (wakeRestartTimerRef.current) {
                clearTimeout(wakeRestartTimerRef.current);
            }

            autoListenModeRef.current = 'idle';
            wakeTranscriptRef.current = '';
            try {
                ExpoSpeechRecognitionModule.stop();
            } catch (_err) {
                // Ignore stop errors during teardown.
            }
        };
    }, []);

    useKeyboardLift({
        inputTranslateY,
        staticTranslateY: staticUiTranslateY,
        insetBottom: insets.bottom
    });

    const previewVoiceSample = useCallback(async () => {
        if (isThinkingRef.current) return;
        switchAvatarToChat();
        const sample = personaMood === 'Romantic'
            ? 'Suniye, yeh meri voice preview hai. Kya yeh speed theek lag rahi hai?'
            : 'Yeh meri voice preview hai, aap apni pasand ke mutabiq speed adjust kar sakte hain.';

        setSoniyaWords(sample);
        if (alwaysListenEnabled) {
            await stopWakeListening();
        }

        soniyaSpeak(
            sample,
            () => setIsSpeaking(true),
            () => {
                setIsSpeaking(false);
                if (alwaysListenEnabled && appState === 'active' && !isManualListeningRef.current) {
                    startWakeListening();
                }
            },
            { rate: voiceRate, voiceId: selectedVoiceId }
        );
    }, [switchAvatarToChat, personaMood, alwaysListenEnabled, stopWakeListening, appState, startWakeListening, voiceRate, selectedVoiceId]);

    const resetChat = () => {
        clearChatHistory();
        setSoniyaWords(decorateResponseForDisplay(`Soniya: Memory refresh ho gayi hai, ${userName}! Ab hum naye siray se baat kar saktay hain.`, 'HAPPY'));
        setMood("HAPPY");
        setShowSettings(false);
    };

    const handleUserSpeech = useCallback(async (text) => {
        if (!text || text.trim() === "" || isSpeakingRef.current || isThinkingRef.current) return;

        const cleanedText = text.trim();

        const visualResult = tryHandleVisualCommand(cleanedText);
        if (visualResult?.handled) {
            setIsSpeaking(false);
            setMood(visualResult.mood || 'HAPPY');
            setSoniyaWords(decorateResponseForDisplay(visualResult.text || 'Done.', visualResult.mood || 'HAPPY'));

            if (voiceResponse && visualResult.text) {
                if (alwaysListenEnabled) {
                    await stopWakeListening();
                }
                soniyaSpeak(
                    visualResult.text,
                    () => setIsSpeaking(true),
                    () => {
                        setIsSpeaking(false);
                        if (alwaysListenEnabled && appState === 'active' && !isManualListeningRef.current) {
                            startWakeListening();
                        }
                    },
                    { rate: voiceRate, voiceId: selectedVoiceId }
                );
            } else if (alwaysListenEnabled && appState === 'active' && !isManualListeningRef.current) {
                startWakeListening();
            }
            return;
        }

        switchAvatarToChat();
        setIsThinking(true);
        setIsSpeaking(false);
        setMood('CALM');
        setSoniyaWords(getNextThinkingLine());

        try {
            const localResult = await processLocalMemoryCommand(cleanedText);
            if (localResult?.handled) {
                setSoniyaWords(decorateResponseForDisplay(localResult.text || 'Theek hai.', localResult.mood || 'HAPPY'));
                setMood(localResult.mood || 'HAPPY');

                if (voiceResponse && localResult.text) {
                    if (alwaysListenEnabled) {
                        await stopWakeListening();
                    }
                    soniyaSpeak(
                        localResult.text,
                        () => setIsSpeaking(true),
                        () => {
                            setIsSpeaking(false);
                            if (alwaysListenEnabled && appState === 'active' && !isManualListeningRef.current) {
                                startWakeListening();
                            }
                        },
                        { rate: voiceRate, voiceId: selectedVoiceId }
                    );
                } else if (alwaysListenEnabled && appState === 'active' && !isManualListeningRef.current) {
                    startWakeListening();
                }
                return;
            }

            const enhancedPrompt = `(User Name: ${userName}, Vibe: ${vibe}, Preferred Mood Style: ${personaMood}) ${cleanedText}`;

            const result = await askSoniya(enhancedPrompt);

            if (result && result.text) {
                setSoniyaWords(decorateResponseForDisplay(result.text, result.mood || 'HAPPY'));
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
                            if (alwaysListenEnabled && appState === 'active' && !isManualListeningRef.current) {
                                startWakeListening();
                            }
                        },
                        { rate: voiceRate, voiceId: selectedVoiceId }
                    );
                } else if (alwaysListenEnabled && appState === 'active' && !isManualListeningRef.current) {
                    startWakeListening();
                }
            } else {
                setSoniyaWords(decorateResponseForDisplay(`Maaf karna ${userName}, mujhe kuch samajh nahi aaya.`, 'SAD'));
                setMood('SAD');
            }
        } catch (error) {
            console.error("Speech Handler Error:", error);
            setSoniyaWords(decorateResponseForDisplay('Connection mein kuch masla hai, Jaani.', 'SAD'));
            setMood('SAD');
        } finally {
            setIsThinking(false);
        }
    }, [switchAvatarToChat, tryHandleVisualCommand, decorateResponseForDisplay, voiceResponse, alwaysListenEnabled, appState, startWakeListening, stopWakeListening, voiceRate, selectedVoiceId, getNextThinkingLine, userName, vibe, personaMood]);

    const sendTypedMessage = useCallback(() => {
        if (!userInputText.trim()) return;
        handleUserSpeech(userInputText);
        setUserInputText('');
        setInputHeight(MIN_INPUT_HEIGHT);
        setIsInputScrollable(false);
    }, [handleUserSpeech, userInputText]);

    const onInputContentSizeChange = useCallback((event) => {
        const contentHeight = event?.nativeEvent?.contentSize?.height || 0;
        if (!contentHeight) return;

        if (!inputBaseContentHeightRef.current || contentHeight < inputBaseContentHeightRef.current) {
            inputBaseContentHeightRef.current = contentHeight;
        }

        const baseContentHeight = inputBaseContentHeightRef.current || contentHeight;
        const totalLines = Math.max(
            1,
            Math.ceil(Math.max(0, contentHeight - baseContentHeight) / INPUT_LINE_HEIGHT) + 1
        );
        const visibleLines = clamp(totalLines, 1, MAX_VISIBLE_INPUT_LINES);
        const nextHeight = MIN_INPUT_HEIGHT + ((visibleLines - 1) * INPUT_LINE_HEIGHT);

        setInputHeight((prev) => (Math.abs(prev - nextHeight) > 1 ? nextHeight : prev));
        setIsInputScrollable(totalLines > MAX_VISIBLE_INPUT_LINES);
    }, []);

    const currentScene = BACKGROUND_SCENES[bgCurrentIndex % BACKGROUND_SCENES.length];
    const nextScene = BACKGROUND_SCENES[bgNextIndex % BACKGROUND_SCENES.length];
    const currentOverlay = midnightMode ? currentScene.night : currentScene.day;
    const nextOverlay = midnightMode ? nextScene.night : nextScene.day;
    const baseBgOpacity = bgFade.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0]
    });
    const backgroundScale = bgDrift.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.06]
    });
    const backgroundShiftX = bgDrift.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 12]
    });
    const backgroundShiftY = bgDrift.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -10]
    });

    if (!isReady) return <SplashScreen onFinish={() => setIsReady(true)} />;

    return (
        <>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <View style={StyleSheet.absoluteFill}>
                <Animated.View
                    style={[
                        styles.backgroundLayer,
                        {
                            opacity: baseBgOpacity,
                            transform: [
                                { translateY: staticUiTranslateY },
                                { scale: backgroundScale },
                                { translateX: backgroundShiftX },
                                { translateY: backgroundShiftY }
                            ]
                        }
                    ]}
                >
                    <ImageBackground source={currentScene.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    <LinearGradient colors={currentOverlay} style={StyleSheet.absoluteFill} />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.backgroundLayer,
                        {
                            opacity: bgFade,
                            transform: [
                                { translateY: staticUiTranslateY },
                                { scale: backgroundScale },
                                { translateX: Animated.multiply(backgroundShiftX, -1) },
                                { translateY: Animated.multiply(backgroundShiftY, -1) }
                            ]
                        }
                    ]}
                >
                    <ImageBackground source={nextScene.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    <LinearGradient colors={nextOverlay} style={StyleSheet.absoluteFill} />
                </Animated.View>

                <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: staticUiTranslateY }] }]}>
                    <Animated.View style={[styles.orb, styles.orb1, { backgroundColor: midnightMode ? '#4b0082' : '#ff00ff', transform: [{ translateY: orb1Pos }, { scale: 1.8 }] }]} />
                    <Animated.View style={[styles.orb, styles.orb2, { backgroundColor: '#00ffff', transform: [{ translateX: orb2Pos }, { scale: 1.5 }] }]} />
                </Animated.View>
                <Animated.View pointerEvents="none" style={[styles.decorLayer, { transform: [{ translateY: staticUiTranslateY }] }]}>
                    <Animated.View
                        style={[
                            styles.energyHaloA,
                            {
                                transform: [{
                                    scale: decorPulse.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.92, 1.2]
                                    })
                                }],
                                opacity: decorPulse.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.2, 0.42]
                                })
                            }
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.energyHaloB,
                            {
                                transform: [{
                                    scale: decorPulse.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [1.25, 0.95]
                                    })
                                }],
                                opacity: decorPulse.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.36, 0.18]
                                })
                            }
                        ]}
                    />
                    <Animated.View style={[styles.decorItem, styles.heartDecor, { transform: [{ translateY: heartFloat }, { translateX: heartSway }] }]}>
                        <Ionicons name="heart" size={30} color="rgba(255, 110, 180, 0.95)" />
                    </Animated.View>
                    <Animated.View style={[styles.decorItem, styles.butterflyDecor, { transform: [{ translateY: butterflyFloat }, { translateX: butterflySway }] }]}>
                        <Ionicons name="sparkles" size={28} color="rgba(120, 240, 255, 0.96)" />
                    </Animated.View>
                    <Animated.View style={[styles.decorItem, styles.birdDecor, { transform: [{ translateY: sparkleFloat }, { translateX: sparkleSway }] }]}>
                        <Ionicons name="planet" size={26} color="rgba(180, 255, 190, 0.92)" />
                    </Animated.View>
                    <Animated.View style={[styles.decorItem, styles.balloonDecor, { transform: [{ translateY: balloonFloat }, { translateX: balloonSway }] }]}>
                        <Ionicons name="rocket" size={24} color="rgba(255, 216, 120, 0.92)" />
                    </Animated.View>
                    <Animated.View style={[styles.decorItem, styles.starDecor, { transform: [{ translateY: sparkleFloat }, { translateX: butterflySway }] }]}>
                        <Ionicons name="star" size={22} color="rgba(255, 245, 175, 0.96)" />
                    </Animated.View>
                </Animated.View>

                <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
                    <Animated.View style={[styles.header, { transform: [{ translateY: staticUiTranslateY }] }]}>
                            <View style={styles.headerRow}>
                                <View style={styles.topBar}>
                                    <View style={styles.companyLogoCircle}>
                                        <Image source={COMPANY_LOGO} style={styles.companyLogoImage} />
                                    </View>
                                    <View style={styles.statusDot} />
                                    <Text style={styles.brand}>NOSHAHI DEVELOPERS INC.</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.profileBtn}>
                                    <View style={styles.profileIconWrapper}>
                                        <Ionicons name="person" size={20} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <Animated.View
                                style={[
                                    styles.appNameWrap,
                                    {
                                        transform: [{
                                            scale: titleGlow.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [1, 1.03]
                                            })
                                        }]
                                    }
                                ]}
                            >
                                <Animated.View
                                    pointerEvents="none"
                                    style={[
                                        styles.titleGlowBar,
                                        {
                                            opacity: titleGlow.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0.22, 0.62]
                                            }),
                                            transform: [
                                                {
                                                    translateX: titleMotionPhase.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [-70, 70]
                                                    })
                                                },
                                                {
                                                    rotate: titleMotionPhase.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: ['-9deg', '9deg']
                                                    })
                                                }
                                            ]
                                        }
                                    ]}
                                >
                                    <LinearGradient
                                        colors={['rgba(110,231,249,0.15)', 'rgba(249,168,212,0.25)', 'rgba(96,165,250,0.15)']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                </Animated.View>

                                <View style={styles.appNameRow}>
                                    <View style={styles.appNameWord}>
                                        {TITLE_MAIN.split('').map((char, idx) => (
                                            <Animated.Text
                                                key={`main-${char}-${idx}`}
                                                style={[styles.appNameLetter, { color: titleColorAt(idx * 0.11) }]}
                                            >
                                                {char}
                                            </Animated.Text>
                                        ))}
                                    </View>
                                    <View style={styles.proPill}>
                                        {TITLE_PRO.split('').map((char, idx) => (
                                            <Animated.Text
                                                key={`pro-${char}-${idx}`}
                                                style={[styles.proLetter, { color: titleColorAt(0.38 + idx * 0.15) }]}
                                            >
                                                {char}
                                            </Animated.Text>
                                        ))}
                                    </View>
                                </View>
                            </Animated.View>
                        </Animated.View>

                    <View style={styles.stageArea}>
                            <Animated.View
                                style={[
                                    styles.avatarLayer,
                                    { transform: [{ translateY: staticUiTranslateY }] }
                                ]}
                            >
                                <SoniyaAvatar
                                    mood={mood}
                                    isSpeaking={isSpeaking && !isThinking}
                                    isThinking={isThinking}
                                    viewType={viewType}
                                    bottomInset={insets.bottom}
                                    activityMode={avatarActivity}
                                    styleVariant={avatarStyle}
                                    autoModeEnabled={autoAvatarMode}
                                />
                            </Animated.View>

                            <Animated.View
                                style={[
                                    styles.controlsOverlay,
                                    {
                                        paddingBottom: Math.max(3, insets.bottom + 3)
                                    }
                                ]}
                            >
                                <Animated.View style={{ transform: [{ translateY: staticUiTranslateY }] }}>
                                    <View style={styles.controlsTopRow}>
                                        {alwaysListenEnabled && (
                                            <Animated.View
                                                style={[
                                                    styles.wakeBadge,
                                                    {
                                                        opacity: sendPulse.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [0.45, 1]
                                                        })
                                                    }
                                                ]}
                                            >
                                                <View
                                                    style={[
                                                        styles.wakeBadgeDot,
                                                        isWakeListening && styles.wakeBadgeDotActive
                                                    ]}
                                                />
                                                <Text style={styles.wakeBadgeText}>
                                                    {`Auto Listen ON (${wakeLang}) | ${isWakeListening ? 'Listening' : 'Waiting'}`}
                                                </Text>
                                            </Animated.View>
                                        )}
                                        <View
                                            style={[
                                                styles.voiceHandlerDock,
                                                voiceHandlerVariant === 'AI' && styles.voiceHandlerDockPanel,
                                                !alwaysListenEnabled && styles.voiceHandlerDockSolo
                                            ]}
                                        >
                                            <VoiceHandler
                                                onSpeechResult={handleUserSpeech}
                                                disabled={isThinking || isSpeaking}
                                                variant={voiceHandlerVariant}
                                                onListenStart={() => {
                                                    isManualListeningRef.current = true;
                                                    if (alwaysListenEnabled) {
                                                        stopWakeListening();
                                                    }
                                                }}
                                                onListenEnd={() => {
                                                    isManualListeningRef.current = false;
                                                }}
                                            />
                                        </View>
                                    </View>
                                </Animated.View>
                                <Animated.View
                                    style={[
                                        styles.keyboardLiftWrap,
                                        { transform: [{ translateY: inputTranslateY }] }
                                    ]}
                                >
                                    <BlurView intensity={45} tint="dark" style={styles.speechPanel}>
                                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                                            <Text style={styles.speechText}>{soniyaWords}</Text>
                                        </ScrollView>
                                    </BlurView>

                                    <View style={styles.footerInner}>
                                        <View style={styles.inputContainer}>
                                            <TextInput
                                                style={[styles.textInput, styles.textInputMultiline, { height: inputHeight }]}
                                                placeholder={`Baat karein ${userName}...`}
                                                placeholderTextColor="rgba(255,255,255,0.4)"
                                                value={userInputText}
                                                onChangeText={(value) => {
                                                    setUserInputText(value);
                                                    if (value?.trim()) {
                                                        if (autoAvatarMode) {
                                                            scheduleAvatarIdleCycle(AVATAR_IDLE_DELAY_MS + 6000);
                                                        }
                                                    } else if (autoAvatarMode) {
                                                        scheduleAvatarIdleCycle();
                                                    }
                                                }}
                                                onContentSizeChange={onInputContentSizeChange}
                                                multiline
                                                blurOnSubmit={false}
                                                returnKeyType="default"
                                                scrollEnabled={isInputScrollable}
                                                disableFullscreenUI
                                                textAlignVertical="top"
                                            />
                                            <Animated.View
                                                style={[
                                                    styles.sendBtnWrap,
                                                    {
                                                        transform: [{
                                                            scale: sendPulse.interpolate({
                                                                inputRange: [0, 1],
                                                                outputRange: [1, 1.08]
                                                            })
                                                        }],
                                                        opacity: sendPulse.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [0.9, 1]
                                                        })
                                                    }
                                                ]}
                                            >
                                                <TouchableOpacity
                                                    style={styles.sendBtn}
                                                    onPress={sendTypedMessage}
                                                >
                                                    <LinearGradient colors={['#ff69b4', '#ff1493', '#ff7ad1']} style={styles.sendIconBg}>
                                                        <Ionicons name="send" size={18} color="#fff" />
                                                    </LinearGradient>
                                                </TouchableOpacity>
                                            </Animated.View>
                                        </View>
                                    </View>
                                </Animated.View>
                                <Animated.Text style={[styles.footerBrand, { transform: [{ translateY: staticUiTranslateY }] }]}>
                                    Powered by NDI - Soniya v1.2.0
                                </Animated.Text>
                            </Animated.View>
                    </View>
                </SafeAreaView>

                <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
                    <View style={styles.modalOverlay}>
                        <BlurView intensity={100} tint="dark" style={styles.modalContent}>
                            <LinearGradient
                                colors={['rgba(255,105,180,0.1)', 'transparent']}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.modalHeaderFixed}>
                                <View style={styles.modalHeader}>
                                    <View>
                                        <View style={styles.modalTitleRow}>
                                            <View style={styles.modalTitleLogo}>
                                                <Image source={COMPANY_LOGO} style={styles.companyLogoImage} />
                                            </View>
                                            <Text style={styles.modalTitle}>{"Soniya's Profile"}</Text>
                                        </View>
                                        <Text style={styles.modalSubtitle}>Configure your AI Experience</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.closeModalBtn}>
                                        <Ionicons name="close" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.settingsScrollContent}
                            >

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

                                <View style={styles.settingItemColumn}>
                                    <View style={styles.settingTextGroup}>
                                        <View style={[styles.iconCircle, { backgroundColor: '#06b6d4' }]}><Ionicons name="speedometer" size={18} color="#fff" /></View>
                                        <View>
                                            <Text style={styles.settingLabel}>Voice Speed</Text>
                                            <Text style={styles.settingDesc}>Advanced control with slider (default 1.0x)</Text>
                                        </View>
                                    </View>
                                    <View style={styles.rateRow}>
                                        <TouchableOpacity style={styles.rateBtn} onPress={() => adjustVoiceRate(-0.05)}>
                                            <Text style={styles.rateBtnText}>-</Text>
                                        </TouchableOpacity>
                                        <Text style={styles.rateValue}>{voiceRate.toFixed(2)}x</Text>
                                        <TouchableOpacity style={styles.rateBtn} onPress={() => adjustVoiceRate(0.05)}>
                                            <Text style={styles.rateBtnText}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <Slider
                                        style={styles.rateSlider}
                                        minimumValue={0.6}
                                        maximumValue={1.4}
                                        step={0.01}
                                        value={voiceRate}
                                        minimumTrackTintColor="#ff69b4"
                                        maximumTrackTintColor="rgba(255,255,255,0.25)"
                                        thumbTintColor="#ff69b4"
                                        onValueChange={(value) => setVoiceRate(Number(value.toFixed(2)))}
                                    />
                                    <View style={styles.presetRow}>
                                        {[0.8, 1.0, 1.2].map((rate) => (
                                            <TouchableOpacity
                                                key={rate}
                                                onPress={() => setVoiceRate(rate)}
                                                style={[styles.ratePreset, Math.abs(voiceRate - rate) < 0.01 && styles.ratePresetActive]}
                                            >
                                                <Text style={[styles.ratePresetText, Math.abs(voiceRate - rate) < 0.01 && styles.ratePresetTextActive]}>
                                                    {rate.toFixed(1)}x
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <TouchableOpacity style={styles.previewBtn} onPress={previewVoiceSample}>
                                        <Ionicons name="play-circle" size={18} color="#fff" />
                                        <Text style={styles.previewBtnText}>Preview Voice</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.settingItemColumn}>
                                    <View style={styles.settingTextGroup}>
                                        <View style={[styles.iconCircle, { backgroundColor: '#fb7185' }]}><Ionicons name="mic-circle" size={18} color="#fff" /></View>
                                        <View>
                                            <Text style={styles.settingLabel}>Voice Style</Text>
                                            <Text style={styles.settingDesc}>Female assistant tone presets</Text>
                                        </View>
                                    </View>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.voiceChipRow}>
                                        {voiceOptions.slice(0, 8).map((voice) => (
                                            <TouchableOpacity
                                                key={voice.id}
                                                onPress={() => pickVoice(voice.id)}
                                                style={[styles.voiceChip, selectedVoiceId === voice.id && styles.voiceChipActive]}
                                            >
                                                <Text numberOfLines={1} style={[styles.voiceChipTitle, selectedVoiceId === voice.id && styles.voiceChipTitleActive]}>
                                                    {voice.name}
                                                </Text>
                                                <Text style={styles.voiceChipLang}>{voice.language}</Text>
                                            </TouchableOpacity>
                                        ))}
                                        {!voiceOptions.length && <Text style={styles.voiceEmptyText}>No voice options found on this device.</Text>}
                                    </ScrollView>
                                </View>

                                <View style={styles.settingItem}>
                                    <View style={styles.settingTextGroup}>
                                        <View style={[styles.iconCircle, { backgroundColor: '#7c3aed' }]}><Ionicons name="sparkles" size={18} color="#fff" /></View>
                                        <View>
                                            <Text style={styles.settingLabel}>Voice Button Style</Text>
                                            <Text style={styles.settingDesc}>Default mini button ya optional AI panel</Text>
                                        </View>
                                    </View>
                                    <View style={styles.viewToggle}>
                                        {VOICE_HANDLER_VARIANTS.map((variant) => (
                                            <TouchableOpacity
                                                key={variant}
                                                onPress={() => setVoiceHandlerVariant(variant)}
                                                style={[styles.miniToggle, voiceHandlerVariant === variant && styles.miniToggleActive]}
                                            >
                                                <Text style={[styles.miniToggleText, voiceHandlerVariant === variant && styles.miniToggleTextActive]}>
                                                    {VOICE_HANDLER_LABELS[variant]}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.settingItemColumn}>
                                    <View style={styles.settingTextGroup}>
                                        <View style={[styles.iconCircle, { backgroundColor: '#ec4899' }]}><Ionicons name="heart-circle" size={18} color="#fff" /></View>
                                        <View>
                                            <Text style={styles.settingLabel}>Personality Mood</Text>
                                            <Text style={styles.settingDesc}>Reply style mood profile</Text>
                                        </View>
                                    </View>
                                    <View style={styles.moodWrap}>
                                        {MOOD_OPTIONS.map((m) => (
                                            <TouchableOpacity
                                                key={m}
                                                onPress={() => setPersonaMood(m)}
                                                style={[styles.moodChip, personaMood === m && styles.moodChipActive]}
                                            >
                                                <Text style={[styles.moodChipText, personaMood === m && styles.moodChipTextActive]}>{m}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.settingItem}>
                                    <View style={styles.settingTextGroup}>
                                        <View style={[styles.iconCircle, { backgroundColor: '#22c55e' }]}><Ionicons name="mic" size={18} color="#fff" /></View>
                                        <View>
                                            <Text style={styles.settingLabel}>Always Listen</Text>
                                            <Text style={styles.settingDesc}>
                                                {speechRecognitionAvailable
                                                    ? 'Continuous quick capture and instant reply'
                                                    : 'Speech runtime unavailable (use a dev build)'}
                                            </Text>
                                        </View>
                                    </View>
                                    <Switch
                                        value={alwaysListenEnabled}
                                        onValueChange={setAlwaysListenEnabled}
                                        trackColor={{ false: '#333', true: '#22c55e' }}
                                        disabled={!speechRecognitionAvailable}
                                    />
                                </View>

                                <View style={styles.settingItem}>
                                    <View style={styles.settingTextGroup}>
                                        <View style={[styles.iconCircle, { backgroundColor: '#0ea5e9' }]}><Ionicons name="sync-circle" size={18} color="#fff" /></View>
                                        <View>
                                            <Text style={styles.settingLabel}>Avatar Auto Mode</Text>
                                            <Text style={styles.settingDesc}>Auto pose/mode switching every 15-20 sec</Text>
                                        </View>
                                    </View>
                                    <Switch value={autoAvatarMode} onValueChange={setAutoAvatarMode} trackColor={{ false: '#333', true: '#0ea5e9' }} />
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

                                <TouchableOpacity
                                    onPress={() => {
                                        setManualLang('EN');
                                        setShowManual(true);
                                    }}
                                    style={styles.manualTriggerBtn}
                                >
                                    <LinearGradient colors={['rgba(86,157,255,0.55)', 'rgba(168,85,247,0.58)', 'rgba(236,72,153,0.52)']} style={styles.manualTriggerGradient}>
                                        <View style={styles.manualTriggerIconWrap}>
                                            <Ionicons name="book" size={18} color="#fff" />
                                        </View>
                                        <View style={styles.manualTriggerTextWrap}>
                                            <Text style={styles.manualTriggerTitle}>{"Soniya's User Manual"}</Text>
                                            <Text style={styles.manualTriggerSubtitle}>Tap to view all non-private commands</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color="#fff" />
                                    </LinearGradient>
                                </TouchableOpacity>

                                <View style={styles.profileSection}>
                                    <Text style={styles.profileTitle}>SYSTEM INFO</Text>
                                    <View style={styles.devCard}>
                                        <View style={styles.devLogoCircle}>
                                            <Image source={COMPANY_LOGO} style={styles.devLogoImage} />
                                        </View>
                                        <View style={styles.devInfo}>
                                            <Text style={styles.devName}>Noshahi Developers Inc.</Text>
                                            <Text style={styles.devRole}>Authorized Premium Build - 2026</Text>
                                        </View>
                                        <Ionicons name="shield-checkmark" size={22} color="#ff69b4" />
                                    </View>
                                </View>
                            </ScrollView>
                        </BlurView>
                    </View>
                </Modal>

                <Modal visible={showManual} animationType="fade" transparent onRequestClose={() => setShowManual(false)}>
                    <View style={styles.manualOverlay}>
                        <View style={styles.manualCardShadow} />
                        <LinearGradient colors={['rgba(10,18,40,0.98)', 'rgba(31,14,48,0.98)', 'rgba(22,10,34,0.98)']} style={styles.manualCard}>
                            <View style={styles.manualHeader}>
                                <View>
                                    <Text style={styles.manualTitle}>{"Soniya's User Manual"}</Text>
                                    <Text style={styles.manualSubtitle}>Quick command guide (non-private)</Text>
                                    <View style={styles.manualLangRow}>
                                        {['EN', 'UR'].map((lang) => (
                                            <TouchableOpacity
                                                key={lang}
                                                onPress={() => setManualLang(lang)}
                                                style={[styles.manualLangBtn, manualLang === lang && styles.manualLangBtnActive]}
                                            >
                                                <Text style={[styles.manualLangBtnText, manualLang === lang && styles.manualLangBtnTextActive]}>
                                                    {lang === 'EN' ? 'English' : 'Urdu'}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => setShowManual(false)} style={styles.manualCloseBtn}>
                                    <Ionicons name="close" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.manualList}>
                                {manualCommands.map((item, idx) => (
                                    <View key={`${item.title}-${idx}`} style={styles.manualItem}>
                                        <Text style={styles.manualItemTitle}>{item.title}</Text>
                                        <Text style={styles.manualItemTrigger}>{item.trigger}</Text>
                                        <Text style={styles.manualItemResult}>{item.result}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </LinearGradient>
                    </View>
                </Modal>
            </View>
        </>
    );
}

export default function App() {
    return (
        <SafeAreaProvider>
            <AppContent />
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, position: 'relative' },
    backgroundLayer: { ...StyleSheet.absoluteFillObject },
    header: { marginTop: -2, paddingHorizontal: 25, zIndex: 5 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(2, 6, 20, 0.7)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
        paddingHorizontal: 9,
        paddingVertical: 5
    },
    companyLogoCircle: {
        width: 23,
        height: 23,
        borderRadius: 11.5,
        marginRight: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    companyLogoImage: { width: '100%', height: '100%' },
    statusDot: { width: 6, height: 3, borderRadius: 2, backgroundColor: '#4ade80', marginRight: 4, shadowColor: '#4ade80', shadowRadius: 5, shadowOpacity: 0.8 },
    brand: {
        color: 'rgba(255,255,255,0.93)',
        fontSize: 8,
        letterSpacing: 0.6,
        fontWeight: '900',
        textShadowColor: 'rgba(0,0,0,0.45)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3
    },
    profileBtn: { padding: 5 },
    profileIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,105,180,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    appNameWrap: {
        alignSelf: 'flex-start',
        marginTop: 2,
        paddingHorizontal: 10,
        paddingVertical: 1,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(3, 10, 28, 0.52)',
        shadowColor: '#65d8ff',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 18,
        shadowOpacity: 0.2
    },
    titleGlowBar: {
        position: 'absolute',
        top: -20,
        bottom: -20,
        left: '30%',
        width: '38%',
        borderRadius: 30
    },
    appNameRow: { flexDirection: 'row', alignItems: 'center' },
    appNameWord: { flexDirection: 'row', alignItems: 'center' },
    appNameLetter: {
        fontSize: 25,
        fontWeight: '900',
        letterSpacing: 0.8,
        textShadowColor: 'rgba(2, 8, 20, 0.55)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 5
    },
    proPill: {
        marginLeft: 2,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.26)',
        backgroundColor: 'rgba(12, 20, 44, 0.5)',
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#f472b6',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 10,
        shadowOpacity: 0.28
    },
    proLetter: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.6
    },
    stageArea: { flex: 1, justifyContent: 'flex-end' },
    avatarLayer: { ...StyleSheet.absoluteFillObject, zIndex: 2, justifyContent: 'flex-end' },
    controlsOverlay: { zIndex: 6, paddingHorizontal: 16, paddingBottom: 14 },
    controlsTopRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 8,
        flexWrap: 'wrap'
    },
    wakeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
        backgroundColor: 'rgba(3,12,28,0.72)',
        maxWidth: '72%'
    },
    wakeBadgeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#7dd3fc',
        shadowColor: '#7dd3fc',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6
    },
    wakeBadgeDotActive: {
        backgroundColor: '#4ade80',
        shadowColor: '#4ade80'
    },
    wakeBadgeText: {
        color: 'rgba(255,255,255,0.88)',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.3
    },
    voiceHandlerDock: {
        alignSelf: 'flex-end',
        zIndex: 8
    },
    voiceHandlerDockSolo: {
        marginLeft: 'auto'
    },
    voiceHandlerDockPanel: {
        width: '100%',
        alignSelf: 'stretch'
    },
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
    footerBrand: { color: 'rgba(255,255,255,0.2)', fontSize: 10, marginTop: 10, letterSpacing: 2, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { height: '85%', borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden', borderTopWidth: 1, borderTopColor: 'rgba(255, 105, 180, 0.3)' },
    modalHeaderFixed: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(3,6,16,0.9)',
        paddingHorizontal: 25,
        paddingTop: 18,
        paddingBottom: 12
    },
    settingsScrollContent: { paddingHorizontal: 25, paddingTop: 16, paddingBottom: 50 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
    modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    modalTitleLogo: {
        width: 26,
        height: 26,
        borderRadius: 13,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.24)'
    },
    modalTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 0.8 },
    modalSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
    closeModalBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: 20, borderRadius: 30, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,105,180,0.2)' },
    userAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,105,180,0.1)', justifyContent: 'center', alignItems: 'center' },
    userInfo: { marginLeft: 15, flex: 1 },
    userLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
    userNameInput: { color: '#fff', fontSize: 20, fontWeight: '700', paddingVertical: 0 },
    sectionTitle: { color: '#ff1493', fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 15, marginLeft: 5 },
    settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.05)', padding: 18, borderRadius: 25 },
    settingItemColumn: { marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.05)', padding: 18, borderRadius: 25 },
    settingTextGroup: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ff69b4', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    settingLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
    settingDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
    rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, gap: 18 },
    rateBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)'
    },
    rateBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
    rateValue: { color: '#fff', fontSize: 18, fontWeight: '800', minWidth: 74, textAlign: 'center' },
    rateSlider: { width: '100%', marginTop: 8 },
    presetRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 12 },
    ratePreset: {
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.06)'
    },
    ratePresetActive: { backgroundColor: '#ff69b4', borderColor: '#ff69b4' },
    ratePresetText: { color: 'rgba(255,255,255,0.82)', fontWeight: '700' },
    ratePresetTextActive: { color: '#fff' },
    previewBtn: {
        marginTop: 12,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 14,
        backgroundColor: 'rgba(255,105,180,0.22)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    previewBtnText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
    voiceChipRow: { paddingTop: 14, gap: 10 },
    voiceChip: {
        width: 150,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.06)',
        paddingHorizontal: 10,
        paddingVertical: 8
    },
    voiceChipActive: { borderColor: '#ff69b4', backgroundColor: 'rgba(255,105,180,0.22)' },
    voiceChipTitle: { color: 'rgba(255,255,255,0.92)', fontWeight: '700', fontSize: 12 },
    voiceChipTitleActive: { color: '#fff' },
    voiceChipLang: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 },
    voiceEmptyText: { color: 'rgba(255,255,255,0.55)', fontSize: 12, paddingVertical: 10 },
    moodWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    moodChip: {
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.07)'
    },
    moodChipActive: { borderColor: '#ff69b4', backgroundColor: 'rgba(255,105,180,0.22)' },
    moodChipText: { color: 'rgba(255,255,255,0.84)', fontSize: 12, fontWeight: '700' },
    moodChipTextActive: { color: '#fff' },
    vibeToggle: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15 },
    vibeText: { color: '#00ffff', fontSize: 10, fontWeight: '900' },
    profileSection: { marginTop: 20 },
    profileTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 3, marginBottom: 15 },
    devCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.04)',
        padding: 15,
        borderRadius: 25
    },
    devLogoCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        marginRight: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.24)'
    },
    devLogoImage: { width: '100%', height: '100%' },
    devInfo: { flex: 1, marginLeft: 0, marginRight: 10 },
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
    manualTriggerBtn: {
        marginTop: 14,
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    manualTriggerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12
    },
    manualTriggerIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.16)',
        marginRight: 10
    },
    manualTriggerTextWrap: { flex: 1 },
    manualTriggerTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
    manualTriggerSubtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 11, marginTop: 1 },
    manualOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.66)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 18
    },
    manualCardShadow: {
        position: 'absolute',
        width: '92%',
        height: '74%',
        borderRadius: 26,
        backgroundColor: 'rgba(86,157,255,0.22)',
        shadowColor: '#60a5fa',
        shadowRadius: 34,
        shadowOpacity: 0.4
    },
    manualCard: {
        width: '92%',
        maxHeight: '74%',
        borderRadius: 26,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        overflow: 'hidden',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 16
    },
    manualHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    manualTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
    manualSubtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
    manualLangRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
    manualLangBtn: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.24)',
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 12,
        paddingVertical: 6
    },
    manualLangBtnActive: {
        borderColor: 'rgba(125,211,252,0.95)',
        backgroundColor: 'rgba(56,189,248,0.25)'
    },
    manualLangBtnText: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '700' },
    manualLangBtnTextActive: { color: '#fff' },
    manualCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    manualList: { paddingBottom: 8, gap: 10 },
    manualItem: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        backgroundColor: 'rgba(255,255,255,0.06)',
        paddingHorizontal: 12,
        paddingVertical: 10
    },
    manualItemTitle: { color: '#fff', fontSize: 13, fontWeight: '800' },
    manualItemTrigger: { color: '#7dd3fc', fontSize: 12, marginTop: 3, fontWeight: '700' },
    manualItemResult: { color: 'rgba(255,255,255,0.84)', fontSize: 12, marginTop: 3 },
    keyboardLiftWrap: { width: '100%', zIndex: 3 },
    inputContainer: {
        width: '100%',
        marginBottom: 5,
        position: 'relative',
        justifyContent: 'flex-end',
        overflow: 'hidden',
        borderRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(255,105,180,0.36)',
        backgroundColor: 'rgba(2,8,22,0.66)',
        paddingLeft: 18,
        paddingRight: 68,
        paddingVertical: 6
    },
    textInput: {
        width: '100%',
        backgroundColor: 'transparent',
        borderRadius: 26,
        paddingHorizontal: 0,
        color: '#fff',
        fontSize: 16,
        borderWidth: 0,
        borderColor: 'transparent'
    },
    textInputMultiline: {
        minHeight: MIN_INPUT_HEIGHT,
        maxHeight: MAX_INPUT_HEIGHT,
        paddingTop: 14,
        paddingBottom: 14,
        lineHeight: INPUT_LINE_HEIGHT
    },
    sendBtnWrap: {
        position: 'absolute',
        right: 6,
        bottom: 6,
        shadowColor: '#ff5fb5',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 15
    },
    sendBtn: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    sendIconBg: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    orb: { position: 'absolute', width: 500, height: 500, borderRadius: 250, opacity: 0.27 },
    orb1: { top: -100, right: -100, shadowColor: '#ff00ff', shadowRadius: 120, shadowOpacity: 0.92 },
    orb2: { bottom: '10%', left: -150, shadowColor: '#00ffff', shadowRadius: 115, shadowOpacity: 0.92 },
    decorLayer: { ...StyleSheet.absoluteFillObject },
    decorItem: { position: 'absolute' },
    heartDecor: { right: 22, bottom: 236 },
    butterflyDecor: { left: 16, top: 142 },
    birdDecor: { right: 54, top: 192 },
    balloonDecor: { left: 38, bottom: 292 },
    starDecor: { right: 136, bottom: 320 },
    energyHaloA: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 148, 214, 0.6)',
        right: 42,
        bottom: 180
    },
    energyHaloB: {
        position: 'absolute',
        width: 210,
        height: 210,
        borderRadius: 105,
        borderWidth: 1.2,
        borderColor: 'rgba(130, 230, 255, 0.5)',
        left: 12,
        top: 112
    },
});
