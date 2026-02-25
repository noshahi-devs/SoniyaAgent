let chatHistory = [];

export const clearChatHistory = () => {
  chatHistory = [];
};

export const askSoniya = async (userText) => {
  if (!userText || userText.trim() === "") return;

  const apiKey = "AIzaSyCm1ppzHcB3B_ANF1aycVBSDukpwyMYIsE";

  // Fallback chain for high demand and model availability
  const configs = [
    { ver: 'v1beta', model: 'gemini-1.5-flash-latest' },
    { ver: 'v1', model: 'gemini-1.5-flash' },
    { ver: 'v1beta', model: 'gemini-3-flash-preview' },
    { ver: 'v1beta', model: 'gemini-1.5-flash' }
  ];

  let lastError = null;

  for (const config of configs) {
    const url = `https://generativelanguage.googleapis.com/${config.ver}/models/${config.configModel || config.model}:generateContent?key=${apiKey}`;

    try {
      console.log(`Trying ${config.model}...`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Your name is Soniya. Speak Roman Urdu. Add mood tag like [HAPPY] or [SAD]. Keep responses concise. User: ${userText}`
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
        lastError = result.error?.message || "Unknown error";
        console.error(`Failed ${config.model}: ${lastError}`);
        // If high demand or not found, continue to next model
        continue;
      }
    } catch (e) {
      console.error(`Fetch error for ${config.model}:`, e);
      continue;
    }
  }

  return {
    text: `Jaani, Google servers par boht rush hai. Error: ${lastError}`,
    mood: "SAD"
  };
};
