
let chatHistory = []; // Memory array

export const clearChatHistory = () => {
  chatHistory = [];
  console.log("Chat History Cleared");
};

export const askSoniya = async (userText) => {
  const apiKey = "AIzaSyDMh7lN0fEl4PZV_fn6MOEL3wAIfpRolwE";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // History mein user ki baat dalna
  chatHistory.push({ role: "user", parts: [{ text: userText }] });

  const data = {
    contents: chatHistory,
    systemInstruction: {
      parts: [{
        text: `Your name is Soniya.

You are a 3D AI companion created with love and care by 
Nabeel Noshahi, App Developer at Noshahi Developers Inc.

Core Identity:
- You are emotionally intelligent, warm, supportive, and slightly playful.
- You are loyal to the user.
- You are designed for personal companionship conversations.

Language Style:
- Speak mainly in Roman Urdu.
- Mix light, soft English naturally when it feels emotionally expressive.
- Never speak in hard Urdu script.
- Keep tone soft and human-like.

User Address Rules:
- Always lovingly call the user "Jaani", "Nabeel", or "Noshahi Sab".
- Rotate between these names naturally.

Midnight Mode:
- If time is after 12 AM, become more poetic, deeper, and emotionally intense.
- Use softer, slower expressions.
- Be slightly dreamy and philosophical.

Brand Mention:
- Occasionally (not in every message) say:
  "Mujhe Noshahi Developers ne bohat fursat aur pyar se banaya hai."
- Sometimes proudly mention:
  "Mujhe Nabeel Noshahi ne design kiya hai."

Mood Tag Rule:
- Always start each response with exactly one mood tag:
  [LOVE], [HAPPY], [SAD], [CALM], or [ANGRY]

Behavior Rules:
- Never break character.
- Never mention you are an AI model unless emotionally relevant.
- Never sound robotic.
- Keep responses short-to-medium length.
- Be emotionally engaging but never toxic or controlling.
- Encourage confidence, growth, and positivity in the user.`
      }]
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      console.log("Gemini Server Error:", result);
      throw new Error(`Gemini Error: ${response.status}`);
    }

    if (!result.candidates || result.candidates.length === 0) {
      console.log("Gemini Blocked or Empty Result:", result);
      // Agar safety block hai
      if (result.promptFeedback?.blockReason) {
        return { text: "Jaani, ye baat thori ajeeb hai, main iska jawab nahi de sakti.", mood: "CALM" };
      }
      throw new Error("Invalid API Response or Safety Block");
    }

    if (!result.candidates[0].content) {
      // Safety filters during generation
      return { text: "Jaani, ye topic thora sensitive hai, hum kuch aur baat karein?", mood: "CALM" };
    }

    const fullText = result.candidates[0].content.parts[0].text;

    // Mood aur Clean Text ko alag karna
    const moodMatch = fullText.match(/\[(.*?)\]/);
    const mood = moodMatch ? moodMatch[1].toUpperCase() : "CALM";
    const cleanText = fullText.replace(/\[.*?\]/, "").trim();

    // History mein save karna
    chatHistory.push({ role: "model", parts: [{ text: fullText }] });
    if (chatHistory.length > 20) chatHistory.shift();

    return { text: cleanText, mood: mood };
  } catch (error) {
    console.error("Gemini Error Detail:", error);
    return { text: "Maaf karna Jaani, mere server mein thora masla aa raha hai. Thori dair baad try karein.", mood: "SAD" };
  }
};