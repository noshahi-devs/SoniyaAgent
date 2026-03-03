import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

const BASE_BOTTOM_GAP = 24;

const SoniyaAvatar = ({ mood, isSpeaking, viewType = 'FULL', bottomInset = 0 }) => {
    const floatAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const idleFloatLoopRef = useRef(null);
    const speakPulseLoopRef = useRef(null);

    const [currentFrame, setCurrentFrame] = useState(0); // 0: closed, 1: small, 2: large
    const lipsingInterval = useRef(null);

    const startIdleFloat = () => {
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
    };

    const stopSpeakPulse = () => {
        if (speakPulseLoopRef.current) {
            speakPulseLoopRef.current.stop();
            speakPulseLoopRef.current = null;
        }
    };

    useEffect(() => {
        startIdleFloat();
        return () => {
            if (idleFloatLoopRef.current) idleFloatLoopRef.current.stop();
            stopSpeakPulse();
            if (lipsingInterval.current) clearInterval(lipsingInterval.current);
        };
    }, []);

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

            // Lipsing Cycle
            lipsingInterval.current = setInterval(() => {
                setCurrentFrame(prev => (prev + 1) % 3);
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
    }, [isSpeaking]);

    const viewConfig = {
        // Negative yLift pushes avatar down so feet/body baseline touches screen bottom naturally.
        FULL: { width: 420, height: 620, yLift: -20 },
        HALF: { width: 455, height: 645, yLift: -30 },
        CLOSEUP: { width: 560, height: 760, yLift: -60 }
    };
    const activeView = viewConfig[viewType] || viewConfig.FULL;
    const bottomGap = Math.max(0, bottomInset) + BASE_BOTTOM_GAP;

    // Image Source Logic
    const getAvatarImage = () => {
        if (viewType === 'HALF') return require('../assets/images/soniya_half.png');
        if (viewType === 'CLOSEUP') return require('../assets/images/soniya_closeup.png');

        // Full Body Lipsing
        if (isSpeaking) {
            if (currentFrame === 1) return require('../assets/images/soniya_mouth_open_small.png');
            if (currentFrame === 2) return require('../assets/images/soniya_mouth_open_large.png');
        }
        return require('../assets/images/soniya_full.png');
    };

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.anchor, { bottom: bottomGap, transform: [{ translateY: floatAnim }, { scale: scaleAnim }] }]}>
                <Image
                    source={getAvatarImage()}
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
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', width: '100%', overflow: 'visible' },
    anchor: { position: 'absolute', bottom: 0, alignItems: 'center' },
    character: { width: 420, height: 620 },
});

export default SoniyaAvatar;
