import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@soniya_local_memory_v1';

const DEFAULT_MEMORY = {
  profile: {
    userName: ['Nabeel Khalil', 'Nabeel Jaani', 'Nabeel Sb' ],
    fatherNames: ['Muhammad Khalil Noshahi sab', 'Baba Khalil Noshahi Sb'],
    brothers: [
      'Adeel Noshahi sab',
      'Aqeel Noshahi Sb',
      'Nabeel Khalil',
      'Sharjeel Noshahi'
    ]
  },
  creatorStory: {
    ur: 'Beshak har cheez ka khalik Allah Pak hai. Mujhe Nabeel Noshahi Sb ne develop kiya, jo Noshahi Developers Inc. ke App Developer aur Business Developer hain; mujhe NDI ke CEO Janab Adeel Noshahi Sb ki guidance aur approval ke sath tayyar kiya gaya, aur isme NDI team ki mehnat bhi shamil hai.',
    en: 'Above all, everything is created by Allah Almighty. I was developed by Mr. Nabeel Noshahi, the App Developer and Business Developer at Noshahi Developers Inc.; I was built with the guidance and approval of NDI CEO Mr. Adeel Noshahi, with valuable contributions from the NDI team.',
    pa: 'Beshak har cheez da khalik Allah Pak ae. Mainu Nabeel Noshahi Sb ne develop kita, jo Noshahi Developers Inc. vich App Developer te Business Developer ne; main NDI de CEO Janab Adeel Noshahi Sb di guidance te approval naal bani aan, te NDI team di mehnat vi is vich shamil ae.'
  },
  security: {
    ownerPin: '1598',
    unlockUntil: 0,
    pendingPrivateKey: ''
  },
  privateFacts: {
    motherName: '',
    sisterName: ''
  },
  customFacts: {},
  notes: []
};

const cloneDefaultMemory = () => JSON.parse(JSON.stringify(DEFAULT_MEMORY));

const normalize = (value = '') => value.toLowerCase().trim();

const cleanValue = (value = '') =>
  value
    .replace(/^[\s:=-]+/, '')
    .replace(/[\s.]+$/, '')
    .replace(/\b(hai|is)\b\s*$/i, '')
    .trim();

const mergeMemory = (stored = {}) => ({
  ...cloneDefaultMemory(),
  ...stored,
  profile: { ...cloneDefaultMemory().profile, ...(stored?.profile || {}) },
  creatorStory: { ...cloneDefaultMemory().creatorStory, ...(stored?.creatorStory || {}) },
  security: { ...cloneDefaultMemory().security, ...(stored?.security || {}) },
  privateFacts: { ...cloneDefaultMemory().privateFacts, ...(stored?.privateFacts || {}) },
  customFacts: { ...(stored?.customFacts || {}) },
  notes: Array.isArray(stored?.notes) ? stored.notes : []
});

export const loadLocalMemory = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = cloneDefaultMemory();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    return mergeMemory(JSON.parse(raw));
  } catch (_err) {
    return cloneDefaultMemory();
  }
};

export const saveLocalMemory = async (memory) => {
  const next = mergeMemory(memory);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
};

const extractAfterMarkers = (text, markers) => {
  const lower = normalize(text);
  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx >= 0) {
      const raw = text.slice(idx + marker.length);
      const value = cleanValue(raw);
      if (value) return value;
    }
  }
  return '';
};

const hasNabeelValidation = (text = '') => {
  return /\b(main|mai|mein|ma|me)\s+nabeel\b/i.test(text)
    || /\b(i am|i'm|this is)\s+nabeel\b/i.test(text);
};

const askMomName = (text = '') => /(\bammi\b|\bmom\b|\bmother\b).*(\bname\b|\bnaam\b)|(\bname\b|\bnaam\b).*(\bammi\b|\bmom\b|\bmother\b)/i.test(text);
const askSisName = (text = '') => /(\bsis\b|\bsister\b|\bbehan\b).*(\bname\b|\bnaam\b)|(\bname\b|\bnaam\b).*(\bsis\b|\bsister\b|\bbehan\b)/i.test(text);
const askBrothers = (text = '') => /(\bbhai\b|\bbrother\b|\bbrothers\b).*(\bname\b|\bnaam\b)|(\bname\b|\bnaam\b).*(\bbhai\b|\bbrother\b|\bbrothers\b)/i.test(text);
const askFather = (text = '') => /(\babu\b|\babba\b|\bfather\b).*(\bname\b|\bnaam\b)|(\bname\b|\bnaam\b).*(\babu\b|\babba\b|\bfather\b)/i.test(text);
const askRemembered = (text = '') => /kya yaad|kya yaad hai|what do you remember|what did i ask you to remember|yaad rakhne ko/i.test(text);
const askWhoCreated = (text = '') =>
  /kis ne.*(banaya|bnaya)|aapko.*(banaya|bnaya)|who (made|created|built) you|who is your creator|tusi.*(kis ne|kinne).*(banaya|bnaya)|tuhanu.*(kis ne|kinne).*(banaya|bnaya)/i.test(text);
const askForPinContext = (text = '') =>
  /\b(pin|passcode|password|verify|verification|code|access)\b/i.test(text);

const isRememberCommand = (text = '') => /yaad rakhna|remember this|save this|is baat ko yaad/i.test(text);

const extractRememberNote = (text = '') => {
  const lower = normalize(text);
  const markers = ['yaad rakhna', 'remember this', 'save this', 'is baat ko yaad'];
  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx >= 0) {
      const note = cleanValue(text.slice(idx + marker.length));
      return note || '';
    }
  }
  return '';
};

const extractGenericFact = (text = '') => {
  const match = text.match(/(.+?)\s+ka\s+name\s+(.+?)\s+hai/i);
  if (!match) return null;

  const rawLabel = cleanValue(match[1]);
  const rawValue = cleanValue(match[2]);
  if (!rawLabel || !rawValue) return null;

  const lowerLabel = normalize(rawLabel);
  if (/(ammi|mom|mother|sis|sister|behan)/i.test(lowerLabel)) return null;

  return { key: lowerLabel, label: rawLabel, value: rawValue };
};

const askGenericName = (text = '') => {
  const match = text.match(/(.+?)\s+ka\s+name\s+(kya hai|kya|btao|batao|btaein|btain)/i);
  if (!match) return '';
  return normalize(cleanValue(match[1]));
};

const detectLanguageStyle = (text = '') => {
  if (/[\u0600-\u06FF]/.test(text)) return 'ur';
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa';
  if (/\b(who|made|create|created|built|developer|company|ceo|approval|guidance)\b/i.test(text)) return 'en';
  if (/\b(tusi|tuhanu|tuhanun|tuhada|sadi|sada|kinne)\b/i.test(text)) return 'pa';
  return 'ur';
};

const PRIVATE_DENY_MESSAGES = {
  ur: [
    'Maaf kijiye, main aapko yeh private info nahi bata sakti.',
    'Maaf kijiye, yeh private information hai. Nabeel sab ki taraf se iski permission nahi hai.',
    'Yeh maloomat confidential hai, isko share karne ki ijazat nahi.',
    'Mujhe yeh baat private rakhne ka hukm diya gaya hai.'
  ],
  en: [
    'Sorry, I cannot share that private information.',
    'This detail is confidential and permission is required to disclose it.',
    'I am not allowed to reveal this private information right now.'
  ],
  pa: [
    'Maaf karo, aehe private maloomat ae; main eh nahi das sakdi.',
    'O jaa pai, main nai dassna; eh private gall ae.',
    'Eh gall confidential ae, permission to baghair share nahi ho sakdi.'
  ]
};

const PRIVATE_PIN_PROMPTS = {
  ur: [
    'Yeh private info hai, access ke liye PIN type ya bol kar verify karein.',
    'Private maloomat ke liye pehle PIN verification zaroori hai.',
    'Maazrat, is jawab se pehle PIN confirm karna hoga.'
  ],
  en: [
    'This is private information. Please verify with your PIN.',
    'PIN verification is required before I can share that detail.',
    'For privacy, please enter or speak your PIN first.'
  ],
  pa: [
    'Eh private info ae, pehlan PIN verify karo phir main dasangi.',
    'Private gall lai PIN verification zaroori ae.',
    'Kirpa karke pehlan PIN dasso ya type karo.'
  ]
};

const lastPrivateReplyIndex = { ur: -1, en: -1, pa: -1 };
const lastPrivatePromptIndex = { ur: -1, en: -1, pa: -1 };

const PIN_WORDS_TO_DIGITS = {
  zero: '0',
  oh: '0',
  o: '0',
  one: '1',
  won: '1',
  aik: '1',
  ek: '1',
  two: '2',
  to: '2',
  too: '2',
  do: '2',
  three: '3',
  teen: '3',
  four: '4',
  for: '4',
  chaar: '4',
  char: '4',
  five: '5',
  paanch: '5',
  panch: '5',
  six: '6',
  chay: '6',
  chhe: '6',
  seven: '7',
  saat: '7',
  eight: '8',
  ate: '8',
  aath: '8',
  ath: '8',
  nine: '9',
  nau: '9'
};

const pickPrivateDenyMessage = (text = '') => {
  const lang = detectLanguageStyle(text);
  const pool = PRIVATE_DENY_MESSAGES[lang] || PRIVATE_DENY_MESSAGES.ur;
  if (!pool.length) {
    return 'Maaf kijiye, yeh private information hai.';
  }

  let idx = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && idx === lastPrivateReplyIndex[lang]) {
    idx = (idx + 1) % pool.length;
  }
  lastPrivateReplyIndex[lang] = idx;
  return pool[idx];
};

const pickPrivatePinPrompt = (text = '') => {
  const lang = detectLanguageStyle(text);
  const pool = PRIVATE_PIN_PROMPTS[lang] || PRIVATE_PIN_PROMPTS.ur;
  let idx = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && idx === lastPrivatePromptIndex[lang]) {
    idx = (idx + 1) % pool.length;
  }
  lastPrivatePromptIndex[lang] = idx;
  return pool[idx];
};

const extractWordDigits = (text = '') => {
  const tokens = normalize(text).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  let digits = '';
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      digits += token;
      continue;
    }
    if (PIN_WORDS_TO_DIGITS[token] !== undefined) {
      digits += PIN_WORDS_TO_DIGITS[token];
    }
  }
  return digits;
};

const textContainsPin = (text = '', pin = '1598') => {
  if (!text || !pin) return false;
  const numeric = String(text).replace(/\D/g, '');
  if (numeric.includes(pin)) return true;
  const wordDigits = extractWordDigits(text);
  return wordDigits.includes(pin);
};

const looksLikePinAttempt = (text = '') => {
  const numeric = String(text).replace(/\D/g, '');
  if (numeric.length >= 3) return true;
  return askForPinContext(text) || /\b(one|five|nine|eight|ek|aik|panch|paanch|nau|aath)\b/i.test(text);
};

export const processLocalMemoryCommand = async (userText) => {
  if (!userText?.trim()) return { handled: false };

  const text = userText.trim();
  const lower = normalize(text);
  const memory = await loadLocalMemory();
  const now = Date.now();
  const hasPin = textContainsPin(text, memory.security?.ownerPin || '1598');
  const isSessionUnlocked = Number(memory.security?.unlockUntil || 0) > now;
  const hasOwnerValidation = hasNabeelValidation(text);
  const isPrivateAuthorized = hasOwnerValidation || hasPin || isSessionUnlocked;
  const hasPendingPrivateRequest = !!memory.security?.pendingPrivateKey;

  if (hasPin) {
    memory.security.unlockUntil = now + 10 * 60 * 1000;
    const pendingKey = memory.security.pendingPrivateKey || '';
    memory.security.pendingPrivateKey = '';
    await saveLocalMemory(memory);

    if (pendingKey === 'motherName') {
      if (!memory.privateFacts.motherName) {
        return { handled: true, mood: 'SAD', text: 'Aap ne Ammi ka naam abhi save nahi kiya.' };
      }
      return { handled: true, mood: 'HAPPY', text: `Verification complete. Aap ki Ammi ka naam ${memory.privateFacts.motherName} hai.` };
    }

    if (pendingKey === 'sisterName') {
      if (!memory.privateFacts.sisterName) {
        return { handled: true, mood: 'SAD', text: 'Aap ne sister ka naam abhi save nahi kiya.' };
      }
      return { handled: true, mood: 'HAPPY', text: `Verification complete. Aap ki sister ka naam ${memory.privateFacts.sisterName} hai.` };
    }

    if (askForPinContext(text)) {
      return { handled: true, mood: 'HAPPY', text: 'Verification successful. Ab aap private cheez pooch sakte hain.' };
    }
  }

  if (!hasPin && hasPendingPrivateRequest && looksLikePinAttempt(text)) {
    return { handled: true, mood: 'SAD', text: pickPrivateDenyMessage(text) };
  }

  if (askWhoCreated(text)) {
    const lang = detectLanguageStyle(text);
    const story = memory.creatorStory?.[lang] || memory.creatorStory?.ur;
    return { handled: true, mood: 'HAPPY', text: story };
  }

  const motherName = extractAfterMarkers(text, [
    'meri ammi ka name',
    'meri ammi ka naam',
    'my mother name is',
    'my mom name is',
    'my mom is',
    'meri mom ka name'
  ]);

  if (motherName) {
    memory.privateFacts.motherName = motherName;
    await saveLocalMemory(memory);
    return { handled: true, mood: 'HAPPY', text: 'Theek hai, maine Ammi ka naam local memory mein save kar liya hai.' };
  }

  const sisterName = extractAfterMarkers(text, [
    'meri sis ka name',
    'meri sister ka name',
    'meri behan ka name',
    'meri behan ka naam',
    'my sister name is',
    'my sis name is'
  ]);

  if (sisterName) {
    memory.privateFacts.sisterName = sisterName;
    await saveLocalMemory(memory);
    return { handled: true, mood: 'HAPPY', text: 'Theek hai, maine sister ka naam local memory mein save kar liya hai.' };
  }

  const genericFact = extractGenericFact(text);
  if (genericFact) {
    memory.customFacts[genericFact.key] = { label: genericFact.label, value: genericFact.value };
    await saveLocalMemory(memory);
    return { handled: true, mood: 'HAPPY', text: `${genericFact.label} ka naam yaad rakh liya hai.` };
  }

  if (askMomName(text)) {
    if (!isPrivateAuthorized) {
      memory.security.pendingPrivateKey = 'motherName';
      await saveLocalMemory(memory);
      return { handled: true, mood: 'SAD', text: pickPrivatePinPrompt(text) };
    }
    if (!memory.privateFacts.motherName) {
      return { handled: true, mood: 'SAD', text: 'Aap ne Ammi ka naam abhi save nahi kiya.' };
    }
    return { handled: true, mood: 'HAPPY', text: `Aap ki Ammi ka naam ${memory.privateFacts.motherName} hai.` };
  }

  if (askSisName(text)) {
    if (!isPrivateAuthorized) {
      memory.security.pendingPrivateKey = 'sisterName';
      await saveLocalMemory(memory);
      return { handled: true, mood: 'SAD', text: pickPrivatePinPrompt(text) };
    }
    if (!memory.privateFacts.sisterName) {
      return { handled: true, mood: 'SAD', text: 'Aap ne sister ka naam abhi save nahi kiya.' };
    }
    return { handled: true, mood: 'HAPPY', text: `Aap ki sister ka naam ${memory.privateFacts.sisterName} hai.` };
  }

  if (askBrothers(text)) {
    const list = memory.profile.brothers.join(', ');
    return { handled: true, mood: 'HAPPY', text: `Aap ke 4 bhai hain: ${list}.` };
  }

  if (askFather(text)) {
    const name = lower.includes('baba')
      ? memory.profile.fatherNames[1]
      : memory.profile.fatherNames[0];
    return { handled: true, mood: 'HAPPY', text: `Aap ke Abu ka naam ${name} hai.` };
  }

  const askLabel = askGenericName(text);
  if (askLabel && memory.customFacts[askLabel]) {
    return {
      handled: true,
      mood: 'HAPPY',
      text: `${memory.customFacts[askLabel].label} ka naam ${memory.customFacts[askLabel].value} hai.`
    };
  }

  if (isRememberCommand(text)) {
    const note = extractRememberNote(text);
    if (note) {
      const existing = new Set(memory.notes.map((n) => n.text));
      if (!existing.has(note)) {
        memory.notes.unshift({ text: note, at: Date.now() });
        memory.notes = memory.notes.slice(0, 100);
        await saveLocalMemory(memory);
      }
      return { handled: true, mood: 'HAPPY', text: 'Theek hai, maine ye baat local memory mein yaad rakh li hai.' };
    }
  }

  if (askRemembered(text)) {
    if (!memory.notes.length) {
      return { handled: true, mood: 'SAD', text: 'Abhi aap ne koi specific baat yaad rakhne ko nahi kahi.' };
    }
    const list = memory.notes.slice(0, 4).map((item, idx) => `${idx + 1}. ${item.text}`).join(' ');
    return { handled: true, mood: 'HAPPY', text: `Aap ne mujhe ye baatein yaad rakhne ko kahi hain: ${list}` };
  }

  return { handled: false };
};
