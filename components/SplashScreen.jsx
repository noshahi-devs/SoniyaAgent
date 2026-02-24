import { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

const SplashScreen = ({ onFinish }) => {
    const fadeAnim = new Animated.Value(0);
    const scaleAnim = new Animated.Value(0.8);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start();

        setTimeout(onFinish, 3500); // 3.5 seconds baad app main screen par jayegi
    }, []);

    return (
        <View style={styles.container}>
            <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
                <Text style={styles.logoText}>SONIYA</Text>
                <View style={styles.line} />
                <Text style={styles.company}>Noshahi Developers Inc.</Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' },
    logoText: { color: '#ff69b4', fontSize: 50, fontWeight: '900', letterSpacing: 15 },
    line: { width: 100, height: 2, backgroundColor: '#ff69b4', marginVertical: 10 },
    company: { color: 'rgba(255,255,255,0.5)', fontSize: 12, letterSpacing: 3, fontWeight: 'bold' }
});

export default SplashScreen;