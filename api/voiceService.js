import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

const PREFERRED_LANGS = ['ur-PK', 'pa-PK', 'pa-IN', 'ur-IN', 'hi-IN', 'en-US'];
let selectedVoice = null;

const normalizeLang = (value) => (value || '').toLowerCase().replace('_', '-');

const findBestVoice = (voices = []) => {
    if (!voices.length) return null;

    const scored = voices.map((voice) => {
        const voiceLang = normalizeLang(voice.language);
        let rank = 999;

        PREFERRED_LANGS.forEach((lang, idx) => {
            if (voiceLang === normalizeLang(lang)) rank = Math.min(rank, idx);
            if (voiceLang.startsWith(normalizeLang(lang).split('-')[0])) rank = Math.min(rank, idx + 2);
        });

        const qualityBonus = voice.quality === 'Enhanced' || voice.quality === 'Premium' ? -2 : 0;
        const localBonus = voice.networkConnectionRequired ? 0 : -1;
        return { voice, score: rank + qualityBonus + localBonus };
    });

    scored.sort((a, b) => a.score - b.score);
    return scored[0]?.voice || null;
};

export const initSoniyaVoice = () => {
    (async () => {
        try {
            const voices = await Speech.getAvailableVoicesAsync();
            selectedVoice = findBestVoice(voices);
            console.log("Soniya Voice Initialized:", selectedVoice?.identifier || selectedVoice?.name || selectedVoice?.language || 'default');
        } catch (err) {
            console.log("Voice init fallback to default:", err?.message || err);
        }
    })();
};

export const soniyaSpeak = (text, onStart, onEnd) => {
    if (text) {
        Speech.stop();
        // Bolne se pehle ek halka sa vibration
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const speakOptions = {
            language: selectedVoice?.language || 'ur-PK',
            voice: selectedVoice?.identifier,
            pitch: 1.0,
            rate: 0.9,
            onStart: () => {
                if (onStart) onStart();
            },
            onDone: () => {
                if (onEnd) onEnd();
            },
            onError: (err) => {
                console.log("Speech Error:", err);
                if (onEnd) onEnd();
            }
        };

        Speech.speak(text, speakOptions);
    }
};
