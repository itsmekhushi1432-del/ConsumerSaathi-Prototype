// Matches greetings, small talk, and about-the-bot queries without model calls, returning 14 topic chips when helpful.
import type { ChatApiResponse, ChatLanguage } from '../src/chat/types.ts';
import {
  ALL_TOPICS,
  BOT_ACCURACY_REPLY,
  BOT_ACCURACY_REPLY_HI,
  BOT_FREE_REPLY,
  BOT_FREE_REPLY_HI,
  BOT_HOW_IT_WORKS_REPLY,
  BOT_HOW_IT_WORKS_REPLY_HI,
  BOT_IDENTITY_AI_REPLY,
  BOT_IDENTITY_AI_REPLY_HI,
  BOT_LAWYER_REPLY,
  BOT_LAWYER_REPLY_HI,
  BYE_REPLY,
  BYE_REPLY_HI,
  CAPABILITY_REPLY,
  CAPABILITY_REPLY_HI,
  GREETING_REPLY,
  GREETING_REPLY_HI,
  HELP_ASK_REPLY,
  HELP_REPLY_HI,
  HINDI_TOPICS,
  HOW_ARE_YOU_REPLY,
  HOW_ARE_YOU_REPLY_HI,
  NICE_TO_MEET_REPLY,
  THANKS_ACK_REPLY,
  THANKS_MUCH_REPLY,
  THANKS_PLEASURE_REPLY,
  THANKS_REPLY_HI,
  THANKS_SHORT_REPLY,
  getDisclaimerForLang,
} from './strings.ts';

const SMALL_TALK_FILLERS = new Set([
  'there', 'bot', 'saathi', 'consumersaathi', 'please', 'again', 'now',
  'kindly', 'sir', 'madam', 'maam', 'friend', 'mate', 'ji',
  'जी', 'कृपया', 'दोस्त', 'साथी', 'साथियों', 'भाई', 'सर', 'मैडम',
  'अभी', 'जरा', 'ज़रा', 'बताइए',
  'kripaya', 'dost', 'bhai', 'abhi', 'zara',
]);

type SmallTalkCategory = 'greeting' | 'how_are_you' | 'thanks' | 'bye' | 'help';

interface SmallTalkGroup {
  category: SmallTalkCategory;
  phrases: string[];
  reply: string;
  hiReply: string;
  suggestions?: readonly string[];
  hiSuggestions?: readonly string[];
  preferHindi?: boolean;
}

export interface SmallTalkMatch {
  reply: string;
  suggestions?: string[];
  preferHindi?: boolean;
}

const SMALL_TALK_GROUPS: SmallTalkGroup[] = [
  {
    category: 'greeting',
    phrases: [
      'hi', 'hii', 'hello', 'hello there', 'hey', 'hey there',
      'good morning', 'good afternoon', 'good evening', 'greetings',
      'namaste', 'namaskar', 'hola',
    ],
    reply: GREETING_REPLY,
    hiReply: GREETING_REPLY_HI,
  },
  {
    category: 'greeting',
    phrases: ['नमस्ते', 'नमस्कार', 'हेलो', 'हैलो', 'हाय', 'सुप्रभात', 'शुभ प्रभात', 'शुभ संध्या'],
    reply: GREETING_REPLY_HI,
    hiReply: GREETING_REPLY_HI,
    preferHindi: true,
  },
  {
    category: 'how_are_you',
    phrases: ['how are you', 'how r u', 'how are you doing', 'whats up', 'sup'],
    reply: HOW_ARE_YOU_REPLY,
    hiReply: HOW_ARE_YOU_REPLY_HI,
  },
  {
    category: 'how_are_you',
    phrases: [
      'आप कैसे हैं', 'आप कैसे हो', 'कैसे हैं', 'कैसे हो', 'सब ठीक है',
      'aap kaise hain', 'aap kaise ho', 'kaise ho', 'kaise hain',
    ],
    reply: HOW_ARE_YOU_REPLY_HI,
    hiReply: HOW_ARE_YOU_REPLY_HI,
    preferHindi: true,
  },
  {
    category: 'how_are_you',
    phrases: [
      'im good', 'i am good', 'im fine', 'i am fine', 'doing well', 'doing good',
      'nice to meet you', 'good to meet you', 'pleased to meet you',
    ],
    reply: NICE_TO_MEET_REPLY,
    hiReply: HOW_ARE_YOU_REPLY_HI,
  },
  {
    category: 'thanks',
    phrases: ['thanks', 'thx', 'ty', 'appreciate it', 'i appreciate it'],
    reply: THANKS_SHORT_REPLY,
    hiReply: THANKS_REPLY_HI,
  },
  {
    category: 'thanks',
    phrases: ['thank', 'thank you', 'thank u'],
    reply: THANKS_PLEASURE_REPLY,
    hiReply: THANKS_REPLY_HI,
  },
  {
    category: 'thanks',
    phrases: ['thank you so much', 'thanks a lot', 'thank you very much'],
    reply: THANKS_MUCH_REPLY,
    hiReply: THANKS_REPLY_HI,
  },
  {
    category: 'thanks',
    phrases: [
      'धन्यवाद', 'बहुत धन्यवाद', 'शुक्रिया', 'बहुत शुक्रिया',
      'dhanyavad', 'dhanyawaad', 'shukriya', 'bahut dhanyavad', 'bahut shukriya',
    ],
    reply: THANKS_REPLY_HI,
    hiReply: THANKS_REPLY_HI,
    preferHindi: true,
  },
  {
    category: 'thanks',
    phrases: [
      'great', 'nice', 'awesome', 'cool', 'good job', 'well done', 'ok', 'okay', 'got it',
      'ठीक है', 'अच्छा', 'समझ गया', 'समझ गई',
    ],
    reply: THANKS_ACK_REPLY,
    hiReply: THANKS_REPLY_HI,
  },
  {
    category: 'bye',
    phrases: ['bye', 'goodbye', 'see you', 'see ya', 'good night', 'take care'],
    reply: BYE_REPLY,
    hiReply: BYE_REPLY_HI,
  },
  {
    category: 'bye',
    phrases: ['अलविदा', 'बाय', 'फिर मिलेंगे', 'शुभ रात्रि', 'alvida', 'phir milenge'],
    reply: BYE_REPLY_HI,
    hiReply: BYE_REPLY_HI,
    preferHindi: true,
  },
  {
    category: 'help',
    phrases: [
      'are you ai', 'are you a robot', 'are you human', 'are you a bot',
      'क्या आप एआई हैं', 'क्या आप इंसान हैं', 'क्या आप रोबोट हैं', 'क्या आप बॉट हैं',
    ],
    reply: BOT_IDENTITY_AI_REPLY,
    hiReply: BOT_IDENTITY_AI_REPLY_HI,
    suggestions: ALL_TOPICS,
    hiSuggestions: HINDI_TOPICS,
  },
  {
    category: 'help',
    phrases: [
      'are you a lawyer', 'are you an advocate', 'can you be my lawyer',
      'क्या आप वकील हैं', 'क्या आप अधिवक्ता हैं', 'क्या आप मेरे वकील बन सकते हैं',
    ],
    reply: BOT_LAWYER_REPLY,
    hiReply: BOT_LAWYER_REPLY_HI,
    suggestions: ALL_TOPICS,
    hiSuggestions: HINDI_TOPICS,
  },
  {
    category: 'help',
    phrases: [
      'is this legal advice', 'can i trust you', 'are your answers correct', 'is this accurate',
      'क्या यह कानूनी सलाह है', 'क्या मैं आप पर भरोसा कर सकता हूँ', 'क्या आपके उत्तर सही हैं',
    ],
    reply: BOT_ACCURACY_REPLY,
    hiReply: BOT_ACCURACY_REPLY_HI,
    suggestions: ALL_TOPICS,
    hiSuggestions: HINDI_TOPICS,
  },
  {
    category: 'help',
    phrases: [
      'how do you work', 'what is your source', 'which law do you use', 'where do you get answers',
      'आप कैसे काम करते हैं', 'आपका स्रोत क्या है', 'आप कौन सा कानून उपयोग करते हैं', 'आपको उत्तर कहाँ से मिलते हैं',
    ],
    reply: BOT_HOW_IT_WORKS_REPLY,
    hiReply: BOT_HOW_IT_WORKS_REPLY_HI,
    suggestions: ALL_TOPICS,
    hiSuggestions: HINDI_TOPICS,
  },
  {
    category: 'help',
    phrases: [
      'is this free', 'do you charge',
      'क्या यह मुफ्त है', 'क्या यह फ्री है', 'क्या आप पैसे लेते हैं', 'क्या इसका कोई शुल्क है',
    ],
    reply: BOT_FREE_REPLY,
    hiReply: BOT_FREE_REPLY_HI,
    suggestions: ALL_TOPICS,
    hiSuggestions: HINDI_TOPICS,
  },
  {
    category: 'help',
    phrases: [
      'who are you', 'what are you', 'what is your name', 'whats your name',
      'your name', 'who made you', 'tell me about yourself',
      'what can you do', 'what can you help me with', 'what can you help with',
      'what can i ask you', 'what can i ask', 'what questions can i ask',
      'how can you help me', 'how can you help', 'how do you answer questions',
      'how do you answer', 'how does this work',
      'how does this chatbot work', 'how does consumersaathi work',
      'what are your specialties', 'what are your specialities',
      'what services do you provide', 'what services do you offer',
      'what topics do you cover', 'what do you cover',
      'what is your purpose', 'whats your purpose', 'what do you do',
      'help', 'help me', 'do you help', 'can you really help', 'are you useful',
    ],
    reply: CAPABILITY_REPLY,
    hiReply: CAPABILITY_REPLY_HI,
    suggestions: ALL_TOPICS,
    hiSuggestions: HINDI_TOPICS,
  },
  {
    category: 'help',
    phrases: [
      'can you help me', 'can you help', 'can u help me', 'could you help me',
      'will you help me', 'can you assist me', 'can you assist', 'i need help',
      'need help', 'i need your help', 'please help', 'help me please',
      'i have a question', 'i have a doubt', 'i have a problem',
      'can i ask something', 'can i ask a question', 'can i ask you something',
      'i want to ask something', 'i want to ask a question', 'i want to know something',
      'may i ask', 'are you there', 'anyone there',
    ],
    reply: HELP_ASK_REPLY,
    hiReply: HELP_REPLY_HI,
    suggestions: ALL_TOPICS,
    hiSuggestions: HINDI_TOPICS,
  },
  {
    category: 'help',
    phrases: [
      'आप क्या करते हैं', 'आप क्या कर सकते हैं', 'आप मेरी क्या मदद कर सकते हैं',
      'तुम क्या करते हो', 'तुम क्या कर सकते हो', 'तुम कौन हो',
      'आप कौन हैं', 'आप कौन हो', 'आपका नाम क्या है',
      'tum kya karte ho', 'tum kya kar sakte ho', 'tum kaun ho',
      'aap kya karte ho', 'aap kya karte hain', 'aap kya kar sakte hain', 'aap kaun hain',
      'kya kar sakte ho', 'kya karte ho',
    ],
    reply: CAPABILITY_REPLY_HI,
    hiReply: CAPABILITY_REPLY_HI,
    suggestions: HINDI_TOPICS,
    hiSuggestions: HINDI_TOPICS,
    preferHindi: true,
  },
  {
    category: 'help',
    phrases: [
      'क्या आप मेरी मदद कर सकते हैं', 'क्या आप मदद कर सकते हैं',
      'मुझे मदद चाहिए', 'मदद चाहिए', 'मदद करें', 'सहायता चाहिए',
      'मेरा एक सवाल है', 'मेरा एक प्रश्न है', 'क्या मैं एक सवाल पूछ सकता हूँ', 'क्या मैं कुछ पूछ सकता हूँ',
      'kya aap meri madad kar sakte hain', 'kya aap madad kar sakte hain',
      'mujhe madad chahiye', 'madad chahiye', 'mera ek sawal hai',
    ],
    reply: HELP_REPLY_HI,
    hiReply: HELP_REPLY_HI,
    suggestions: HINDI_TOPICS,
    hiSuggestions: HINDI_TOPICS,
    preferHindi: true,
  },
];

const SMALL_TALK_EXACT_MAP: Map<string, SmallTalkGroup> = (() => {
  const map = new Map<string, SmallTalkGroup>();
  for (const group of SMALL_TALK_GROUPS) {
    for (const phrase of group.phrases) {
      map.set(phrase, group);
    }
  }
  return map;
})();

export function normalizeSmallTalkText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\uFE0F\u200D]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchSmallTalk(input: string, lang: ChatLanguage = 'en'): SmallTalkMatch | null {
  const normalized = normalizeSmallTalkText(input);
  if (!normalized) return null;

  const toResult = (group: SmallTalkGroup): SmallTalkMatch => {
    const useHindi = lang === 'hi' || Boolean(group.preferHindi);
    const reply = useHindi ? group.hiReply : group.reply;
    const rawSuggestions = useHindi ? (group.hiSuggestions ?? group.suggestions) : group.suggestions;
    return {
      reply,
      ...(rawSuggestions ? { suggestions: [...rawSuggestions] } : {}),
      ...(group.preferHindi ? { preferHindi: true } : {}),
    };
  };

  const exact = SMALL_TALK_EXACT_MAP.get(normalized);
  if (exact) return toResult(exact);

  const tokens = normalized.split(' ').filter(Boolean);
  const fillerIndices: number[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    if (SMALL_TALK_FILLERS.has(tokens[i])) {
      fillerIndices.push(i);
    }
  }

  // Try removing 1 filler token
  for (const idx of fillerIndices) {
    const candidate = tokens.filter((_, pos) => pos !== idx).join(' ');
    const match = candidate ? SMALL_TALK_EXACT_MAP.get(candidate) : undefined;
    if (match) return toResult(match);
  }

  // Try removing 2 filler tokens
  for (let i = 0; i < fillerIndices.length; i += 1) {
    for (let j = i + 1; j < fillerIndices.length; j += 1) {
      const idxA = fillerIndices[i];
      const idxB = fillerIndices[j];
      const candidate = tokens.filter((_, pos) => pos !== idxA && pos !== idxB).join(' ');
      const match = candidate ? SMALL_TALK_EXACT_MAP.get(candidate) : undefined;
      if (match) return toResult(match);
    }
  }

  return null;
}

export function buildChitchatResponse(
  match: SmallTalkMatch,
  lang: ChatLanguage = 'en',
): ChatApiResponse {
  const effectiveLang: ChatLanguage = lang === 'hi' || match.preferHindi ? 'hi' : 'en';
  return {
    type: 'chitchat',
    answer: match.reply,
    citations: [],
    procedure: [],
    disclaimer: getDisclaimerForLang(effectiveLang),
    ...(match.suggestions ? { suggestions: match.suggestions } : {}),
    lang: effectiveLang,
  };
}
