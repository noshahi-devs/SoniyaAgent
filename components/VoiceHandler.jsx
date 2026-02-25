import { LinearGradient } from 'expo-linear-gradient';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const VoiceHandler = ({ onSpeechResult }) => {
    const [isListening, setIsListening] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isListening) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isListening]);

    useSpeechRecognitionEvent("result", (event) => {
        const transcript = event.results[0]?.transcript;
        if (transcript) {
            onSpeechResult(transcript);
        }
    });

    useSpeechRecognitionEvent("end", () => {
        setIsListening(false);
    });

    const handlePressIn = async () => {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
            Alert.alert("Permission Required", "Soniya ko mic ki zaroorat hai.");
            return;
        }

        setIsListening(true);
        ExpoSpeechRecognitionModule.start({
            lang: "en-US",
            interimResults: false,
        });
    };

    const handlePressOut = () => {
        ExpoSpeechRecognitionModule.stop();
        setIsListening(false);
    };

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.pulseShadow, { transform: [{ scale: pulseAnim }], opacity: isListening ? 0.3 : 0 }]} />
            <TouchableOpacity
                activeOpacity={0.8}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                <LinearGradient
                    colors={isListening ? ['#ff4081', '#ff1493'] : ['#ff69b4', '#db7093']}
                    style={styles.btn}
                >
                    <Text style={styles.btnText}>
                        {isListening ? "LISENING..." : "HOLD TO SPEAK"}
                    </Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { alignItems: 'center', justifyContent: 'center' },
    pulseShadow: {
        position: 'absolute',
        width: 280,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ff69b4',
    },
    btn: {
        paddingVertical: 18,
        paddingHorizontal: 45,
        borderRadius: 40,
        alignItems: 'center',
        shadowColor: '#ff69b4',
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 15,
        shadowOpacity: 0.4,
        elevation: 10,
    },
    btnText: { color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 2 }
});

export default VoiceHandler;