import * as Updates from 'expo-updates'; // Live Updates Library
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { askSoniya } from './api/gemini';
import { soniyaSpeak } from './api/voiceService';
import SoniyaAvatar from './components/SoniyaAvatar';
import SplashScreen from './components/SplashScreen';
import VoiceHandler from './components/VoiceHandler';

export default function App() {
    const [isReady, setIsReady] = useState(false);
    const [soniyaWords, setSoniyaWords] = useState("Soniya: Noshahi Developers ki janib se salaam...");
    const [mood, setMood] = useState("CALM");

    // Check for Live Updates
    async function onFetchUpdateAsync() {
        try {
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
            }
        } catch (e) { console.log(e); }
    }

    useEffect(() => {
        onFetchUpdateAsync();
    }, []);

    if (!isReady) return <SplashScreen onFinish={() => setIsReady(true)} />;

    const handleUserSpeech = async (text) => {
        const result = await askSoniya(text);
        setSoniyaWords(result.text);
        setMood(result.mood);
        soniyaSpeak(result.text);
    };

    return (
        <SafeAreaProvider>
            <View style={styles.mainWrapper}>
                <SafeAreaView style={styles.container}>

                    <View style={styles.header}>
                        <Text style={styles.brand}>NOSHAHI</Text>
                        <Text style={styles.appName}>SONIYA V1</Text>
                    </View>

                    <SoniyaAvatar mood={mood} />

                    <View style={styles.chatBox}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            <Text style={styles.speechText}>{soniyaWords}</Text>
                        </ScrollView>
                    </View>

                    <View style={styles.controls}>
                        <VoiceHandler onSpeechResult={handleUserSpeech} />
                        <Text style={styles.footerBrand}>Powered by Noshahi Developers Inc.</Text>
                    </View>

                </SafeAreaView>
            </View>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: '#000' },
    container: { flex: 1, paddingHorizontal: 25 },
    header: { marginTop: 20, alignItems: 'center' },
    brand: { color: '#ff69b4', fontSize: 10, letterSpacing: 5, fontWeight: 'bold', opacity: 0.7 },
    appName: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 2 },
    chatBox: {
        flex: 1, backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 40, padding: 30, marginTop: -30,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    speechText: { color: '#ddd', fontSize: 18, textAlign: 'center', lineHeight: 28, fontStyle: 'italic' },
    controls: { paddingVertical: 20, alignItems: 'center' },
    footerBrand: { color: 'rgba(255,255,255,0.3)', fontSize: 9, marginTop: 15, letterSpacing: 1 }
});