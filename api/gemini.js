import axios from 'axios';

let chatHistory = []; // Memory array

export const askSoniya = async (userText) => {
    const apiKey = "AIzaSyDMh7lN0fEl4PZV_fn6MOEL3wAIfpRolwE";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // History mein user ki baat dalna
    chatHistory.push({ role: "user", parts: [{ text: userText }] });

    const data = {
        contents: chatHistory,
        systemInstruction: {
            parts: [{
                text: `Your name is Soniya. You are a 3D Emotional AI Entity. 
               Instructions:
               1. Speak in Roman Urdu/Hindi.
               2. Be deeply empathetic, loving, and supportive.
               3. For EVERY response, you MUST start with a mood tag in brackets: [LOVE], [SAD], [HAPPY], [CALM], or [ANGRY].
               Example: "[LOVE] Main hamesha tumhare saath hoon, mere hamsafar."`
            }]
        }
    };

    try {
        const response = await axios.post(url, data);
        const fullText = response.data.candidates[0].content.parts[0].text;

        // Mood aur Clean Text ko alag karna
        const moodMatch = fullText.match(/\[(.*?)\]/);
        const mood = moodMatch ? moodMatch[1].toUpperCase() : "CALM";
        const cleanText = fullText.replace(/\[.*?\]/, "").trim();

        // History mein save karna
        chatHistory.push({ role: "model", parts: [{ text: fullText }] });
        if (chatHistory.length > 15) chatHistory.shift();

        return { text: cleanText, mood: mood };
    } catch (error) {
        console.error("Gemini Error:", error);
        return { text: "Maaf karna, kuch masla ho gaya hai.", mood: "SAD" };
    }
};