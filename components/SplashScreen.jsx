import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, ImageBackground, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const SPLASH_IMAGE = require('../assets/images/splash-icon.png');

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
            <ImageBackground source={SPLASH_IMAGE} style={styles.bgImage} resizeMode="cover">
                <LinearGradient
                    colors={['rgba(5,1,17,0.35)', 'rgba(3,0,12,0.55)', 'rgba(0,0,0,0.7)']}
                    style={StyleSheet.absoluteFill}
                />
            </ImageBackground>

            <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
                <Animated.View style={[styles.ring, { transform: [{ rotate: spin }] }]} />
                <Animated.View style={[styles.ring, styles.ring2, { transform: [{ rotate: '-45deg' }, { scale: 1.2 }] }]} />
            </Animated.View>

            <SafeAreaView pointerEvents="none" style={styles.captionSafe}>
                <Animated.View style={[styles.captionChip, { opacity: textFadeAnim }]}>
                    <Text style={styles.pro}>PREMIUM AI VERSION</Text>
                    <View style={styles.line} />
                    <Text style={styles.company}>Noshahi Developers Inc.</Text>
                </Animated.View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    bgImage: { ...StyleSheet.absoluteFillObject },
    captionSafe: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        paddingBottom: 14
    },
    captionChip: {
        minWidth: 210,
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        backgroundColor: 'rgba(1,6,18,0.38)'
    },
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
    pro: {
        color: '#9beeff',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 3.2,
        marginTop: 2,
        textAlign: 'center'
    },
    line: {
        width: 62,
        height: 2,
        backgroundColor: 'rgba(135, 236, 255, 0.9)',
        marginVertical: 8,
        alignSelf: 'center',
        borderRadius: 2
    },
    company: {
        color: 'rgba(255,255,255,0.74)',
        fontSize: 10,
        letterSpacing: 1.2,
        fontWeight: '700',
        textAlign: 'center'
    }
});

export default SplashScreen;
