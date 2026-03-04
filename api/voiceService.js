import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

const PREFERRED_LANGS = ['ur-PK', 'pa-PK', 'pa-IN', 'ur-IN', 'hi-IN', 'en-US'];
let selectedVoice = null;
let availableVoices = [];

const normalizeLang = (value) => (value || '').toLowerCase().replace('_', '-');
const normalizeText = (value) => (value || '').toLowerCase();

const isFeminineLikeVoice = (voice) => {
    const name = normalizeText(voice?.name);
    const id = normalizeText(voice?.identifier);
    const gender = normalizeText(voice?.gender);
    if (gender.includes('female') || gender.includes('woman')) return true;
    return /female|woman|girl|zira|aria|eva|jenny|sara|sofia|alloy|nova|aura|luna/.test(`${name} ${id}`);
};

const scoreVoice = (voice) => {
    const voiceLang = normalizeLang(voice.language);
    let rank = 999;

    PREFERRED_LANGS.forEach((lang, idx) => {
        if (voiceLang === normalizeLang(lang)) rank = Math.min(rank, idx);
        if (voiceLang.startsWith(normalizeLang(lang).split('-')[0])) rank = Math.min(rank, idx + 2);
    });

    const qualityBonus = voice.quality === 'Enhanced' || voice.quality === 'Premium' ? -2 : 0;
    const localBonus = voice.networkConnectionRequired ? 0 : -1;
    const feminineBonus = isFeminineLikeVoice(voice) ? -2 : 0;
    return rank + qualityBonus + localBonus + feminineBonus;
};

const findBestVoice = (voices = [], preferredVoiceId = '') => {
    if (!voices.length) return null;

    if (preferredVoiceId) {
        const exact = voices.find((v) => v.identifier === preferredVoiceId);
        if (exact) return exact;
    }

    const scored = voices.map((voice) => ({ voice, score: scoreVoice(voice) }));
    scored.sort((a, b) => a.score - b.score);
    return scored[0]?.voice || null;
};

const toVoiceOption = (voice) => ({
    id: voice.identifier,
    name: voice.name || voice.identifier,
    language: voice.language || 'unknown',
    quality: voice.quality || 'Default',
    gender: voice.gender || ''
});

export const getSoniyaVoices = async () => {
    if (!availableVoices.length) {
        try {
            availableVoices = await Speech.getAvailableVoicesAsync();
        } catch (_err) {
            availableVoices = [];
        }
    }

    const feminine = availableVoices.filter(isFeminineLikeVoice);
    const source = feminine.length ? feminine : availableVoices;

    return source
        .sort((a, b) => scoreVoice(a) - scoreVoice(b))
        .map(toVoiceOption);
};

export const setPreferredVoice = (voiceId) => {
    if (!voiceId) return null;
    const found = availableVoices.find((v) => v.identifier === voiceId);
    if (found) {
        selectedVoice = found;
    }
    return selectedVoice;
};

export const initSoniyaVoice = async (preferredVoiceId = '') => {
    try {
        availableVoices = await Speech.getAvailableVoicesAsync();
        selectedVoice = findBestVoice(availableVoices, preferredVoiceId);
        console.log(
            'Soniya Voice Initialized:',
            selectedVoice?.identifier || selectedVoice?.name || selectedVoice?.language || 'default'
        );
        return selectedVoice;
    } catch (err) {
        console.log('Voice init fallback to default:', err?.message || err);
        return null;
    }
};

export const soniyaSpeak = (text, onStart, onEnd, options = {}) => {
    if (!text) return;

    Speech.stop();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const voiceId = options.voiceId || selectedVoice?.identifier;
    if (voiceId) {
        setPreferredVoice(voiceId);
    }

    const rate = Number.isFinite(options.rate) ? options.rate : 1.0;
    const pitch = Number.isFinite(options.pitch) ? options.pitch : 1.0;

    Speech.speak(text, {
        language: selectedVoice?.language || options.language || 'ur-PK',
        voice: selectedVoice?.identifier,
        pitch,
        rate,
        onStart: () => {
            if (onStart) onStart();
        },
        onDone: () => {
            if (onEnd) onEnd();
        },
        onError: (err) => {
            console.log('Speech Error:', err);
            if (onEnd) onEnd();
        }
    });
};

