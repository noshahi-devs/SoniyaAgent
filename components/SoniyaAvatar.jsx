import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

const BASE_BOTTOM_GAP = 0;

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

const POSE_SWITCH_MIN_MS = 15000;
const POSE_SWITCH_MAX_MS = 20000;
const ACTIVITY_POSE_POOLS = {
    CHAT: [
        require('../assets/images/soniya_full.png'),
        require('../assets/images/soniya_pose_talking_dress_change.png'),
        require('../assets/images/soniya_pose_nabeel.png')
    ],
    PHONE: [
        require('../assets/images/soniya_pose_phone.png'),
        require('../assets/images/1 soniya_pose_phone.png'),
        require('../assets/images/2 soniya_pose_phone.png')
    ],
    READING: [
        require('../assets/images/soniya_pose_reading.png'),
        require('../assets/images/1 soniya_pose_reading.png'),
        require('../assets/images/2 soniya_pose_reading.png')
    ],
    RELAX: [
        require('../assets/images/soniya_pose_relax.png'),
        require('../assets/images/1 soniya_pose_relax.png')
    ],
    SLEEP: [
        require('../assets/images/soniya_pose_sleep.png')
    ],
    OFFICE: [
        require('../assets/images/soniya_pose_office.png'),
        require('../assets/images/soniya_pose_laptop.png')
    ]
};

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
    const idleFloatLoopRef = useRef(null);
    const speakPulseLoopRef = useRef(null);
    const activityPulseLoopRef = useRef(null);
    const poseSwitchTimerRef = useRef(null);

    const [currentFrame, setCurrentFrame] = useState(0); // 0: closed, 1: small, 2: large
    const [poseVariantIndex, setPoseVariantIndex] = useState(0);
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
            stopSpeakPulse();
            if (lipsingInterval.current) clearInterval(lipsingInterval.current);
        };
    }, [activityPulse, startIdleFloat]);

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
        // Negative yLift pushes avatar down so feet/body baseline touches screen bottom naturally.
        FULL: { width: 420, height: 620, yLift: -30 },
        HALF: { width: 455, height: 645, yLift: -54 },
        CLOSEUP: { width: 560, height: 760, yLift: -72 }
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

        setPoseVariantIndex((prev) => {
            if (posePool.length <= 1) return 0;
            const safePrev = Number.isInteger(prev) ? prev : 0;
            let next = Math.floor(Math.random() * posePool.length);
            if (next === safePrev) {
                next = (next + 1) % posePool.length;
            }
            return next;
        });

        if (!autoModeEnabled || posePool.length <= 1) {
            return () => {};
        }

        const scheduleNextPose = () => {
            const delay = POSE_SWITCH_MIN_MS + Math.floor(Math.random() * (POSE_SWITCH_MAX_MS - POSE_SWITCH_MIN_MS + 1));
            poseSwitchTimerRef.current = setTimeout(() => {
                setPoseVariantIndex((prev) => {
                    if (posePool.length <= 1) return 0;
                    const safePrev = Number.isInteger(prev) ? prev : 0;
                    let next = Math.floor(Math.random() * posePool.length);
                    if (next === safePrev) {
                        next = (next + 1) % posePool.length;
                    }
                    return next;
                });
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

    const avatarSource = useMemo(() => {
        if (viewType === 'HALF') return require('../assets/images/soniya_half.png');
        if (viewType === 'CLOSEUP') return require('../assets/images/soniya_closeup.png');

        if (isSpeaking) {
            if (currentFrame === 1) return require('../assets/images/soniya_mouth_open_small.png');
            if (currentFrame === 2) return require('../assets/images/soniya_mouth_open_large.png');
        }

        if (posePool.length) {
            const idx = ((poseVariantIndex % posePool.length) + posePool.length) % posePool.length;
            return posePool[idx];
        }

        return require('../assets/images/soniya_full.png');
    }, [viewType, isSpeaking, currentFrame, posePool, poseVariantIndex]);

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
                    <Image
                        source={avatarSource}
                        style={[
                            styles.character,
                            {
                                width: activeView.width,
                                height: activeView.height,
                                marginBottom: activeView.yLift
                            }
                        ]}
                        resizeMode="contain"
                    />
                    <Image
                        source={avatarSource}
                        style={[
                            styles.character,
                            styles.tintLayer,
                            {
                                width: activeView.width,
                                height: activeView.height,
                                marginBottom: activeView.yLift,
                                tintColor: styleProfile.tintColor,
                                opacity: styleProfile.tintOpacity
                            }
                        ]}
                        resizeMode="contain"
                    />
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
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 18
    },
    character: { width: 420, height: 620 },
    tintLayer: {
        position: 'absolute',
        top: 0,
        left: 0
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
