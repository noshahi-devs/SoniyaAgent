import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

const SoniyaAvatar = ({ mood, isSpeaking, viewType = 'FULL' }) => {
    const floatAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0.3)).current;

    const [currentFrame, setCurrentFrame] = useState(0); // 0: closed, 1: small, 2: large
    const lipsingInterval = useRef(null);

    useEffect(() => {
        // Floating loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -15, duration: 3000, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
            ])
        ).start();

        // Glow pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
                Animated.timing(glowAnim, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
            ])
        ).start();

        return () => {
            if (lipsingInterval.current) clearInterval(lipsingInterval.current);
        };
    }, []);

    useEffect(() => {
        if (isSpeaking) {
            // Talking animation (Scale pulse + Zoom Forward)
            Animated.parallel([
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(scaleAnim, { toValue: 1.15, duration: 250, useNativeDriver: true }),
                        Animated.timing(scaleAnim, { toValue: 1.1, duration: 250, useNativeDriver: true }),
                    ])
                ),
                Animated.timing(floatAnim, { toValue: -30, duration: 300, useNativeDriver: true })
            ]).start();

            // Lipsing Cycle
            lipsingInterval.current = setInterval(() => {
                setCurrentFrame(prev => (prev + 1) % 3);
            }, 120);
        } else {
            if (lipsingInterval.current) clearInterval(lipsingInterval.current);
            setCurrentFrame(0);
            scaleAnim.stopAnimation();
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
                Animated.spring(floatAnim, { toValue: 0, friction: 5, useNativeDriver: true })
            ]).start();
        }
    }, [isSpeaking]);

    // Mood colors for the background glow
    const glowColor = mood === 'LOVE' ? '#ff1493' : mood === 'HAPPY' ? '#ffd700' : mood === 'ANGRY' ? '#ff0000' : '#4b0082';

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
            <Animated.View style={[styles.glow, { backgroundColor: glowColor, shadowColor: glowColor, opacity: glowAnim }]} />
            <Animated.View style={{ transform: [{ translateY: floatAnim }, { scale: scaleAnim }] }}>
                <Image
                    source={getAvatarImage()}
                    style={[
                        styles.character,
                        viewType === 'HALF' && styles.halfBody,
                        viewType === 'CLOSEUP' && styles.closeupBody
                    ]}
                    resizeMode="contain"
                />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { height: 400, justifyContent: 'center', alignItems: 'center' },
    character: { width: 350, height: 400 },
    halfBody: { width: 400, height: 450, marginTop: 50 },
    closeupBody: { width: 500, height: 550, marginTop: 100 },
    glow: {
        position: 'absolute', width: 220, height: 220, borderRadius: 110,
        elevation: 100, shadowRadius: 100, shadowOpacity: 1
    }
});

export default SoniyaAvatar;