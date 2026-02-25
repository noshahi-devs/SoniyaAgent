import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StatusBar, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onFinish }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.5)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const textFadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Step 1: Logo enters
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
            Animated.timing(rotateAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        ]).start();

        // Step 2: Show Subtitle
        setTimeout(() => {
            Animated.timing(textFadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }).start();
        }, 1200);

        setTimeout(onFinish, 5000);
    }, []);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            <LinearGradient
                colors={['#050111', '#4b0082', '#000']}
                style={StyleSheet.absoluteFill}
            />

            <Animated.View style={[styles.ring, { transform: [{ rotate: spin }] }]} />
            <Animated.View style={[styles.ring, styles.ring2, { transform: [{ rotate: '-45deg' }, { scale: 1.2 }] }]} />

            <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
                <Text style={styles.logoText}>SONIYA</Text>
                <Animated.View style={{ opacity: textFadeAnim }}>
                    <Text style={styles.pro}>PREMIUM AI VERSION</Text>
                    <View style={styles.line} />
                    <Text style={styles.company}>NOSHAHI DEVELOPERS INC.</Text>
                </Animated.View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    ring: {
        position: 'absolute',
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: (width * 0.8) / 2,
        borderWidth: 2,
        borderColor: 'rgba(255, 105, 180, 0.4)',
        borderStyle: 'dashed',
    },
    ring2: {
        width: width * 0.9,
        height: width * 0.9,
        borderRadius: (width * 0.9) / 2,
        borderColor: 'rgba(75, 0, 130, 0.4)',
    },
    logoText: {
        color: '#fff',
        fontSize: 60,
        fontWeight: '900',
        letterSpacing: 18,
        textShadowColor: 'rgba(255, 105, 180, 1)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 40
    },
    pro: { color: '#00ffff', fontSize: 16, fontWeight: '800', letterSpacing: 8, marginTop: 5, textAlign: 'center', textShadowColor: '#00ffff', textShadowRadius: 10 },
    line: { width: 80, height: 3, backgroundColor: '#00ffff', marginVertical: 25, alignSelf: 'center', borderRadius: 2, shadowColor: '#00ffff', shadowRadius: 10, shadowOpacity: 0.8 },
    company: { color: 'rgba(255,255,255,0.7)', fontSize: 12, letterSpacing: 6, fontWeight: '800', textAlign: 'center' }
});

export default SplashScreen;