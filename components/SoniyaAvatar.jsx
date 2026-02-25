import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

const SoniyaAvatar = ({ mood, isSpeaking, viewType = 'FULL' }) => {
    const floatAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const [currentFrame, setCurrentFrame] = useState(0); // 0: closed, 1: small, 2: large
    const lipsingInterval = useRef(null);

    useEffect(() => {
        // Gentle idle float while staying bottom-anchored.
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -10, duration: 3600, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 3600, useNativeDriver: true }),
            ])
        ).start();

        return () => {
            if (lipsingInterval.current) clearInterval(lipsingInterval.current);
        };
    }, []);

    useEffect(() => {
        if (isSpeaking) {
            // Slow and natural speech pulse.
            Animated.parallel([
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(scaleAnim, { toValue: 1.06, duration: 420, useNativeDriver: true }),
                        Animated.timing(scaleAnim, { toValue: 1.02, duration: 420, useNativeDriver: true }),
                    ])
                ),
                Animated.timing(floatAnim, { toValue: -14, duration: 450, useNativeDriver: true })
            ]).start();

            // Lipsing Cycle
            lipsingInterval.current = setInterval(() => {
                setCurrentFrame(prev => (prev + 1) % 3);
            }, 180);
        } else {
            if (lipsingInterval.current) clearInterval(lipsingInterval.current);
            setCurrentFrame(0);
            scaleAnim.stopAnimation();
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 35, useNativeDriver: true }),
                Animated.spring(floatAnim, { toValue: 0, friction: 8, tension: 35, useNativeDriver: true })
            ]).start();
        }
    }, [isSpeaking]);

    const viewConfig = {
        FULL: { width: 420, height: 620, yLift: -52 },
        HALF: { width: 430, height: 600, yLift: -24 },
        CLOSEUP: { width: 470, height: 620, yLift: 0 }
    };
    const activeView = viewConfig[viewType] || viewConfig.FULL;

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
    character: { width: 420, height: 620 },
});

export default SoniyaAvatar;
