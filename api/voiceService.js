import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

const PREFERRED_LANGS = ['ur-PK', 'pa-PK', 'pa-IN', 'ur-IN', 'hi-IN', 'en-US'];
const STYLE_REFERENCE_PRESETS = [
    {
        id: 'soniya_default',
        legacyIds: ['mahira_khan'],
        name: 'Soniya Default',
        subtitle: 'Default | Soft Urdu + Punjabi',
        preferredLangs: ['ur-PK', 'pa-PK', 'pa-IN', 'ur-IN', 'hi-IN', 'en-US'],
        pitch: 1.0
    },
    {
        id: 'gentle_warm',
        legacyIds: ['sajal_aly'],
        name: 'Gentle Warm',
        subtitle: 'Optional | Gentle warm tone',
        preferredLangs: ['ur-PK', 'ur-IN', 'pa-PK', 'hi-IN', 'en-US'],
        pitch: 1.02
    },
    {
        id: 'calm_polished',
        legacyIds: ['ayeza_khan'],
        name: 'Calm Polished',
        subtitle: 'Optional | Calm polished tone',
        preferredLangs: ['pa-PK', 'ur-PK', 'pa-IN', 'hi-IN', 'en-US'],
        pitch: 0.98
    },
    {
        id: 'bright_friendly',
        legacyIds: ['hania_aamir'],
        name: 'Bright Friendly',
        subtitle: 'Optional | Bright friendly tone',
        preferredLangs: ['ur-PK', 'pa-PK', 'hi-IN', 'en-US'],
        pitch: 1.04
    }
];
let selectedVoice = null;
let selectedVoicePreset = STYLE_REFERENCE_PRESETS[0];
let availableVoices = [];
let namedPresetOptions = [];

const normalizeLang = (value) => (value || '').toLowerCase().replace('_', '-');
const normalizeText = (value) => (value || '').toLowerCase();

const isFeminineLikeVoice = (voice) => {
    const name = normalizeText(voice?.name);
    const id = normalizeText(voice?.identifier);
    const gender = normalizeText(voice?.gender);
    if (gender.includes('female') || gender.includes('woman')) return true;
    return /female|woman|girl|zira|aria|eva|jenny|sara|sofia|alloy|nova|aura|luna/.test(`${name} ${id}`);
};

const scoreVoice = (voice, preferredLangs = PREFERRED_LANGS) => {
    const voiceLang = normalizeLang(voice.language);
    let rank = 999;

    preferredLangs.forEach((lang, idx) => {
        if (voiceLang === normalizeLang(lang)) rank = Math.min(rank, idx);
        if (voiceLang.startsWith(normalizeLang(lang).split('-')[0])) rank = Math.min(rank, idx + 2);
    });

    const qualityBonus = voice.quality === 'Enhanced' || voice.quality === 'Premium' ? -2 : 0;
    const localBonus = voice.networkConnectionRequired ? 0 : -1;
    const feminineBonus = isFeminineLikeVoice(voice) ? -2 : 0;
    return rank + qualityBonus + localBonus + feminineBonus;
};

const findBestVoice = (voices = [], preferredVoiceId = '', preferredLangs = PREFERRED_LANGS) => {
    if (!voices.length) return null;

    if (preferredVoiceId) {
        const exact = voices.find((v) => v.identifier === preferredVoiceId);
        if (exact) return exact;
    }

    const scored = voices.map((voice) => ({ voice, score: scoreVoice(voice, preferredLangs) }));
    scored.sort((a, b) => a.score - b.score);
    return scored[0]?.voice || null;
};

const getUsableVoices = () => {
    const feminine = availableVoices.filter(isFeminineLikeVoice);
    const source = feminine.length ? feminine : availableVoices;
    const local = source.filter((voice) => !voice.networkConnectionRequired);
    return local.length ? local : source;
};

const buildNamedPresetOptions = () => {
    const usableVoices = getUsableVoices();
    const rankedVoices = [...usableVoices].sort(
        (a, b) => scoreVoice(a, PREFERRED_LANGS) - scoreVoice(b, PREFERRED_LANGS)
    );
    const primaryVoice = rankedVoices[0] || null;
    const secondaryVoice = rankedVoices.find((voice) => voice.identifier !== primaryVoice?.identifier) || primaryVoice;

    const voiceAssignments = {
        soniya_default: primaryVoice,
        gentle_warm: secondaryVoice,
        calm_polished: primaryVoice,
        bright_friendly: secondaryVoice
    };

    return STYLE_REFERENCE_PRESETS.map((preset) => {
        const assignedVoice = voiceAssignments[preset.id]
            || findBestVoice(usableVoices, '', preset.preferredLangs)
            || primaryVoice
            || null;

        return {
            id: preset.id,
            name: preset.name,
            language: preset.subtitle,
            quality: assignedVoice?.quality || 'Adaptive',
            gender: assignedVoice?.gender || '',
            pitch: preset.pitch,
            preferredLangs: preset.preferredLangs,
            preferredLanguage: assignedVoice?.language || preset.preferredLangs[0],
            voiceIdentifier: assignedVoice?.identifier || ''
        };
    });
};

const findPresetOption = (voiceId, presets = namedPresetOptions) => {
    if (!presets.length) return null;
    if (!voiceId) return presets[0] || null;

    return presets.find((preset) =>
        preset.id === voiceId
        || preset.voiceIdentifier === voiceId
        || preset.legacyIds?.includes?.(voiceId)
    ) || presets[0] || null;
};

export const getSoniyaVoices = async () => {
    if (!availableVoices.length) {
        try {
            availableVoices = await Speech.getAvailableVoicesAsync();
        } catch (_err) {
            availableVoices = [];
        }
    }

    namedPresetOptions = buildNamedPresetOptions();
    return namedPresetOptions;
};

export const setPreferredVoice = (voiceId) => {
    if (!voiceId && !selectedVoicePreset?.id) return null;

    if (!namedPresetOptions.length) {
        namedPresetOptions = buildNamedPresetOptions();
    }

    const preset = findPresetOption(voiceId || selectedVoicePreset?.id, namedPresetOptions);
    if (!preset) return selectedVoice;

    selectedVoicePreset = preset;
    const found = availableVoices.find((voice) => voice.identifier === preset.voiceIdentifier)
        || findBestVoice(getUsableVoices(), '', PREFERRED_LANGS);
    if (found) {
        selectedVoice = found;
    }
    return selectedVoice;
};

export const initSoniyaVoice = async (preferredVoiceId = '') => {
    try {
        availableVoices = await Speech.getAvailableVoicesAsync();
        namedPresetOptions = buildNamedPresetOptions();
        const preset = findPresetOption(preferredVoiceId, namedPresetOptions);
        selectedVoicePreset = preset || STYLE_REFERENCE_PRESETS[0];
        selectedVoice = availableVoices.find((voice) => voice.identifier === selectedVoicePreset?.voiceIdentifier)
            || findBestVoice(getUsableVoices(), '', selectedVoicePreset?.preferredLangs || PREFERRED_LANGS);
        console.log(
            'Soniya Voice Initialized:',
            selectedVoicePreset?.name || selectedVoice?.name || selectedVoice?.language || 'default'
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

    const voiceId = options.voiceId || selectedVoicePreset?.id || selectedVoice?.identifier;
    const activeVoice = setPreferredVoice(voiceId) || selectedVoice;
    const activePreset = findPresetOption(voiceId, namedPresetOptions) || selectedVoicePreset;

    const rate = Number.isFinite(options.rate) ? options.rate : 1.0;
    const pitch = Number.isFinite(options.pitch) ? options.pitch : (activePreset?.pitch || 1.0);

    Speech.speak(text, {
        language: options.language || activePreset?.preferredLanguage || activeVoice?.language || 'ur-PK',
        voice: activeVoice?.identifier,
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

