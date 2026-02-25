import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

const SoniyaAvatar = ({ mood, isSpeaking, viewType = 'FULL' }) => {
    const floatAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const [currentFrame, setCurrentFrame] = useState(0); // 0: closed, 1: small, 2: large
    const lipsingInterval = useRef(null);

    useEffect(() => {
        // Floating loop - starts at 0 and goes UP, so it touches bottom at 0
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -15, duration: 3000, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
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
    container: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', width: '100%', overflow: 'hidden' },
    character: { width: 450, height: 600, marginBottom: 0 },
    halfBody: { width: 480, height: 620, marginBottom: 0 },
    closeupBody: { width: 550, height: 700, marginBottom: 0 },
});

export default SoniyaAvatar;