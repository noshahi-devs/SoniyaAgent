Technical Specification Document: Soniya AI Agent
Project Overview: A personalized, emotional AI companion mobile app built with React Native (Expo) that interacts via voice and text.

1. Tech Stack Requirements
Framework: React Native (Expo SDK 54+)

Language: JavaScript / JSX

AI Engine: Google Gemini 1.5 Flash API

Voice Recognition (STT): expo-speech-recognition

Text-to-Speech (TTS): react-native-tts

Styling: StyleSheet (Dark Mode Theme)

2. Project Architecture (Folder Structure)
Developer ko isi structure ko follow karna chahiye taake code modular rahe:

Plaintext
SoniyaAgent/
├── App.jsx              # Main Entry Point & State Management
├── api/
│   ├── gemini.js        # Gemini API Logic & System Prompting
│   └── voiceService.js  # TTS (Text-to-Speech) Configuration
├── components/
│   └── VoiceHandler.jsx # STT (Voice Recording) & Mic Logic
├── assets/              # Soniya's Avatar and Icons
└── app.json             # Native Permissions (Mic/Audio)
3. Core Functional Modules
A. The Brain (Gemini Integration)
System Prompt: AI ka naam "Soniya" hona chahiye. Tone emotional, empathetic, aur friendly honi chahiye.

Endpoint: Google AI Studio (Gemini-1.5-Flash).

Behavior: Roman Urdu/Hindi mein jawab dena.

B. The Hearing (Speech-to-Text)
Interaction: User "Talk" button ko Hold (Long Press) karega to mic active hoga.

Processing: User ki awaz ko text mein convert kar ke Gemini API ko bhejna.

Permissions: Android (RECORD_AUDIO) aur iOS (NSMicrophoneUsageDescription) lazmi hain.

C. The Voice (Text-to-Speech)
Library: react-native-tts.

Settings: Pitch 1.1 (Feminine) aur Rate 0.5 (Slow/Calm) taake voice natural aur emotional lagay.

4. UI/UX Design Guidelines
Theme: Deep Dark (#121212).

Accent Color: Hot Pink (#ff69b4) - Buttons aur Avatar ke liye.

Avatar: Screen ke center mein ek dynamic avatar ya pulsing circle jo Soniya ki presence show kare.

Chat Box: Glassmorphism style (Semi-transparent background).

5. Key API Configurations
Developer ko ye keys aur links configure karne honge:

Gemini API Key: (Set via EXPO_PUBLIC_GEMINI_API_KEY in .env, never commit real keys).

Base URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent.

6. Known Challenges & Fixes
Native Modules: Ye project "Expo Go" ke bajaye Development Build (npx expo run:android) par behtar kaam karega kyunke isme native voice libraries use ho rahi hain.

Deprecation Fix: SafeAreaView ko react-native-safe-area-context se hi use karna hai.










---------------------------------------------------------




Technical Requirement Document (TRD): Soniya AI Agent1. Project OverviewSoniya AI Agent ek emotional intelligence-based mobile application hai. Iska maqsad user ko ek aisi AI companion dena hai jo sirf sawalon ke jawab na de, balkay ek dost ki tarah hamdardana (empathetic) aur loving tone mein baat kare.2. Technical StackFramework: React Native (Expo SDK 54+).Programming Language: JavaScript (JSX).AI Engine: Google Gemini 1.5 Flash (via API).STT (Speech-to-Text): expo-speech-recognition.TTS (Text-to-Speech): react-native-tts.Navigation: React Navigation (Optional/Stack).3. Project ArchitectureDeveloper ko niche diye gaye modular structure ko follow karna chahiye:Folder/FilePurposeApp.jsxRoot entry point, UI state management, aur permissions handling.api/gemini.jsAPI integration, Axios/Fetch logic, aur system prompting.api/voiceService.jsText-to-Speech (TTS) configuration aur functions.components/VoiceHandler.jsxMicrophone logic, STT event listeners, aur UI buttons.app.jsonNative configurations (Permissions, Plugins).4. Core Features & LogicA. Personality & AI (The Brain)Model: Gemini 1.5 Flash.System Instructions: Soniya ko instruct kiya gaya hai ke wo ek emotional dost hai. Wo Roman Urdu/Hindi use karti hai. Jawab chote, dilchasp, aur empathetic hone chahiye.API Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent.B. Voice Interaction (Hearing & Speaking)Speech-to-Text (STT): User button "Hold" karega to mic active hoga. expo-speech-recognition transcription provide karegi.Text-to-Speech (TTS): Gemini ka response aate hi react-native-tts automatically bolna shuru karegi.Pitch: 1.1 (Feminine tone).Rate: 0.5 (Slow and calm).C. Permissions (Native Requirements)Developer ko ensure karna hai ke niche di gayi permissions app.json mein configured hon:RECORD_AUDIOMODIFY_AUDIO_SETTINGSNSMicrophoneUsageDescription (iOS)NSSpeechRecognitionUsageDescription (iOS)5. UI/UX SpecificationsBackground: Deep Dark Mode (#121212).Accent Color: Hot Pink (#ff69b4).Visual Feedback: Jab Soniya "Soch" rahi ho to ActivityIndicator show hona chahiye.Avatar: Screen ke center mein ek pulsing circle ya image jo Soniya ki "Life" ko represent kare.6. Current Implementation Details (For Developers)API Key: (Use EXPO_PUBLIC_GEMINI_API_KEY in .env; do not hardcode).Entry Point Fix: package.json mein "main" ko "node_modules/expo/AppEntry.js" par set kiya gaya hai taake custom root file load ho sake.Avoid: SafeAreaView ko purani react-native library ke bajaye react-native-safe-area-context se use karna hai.Note for the Developer:Ye project Expo Go par native limitations ki wajah se masla kar sakta hai. Behtar hai ke isay Development Build (npx expo run:android) par test kiya jaye taake Voice modules full capacity mein kaam karein.
