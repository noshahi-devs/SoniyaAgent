import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

const BASE_BOTTOM_GAP = 0;
const AVATAR_FADE_MS = 5000;
const AVATAR_IMAGE_ASPECT_RATIO = 1024 / 1536;
const FULL_SOURCE = require('../assets/images/soniya_full.png');
const HALF_SOURCE = require('../assets/images/soniya_half.png');
const CLOSEUP_SOURCE = require('../assets/images/soniya_closeup.png');
const MOUTH_SMALL_SOURCE = require('../assets/images/soniya_mouth_open_small.png');
const MOUTH_LARGE_SOURCE = require('../assets/images/soniya_mouth_open_large.png');
const TALKING_DRESS_SOURCE = require('../assets/images/soniya_pose_talking_dress_change.png');
const NABEEL_SOURCE = require('../assets/images/soniya_pose_nabeel.png');
const PHONE_SOURCE = require('../assets/images/soniya_pose_phone.png');
const PHONE_ALT_1_SOURCE = require('../assets/images/1 soniya_pose_phone.png');
const PHONE_ALT_2_SOURCE = require('../assets/images/2 soniya_pose_phone.png');
const READING_SOURCE = require('../assets/images/soniya_pose_reading.png');
const READING_ALT_1_SOURCE = require('../assets/images/1 soniya_pose_reading.png');
const READING_ALT_2_SOURCE = require('../assets/images/2 soniya_pose_reading.png');
const RELAX_SOURCE = require('../assets/images/soniya_pose_relax.png');
const RELAX_ALT_1_SOURCE = require('../assets/images/1 soniya_pose_relax.png');
const SLEEP_SOURCE = require('../assets/images/soniya_pose_sleep.png');
const OFFICE_SOURCE = require('../assets/images/soniya_pose_office.png');
const LAPTOP_SOURCE = require('../assets/images/soniya_pose_laptop.png');
const AVATAR_SOURCES = {
    FULL: FULL_SOURCE,
    HALF: HALF_SOURCE,
    CLOSEUP: CLOSEUP_SOURCE,
    MOUTH_SMALL: MOUTH_SMALL_SOURCE,
    MOUTH_LARGE: MOUTH_LARGE_SOURCE
};
const DEFAULT_AVATAR_SCALE = 1.08;
const AVATAR_SOURCE_SCALES = new Map([
    [FULL_SOURCE, 1.08],
    [HALF_SOURCE, 1.08],
    [CLOSEUP_SOURCE, 1.08],
    [MOUTH_SMALL_SOURCE, 1.08],
    [MOUTH_LARGE_SOURCE, 1.08],
    [TALKING_DRESS_SOURCE, 1.02],
    [NABEEL_SOURCE, 1.22],
    [PHONE_SOURCE, 1.08],
    [PHONE_ALT_1_SOURCE, 1.10],
    [PHONE_ALT_2_SOURCE, 1.12],
    [READING_SOURCE, 1.08],
    [READING_ALT_1_SOURCE, 1.08],
    [READING_ALT_2_SOURCE, 1.10],
    [RELAX_SOURCE, 1.20],
    [RELAX_ALT_1_SOURCE, 1.22],
    [SLEEP_SOURCE, 1.22],
    [OFFICE_SOURCE, 1.08],
    [LAPTOP_SOURCE, 1.22]
]);

const STYLE_VARIANTS = {
    CLASSIC: {
        label: 'Classic',
        icon: 'sparkles-outline',
        tintColor: '#ffd6f1',
        tintOpacity: 0.04,
        glowColor: '#7dd3fc',
        chipBg: 'rgba(8,14,32,0.62)'
    },
    ELEGANT: {
        label: 'Elegant',
        icon: 'diamond-outline',
        tintColor: '#f5b6ff',
        tintOpacity: 0.12,
        glowColor: '#f472b6',
        chipBg: 'rgba(26,12,30,0.62)'
    },
    CASUAL: {
        label: 'Casual',
        icon: 'flower-outline',
        tintColor: '#93c5fd',
        tintOpacity: 0.11,
        glowColor: '#38bdf8',
        chipBg: 'rgba(8,22,36,0.62)'
    },
    OFFICE: {
        label: 'Office',
        icon: 'briefcase-outline',
        tintColor: '#a7f3d0',
        tintOpacity: 0.1,
        glowColor: '#34d399',
        chipBg: 'rgba(6,22,20,0.64)'
    }
};

const ACTIVITY_META = {
    CHAT: { label: 'Ready', icon: 'chatbubbles-outline' },
    RELAX: { label: 'Relaxing', icon: 'cafe-outline' },
    PHONE: { label: 'On Phone', icon: 'phone-portrait-outline' },
    READING: { label: 'Reading', icon: 'book-outline' },
    SLEEP: { label: 'Resting', icon: 'moon-outline' },
    OFFICE: { label: 'Working', icon: 'laptop-outline' }
};

const POSE_SWITCH_MIN_MS = 30000;
const POSE_SWITCH_MAX_MS = 38000;
const ACTIVITY_POSE_POOLS = {
    CHAT: [
        AVATAR_SOURCES.FULL,
        TALKING_DRESS_SOURCE,
        NABEEL_SOURCE
    ],
    PHONE: [
        PHONE_SOURCE,
        PHONE_ALT_1_SOURCE,
        PHONE_ALT_2_SOURCE
    ],
    READING: [
        READING_SOURCE,
        READING_ALT_1_SOURCE,
        READING_ALT_2_SOURCE
    ],
    RELAX: [
        RELAX_SOURCE,
        RELAX_ALT_1_SOURCE
    ],
    SLEEP: [
        SLEEP_SOURCE
    ],
    OFFICE: [
        OFFICE_SOURCE,
        LAPTOP_SOURCE
    ]
};

const pickNextPoseIndex = (itemsLength, previousIndex = 0) => {
    if (itemsLength <= 1) return 0;

    const safePrevious = Number.isInteger(previousIndex) ? previousIndex : 0;
    let next = Math.floor(Math.random() * itemsLength);
    if (next === safePrevious) {
        next = (next + 1) % itemsLength;
    }
    return next;
};

const resolveStaticAvatarSource = (viewType, posePool, poseVariantIndex) => {
    if (viewType === 'HALF') return AVATAR_SOURCES.HALF;
    if (viewType === 'CLOSEUP') return AVATAR_SOURCES.CLOSEUP;

    if (posePool.length) {
        const idx = ((poseVariantIndex % posePool.length) + posePool.length) % posePool.length;
        return posePool[idx];
    }

    return AVATAR_SOURCES.FULL;
};

const resolveSpeakingAvatarSource = (viewType, currentFrame) => {
    if (viewType === 'HALF') return AVATAR_SOURCES.HALF;
    if (viewType === 'CLOSEUP') return AVATAR_SOURCES.CLOSEUP;
    if (currentFrame === 1) return AVATAR_SOURCES.MOUTH_SMALL;
    if (currentFrame === 2) return AVATAR_SOURCES.MOUTH_LARGE;
    return AVATAR_SOURCES.FULL;
};

const getAvatarScale = (source) => AVATAR_SOURCE_SCALES.get(source) || DEFAULT_AVATAR_SCALE;

const SoniyaAvatar = ({
    mood,
    isSpeaking,
    isThinking = false,
    viewType = 'FULL',
    bottomInset = 0,
    activityMode = 'CHAT',
    styleVariant = 'CLASSIC',
    autoModeEnabled = true
}) => {
    const floatAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const activityPulse = useRef(new Animated.Value(0)).current;
    const avatarFade = useRef(new Animated.Value(0)).current;
    const idleFloatLoopRef = useRef(null);
    const speakPulseLoopRef = useRef(null);
    const activityPulseLoopRef = useRef(null);
    const poseSwitchTimerRef = useRef(null);
    const fadeResetFrameRef = useRef(null);
    const displaySourceRef = useRef(AVATAR_SOURCES.FULL);
    const incomingSourceRef = useRef(null);

    const [currentFrame, setCurrentFrame] = useState(0); // 0: closed, 1: small, 2: large
    const [poseVariantIndex, setPoseVariantIndex] = useState(0);
    const [displaySource, setDisplaySource] = useState(AVATAR_SOURCES.FULL);
    const [incomingSource, setIncomingSource] = useState(null);
    const lipsingInterval = useRef(null);

    const resolvedActivity = (isSpeaking || isThinking) ? 'CHAT' : (activityMode || 'CHAT');
    const styleProfile = STYLE_VARIANTS[styleVariant] || STYLE_VARIANTS.CLASSIC;
    const activityMeta = ACTIVITY_META[resolvedActivity] || ACTIVITY_META.CHAT;

    const startIdleFloat = useCallback(() => {
        if (idleFloatLoopRef.current) {
            idleFloatLoopRef.current.stop();
        }
        idleFloatLoopRef.current = Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -4, duration: 4200, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 4200, useNativeDriver: true }),
            ])
        );
        idleFloatLoopRef.current.start();
    }, [floatAnim]);

    const stopSpeakPulse = () => {
        if (speakPulseLoopRef.current) {
            speakPulseLoopRef.current.stop();
            speakPulseLoopRef.current = null;
        }
    };

    const cancelPendingFadeReset = useCallback(() => {
        if (fadeResetFrameRef.current !== null) {
            cancelAnimationFrame(fadeResetFrameRef.current);
            fadeResetFrameRef.current = null;
        }
    }, []);

    const queueFadeReset = useCallback(() => {
        cancelPendingFadeReset();
        fadeResetFrameRef.current = requestAnimationFrame(() => {
            fadeResetFrameRef.current = null;
            avatarFade.setValue(0);
        });
    }, [avatarFade, cancelPendingFadeReset]);

    useEffect(() => {
        startIdleFloat();
        activityPulseLoopRef.current = Animated.loop(
            Animated.sequence([
                Animated.timing(activityPulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
                Animated.timing(activityPulse, { toValue: 0, duration: 1400, useNativeDriver: true })
            ])
        );
        activityPulseLoopRef.current.start();

        return () => {
            if (idleFloatLoopRef.current) idleFloatLoopRef.current.stop();
            if (activityPulseLoopRef.current) activityPulseLoopRef.current.stop();
            if (poseSwitchTimerRef.current) clearTimeout(poseSwitchTimerRef.current);
            avatarFade.stopAnimation();
            cancelPendingFadeReset();
            stopSpeakPulse();
            if (lipsingInterval.current) clearInterval(lipsingInterval.current);
        };
    }, [activityPulse, avatarFade, cancelPendingFadeReset, startIdleFloat]);

    useEffect(() => {
        if (isSpeaking) {
            if (idleFloatLoopRef.current) {
                idleFloatLoopRef.current.stop();
                idleFloatLoopRef.current = null;
            }
            stopSpeakPulse();
            speakPulseLoopRef.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, { toValue: 1.03, duration: 460, useNativeDriver: true }),
                    Animated.timing(scaleAnim, { toValue: 1.0, duration: 460, useNativeDriver: true }),
                ])
            );
            speakPulseLoopRef.current.start();
            Animated.timing(floatAnim, { toValue: -6, duration: 420, useNativeDriver: true }).start();

            lipsingInterval.current = setInterval(() => {
                setCurrentFrame((prev) => (prev + 1) % 3);
            }, 180);
        } else {
            if (lipsingInterval.current) clearInterval(lipsingInterval.current);
            setCurrentFrame(0);
            stopSpeakPulse();
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
                Animated.spring(floatAnim, { toValue: 0, friction: 9, tension: 38, useNativeDriver: true })
            ]).start(() => startIdleFloat());
        }
    }, [isSpeaking, floatAnim, scaleAnim, startIdleFloat]);

    const viewConfig = {
        FULL: { width: 450, height: 665, bottomOffset: 46 },
        HALF: { width: 486, height: 690, bottomOffset: 68 },
        CLOSEUP: { width: 596, height: 812, bottomOffset: 92 }
    };
    const activeView = viewConfig[viewType] || viewConfig.FULL;
    const bottomGap = viewType === 'CLOSEUP'
        ? Math.max(0, Math.round(bottomInset * 0.25)) + BASE_BOTTOM_GAP
        : BASE_BOTTOM_GAP;

    const posePool = useMemo(() => {
        if (viewType !== 'FULL' || isSpeaking) return [];
        return ACTIVITY_POSE_POOLS[resolvedActivity] || ACTIVITY_POSE_POOLS.CHAT;
    }, [viewType, isSpeaking, resolvedActivity]);

    const usesPosePack = posePool.length > 0;

    useEffect(() => {
        if (poseSwitchTimerRef.current) {
            clearTimeout(poseSwitchTimerRef.current);
            poseSwitchTimerRef.current = null;
        }

        if (!posePool.length) {
            setPoseVariantIndex(0);
            return () => {};
        }

        setPoseVariantIndex(0);

        if (!autoModeEnabled || posePool.length <= 1) {
            return () => {};
        }

        const scheduleNextPose = () => {
            const delay = POSE_SWITCH_MIN_MS + Math.floor(Math.random() * (POSE_SWITCH_MAX_MS - POSE_SWITCH_MIN_MS + 1));
            poseSwitchTimerRef.current = setTimeout(() => {
                setPoseVariantIndex((prev) => pickNextPoseIndex(posePool.length, prev));
                scheduleNextPose();
            }, delay);
        };

        scheduleNextPose();
        return () => {
            if (poseSwitchTimerRef.current) {
                clearTimeout(poseSwitchTimerRef.current);
                poseSwitchTimerRef.current = null;
            }
        };
    }, [posePool, autoModeEnabled]);

    const staticAvatarSource = useMemo(
        () => resolveStaticAvatarSource(viewType, posePool, poseVariantIndex),
        [viewType, posePool, poseVariantIndex]
    );
    const speakingAvatarSource = useMemo(
        () => resolveSpeakingAvatarSource(viewType, currentFrame),
        [viewType, currentFrame]
    );

    useEffect(() => {
        cancelPendingFadeReset();

        if (isSpeaking) {
            avatarFade.stopAnimation();
            incomingSourceRef.current = null;
            setIncomingSource(null);
            displaySourceRef.current = speakingAvatarSource;
            setDisplaySource(speakingAvatarSource);
            queueFadeReset();
            return;
        }

        const currentVisibleSource = incomingSourceRef.current ?? displaySourceRef.current;
        if (currentVisibleSource === staticAvatarSource) {
            return;
        }

        avatarFade.stopAnimation();
        avatarFade.setValue(0);
        displaySourceRef.current = currentVisibleSource;
        setDisplaySource(currentVisibleSource);
        incomingSourceRef.current = staticAvatarSource;
        setIncomingSource(staticAvatarSource);

        Animated.timing(avatarFade, {
            toValue: 1,
            duration: AVATAR_FADE_MS,
            useNativeDriver: true
        }).start(({ finished }) => {
            if (!finished) return;
            displaySourceRef.current = staticAvatarSource;
            incomingSourceRef.current = null;
            setDisplaySource(staticAvatarSource);
            setIncomingSource(null);
            queueFadeReset();
        });
    }, [avatarFade, cancelPendingFadeReset, isSpeaking, queueFadeReset, speakingAvatarSource, staticAvatarSource]);

    const activityBodyTransform = useMemo(() => {
        if (resolvedActivity === 'SLEEP') {
            return [{ rotate: '-7deg' }, { translateX: 10 }, { translateY: 12 }, { scale: 0.95 }];
        }
        if (resolvedActivity === 'RELAX') {
            return [{ rotate: '-3deg' }, { translateY: 6 }, { scale: 0.98 }];
        }
        if (resolvedActivity === 'OFFICE') {
            return [{ translateY: -2 }, { scale: 0.99 }];
        }
        return [{ rotate: '0deg' }, { scale: 1 }];
    }, [resolvedActivity]);

    const moodAuraColor = useMemo(() => {
        const m = String(mood || '').toUpperCase();
        if (m === 'SAD') return 'rgba(125, 211, 252, 0.18)';
        if (m === 'HAPPY') return 'rgba(251, 146, 178, 0.2)';
        return 'rgba(148, 163, 184, 0.16)';
    }, [mood]);

    const activityFx = useMemo(() => {
        const base = {
            size: 210,
            bottom: 170,
            side: 'left',
            offset: 18,
            rotate: '0deg',
            glow: [moodAuraColor, 'rgba(86, 153, 255, 0.12)', 'rgba(0,0,0,0)']
        };
        if (resolvedActivity === 'PHONE') {
            return {
                ...base,
                size: 170,
                bottom: 230,
                side: 'right',
                offset: 58,
                rotate: '8deg',
                glow: ['rgba(126, 240, 255, 0.58)', 'rgba(86, 146, 255, 0.2)', 'rgba(0,0,0,0)']
            };
        }
        if (resolvedActivity === 'READING') {
            return {
                ...base,
                size: 190,
                bottom: 214,
                side: 'left',
                offset: 44,
                rotate: '-9deg',
                glow: ['rgba(255, 206, 130, 0.52)', 'rgba(255, 164, 96, 0.22)', 'rgba(0,0,0,0)']
            };
        }
        if (resolvedActivity === 'RELAX') {
            return {
                ...base,
                size: 255,
                bottom: 130,
                side: 'left',
                offset: 4,
                rotate: '0deg',
                glow: ['rgba(214, 179, 255, 0.44)', 'rgba(123, 92, 206, 0.24)', 'rgba(0,0,0,0)']
            };
        }
        if (resolvedActivity === 'SLEEP') {
            return {
                ...base,
                size: 250,
                bottom: 132,
                side: 'right',
                offset: 12,
                rotate: '4deg',
                glow: ['rgba(171, 196, 255, 0.4)', 'rgba(97, 117, 198, 0.18)', 'rgba(0,0,0,0)']
            };
        }
        if (resolvedActivity === 'OFFICE') {
            return {
                ...base,
                size: 240,
                bottom: 144,
                side: 'right',
                offset: 34,
                rotate: '-6deg',
                glow: ['rgba(102, 255, 224, 0.4)', 'rgba(35, 167, 151, 0.18)', 'rgba(0,0,0,0)']
            };
        }
        return base;
    }, [resolvedActivity, moodAuraColor]);

    const outgoingAvatarOpacity = incomingSource
        ? avatarFade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
        : 1;
    const outgoingTintOpacity = styleProfile.tintOpacity;
    const incomingTintOpacity = styleProfile.tintOpacity;
    const avatarFrameStyle = {
        width: activeView.width,
        height: activeView.height,
        transform: [{ translateY: activeView.bottomOffset }]
    };
    const renderAvatarLayer = (source, opacity, tintOpacity, layerKey) => {
        if (!source) return null;
        const avatarScale = getAvatarScale(source);
        const pinnedTranslateY = -((activeView.height * (avatarScale - 1)) / 2);

        return (
            <Animated.View key={layerKey} pointerEvents="none" style={[styles.characterLayer, { opacity }]}>
                <View style={styles.characterSlot}>
                    <View
                        style={[
                            styles.characterContent,
                            {
                                transform: [{ translateY: pinnedTranslateY }, { scale: avatarScale }]
                            }
                        ]}
                    >
                        <Image source={source} style={styles.character} resizeMode="contain" />
                        <Animated.Image
                            source={source}
                            style={[
                                styles.character,
                                styles.tintLayer,
                                {
                                    tintColor: styleProfile.tintColor,
                                    opacity: tintOpacity
                                }
                            ]}
                            resizeMode="contain"
                        />
                    </View>
                </View>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.anchor, { bottom: bottomGap, transform: [{ translateY: floatAnim }, { scale: scaleAnim }] }]}>
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.activityLight,
                        {
                            width: activityFx.size,
                            height: activityFx.size,
                            borderRadius: activityFx.size / 2,
                            bottom: activityFx.bottom,
                            opacity: activityPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.82] }),
                            transform: [
                                { translateY: activityPulse.interpolate({ inputRange: [0, 1], outputRange: [2, -7] }) },
                                { rotate: activityFx.rotate }
                            ],
                            ...(activityFx.side === 'right' ? { right: activityFx.offset } : { left: activityFx.offset })
                        }
                    ]}
                >
                    <LinearGradient
                        colors={activityFx.glow}
                        start={{ x: 0.12, y: 0.14 }}
                        end={{ x: 0.88, y: 0.92 }}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.characterWrap,
                        {
                            transform: activityBodyTransform,
                            shadowColor: styleProfile.glowColor,
                            shadowOpacity: 0.24
                        }
                    ]}
                >
                    <View style={[styles.characterFrame, avatarFrameStyle]}>
                        {renderAvatarLayer(displaySource, outgoingAvatarOpacity, outgoingTintOpacity, 'current')}
                        {incomingSource && renderAvatarLayer(incomingSource, avatarFade, incomingTintOpacity, 'next')}
                    </View>
                </Animated.View>

                <Animated.View
                    style={[
                        styles.styleChip,
                        {
                            borderColor: `${styleProfile.glowColor}95`,
                            backgroundColor: styleProfile.chipBg,
                            opacity: activityPulse.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] })
                        }
                    ]}
                >
                    <LinearGradient
                        colors={['rgba(255,255,255,0.17)', 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0)']}
                        start={{ x: 0.05, y: 0.1 }}
                        end={{ x: 0.95, y: 0.95 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <Ionicons name={styleProfile.icon} size={12} color={styleProfile.glowColor} />
                    <Text style={styles.styleChipText}>{styleProfile.label}</Text>
                </Animated.View>

                <Animated.View
                    style={[
                        styles.activityChip,
                        {
                            borderColor: `${styleProfile.glowColor}8A`,
                            backgroundColor: moodAuraColor,
                            opacity: activityPulse.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] })
                        }
                    ]}
                >
                    <LinearGradient
                        colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0)']}
                        start={{ x: 0.08, y: 0.15 }}
                        end={{ x: 0.92, y: 0.9 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <Ionicons name={activityMeta.icon} size={12} color={styleProfile.glowColor} />
                    <Text style={styles.activityChipText}>{activityMeta.label}</Text>
                </Animated.View>

                {resolvedActivity === 'PHONE' && !usesPosePack && (
                    <Animated.View
                        style={[
                            styles.phoneProp,
                            {
                                transform: [{ translateY: activityPulse.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }]
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={['rgba(103,212,255,0.55)', 'rgba(18,34,72,0.88)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <Ionicons name="phone-portrait" size={18} color="#fff" />
                    </Animated.View>
                )}
                {resolvedActivity === 'READING' && !usesPosePack && (
                    <Animated.View
                        style={[
                            styles.bookProp,
                            {
                                transform: [{ translateY: activityPulse.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }]
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={['rgba(255,197,120,0.52)', 'rgba(88,46,132,0.84)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <Ionicons name="book" size={18} color="#fff" />
                    </Animated.View>
                )}
                {resolvedActivity === 'RELAX' && !usesPosePack && (
                    <Animated.View
                        style={[
                            styles.sofaProp,
                            {
                                transform: [{ translateY: activityPulse.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }]
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={['rgba(215,170,255,0.4)', 'rgba(82,66,126,0.78)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <Ionicons name="cafe-outline" size={16} color="#fff" />
                    </Animated.View>
                )}
                {resolvedActivity === 'SLEEP' && !usesPosePack && (
                    <Animated.View
                        style={[
                            styles.bedProp,
                            {
                                transform: [{ translateY: activityPulse.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={['rgba(182,202,255,0.4)', 'rgba(63,80,114,0.8)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <Text style={styles.zzzText}>Zz</Text>
                    </Animated.View>
                )}
                {resolvedActivity === 'OFFICE' && !usesPosePack && (
                    <Animated.View
                        style={[
                            styles.officeDesk,
                            {
                                transform: [{ translateY: activityPulse.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }]
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={['rgba(88,249,223,0.35)', 'rgba(10,52,42,0.82)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <Ionicons name="laptop-outline" size={18} color="#fff" />
                    </Animated.View>
                )}

                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.edgeRim,
                        {
                            borderColor: `${styleProfile.glowColor}66`,
                            opacity: activityPulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.55] })
                        }
                    ]}
                />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', width: '100%', overflow: 'visible' },
    anchor: { position: 'absolute', bottom: 0, alignItems: 'center' },
    characterWrap: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 18
    },
    characterFrame: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'flex-end',
        overflow: 'visible'
    },
    characterLayer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'flex-end'
    },
    characterSlot: {
        position: 'relative',
        height: '100%',
        aspectRatio: AVATAR_IMAGE_ASPECT_RATIO,
        alignItems: 'center',
        justifyContent: 'flex-end'
    },
    characterContent: {
        width: '100%',
        height: '100%'
    },
    character: { width: '100%', height: '100%' },
    tintLayer: {
        ...StyleSheet.absoluteFillObject
    },
    activityLight: {
        position: 'absolute'
    },
    styleChip: {
        position: 'absolute',
        top: 38,
        right: -8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        overflow: 'hidden'
    },
    styleChipText: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '800' },
    activityChip: {
        position: 'absolute',
        left: -8,
        top: 76,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        overflow: 'hidden'
    },
    activityChipText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    phoneProp: {
        position: 'absolute',
        right: 58,
        bottom: 212,
        width: 32,
        height: 52,
        borderRadius: 12,
        backgroundColor: 'rgba(14, 24, 42, 0.88)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    bookProp: {
        position: 'absolute',
        left: 58,
        bottom: 222,
        width: 48,
        height: 34,
        borderRadius: 10,
        backgroundColor: 'rgba(96, 42, 132, 0.82)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    sofaProp: {
        position: 'absolute',
        bottom: 106,
        width: 156,
        height: 48,
        borderRadius: 16,
        backgroundColor: 'rgba(94, 78, 116, 0.62)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    bedProp: {
        position: 'absolute',
        bottom: 100,
        width: 172,
        height: 52,
        borderRadius: 18,
        backgroundColor: 'rgba(64, 80, 114, 0.6)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    zzzText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
    officeDesk: {
        position: 'absolute',
        bottom: 104,
        width: 178,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(10, 52, 42, 0.66)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    edgeRim: {
        position: 'absolute',
        width: 236,
        height: 236,
        borderRadius: 118,
        borderWidth: 1.2,
        right: 12,
        bottom: 120
    }
});

export default SoniyaAvatar;
