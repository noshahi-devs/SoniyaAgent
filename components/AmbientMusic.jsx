import { Audio } from 'expo-av';
import { useEffect, useState } from 'react';

const moodMusic = {
    LOVE: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Example links
    SAD: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    HAPPY: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
};

const AmbientMusic = ({ mood }) => {
    const [sound, setSound] = useState();

    async function playSound() {
        if (sound) await sound.unloadAsync();

        const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: moodMusic[mood] || moodMusic.HAPPY },
            { shouldPlay: true, isLooping: true, volume: 0.2 } // Volume halka rakha hai
        );
        setSound(newSound);
    }

    useEffect(() => {
        playSound();
        return () => {
            if (sound) sound.unloadAsync();
        };
    }, [mood]);

    return null; // Ye UI mein nazar nahi aaye ga
};

export default AmbientMusic;