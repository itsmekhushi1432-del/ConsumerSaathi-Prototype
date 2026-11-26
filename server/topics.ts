// Matches any of the 14 consumer-law topics (EN/HI, singular/plural, optional leading prefix) and copies citations by id.
import type { Passage } from '../src/knowledgeBase.ts';
import type { ChatApiResponse, ChatCitation, ChatLanguage } from '../src/chat/types.ts';
import { buildProcedureSteps } from './procedure.ts';
import { toCitation } from './retrieval.ts';
import { ALL_TOPICS, HINDI_TOPICS, getDisclaimerForLang } from './strings.ts';

interface TopicDefinition {
  aliases: string[];
  excludedSuggestionLabels: string[];
  excludedHindiLabels: string[];
  passageIds: string[];
  intro: string;
  hiIntro: string;
  includeProcedure: boolean;
}

const TOPIC_DEFINITIONS: TopicDefinition[] = [
  {
    aliases: [
      'refunds and replacements', 'refund', 'refunds', 'replacement', 'replacements',
      'रिफंड और वापसी', 'रिफंड', 'वापसी', 'पैसे वापस',
    ],
    excludedSuggestionLabels: ['Refunds and Replacements'],
    excludedHindiLabels: ['रिफंड और वापसी'],
    passageIds: ['cpa2019-sec2-47', 'cpa2019-sec2-10', 'ecom-rules-2020-rule6-cancellation'],
    intro:
      "Here is what I have on refunds and replacements. Try asking: 'Can a website charge cancellation fees if it cancelled an order?'",
    hiIntro:
      "रिफंड और वापसी से जुड़े मुख्य प्रावधान नीचे दिए गए हैं। आप यह भी पूछ सकते हैं: 'यदि कोई वेबसाइट कोई ऑर्डर रद्द कर दे तो क्या वह कैंसिलेशन शुल्क ले सकती है?'",
    includeProcedure: true,
  },
  {
    aliases: [
      'defective products', 'defective product', 'defective goods', 'defect', 'defects',
      'खराब उत्पाद', 'खराब सामान', 'दोषपूर्ण उत्पाद',
    ],
    excludedSuggestionLabels: ['Defective Products'],
    excludedHindiLabels: ['खराब उत्पाद'],
    passageIds: [
      'cpa2019-sec2-10',
      'cpa2019-sec84-prod-liability',
      'cpa2019-sec86-seller-liability',
    ],
    intro:
      "Here is what I have on defective products. Try asking: 'Who is liable for a defective product?'",
    hiIntro:
      "खराब उत्पाद से जुड़े मुख्य प्रावधान नीचे दिए गए हैं। आप यह भी पूछ सकते हैं: 'खराब उत्पाद के लिए कौन उत्तरदायी होता है?'",
    includeProcedure: true,
  },
  {
    aliases: [
      'deficient services', 'deficient service', 'deficiency in service',
      'सेवा में कमी',
    ],
    excludedSuggestionLabels: ['Deficient Services'],
    excludedHindiLabels: ['सेवा में कमी'],
    passageIds: ['cpa2019-sec2-11', 'cpa2019-sec85-service-liability'],
    intro:
      "Here is what I have on deficient services. Try asking: 'What counts as deficiency in service?'",
    hiIntro:
      "सेवा में कमी से जुड़े मुख्य प्रावधान नीचे दिए गए हैं। आप यह भी पूछ सकते हैं: 'सेवा में कमी किसे माना जाता है?'",
    includeProcedure: true,
  },
  {
    aliases: [
      'online shopping issues', 'online shopping issue', 'online shopping',
      'ऑनलाइन खरीदारी की समस्याएँ', 'ऑनलाइन खरीदारी की समस्याएं', 'ऑनलाइन खरीदारी',
    ],
    excludedSuggestionLabels: ['Online Shopping Issues'],
    excludedHindiLabels: ['ऑनलाइन खरीदारी की समस्याएँ'],
    passageIds: [
      'ecom-rules-2020-rule4-duties',
      'ecom-rules-2020-rule6-cancellation',
      'nch-redressal-1915',
    ],
    intro:
      "Here is what I have on online shopping issues. Try asking: 'How many hours does an e-commerce platform have to acknowledge a grievance?'",
    hiIntro:
      "ऑनलाइन खरीदारी से जुड़े मुख्य नियम नीचे दिए गए हैं। आप यह भी पूछ सकते हैं: 'ई-कॉमर्स प्लेटफॉर्म को शिकायत की प्राप्ति कितने घंटे में स्वीकार करनी होती है?'",
    includeProcedure: true,
  },
  {
    aliases: ['product liability', 'उत्पाद दायित्व'],
    excludedSuggestionLabels: ['Product Liability'],
    excludedHindiLabels: ['उत्पाद दायित्व'],
    passageIds: [
      'cpa2019-sec84-prod-liability',
      'cpa2019-sec85-service-liability',
      'cpa2019-sec86-seller-liability',
    ],
    intro:
      "Here is what I have on product liability. Try asking: 'When is a product seller liable?'",
    hiIntro:
      "उत्पाद दायित्व से जुड़े मुख्य प्रावधान नीचे दिए गए हैं। आप यह भी पूछ सकते हैं: 'उत्पाद विक्रेता कब उत्तरदायी होता है?'",
    includeProcedure: true,
  },
  {
    aliases: [
      'misleading advertisements', 'misleading advertisement', 'misleading ads', 'misleading ad',
      'भ्रामक विज्ञापन', 'झूठा विज्ञापन',
    ],
    excludedSuggestionLabels: ['Misleading Advertisements'],
    excludedHindiLabels: ['भ्रामक विज्ञापन'],
    passageIds: ['cpa2019-sec2-28', 'cpa2019-sec21-ccpa-penalties'],
    intro:
      "Here is what I have on misleading advertisements. Try asking: 'Which authority can stop a misleading advertisement?'",
    hiIntro:
      "भ्रामक विज्ञापनों से जुड़े मुख्य प्रावधान नीचे दिए गए हैं। आप यह भी पूछ सकते हैं: 'भ्रामक विज्ञापन को रोकने का आदेश कौन-सा प्राधिकरण दे सकता है?'",
    includeProcedure: true,
  },
  {
    aliases: [
      'unfair trade practices', 'unfair trade practice',
      'अनुचित व्यापार प्रथाएँ', 'अनुचित व्यापार प्रथाएं', 'अनुचित व्यापार प्रथा',
    ],
    excludedSuggestionLabels: ['Unfair Trade Practices'],
    excludedHindiLabels: ['अनुचित व्यापार प्रथाएँ'],
    passageIds: ['cpa2019-sec2-47'],
    intro:
      "Here is what I have on unfair trade practices. Try asking: 'Is refusing to take back a defective product an unfair trade practice?'",
    hiIntro:
      "अनुचित व्यापार प्रथाओं से जुड़े मुख्य प्रावधान नीचे दिए गए हैं। आप यह भी पूछ सकते हैं: 'क्या खराब उत्पाद वापस लेने से इनकार करना अनुचित व्यापार प्रथा है?'",
    includeProcedure: true,
  },
  {
    aliases: [
      'complaint filing process', 'complaint filing', 'how to file a complaint',
      'शिकायत दर्ज करने की प्रक्रिया', 'शिकायत की प्रक्रिया', 'शिकायत कैसे दर्ज करें',
    ],
    excludedSuggestionLabels: ['Complaint Filing Process'],
    excludedHindiLabels: ['शिकायत दर्ज करने की प्रक्रिया'],
    passageIds: ['cpa2019-sec35-filing-complaint', 'edaakhil-process-overview', 'nch-redressal-1915'],
    intro:
      "Here is what I have on filing a complaint. Try asking: 'How do I file a consumer complaint online?'",
    hiIntro:
      "शिकायत दर्ज करने की प्रक्रिया से जुड़े मुख्य प्रावधान नीचे दिए गए हैं। आप यह भी पूछ सकते हैं: 'ऑनलाइन उपभोक्ता शिकायत कैसे दर्ज करें?'",
    includeProcedure: true,
  },
  {
    aliases: [
      'consumer commissions', 'consumer commission', 'commissions', 'commission',
      'उपभोक्ता आयोग', 'उपभोक्ता फोरम',
    ],
    excludedSuggestionLabels: ['Consumer Commissions'],
    excludedHindiLabels: ['उपभोक्ता आयोग'],
    passageIds: ['cpa2019-sec34-district-comm', 'cdrc-jurisdiction-limits-2021'],
    intro:
      "Here is what I have on Consumer Commissions. Try asking: 'Which Commission handles complaints up to Rs 50 lakh?'",
    hiIntro:
      "उपभोक्ता आयोगों से जुड़े मुख्य प्रावधान नीचे दिए गए हैं। आप यह भी पूछ सकते हैं: '50 लाख रुपये तक की शिकायत किस आयोग में दर्ज होती है?'",
    includeProcedure: true,
  },
  {
    aliases: [
      'complaint deadlines', 'complaint deadline', 'deadline', 'deadlines', 'time limit', 'time limits',
      'शिकायत की समय-सीमा', 'शिकायत की समय सीमा', 'समय सीमा', 'समय-सीमा',
    ],
    excludedSuggestionLabels: ['Complaint Deadlines'],
    excludedHindiLabels: ['शिकायत की समय-सीमा'],
    passageIds: ['cpa2019-sec69-limitation'],
    intro:
      "Here is what I have on complaint deadlines. Try asking: 'Can a complaint be accepted after two years?'",
    hiIntro:
      "शिकायत दर्ज करने की समय-सीमा से जुड़ा मुख्य प्रावधान नीचे दिया गया है। आप यह भी पूछ सकते हैं: 'क्या दो वर्ष के बाद भी शिकायत स्वीकार की जा सकती है?'",
    includeProcedure: true,
  },
  {
    aliases: [
      'consumer protection act', 'consumer protection act 2019', 'the act',
      'उपभोक्ता संरक्षण अधिनियम', 'उपभोक्ता संरक्षण अधिनियम 2019',
    ],
    excludedSuggestionLabels: ['Consumer Protection Act 2019'],
    excludedHindiLabels: ['उपभोक्ता संरक्षण अधिनियम 2019'],
    passageIds: [],
    intro:
      'I have passages from the Consumer Protection Act, 2019 on: definitions of defect, deficiency, misleading advertisement and unfair trade practice (Section 2); the powers of the Central Consumer Protection Authority (Section 21); where complaints are filed (Sections 34 and 35); the time limit for complaints (Section 69); and product liability (Sections 84 to 86). Pick one below or ask a question.',
    hiIntro:
      'मेरे पास उपभोक्ता संरक्षण अधिनियम, 2019 से दोष, सेवा में कमी, भ्रामक विज्ञापन, अनुचित व्यापार प्रथा, आयोगों के अधिकार क्षेत्र, शिकायत की समय-सीमा और उत्पाद दायित्व से जुड़े अंश हैं। नीचे किसी विषय को चुनें या अपना प्रश्न पूछें।',
    includeProcedure: true,
  },
  {
    aliases: [
      'e-commerce rules',
      'e commerce rules',
      'ecommerce rules',
      'consumer protection e-commerce rules',
      'consumer protection e commerce rules',
      'consumer protection ecommerce rules',
      'e-commerce rules 2020',
      'e commerce rules 2020',
      'ecommerce rules 2020',
      'consumer protection e-commerce rules 2020',
      'consumer protection e commerce rules 2020',
      'consumer protection ecommerce rules 2020',
      'ई-कॉमर्स नियम',
      'ई कॉमर्स नियम 2020',
      'ई कॉमर्स नियम',
    ],
    excludedSuggestionLabels: ['E-Commerce Rules 2020'],
    excludedHindiLabels: ['ई-कॉमर्स नियम 2020'],
    passageIds: [],
    intro:
      'I have passages from the Consumer Protection (E-Commerce) Rules, 2020 on the duties of e-commerce entities, grievance handling and cancellation charges. Pick one below or ask a question.',
    hiIntro:
      'मेरे पास उपभोक्ता संरक्षण (ई-कॉमर्स) नियम, 2020 से ई-कॉमर्स कंपनियों के कर्तव्य, शिकायत निवारण और रद्दीकरण शुल्क से जुड़े अंश हैं। नीचे किसी विषय को चुनें या अपना प्रश्न पूछें।',
    includeProcedure: true,
  },
  {
    aliases: [
      'consumer rights', 'consumer right', 'my rights', 'my right', 'consumer awareness', 'awareness',
      'उपभोक्ता अधिकार', 'मेरे अधिकार', 'उपभोक्ता जागरूकता',
    ],
    excludedSuggestionLabels: ['Consumer Rights', 'Consumer Awareness'],
    excludedHindiLabels: ['उपभोक्ता अधिकार', 'उपभोक्ता जागरूकता'],
    passageIds: [],
    intro:
      'I can explain what the Consumer Protection Act, 2019 and the E-Commerce Rules, 2020 say on these topics. Choose one below, or type your own question.',
    hiIntro:
      'मैं उपभोक्ता संरक्षण अधिनियम, 2019 और ई-कॉमर्स नियम, 2020 के आधार पर नीचे दिए गए विषयों की जानकारी दे सकता हूँ। किसी विषय को चुनें या अपना प्रश्न लिखें।',
    includeProcedure: false,
  },
];

const TOPIC_LEADING_FILLERS = [
  'tell me more about',
  'tell me about',
  'information on',
  'info on',
  'what are',
  'what is',
  'explain',
  'about',
];

const TOPIC_TRAILING_FILLERS_HI = [
  'के बारे में बताएं',
  'के बारे में बताइए',
  'के बारे में जानकारी',
  'के बारे में',
  'क्या होते हैं',
  'क्या होता है',
  'क्या हैं',
  'क्या है',
  'समझाएं',
  'समझाइए',
  'बताएं',
  'बताइए',
];

function singularizeTokenSimple(token: string): string {
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) {
    return token.slice(0, -1);
  }
  return token;
}

export function normalizeTopicInput(input: string): string {
  let normalized = input
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let stripped = true;
  while (stripped) {
    stripped = false;
    for (const prefix of TOPIC_LEADING_FILLERS) {
      if (normalized.startsWith(`${prefix} `)) {
        normalized = normalized.slice(prefix.length).trim();
        stripped = true;
        break;
      }
    }
    for (const suffix of TOPIC_TRAILING_FILLERS_HI) {
      if (normalized.endsWith(` ${suffix}`)) {
        normalized = normalized.slice(0, -suffix.length).trim();
        stripped = true;
        break;
      }
    }
  }

  return normalized;
}

function toTopicLookupKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TOPIC_ALIAS_MAP: Map<string, TopicDefinition> = (() => {
  const map = new Map<string, TopicDefinition>();
  for (const def of TOPIC_DEFINITIONS) {
    for (const alias of def.aliases) {
      const key = toTopicLookupKey(alias);
      map.set(key, def);
      const singularKey = key
        .split(' ')
        .map(singularizeTokenSimple)
        .join(' ');
      if (!map.has(singularKey)) {
        map.set(singularKey, def);
      }
    }
  }
  return map;
})();

function getOtherTopicSuggestions(def: TopicDefinition, lang: ChatLanguage): string[] {
  if (lang === 'hi') {
    const excluded = new Set(def.excludedHindiLabels);
    return HINDI_TOPICS.filter((topic) => !excluded.has(topic)).slice(0, 6);
  }
  const excluded = new Set(def.excludedSuggestionLabels);
  return ALL_TOPICS.filter((topic) => !excluded.has(topic)).slice(0, 6);
}

export function matchTopic(
  input: string,
  passages: Passage[],
  lang: ChatLanguage = 'en',
): ChatApiResponse | null {
  const normalized = normalizeTopicInput(input);
  if (!normalized) return null;

  const candidates = [normalized];
  if (normalized !== 'the act') {
    if (normalized.startsWith('the ')) {
      candidates.push(normalized.slice(4).trim());
    } else if (normalized.startsWith('a ')) {
      candidates.push(normalized.slice(2).trim());
    } else if (normalized.startsWith('an ')) {
      candidates.push(normalized.slice(3).trim());
    }
  }

  let matchedDef: TopicDefinition | undefined;
  for (const candidate of candidates) {
    matchedDef = TOPIC_ALIAS_MAP.get(candidate);
    if (matchedDef) break;

    const singularCandidate = candidate
      .split(' ')
      .map(singularizeTokenSimple)
      .join(' ');
    matchedDef = TOPIC_ALIAS_MAP.get(singularCandidate);
    if (matchedDef) break;
  }

  if (!matchedDef) {
    return null;
  }

  const passageById = new Map(passages.map((p) => [p.id, p]));
  const citations: ChatCitation[] = matchedDef.passageIds
    .map((id) => passageById.get(id))
    .filter((p): p is Passage => Boolean(p))
    .map((p) => toCitation(p));

  return {
    type: 'answer',
    answer: lang === 'hi' ? matchedDef.hiIntro : matchedDef.intro,
    citations,
    procedure: matchedDef.includeProcedure ? buildProcedureSteps(input.trim(), lang) : [],
    disclaimer: getDisclaimerForLang(lang),
    suggestions: getOtherTopicSuggestions(matchedDef, lang),
    lang,
  };
}
