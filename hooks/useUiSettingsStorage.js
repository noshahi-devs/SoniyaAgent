import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef } from 'react';

export const useUiSettingsStorage = ({
  storageKey,
  clamp,
  applySettings,
  currentSettings
}) => {
  const hydratedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!isMounted || !parsed || typeof parsed !== 'object') return;

        applySettings({
          personaMood: typeof parsed.personaMood === 'string' && parsed.personaMood ? parsed.personaMood : undefined,
          voiceRate: Number.isFinite(parsed.voiceRate) ? Number(clamp(parsed.voiceRate, 0.6, 1.4).toFixed(2)) : undefined,
          selectedVoiceId: typeof parsed.selectedVoiceId === 'string' ? parsed.selectedVoiceId : undefined,
          voiceResponse: typeof parsed.voiceResponse === 'boolean' ? parsed.voiceResponse : undefined,
          alwaysListenEnabled: typeof parsed.alwaysListenEnabled === 'boolean' ? parsed.alwaysListenEnabled : undefined,
          autoAvatarMode: typeof parsed.autoAvatarMode === 'boolean' ? parsed.autoAvatarMode : undefined,
          voiceHandlerVariant: typeof parsed.voiceHandlerVariant === 'string' ? parsed.voiceHandlerVariant : undefined
        });
      } catch (_err) {
        // Ignore settings restore failures.
      } finally {
        hydratedRef.current = true;
      }
    };

    loadSettings();
    return () => {
      isMounted = false;
    };
  }, [storageKey, clamp, applySettings]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(currentSettings)).catch(() => {});
  }, [storageKey, currentSettings]);
};
