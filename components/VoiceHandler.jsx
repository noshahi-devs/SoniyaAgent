import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';

const VoiceHandler = ({ onSpeechResult }) => {
    const [isListening, setIsListening] = useState(false);

    // Jab Speech khatam ho jaye aur result aaye
    useSpeechRecognitionEvent("result", (event) => {
        const transcript = event.results[0]?.transcript;
        if (transcript) {
            onSpeechResult(transcript); // Soniya ko bhejo
        }
    });

    // Jab bolna band karein
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
            lang: "en-US", // Aap "ur-PK" bhi kar sakte hain
            interimResults: false,
        });
    };

    const handlePressOut = () => {
        ExpoSpeechRecognitionModule.stop();
        setIsListening(false);
    };

    return (
        <TouchableOpacity
            style={[styles.btn, isListening ? styles.listening : styles.idle]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <Text style={styles.btnText}>
                {isListening ? "Soniya Sun Rahi Hai..." : "Daba kar Rakhein aur Bolein"}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    btn: { padding: 20, borderRadius: 50, alignItems: 'center', marginVertical: 20, marginHorizontal: 40 },
    idle: { backgroundColor: '#ff69b4' },
    listening: { backgroundColor: '#ff4081', transform: [{ scale: 1.1 }] },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default VoiceHandler;