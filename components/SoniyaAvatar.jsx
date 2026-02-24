import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

const SoniyaAvatar = ({ mood, isThinking }) => {
    const floatAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -15, duration: 3000, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // Mood colors for the background glow
    const glowColor = mood === 'LOVE' ? '#ff1493' : mood === 'HAPPY' ? '#ffd700' : '#9370db';

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.glow, { backgroundColor: glowColor, shadowColor: glowColor }]} />
            <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
                {/* Yahan aap Soniya ki 3D smart girl image ka path dalenge */}
                <Image
                    source={require('../assets/soniya_3d.png')}
                    style={styles.character}
                    resizeMode="contain"
                />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { height: 350, justifyContent: 'center', alignItems: 'center' },
    character: { width: 280, height: 280 },
    glow: {
        position: 'absolute', width: 200, height: 200, borderRadius: 100,
        opacity: 0.3, elevation: 50, shadowRadius: 50, shadowOpacity: 1
    }
});

export default SoniyaAvatar;