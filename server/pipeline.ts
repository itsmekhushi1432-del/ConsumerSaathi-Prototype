import type { Passage } from '../src/knowledgeBase.ts';
import {
  CONSUMERSAATHI_DISCLAIMER,
  type ChatApiResponse,
  type ChatCitation,
  type ProcedureStep,
} from '../src/chat/types.ts';
import {
  classifyQuestionWithGemini,
  generateGroundedAnswerWithGemini,
  type GeminiClientLike,
  type ModelAnswerPayload,
} from './geminiService.ts';

const FILLER_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'am', 'be', 'been', 'being',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'about',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between',
  'under', 'over', 'what', 'which', 'who', 'whom', 'whose', 'when', 'where',
  'why', 'how', 'can', 'could', 'will', 'would', 'shall', 'should', 'may',
  'might', 'must', 'do', 'does', 'did', 'have', 'has', 'had', 'having',
  'i', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours', 'you', 'your', 'yours',
  'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'they', 'them',
  'their', 'theirs', 'this', 'that', 'these', 'those', 'and', 'or', 'but',
  'if', 'then', 'else', 'than', 'so', 'very', 'just', 'only', 'also', 'any',
  'all', 'some', 'no', 'not', 'nor', 'too', 'more', 'most', 'other', 'such',
  'please', 'tell', 'give', 'explain', 'describe', 'know', 'want', 'need',
  'get', 'got', 'make', 'made', 'say', 'said', 'there', 'here',
]);

const SYNONYM_GROUPS: string[][] = [
  ['refund', 'return', 'cancellation', 'cancel'],
  ['court', 'commission'],
  ['deadline', 'limitation'],
  ['fees', 'fee', 'charges', 'charge'],
  ['lawyer', 'advocate'],
];

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/i,
  /disregard\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/i,
  /(?:show|reveal|print|display|repeat|tell\s+me)\s+(?:your\s+)?system\s+prompt/i,
  /\byou\s+are\s+now\b/i,
  /\bdeveloper\s+mode\b/i,
  /\bdelete\s+(?:the\s+)?database\b/i,
  /\bdrop\s+table\b/i,
];

const PERSONAL_DISPUTE_PATTERNS: RegExp[] = [
  /\b(?:will|can|would|could)\s+i\s+win\b/i,
  /\bmy\s+chances\b/i,
  /\bchances\s+of\s+winning\b/i,
  /\bshould\s+i\s+sue\b/i,
  /\bdo\s+i\s+have\s+a\s+case\b/i,
  /\bmy\s+(?:case|dispute)\b/i,
  /\bhearing\s+tomorrow\b/i,
  /\b(?:case|complaint|cc|rp|fa|ma|ea|diary)\s*(?:no\.?|number|#)?\s*[:/-]?\s*\d{1,6}(?:[/-]\d{2,4})+\b/i,
  /\b(?:case|complaint|docket)\s*(?:no\.?|number)\s*[:#-]?\s*\d+\b/i,
  /\b(?:draft|write|prepare|create|compose|generate)\b.{0,40}\b(?:affidavit|petition|plaint|legal\s+notice)\b/i,
  /\b(?:send|issue|file|need)\s+(?:a|an|my)\s+(?:affidavit|plaint|legal\s+notice)\b/i,
  /\b(?:i|we)\s+(?:bought|purchased|ordered|booked|paid|hired|availed)\b.{0,90}\b(?:refused|denied|cheated|scammed|defective|broken|damaged|faulty|won't\s+refund|not\s+refunding|refusing)\b/i,
  /\b(?:my|the)\s+(?:seller|dealer|landlord|shop|shopkeeper|builder|vendor|company|store|merchant)\b.{0,60}\b(?:refused|denied|cheated|scammed|overcharged|refuses|refusing|won't)\b/i,
  /\bi\s+(?:was|got|have\s+been)\s+(?:cheated|scammed|defrauded)\b/i,
];

interface OutOfScopeRule {
  pattern: RegExp;
  area: string;
  guidance: string;
}

const OUT_OF_SCOPE_RULES: OutOfScopeRule[] = [
  {
    pattern: /\b(?:divorce|alimony|matrimonial|child\s+custody|judicial\s+separation|maintenance\s+under\s+125)\b/i,
    area: 'divorce and family law',
    guidance: 'a Family Court or a qualified family law advocate',
  },
  {
    pattern: /\b(?:bail|anticipatory\s+bail|criminal\s+law|criminal\s+case|fir|arrest|murder|theft|robbery|assault|chargesheet|ipc|bns|crpc|bnss|jail|remand)\b/i,
    area: 'criminal law or bail',
    guidance: 'a Criminal Court, the nearest police station (for reporting an offence), or a criminal law advocate',
  },
  {
    pattern: /\b(?:income\s+tax|itr|tax\s+return|tds|capital\s+gains|income\s+tax\s+department|tax\s+assessment|tax\s+evasion)\b/i,
    area: 'income tax',
    guidance: 'the Income Tax Department (incometax.gov.in), a Chartered Accountant, or a tax advocate',
  },
  {
    pattern: /\b(?:property\s+partition|partition\s+suit|ancestral\s+property|land\s+partition|coparcener|title\s+dispute|mutation\s+of\s+land)\b/i,
    area: 'property partition',
    guidance: 'a Civil Court or a qualified civil/property law advocate',
  },
];

const ECOMMERCE_TRIGGER_PATTERN =
  /\b(?:online|website|app|e-commerce|platform|marketplace|delivery|booking)\b/i;

const NOT_FOUND_MESSAGE =
  "I couldn't find specific information about that in my current consumer law knowledge base.\n\nIf you could rephrase your question or provide a few more details, I'll do my best to help.";

const UNCLEAR_QUESTION_MESSAGE =
  "I'd be happy to help.\n\nCould you please provide a little more detail about your question so I can better assist you?";

const OFF_TOPIC_MESSAGE =
  "That's outside my area of expertise. I'm designed to assist with consumer rights, the Consumer Protection Act, 2019, and related consumer law topics. If you have a consumer law question, I'd be happy to help.";

const GREETING_REPLY =
  "Hello! 👋 I'm ConsumerSaathi, your AI assistant for consumer rights and the Consumer Protection Act, 2019.\n\nI'm here to help you understand your consumer rights, complaint procedures, refunds, online shopping issues, and much more.\n\nHow may I assist you today?";

const CAPABILITY_REPLY =
  "I'm ConsumerSaathi, an AI assistant designed to provide general information and guidance about consumer rights in India.\n\nI can help you understand topics such as:\n\n• Consumer Rights\n• Consumer Protection Act, 2019\n• Consumer Protection (E-Commerce) Rules, 2020\n• Refunds and Replacements\n• Defective Products\n• Deficient Services\n• Online Shopping Issues\n• Product Liability\n• Misleading Advertisements\n• Unfair Trade Practices\n• Complaint Filing Process\n• Consumer Commissions\n• Complaint Deadlines\n• Consumer Awareness\n\nMy goal is to make consumer law easier to understand by providing clear and reliable information.\n\nPlease note that I provide general legal information and not legal advice.";

const SMALL_TALK_FILLERS = new Set([
  'there',
  'bot',
  'saathi',
  'consumersaathi',
  'please',
  'again',
  'now',
  'kindly',
  'sir',
  'madam',
  'maam',
  'friend',
  'mate',
  'ji',
]);

interface SmallTalkGroup {
  phrases: string[];
  reply: string;
}

const SMALL_TALK_GROUPS: SmallTalkGroup[] = [
  {
    phrases: [
      'hi', 'hii', 'hello', 'hello there', 'hey', 'hey there',
      'good morning', 'good afternoon', 'good evening', 'greetings',
      'namaste', 'namaskar', 'hola',
    ],
    reply: GREETING_REPLY,
  },
  {
    phrases: ['how are you', 'how r u', 'how are you doing', 'whats up', 'sup'],
    reply:
      "I'm doing well, thank you for asking! 😊\n\nI'm here and ready to help you with any questions related to consumer rights or consumer law.",
  },
  {
    phrases: [
      'im good', 'i am good', 'im fine', 'i am fine', 'doing well', 'doing good',
      'nice to meet you', 'good to meet you', 'pleased to meet you',
    ],
    reply:
      "It's lovely to hear from you! 😊\n\nFeel free to ask any questions you have about consumer rights, refunds, online shopping rules, or complaint procedures.",
  },
  {
    phrases: ['thanks', 'thx', 'ty', 'appreciate it', 'i appreciate it'],
    reply:
      "You're very welcome! 😊\n\nI'm glad I could help. If you ever have more questions about consumer rights or consumer protection, feel free to ask.",
  },
  {
    phrases: ['thank', 'thank you', 'thank u'],
    reply:
      "It's my pleasure! 😊\n\nIf you have any more questions about consumer rights, refunds, complaint procedures, or consumer protection laws, I'm always here to help.",
  },
  {
    phrases: ['thank you so much', 'thanks a lot', 'thank you very much'],
    reply:
      "You're most welcome! I'm happy I could assist you.\n\nWhenever you need guidance about consumer rights or consumer law, don't hesitate to ask.",
  },
  {
    phrases: ['great', 'nice', 'awesome', 'cool', 'good job', 'well done', 'ok', 'okay', 'got it'],
    reply:
      "Glad to help! 😊\n\nWhenever you have a question about consumer rights, refunds, or consumer law, feel free to ask.",
  },
  {
    phrases: ['bye', 'goodbye', 'see you', 'see ya', 'good night', 'take care'],
    reply:
      'Goodbye! 👋\n\nThank you for using ConsumerSaathi.\n\nTake care, and remember that being aware of your consumer rights helps you make informed decisions.\n\nHave a wonderful day!',
  },
  {
    phrases: [
      'who are you', 'what are you', 'what is your name', 'whats your name',
      'your name', 'who made you', 'tell me about yourself',
      'what can you do', 'what can you help me with', 'what can you help with',
      'what can i ask you', 'what can i ask', 'what questions can i ask',
      'how can you help me', 'how can you help', 'how do you answer questions',
      'how do you answer', 'how do you work', 'how does this work',
      'how does this chatbot work', 'how does consumersaathi work',
      'what are your specialties', 'what are your specialities',
      'what services do you provide', 'what services do you offer',
      'what topics do you cover', 'what do you cover',
      'what is your purpose', 'whats your purpose', 'what do you do',
      'help', 'help me', 'do you help', 'can you really help', 'are you useful',
    ],
    reply: CAPABILITY_REPLY,
  },
  {
    phrases: [
      'can you help me', 'can you help', 'can u help me', 'could you help me',
      'will you help me', 'can you assist me', 'can you assist', 'i need help',
      'need help', 'i need your help', 'please help', 'help me please',
      'i have a question', 'i have a doubt', 'i have a problem',
      'can i ask something', 'can i ask a question', 'can i ask you something',
      'i want to ask something', 'i want to ask a question', 'i want to know something',
      'may i ask', 'are you there', 'anyone there',
    ],
    reply:
      "Of course, I'm happy to help! Tell me what you'd like to know about consumer rights. For example: refunds, defective goods, online shopping rules, complaint deadlines or how to use the National Consumer Helpline (1915). I give general information, not legal advice.",
  },
];

const SMALL_TALK_EXACT_MAP: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const group of SMALL_TALK_GROUPS) {
    for (const phrase of group.phrases) {
      map.set(phrase, group.reply);
    }
  }
  return map;
})();

export function normalizeSmallTalkText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\uFE0F\u200D]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchSmallTalk(input: string): string | null {
  const normalized = normalizeSmallTalkText(input);
  if (!normalized) return null;

  const exact = SMALL_TALK_EXACT_MAP.get(normalized);
  if (exact) return exact;

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
    if (match) return match;
  }

  // Try removing 2 filler tokens
  for (let i = 0; i < fillerIndices.length; i += 1) {
    for (let j = i + 1; j < fillerIndices.length; j += 1) {
      const idxA = fillerIndices[i];
      const idxB = fillerIndices[j];
      const candidate = tokens.filter((_, pos) => pos !== idxA && pos !== idxB).join(' ');
      const match = candidate ? SMALL_TALK_EXACT_MAP.get(candidate) : undefined;
      if (match) return match;
    }
  }

  return null;
}

const CONSUMER_LAW_CONTEXT_PATTERN =
  /\b(?:consumer|cpa|e-commerce|ecommerce|refund|defect|defects|defective|deficiency|warranty|guarantee|seller|buyer|merchant|vendor|shop|shopkeeper|product\s+liability|misleading\s+advertisement|grievance|helpline|1915|e-daakhil|edaakhil|commission|ncdrc|scdrc|dcdrc|ccpa|pecuniary|limitation\s+period|cancellation\s+fee|cancellation\s+charge|pre-ticked|unfair\s+trade|unfair\s+contract|section\s+\d+|rule\s+\d+)\b/i;

const OFF_TOPIC_PATTERNS: RegExp[] = [
  /\b(?:tell\s+(?:me\s+)?a\s+joke|knock\s+knock|joke|jokes|riddle|poem|haiku|write\s+(?:me\s+)?a\s+(?:poem|story)|tell\s+(?:me\s+)?a\s+story|sing\s+(?:me\s+)?(?:a\s+)?song|lyrics)\b/i,
  /\b(?:movie|movies|film|films|cinema|bollywood|hollywood|netflix|watch\s+recommendations?|entertainment|celebrity\s+news|celebrities|celebrity|gossip|song|songs|music\s+album)\b/i,
  /\b(?:weather|forecast|temperature\s+(?:in|today|tomorrow)|raining\s+today|humidity|climate\s+of)\b/i,
  /\b(?:cricket|ipl|world\s+cup|football|soccer|tennis|basketball|nba|fifa|match\s+score|who\s+won\s+(?:yesterday(?:'s|s)?\s+|the\s+)?(?:cricket\s+)?match|virat\s+kohli|ms\s+dhoni|sachin\s+tendulkar|messi|ronaldo)\b/i,
  /\b(?:recipe|recipes|cooking|how\s+to\s+cook|how\s+to\s+make\s+(?:pasta|pizza|biryani|cake|tea|coffee|curry|soup|bread|omelette)|ingredients\s+(?:for|to\s+make)|bake\s+a)\b/i,
  /\b(?:python|javascript|typescript|java|c\+\+|html|css|sql|react|node\.js|algorithm|leetcode|write\s+(?:me\s+)?(?:a\s+)?(?:python\s+|javascript\s+)?(?:code|program|script|function)|debug\s+(?:my\s+)?code|regex\s+for)\b/i,
  /^\s*(?:what\s+is|whats|calculate|compute|solve)?\s*-?\d+(?:\.\d+)?\s*[+\-*/^×÷]\s*-?\d+(?:\.\d+)?(?:\s*[+\-*/^×÷]\s*-?\d+(?:\.\d+)?)*\s*\??\s*$/i,
  /\b(?:solve\s+(?:this|a|my)?\s*math|math\s+problem|mathematics|maths|calculus|algebra|trigonometry|quadratic\s+equation|integral|derivative|square\s+root|solve\s+for\s+x|factorial|prime\s+number|pythagoras)\b/i,
  /\b(?:translate\s+(?:this|that|it|the\s+following|into|to)|translation\s+of)\b/i,
  /\b(?:politics|political\s+party|elections?)\b/i,
  /\b(?:medical\s+advice|health\s+advice|relationship\s+advice|dating\s+advice|love\s+advice|investment\s+advice|financial\s+advice|stock\s+market|which\s+stocks?\s+to\s+buy|mutual\s+fund\s+tips|trading\s+tips)\b/i,
  /\b(?:gaming|video\s+games?|esports|pubg|bgmi|valorant|fortnite|minecraft)\b/i,
  /\b(?:travel\s+planning|trip\s+planning|travel\s+itinerary|places\s+to\s+visit|plan\s+(?:a|my)\s+(?:trip|vacation|holiday))\b/i,
  /\b(?:capital\s+of|who\s+invented|who\s+discovered|boiling\s+point|speed\s+of\s+light|distance\s+to\s+the\s+moon|tallest\s+mountain|longest\s+river|periodic\s+table|photosynthesis|solar\s+system|world\s+war)\b/i,
  /\b(?:what\s+do\s+you\s+think\s+(?:of|about)|your\s+opinion\s+(?:on|about)|opinion\s+(?:on|about)|who\s+is\s+the\s+(?:best|worst|greatest)\s+(?:actor|actress|singer|politician|cricketer|player|movie|film|pm|prime\s+minister|president)|is\s+[a-z]+\s+(?:a\s+)?(?:good|bad|great)\s+(?:person|actor|actress|politician|leader|cricketer))\b/i,
];

export function isOffTopicRequest(input: string): boolean {
  if (CONSUMER_LAW_CONTEXT_PATTERN.test(input)) {
    return false;
  }
  return OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(input));
}

export function buildProcedureSteps(question: string): ProcedureStep[] {
  const steps: ProcedureStep[] = [];

  if (ECOMMERCE_TRIGGER_PATTERN.test(question)) {
    steps.push({
      step: "Write to the e-commerce entity's Grievance Officer. It must acknowledge within 48 hours and resolve within one month.",
      authority: 'Grievance Officer of the e-commerce entity',
    });
  }

  steps.push({
    step: 'Raise an informal complaint with the National Consumer Helpline: call 1915 or register on consumerhelpline.gov.in.',
    authority: 'National Consumer Helpline',
  });

  steps.push({
    step: 'If unresolved, file a complaint within two years of the cause of action. The Commission depends on the value paid: District up to Rs 50 lakh, State above Rs 50 lakh up to Rs 2 crore, National above Rs 2 crore. Complaints can be filed online on e-Daakhil.',
    authority: 'District / State / National Consumer Disputes Redressal Commission',
  });

  return steps;
}

export function stemWord(raw: string): string {
  let word = raw.toLowerCase().trim();
  if (word.length <= 3) return word;

  if (word === 'e-daakhil' || word === 'edaakhil') return 'edaakhil';

  if (word.endsWith('ies') && word.length > 4) {
    word = word.slice(0, -3) + 'y';
  } else if (word.endsWith('sses') && word.length > 5) {
    word = word.slice(0, -2);
  } else if (word.endsWith('es') && word.length > 4 && !word.endsWith('ses')) {
    if (/(?:ch|sh|x|z|s)es$/.test(word)) {
      word = word.slice(0, -2);
    } else {
      word = word.slice(0, -1);
    }
  } else if (word.endsWith('s') && word.length > 3 && !word.endsWith('ss')) {
    word = word.slice(0, -1);
  }

  if (word.endsWith('ing') && word.length > 5) {
    word = word.slice(0, -3);
  } else if (word.endsWith('ed') && word.length > 4) {
    word = word.slice(0, -2);
  } else if (word.endsWith('ive') && word.length > 6) {
    word = word.slice(0, -3);
  } else if (word.endsWith('ly') && word.length > 4) {
    word = word.slice(0, -2);
  }

  if (word.length > 4 && word[word.length - 1] === word[word.length - 2] && !word.endsWith('ss')) {
    word = word.slice(0, -1);
  }
  if (word.endsWith('e') && !word.endsWith('ee') && word.length >= 4) {
    word = word.slice(0, -1);
  }

  return word;
}

function extractRawTokens(input: string): string[] {
  const lower = input.toLowerCase();
  const normalized = lower
    .replace(/\be-daakhil\b/g, 'edaakhil')
    .replace(/\b(\d+)\s*\(\s*(\d+)\s*\)/g, '$1_$2');

  const matches = normalized.match(/[a-z0-9_₹]+/g);
  if (!matches) return [];

  const tokens: string[] = [];
  for (const token of matches) {
    const cleaned = token.replace(/^₹+/, '');
    if (!cleaned) continue;
    tokens.push(cleaned);
  }
  return tokens;
}

export function extractMeaningfulStems(input: string): string[] {
  const rawTokens = extractRawTokens(input);
  const stems: string[] = [];
  for (const token of rawTokens) {
    if (FILLER_WORDS.has(token)) continue;
    const stemmed = stemWord(token);
    if (!stemmed || FILLER_WORDS.has(stemmed)) continue;
    stems.push(stemmed);
  }
  return stems;
}

const SYNONYM_MAP: Map<string, string[]> = (() => {
  const map = new Map<string, string[]>();
  for (const group of SYNONYM_GROUPS) {
    const stemmedGroup = Array.from(new Set(group.map((w) => stemWord(w))));
    for (const stem of stemmedGroup) {
      const others = stemmedGroup.filter((s) => s !== stem);
      const existing = map.get(stem) ?? [];
      map.set(stem, Array.from(new Set([...existing, ...others])));
    }
  }
  return map;
})();

interface IndexedPassage {
  passage: Passage;
  sectionStems: Set<string>;
  keywordStems: Set<string>;
  textStems: Set<string>;
  allStems: Set<string>;
}

interface KnowledgeIndex {
  entries: IndexedPassage[];
  df: Map<string, number>;
}

function buildKnowledgeIndex(passages: Passage[]): KnowledgeIndex {
  const entries: IndexedPassage[] = [];
  const df = new Map<string, number>();

  for (const passage of passages) {
    const sectionStems = new Set(extractMeaningfulStems(passage.section));
    const keywordStems = new Set(
      passage.keywords.flatMap((kw) => extractMeaningfulStems(kw)),
    );
    const textStems = new Set(
      extractMeaningfulStems(`${passage.document} ${passage.text}`),
    );
    const allStems = new Set<string>([
      ...sectionStems,
      ...keywordStems,
      ...textStems,
    ]);

    for (const stem of allStems) {
      df.set(stem, (df.get(stem) ?? 0) + 1);
    }

    entries.push({
      passage,
      sectionStems,
      keywordStems,
      textStems,
      allStems,
    });
  }

  return { entries, df };
}

function computeIdf(dfCount: number, totalDocs: number): number {
  return Math.max(0.15, Math.log((totalDocs + 1) / (dfCount + 0.5)));
}

export function retrievePassages(question: string, passages: Passage[]): Passage[] {
  const meaningfulStems = Array.from(new Set(extractMeaningfulStems(question)));
  if (meaningfulStems.length < 2) {
    return [];
  }

  const index = buildKnowledgeIndex(passages);
  const totalDocs = passages.length;

  let knownWords = 0;
  for (const stem of meaningfulStems) {
    const synonyms = SYNONYM_MAP.get(stem) ?? [];
    const candidates = [stem, ...synonyms];
    const existsInKb = candidates.some((c) => (index.df.get(c) ?? 0) > 0);
    if (existsInKb) {
      knownWords += 1;
    }
  }

  if (knownWords / meaningfulStems.length < 0.5) {
    return [];
  }

  const MIN_SCORE = 2.8;
  const scored: Array<{ passage: Passage; score: number }> = [];

  for (const entry of index.entries) {
    let score = 0;
    let matchedOriginalCount = 0;
    let strongSingleMatch = false;

    for (const stem of meaningfulStems) {
      const synonyms = SYNONYM_MAP.get(stem) ?? [];
      const candidates: Array<{ token: string; queryWeight: number }> = [
        { token: stem, queryWeight: 1.0 },
        ...synonyms.map((syn) => ({ token: syn, queryWeight: 0.9 })),
      ];

      let bestTokenScore = 0;
      let isStrong = false;

      for (const candidate of candidates) {
        const docFreq = index.df.get(candidate.token) ?? 0;
        if (docFreq === 0) continue;

        const idf = computeIdf(docFreq, totalDocs);
        let fieldWeight = 0;
        if (entry.sectionStems.has(candidate.token)) {
          fieldWeight = 3.5;
        } else if (entry.keywordStems.has(candidate.token)) {
          fieldWeight = 2.6;
        } else if (entry.textStems.has(candidate.token)) {
          fieldWeight = 1.0;
        }

        if (fieldWeight > 0) {
          const candidateScore = candidate.queryWeight * fieldWeight * idf;
          if (candidateScore > bestTokenScore) {
            bestTokenScore = candidateScore;
            isStrong = fieldWeight >= 2.6 && docFreq <= 5;
          }
        }
      }

      if (bestTokenScore > 0) {
        score += bestTokenScore;
        matchedOriginalCount += 1;
        if (isStrong) {
          strongSingleMatch = true;
        }
      }
    }

    if (matchedOriginalCount === 0) continue;
    if (matchedOriginalCount === 1 && !strongSingleMatch) continue;

    if (score >= MIN_SCORE) {
      scored.push({ passage: entry.passage, score });
    }
  }

  if (scored.length === 0) {
    return [];
  }

  scored.sort((a, b) => b.score - a.score);
  const topScore = scored[0].score;
  const minRelevantScore = 0.7 * topScore;

  return scored
    .filter((item) => item.score >= minRelevantScore)
    .slice(0, 2)
    .map((item) => item.passage);
}

function toCitation(passage: Passage): ChatCitation {
  return {
    document: passage.document,
    section: passage.section,
    authority: passage.authority,
    text: passage.text,
    url: passage.url,
    needsVerification: passage.needsVerification,
  };
}

function checkSectionReference(
  question: string,
  passages: Passage[],
): { notFoundMessage: string } | null {
  const match = question.match(/\b(?:section|sec\.?)\s+(\d+)(?:\s*\(\s*(\d+)\s*\))?/i);
  if (!match) {
    return null;
  }

  const sectionNum = Number(match[1]);
  const subSection = match[2];

  if (sectionNum > 107) {
    return {
      notFoundMessage: `There is no Section ${sectionNum} in the Consumer Protection Act, 2019; the Act has sections 1 to 107.`,
    };
  }

  const normalizedTarget = subSection
    ? `section ${sectionNum}(${subSection})`
    : `section ${sectionNum}`;

  const isIndexed = passages.some((p) => {
    const secLower = p.section.toLowerCase();
    if (subSection) {
      return secLower === normalizedTarget;
    }
    return secLower === normalizedTarget || secLower.startsWith(`${normalizedTarget}(`);
  });

  if (!isIndexed) {
    const label = subSection ? `Section ${sectionNum}(${subSection})` : `Section ${sectionNum}`;
    return {
      notFoundMessage: `${label} is not indexed in the documents I cover, so I cannot provide its text.`,
    };
  }

  return null;
}

export function extractLegalReferences(text: string): Set<string> {
  const refs = new Set<string>();

  const sectionGroups = text.matchAll(
    /\b(?:Sections?|Sec\.?)\s+(\d+(?:\s*\(\s*\d+\s*\))?(?:\s*(?:,|and|&)\s*\d+(?:\s*\(\s*\d+\s*\))?)*)/gi,
  );
  for (const match of sectionGroups) {
    const groupText = match[1];
    const items = groupText.matchAll(/(\d+)(?:\s*\(\s*(\d+)\s*\))?/g);
    for (const item of items) {
      const base = item[1];
      const sub = item[2];
      if (sub) {
        refs.add(`section:${base}(${sub})`);
      } else {
        refs.add(`section:${base}`);
      }
    }
  }

  const ruleGroups = text.matchAll(
    /\bRules?\s+(\d+(?:\s*\(\s*\d+\s*\))?(?:\s*(?:,|and|&)\s*\d+(?:\s*\(\s*\d+\s*\))?)*)/gi,
  );
  for (const match of ruleGroups) {
    const groupText = match[1];
    const items = groupText.matchAll(/(\d+)(?:\s*\(\s*(\d+)\s*\))?/g);
    for (const item of items) {
      const base = item[1];
      const sub = item[2];
      if (sub) {
        refs.add(`rule:${base}(${sub})`);
      } else {
        refs.add(`rule:${base}`);
      }
    }
  }

  return refs;
}

export type VerifiedModelResult =
  | { status: 'accepted'; answer: string; usedPassages: Passage[] }
  | { status: 'not_covered' }
  | { status: 'discarded' };

export function verifyModelAnswer(
  modelOutput: ModelAnswerPayload | null,
  retrievedPassages: Passage[],
): VerifiedModelResult {
  if (!modelOutput || typeof modelOutput.answer !== 'string') {
    return { status: 'discarded' };
  }

  const answer = modelOutput.answer.trim();
  if (!answer) {
    return { status: 'discarded' };
  }

  if (answer === 'NOT_COVERED') {
    return { status: 'not_covered' };
  }

  const uniqueUsedIds = Array.from(new Set(modelOutput.used_ids));
  if (uniqueUsedIds.length === 0) {
    return { status: 'discarded' };
  }

  const retrievedById = new Map(retrievedPassages.map((p) => [p.id, p]));
  const usedPassages: Passage[] = [];

  for (const id of uniqueUsedIds) {
    const found = retrievedById.get(id);
    if (!found) {
      return { status: 'discarded' };
    }
    usedPassages.push(found);
  }

  const allowedRefs = new Set<string>();
  for (const passage of retrievedPassages) {
    const passageRefs = extractLegalReferences(`${passage.section} ${passage.text}`);
    for (const ref of passageRefs) {
      allowedRefs.add(ref);
      // If a passage is Section 2(10), also allow mentioning parent Section 2
      const parenIdx = ref.indexOf('(');
      if (parenIdx !== -1) {
        allowedRefs.add(ref.slice(0, parenIdx));
      }
    }
  }

  const mentionedRefs = extractLegalReferences(answer);
  for (const ref of mentionedRefs) {
    if (!allowedRefs.has(ref)) {
      return { status: 'discarded' };
    }
  }

  return {
    status: 'accepted',
    answer,
    usedPassages,
  };
}

function buildPersonalDisputeResponse(
  trimmedQuestion: string,
  passages: Passage[],
): ChatApiResponse {
  const retrieved = retrievePassages(trimmedQuestion, passages);
  const bestMatch = retrieved.length > 0 ? [retrieved[0]] : [];
  const citations = bestMatch.map(toCitation);
  const procedure = buildProcedureSteps(trimmedQuestion);

  const answer =
    bestMatch.length > 0
      ? `I cannot analyse your specific dispute or predict the result. In general, see ${bestMatch[0].document}, ${bestMatch[0].section} below. Please consult an advocate for your own situation.`
      : 'I cannot analyse your specific dispute or predict the result, and I did not find a matching passage in the documents I cover. Please consult an advocate for your own situation.';

  return {
    type: 'refusal',
    answer,
    citations,
    procedure,
    disclaimer: CONSUMERSAATHI_DISCLAIMER,
  };
}

function buildNotFoundResponse(answer: string): ChatApiResponse {
  return {
    type: 'not_found',
    answer,
    citations: [],
    procedure: [],
    disclaimer: CONSUMERSAATHI_DISCLAIMER,
  };
}

function buildChitchatResponse(answer: string): ChatApiResponse {
  return {
    type: 'chitchat',
    answer,
    citations: [],
    procedure: [],
    disclaimer: CONSUMERSAATHI_DISCLAIMER,
  };
}

export async function runChatPipelineAsync(
  question: string,
  passages: Passage[],
  geminiClient: GeminiClientLike | null = null,
): Promise<ChatApiResponse> {
  const trimmed = question.trim();

  // 1(a). Prompt injection check FIRST
  if (PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return {
      type: 'refusal',
      answer:
        'I cannot follow instructions that override my guidelines or expose system instructions. I can only provide general legal information from the Consumer Protection Act, 2019 and related consumer rules in my knowledge base.',
      citations: [],
      procedure: [],
      disclaimer: CONSUMERSAATHI_DISCLAIMER,
    };
  }

  // 1(b). Small-talk check in plain code (no model call)
  const smallTalkReply = matchSmallTalk(trimmed);
  if (smallTalkReply) {
    return buildChitchatResponse(smallTalkReply);
  }

  // 1(c). Deterministic personal dispute / outcome prediction / drafting check
  if (PERSONAL_DISPUTE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return buildPersonalDisputeResponse(trimmed, passages);
  }

  // 1(c). Out-of-scope legal domain check
  for (const rule of OUT_OF_SCOPE_RULES) {
    if (rule.pattern.test(trimmed)) {
      return {
        type: 'out_of_scope',
        answer: `Questions about ${rule.area} are outside the Consumer Protection Act, 2019 and its rules, which are the only documents I cover. For help with ${rule.area}, please consult ${rule.guidance}.`,
        citations: [],
        procedure: [],
        disclaimer: CONSUMERSAATHI_DISCLAIMER,
      };
    }
  }

  // Off-topic non-consumer requests (never call Gemini)
  if (isOffTopicRequest(trimmed)) {
    return buildNotFoundResponse(OFF_TOPIC_MESSAGE);
  }

  // 3. Explicit Section N check (section > 107 or unindexed section)
  const sectionCheck = checkSectionReference(trimmed, passages);
  if (sectionCheck) {
    return buildNotFoundResponse(sectionCheck.notFoundMessage);
  }

  // Category E: Unknown or unclear questions (too short / ambiguous to search KB)
  if (
    extractMeaningfulStems(trimmed).length < 2 ||
    /^(?:i\s+don'?t\s+understand|not\s+clear|it\s+is\s+not\s+clear|what\s+do\s+you\s+mean|explain\s+again|didn'?t\s+get\s+it)[.?!\s]*$/i.test(
      trimmed,
    )
  ) {
    return buildNotFoundResponse(UNCLEAR_QUESTION_MESSAGE);
  }

  // Second safety check before retrieval using Gemini (temperature 0) if API key / client exists
  if (geminiClient) {
    const label = await classifyQuestionWithGemini(geminiClient, trimmed);
    if (label === 'PERSONAL') {
      return buildPersonalDisputeResponse(trimmed, passages);
    }
  }

  // 2 & 4. Retrieval + empty retrieval check
  const retrieved = retrievePassages(trimmed, passages);
  if (retrieved.length === 0) {
    return buildNotFoundResponse(NOT_FOUND_MESSAGE);
  }

  const procedure = buildProcedureSteps(trimmed);
  const top = retrieved[0];

  // If Gemini client exists, generate grounded 2-4 sentence answer and strictly verify it
  if (geminiClient) {
    const modelOutput = await generateGroundedAnswerWithGemini(geminiClient, trimmed, retrieved);
    if (modelOutput) {
      const verification = verifyModelAnswer(modelOutput, retrieved);
      if (verification.status === 'not_covered') {
        return buildNotFoundResponse(NOT_FOUND_MESSAGE);
      }
      if (verification.status === 'accepted') {
        return {
          type: 'answer',
          answer: verification.answer,
          citations: verification.usedPassages.map(toCitation),
          procedure,
          disclaimer: CONSUMERSAATHI_DISCLAIMER,
        };
      }
      // verification.status === 'discarded': fall back to quoting/referencing top passage
      return {
        type: 'answer',
        answer: `See ${top.document}, ${top.section} below.`,
        citations: retrieved.map(toCitation),
        procedure,
        disclaimer: CONSUMERSAATHI_DISCLAIMER,
      };
    }
  }

  // Fallback / no-API-key path
  return {
    type: 'answer',
    answer: `See ${top.document}, ${top.section} below.`,
    citations: retrieved.map(toCitation),
    procedure,
    disclaimer: CONSUMERSAATHI_DISCLAIMER,
  };
}

// Synchronous helper preserved for deterministic plain-code pipeline checks without Gemini
export function runChatPipeline(question: string, passages: Passage[]): ChatApiResponse {
  const trimmed = question.trim();

  if (PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return {
      type: 'refusal',
      answer:
        'I cannot follow instructions that override my guidelines or expose system instructions. I can only provide general legal information from the Consumer Protection Act, 2019 and related consumer rules in my knowledge base.',
      citations: [],
      procedure: [],
      disclaimer: CONSUMERSAATHI_DISCLAIMER,
    };
  }

  const smallTalkReply = matchSmallTalk(trimmed);
  if (smallTalkReply) {
    return buildChitchatResponse(smallTalkReply);
  }

  if (PERSONAL_DISPUTE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return buildPersonalDisputeResponse(trimmed, passages);
  }

  for (const rule of OUT_OF_SCOPE_RULES) {
    if (rule.pattern.test(trimmed)) {
      return {
        type: 'out_of_scope',
        answer: `Questions about ${rule.area} are outside the Consumer Protection Act, 2019 and its rules, which are the only documents I cover. For help with ${rule.area}, please consult ${rule.guidance}.`,
        citations: [],
        procedure: [],
        disclaimer: CONSUMERSAATHI_DISCLAIMER,
      };
    }
  }

  if (isOffTopicRequest(trimmed)) {
    return buildNotFoundResponse(OFF_TOPIC_MESSAGE);
  }

  const sectionCheck = checkSectionReference(trimmed, passages);
  if (sectionCheck) {
    return buildNotFoundResponse(sectionCheck.notFoundMessage);
  }

  if (
    extractMeaningfulStems(trimmed).length < 2 ||
    /^(?:i\s+don'?t\s+understand|not\s+clear|it\s+is\s+not\s+clear|what\s+do\s+you\s+mean|explain\s+again|didn'?t\s+get\s+it)[.?!\s]*$/i.test(
      trimmed,
    )
  ) {
    return buildNotFoundResponse(UNCLEAR_QUESTION_MESSAGE);
  }

  const retrieved = retrievePassages(trimmed, passages);
  if (retrieved.length === 0) {
    return buildNotFoundResponse(NOT_FOUND_MESSAGE);
  }

  const top = retrieved[0];
  return {
    type: 'answer',
    answer: `See ${top.document}, ${top.section} below.`,
    citations: retrieved.map(toCitation),
    procedure: buildProcedureSteps(trimmed),
    disclaimer: CONSUMERSAATHI_DISCLAIMER,
  };
}
