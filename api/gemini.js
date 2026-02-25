let chatHistory = [];

export const clearChatHistory = () => {
  chatHistory = [];
};

export const askSoniya = async (userText) => {
  if (!userText || userText.trim() === "") return;

  const apiKey = "AIzaSyCm1ppzHcB3B_ANF1aycVBSDukpwyMYIsE";

  // Re-ordered for maximum speed: Stable Flash first
  const configs = [
    { ver: 'v1', model: 'gemini-1.5-flash' },           // Fastest stable
    { ver: 'v1beta', model: 'gemini-1.5-flash-latest' }, // Newest flash
    { ver: 'v1beta', model: 'gemini-2.0-flash-exp' }     // Experimental but ultra-fast
  ];

  let lastError = null;

  for (const config of configs) {
    const url = `https://generativelanguage.googleapis.com/${config.ver}/models/${config.model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Role: Female friend Soniya. Language: Roman Urdu. Mood: Add [HAPPY] or [SAD]. Format: Concise (max 2 sentences). User: ${userText}`
            }]
          }]
        }),
      });

      const result = await response.json();

      if (response.ok && result.candidates?.[0]?.content) {
        const fullText = result.candidates[0].content.parts[0].text;
        const moodMatch = fullText.match(/\[(.*?)\]/);
        const mood = moodMatch ? moodMatch[1].toUpperCase() : "HAPPY";
        const cleanText = fullText.replace(/\[.*?\]/g, "").trim();
        return { text: cleanText, mood: mood };
      } else {
        lastError = result.error?.message || "Busy";
        if (response.status === 404) continue; // Skip quickly if not found
      }
    } catch (e) {
      continue;
    }
  }

  return {
    text: "Jaani, server busy hai. Ek baar dobara try karen.",
    mood: "SAD"
  };
};
