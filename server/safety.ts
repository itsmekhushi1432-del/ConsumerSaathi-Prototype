// Enforces prompt-injection, personal-dispute, out-of-scope, section-bounds, off-topic, and citation verification rules.
import type { Passage } from '../src/knowledgeBase.ts';
import type { ChatApiResponse, ChatLanguage } from '../src/chat/types.ts';
import type { ModelAnswerPayload } from './gemini.ts';
import { buildProcedureSteps } from './procedure.ts';
import {
  convertDevanagariDigitsToAscii,
  correctQueryTypos,
  scorePassagesForQuery,
  toCitation,
} from './retrieval.ts';
import {
  ALL_TOPICS,
  CLOSEST_PASSAGES_INTRO,
  CLOSEST_PASSAGES_INTRO_HI,
  HINDI_TOPICS,
  INJECTION_REFUSAL_EN,
  INJECTION_REFUSAL_HI,
  NOT_FOUND_MESSAGE,
  NOT_FOUND_MESSAGE_HI,
  OFF_TOPIC_MESSAGE,
  OFF_TOPIC_MESSAGE_HI,
  OUT_OF_SCOPE_MESSAGE_HI,
  getDisclaimerForLang,
} from './strings.ts';

export const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/i,
  /disregard\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/i,
  /(?:show|reveal|print|display|repeat|tell\s+me)\s+(?:your\s+)?system\s+prompt/i,
  /\byou\s+are\s+now\b/i,
  /\bdeveloper\s+mode\b/i,
  /\bdelete\s+(?:the\s+)?database\b/i,
  /\bdrop\s+table\b/i,
  /(?:पिछले|सभी|ऊपर\s+के)\s*(?:निर्देश|निर्देशों)\s*(?:को\s*)?(?:अनदेखा|नजरअंदाज|नज़रअंदाज़|भूल|छोड़)/u,
  /(?:सिस्टम\s*प्रॉम्प्ट|system\s*prompt)\s*(?:दिखाओ|दिखाइए|बताओ|बताइए)/iu,
  /(?:डेटाबेस|database)\s*(?:डिलीट|हटाओ|मिटाओ)/iu,
  /\bpichhle\s+nirdesh\s+(?:bhool|ignore|anadekha)\b/i,
  /\bsystem\s+prompt\s+(?:dikhao|batao)\b/i,
  /\bab\s+tum\s+(?:ek\s+)?(?:naye|unrestricted|hacker)/i,
];

export const PERSONAL_DISPUTE_PATTERNS: RegExp[] = [
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
  /(?:क्या\s+मैं|मैं\s+केस)\s*(?:जीतूंगा|जीतूँगा|जीत\s+सकता|जीत\s+जाऊंगा|जीत\s+जाऊँगा)/u,
  /(?:मेरे\s+)?जीतने\s+की\s+संभावना/u,
  /(?:मेरे|मेरा)\s+(?:विशिष्ट\s+)?(?:मामले|केस|विवाद)\s*(?:में\s+क्या\s+होगा|का\s+नतीजा|का\s+परिणाम|की\s+सुनवाई)/u,
  /कल\s+(?:मेरी\s+)?सुनवाई\s+है/u,
  /(?:क्या\s+मुझे|मुझे)\s+(?:मुकदमा|केस)\s+(?:करना\s+चाहिए|लड़ना\s+चाहिए)/u,
  /(?:एफिडेविट|हलफनामा|हलफ़नामा|याचिका|लीगल\s*नोटिस|कानूनी\s*नोटिस)\s*(?:लिखो|लिखें|लिख\s+दें|बनाओ|बनाएं|तैयार\s+करें|तैयार\s+करो)/u,
  /(?:लगा|लगाकर|कर|के)\s+(?:मुझे|मेरे\s+साथ)\s+(?:धोखा|ठगी)\s+(?:हुआ|किया|दी)/u,
  /(?:मुझसे|मेरे\s+साथ)\s+(?:धोखाधड़ी|ठगी)\s+(?:की|हुई)/u,
  /(?:मैंने|हमने)\s+.{0,60}(?:खरीदा|मंगवाया|ऑर्डर\s+किया|बुक\s+किया).{0,60}(?:मना\s+कर\s+दिया|इनकार\s+कर\s+दिया|वापस\s+नहीं\s+कर\s+रहा|खराब\s+निकला|टूटा\s+निकला)/u,
  /(?:मेरा|मेरे)\s+(?:विक्रेता|दुकानदार|डीलर|कंपनी)\s+.{0,50}(?:रिफंड|पैसे\s+वापस)\s*(?:देने\s+से\s+)?(?:मना|इनकार)/u,
  /\b(?:kya\s+main\s+(?:case\s+)?jeetunga|mere\s+jeetne\s+ke\s+chances|mera\s+(?:case|dispute)|seller\s+ne\s+refund\s+(?:dene\s+se\s+)?mana|mujhe\s+dhokha\s+diya)\b/i,
];

const UPSET_OR_HARM_WORDS_EN =
  /\b(?:cheated|fraud|defrauded|scammed|scam|angry|upset|frustrated|harassed|harassment|lost\s+(?:my\s+)?money|help\s+me)\b/i;

const UPSET_PERSONAL_MARKER_EN = /\b(?:i|me|my|we|us|our|mine)\b|\bhelp\s+me\b/i;

const UPSET_OR_HARM_WORDS_HI =
  /(?:^|[^\p{L}])(?:धोखा|ठगी|धोखाधड़ी|परेशान|गुस्सा|नाराज|नाराज़|उदास|तंग|उत्पीड़न|पैसे\s+डूब|पैसे\s+खो|मदद\s+करो|बचाओ)(?=[^\p{L}]|$)/iu;

const UPSET_PERSONAL_MARKER_HI =
  /(?:^|[^\p{L}])(?:मैं|मुझे|मेरा|मेरी|मेरे|हमने|मैंने|हमारी|मदद\s+करो|बचाओ)(?=[^\p{L}]|$)/iu;

export function hasUpsetOrHarmSituation(input: string): boolean {
  const enMatch = UPSET_PERSONAL_MARKER_EN.test(input) && UPSET_OR_HARM_WORDS_EN.test(input);
  const hiMatch = UPSET_PERSONAL_MARKER_HI.test(input) && UPSET_OR_HARM_WORDS_HI.test(input);
  return enMatch || hiMatch;
}

export interface OutOfScopeRule {
  pattern: RegExp;
  area: string;
  guidance: string;
}

export const OUT_OF_SCOPE_RULES: OutOfScopeRule[] = [
  {
    pattern:
      /\b(?:divorce|alimony|matrimonial|child\s+custody|judicial\s+separation|maintenance\s+under\s+125)\b/i,
    area: 'divorce and family law',
    guidance: 'a Family Court or a qualified family law advocate',
  },
  {
    pattern:
      /\b(?:bail|anticipatory\s+bail|criminal\s+law|criminal\s+case|fir|arrest|murder|theft|robbery|assault|chargesheet|ipc|bns|crpc|bnss|jail|remand)\b/i,
    area: 'criminal law or bail',
    guidance:
      'a Criminal Court, the nearest police station (for reporting an offence), or a criminal law advocate',
  },
  {
    pattern:
      /\b(?:income\s+tax|itr|tax\s+return|tds|capital\s+gains|income\s+tax\s+department|tax\s+assessment|tax\s+evasion)\b/i,
    area: 'income tax',
    guidance:
      'the Income Tax Department (incometax.gov.in), a Chartered Accountant, or a tax advocate',
  },
  {
    pattern:
      /\b(?:property\s+partition|partition\s+suit|ancestral\s+property|land\s+partition|coparcener|title\s+dispute|mutation\s+of\s+land)\b/i,
    area: 'property partition',
    guidance: 'a Civil Court or a qualified civil/property law advocate',
  },
  {
    pattern:
      /(?:^|[^\p{L}])(?:तलाक|तलाक़|गुजारा\s*भत्ता|भरण-पोषण|भरण\s*पोषण|पारिवारिक\s+न्यायालय)(?=[^\p{L}]|$)|\b(?:talaq|talaaq|gujara\s+bhatta)\b/iu,
    area: 'divorce and family law',
    guidance: 'a Family Court or a qualified family law advocate',
  },
  {
    pattern:
      /(?:^|[^\p{L}])(?:जमानत|ज़मानत|अग्रिम\s*जमानत|एफआईआर|हत्या|चोरी|डकैती|गिरफ्तारी|गिरफ़्तारी|आपराधिक\s+मामला|फौजदारी)(?=[^\p{L}]|$)|\b(?:jamanat|zamanat)\b/iu,
    area: 'criminal law or bail',
    guidance:
      'a Criminal Court, the nearest police station (for reporting an offence), or a criminal law advocate',
  },
  {
    pattern:
      /(?:^|[^\p{L}])(?:आयकर|जीएसटी|इनकम\s*टैक्स|टैक्स\s*रिटर्न|टीडीएस)(?=[^\p{L}]|$)|\b(?:gst|incometax)\b/iu,
    area: 'income tax',
    guidance:
      'the Income Tax Department (incometax.gov.in), a Chartered Accountant, or a tax advocate',
  },
  {
    pattern:
      /(?:^|[^\p{L}])(?:संपत्ति\s*(?:का\s*)?(?:बँटवारा|बंटवारा)|पैतृक\s*संपत्ति|ज़मीन\s*बंटवारा|जमीन\s*बंटवारा)(?=[^\p{L}]|$)/iu,
    area: 'property partition',
    guidance: 'a Civil Court or a qualified civil/property law advocate',
  },
];

export function findOutOfScopeRule(text: string): OutOfScopeRule | null {
  for (const rule of OUT_OF_SCOPE_RULES) {
    if (rule.pattern.test(text)) {
      return rule;
    }
  }
  return null;
}

const CONSUMER_LAW_CONTEXT_PATTERN =
  /\b(?:consumer|cpa|e-commerce|ecommerce|refund|defect|defects|defective|deficiency|warranty|guarantee|seller|buyer|merchant|vendor|shop|shopkeeper|product\s+liability|misleading\s+advertisement|grievance|helpline|1915|e-daakhil|edaakhil|commission|ncdrc|scdrc|dcdrc|ccpa|pecuniary|limitation\s+period|cancellation\s+fee|cancellation\s+charge|pre-ticked|unfair\s+trade|unfair\s+contract|section\s+\d+|rule\s+\d+)\b/i;

const CONSUMER_LAW_CONTEXT_PATTERN_HI =
  /(?:^|[^\p{L}])(?:उपभोक्ता|ई-कॉमर्स|रिफंड|वापसी|खराब|दोषपूर्ण|सेवा\s+में\s+कमी|शिकायत|आयोग|हेल्पलाइन|1915|ई-दाखिल|उत्पाद\s+दायित्व|भ्रामक\s+विज्ञापन|अनुचित\s+व्यापार|धारा|नियम)(?=[^\p{L}]|$)/iu;

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
  /(?:^|[^\p{L}])(?:चुटकुला|जोक|कविता|कहानी\s+सुनाओ|गाना\s+गाओ|मौसम|क्रिकेट\s+मैच|रेसिपी|राजनीति|चुनाव)(?=[^\p{L}]|$)/iu,
];

export function isOffTopicRequest(input: string): boolean {
  if (CONSUMER_LAW_CONTEXT_PATTERN.test(input) || CONSUMER_LAW_CONTEXT_PATTERN_HI.test(input)) {
    return false;
  }
  return OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(input));
}

export function isUnclearMessage(trimmed: string): boolean {
  return (
    /^(?:i\s+don'?t\s+understand|not\s+clear|it\s+is\s+not\s+clear|what\s+do\s+you\s+mean|explain\s+again|didn'?t\s+get\s+it)[.?!\s]*$/i.test(
      trimmed,
    ) ||
    /^(?:समझ\s+नहीं\s+आया|समझ\s+में\s+नहीं\s+आया|साफ\s+नहीं\s+है|स्पष्ट\s+नहीं\s+है|क्या\s+मतलब\s+है|फिर\s+से\s+समझाएं|समझ\s+नहीं\s+पाया)[.?!।\s]*$/u.test(
      trimmed,
    )
  );
}

export function countLetters(input: string): number {
  const letters = input.match(/\p{L}/gu);
  return letters ? letters.length : 0;
}

export function checkSectionReference(
  question: string,
  passages: Passage[],
  lang: ChatLanguage = 'en',
): { notFoundMessage: string } | null {
  const normalized = convertDevanagariDigitsToAscii(question);
  const match =
    normalized.match(/\b(?:section|sec\.?)\s+(\d+)(?:\s*\(\s*(\d+)\s*\))?/i) ??
    normalized.match(/(?:^|[^\p{L}])धारा\s+(\d+)(?:\s*\(\s*(\d+)\s*\))?/iu);
  if (!match) {
    return null;
  }

  const sectionNum = Number(match[1]);
  const subSection = match[2];

  if (sectionNum > 107) {
    return {
      notFoundMessage:
        lang === 'hi'
          ? `उपभोक्ता संरक्षण अधिनियम, 2019 में धारा ${sectionNum} नहीं है। इस अधिनियम में धारा 1 से 107 तक हैं।`
          : `There is no Section ${sectionNum} in the Consumer Protection Act, 2019; the Act has sections 1 to 107.`,
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
    const hiLabel = subSection ? `${sectionNum}(${subSection})` : `${sectionNum}`;
    return {
      notFoundMessage:
        lang === 'hi'
          ? `धारा ${hiLabel} मेरे पास उपलब्ध अंशों में नहीं है, इसलिए मैं उसे उद्धृत नहीं कर सकता।`
          : `${label} is not indexed in the documents I cover, so I cannot provide its text.`,
    };
  }

  return null;
}

export function extractLegalReferences(text: string): Set<string> {
  const refs = new Set<string>();
  const normalizedText = convertDevanagariDigitsToAscii(text);

  const sectionGroups = normalizedText.matchAll(
    /\b(?:Sections?|Sec\.?)\s+(\d+(?:\s*\(\s*\d+\s*\))?(?:\s*(?:,|and|&)\s*\d+(?:\s*\(\s*\d+\s*\))?)*)/gi,
  );
  for (const match of sectionGroups) {
    const groupText = match[1];
    const items = groupText.matchAll(/(\d+)(?:\s*\(\s*(\d+)\s*\))?/g);
    for (const item of items) {
      const base = item[1];
      const sub = item[2];
      refs.add(sub ? `section:${base}(${sub})` : `section:${base}`);
    }
  }

  const hindiSectionGroups = normalizedText.matchAll(
    /(?:^|[^\p{L}])धारा(?:ओं)?\s+(\d+(?:\s*\(\s*\d+\s*\))?(?:\s*(?:,|और|व|एवं|तथा|and|&)\s*\d+(?:\s*\(\s*\d+\s*\))?)*)/giu,
  );
  for (const match of hindiSectionGroups) {
    const groupText = match[1];
    const items = groupText.matchAll(/(\d+)(?:\s*\(\s*(\d+)\s*\))?/g);
    for (const item of items) {
      const base = item[1];
      const sub = item[2];
      refs.add(sub ? `section:${base}(${sub})` : `section:${base}`);
    }
  }

  const ruleGroups = normalizedText.matchAll(
    /\bRules?\s+(\d+(?:\s*\(\s*\d+\s*\))?(?:\s*(?:,|and|&)\s*\d+(?:\s*\(\s*\d+\s*\))?)*)/gi,
  );
  for (const match of ruleGroups) {
    const groupText = match[1];
    const items = groupText.matchAll(/(\d+)(?:\s*\(\s*(\d+)\s*\))?/g);
    for (const item of items) {
      const base = item[1];
      const sub = item[2];
      refs.add(sub ? `rule:${base}(${sub})` : `rule:${base}`);
    }
  }

  const hindiRuleGroups = normalizedText.matchAll(
    /(?:^|[^\p{L}])नियम(?:ों)?\s+(\d+(?:\s*\(\s*\d+\s*\))?(?:\s*(?:,|और|व|एवं|तथा|and|&)\s*\d+(?:\s*\(\s*\d+\s*\))?)*)/giu,
  );
  for (const match of hindiRuleGroups) {
    const groupText = match[1];
    const items = groupText.matchAll(/(\d+)(?:\s*\(\s*(\d+)\s*\))?/g);
    for (const item of items) {
      const base = item[1];
      const sub = item[2];
      refs.add(sub ? `rule:${base}(${sub})` : `rule:${base}`);
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
      const parenIdx = ref.indexOf('(');
      if (parenIdx !== -1) {
        allowedRefs.add(ref.slice(0, parenIdx));
      }
    }
  }

  const mentionedRefs = extractLegalReferences(convertDevanagariDigitsToAscii(answer));
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

export function buildInjectionRefusalResponse(lang: ChatLanguage): ChatApiResponse {
  return {
    type: 'refusal',
    answer: lang === 'hi' ? INJECTION_REFUSAL_HI : INJECTION_REFUSAL_EN,
    citations: [],
    procedure: [],
    disclaimer: getDisclaimerForLang(lang),
    lang,
  };
}

export function buildPersonalDisputeResponse(
  lookupQuestion: string,
  originalQuestion: string,
  passages: Passage[],
  lang: ChatLanguage = 'en',
  isUpset = false,
): ChatApiResponse {
  let bestMatch: Passage[] = [];
  try {
    const corrected = correctQueryTypos(lookupQuestion, passages);
    const { normal, closest } = scorePassagesForQuery(corrected, passages);
    const chosen = normal.length > 0 ? normal : closest;
    bestMatch = chosen.length > 0 ? [chosen[0].passage] : [];
  } catch {
    bestMatch = [];
  }

  const citations = bestMatch.map((p) => toCitation(p));
  const procedure = buildProcedureSteps(`${originalQuestion} ${lookupQuestion}`, lang);

  let answer: string;
  if (lang === 'hi') {
    if (isUpset) {
      answer =
        bestMatch.length > 0
          ? `मुझे खेद है कि आपको इस स्थिति का सामना करना पड़ रहा है। मैं आपके विशेष विवाद का विश्लेषण नहीं कर सकता और यह नहीं बता सकता कि परिणाम क्या होगा। सामान्य जानकारी के लिए नीचे उपभोक्ता संरक्षण अधिनियम, 2019 की ${bestMatch[0].section} देखें। अपनी स्थिति के लिए कृपया किसी अधिवक्ता से सलाह लें, या राष्ट्रीय उपभोक्ता हेल्पलाइन 1915 पर कॉल करें।`
          : 'मुझे खेद है कि आपको इस स्थिति का सामना करना पड़ रहा है। मैं आपके विशेष विवाद का विश्लेषण नहीं कर सकता और यह नहीं बता सकता कि परिणाम क्या होगा। अपनी स्थिति के लिए कृपया किसी अधिवक्ता से सलाह लें, या राष्ट्रीय उपभोक्ता हेल्पलाइन 1915 पर कॉल करें।';
    } else {
      answer =
        bestMatch.length > 0
          ? `मैं आपके विशेष विवाद का विश्लेषण नहीं कर सकता और यह नहीं बता सकता कि परिणाम क्या होगा। सामान्य जानकारी के लिए नीचे उपभोक्ता संरक्षण अधिनियम, 2019 की ${bestMatch[0].section} देखें। अपनी स्थिति के लिए कृपया किसी अधिवक्ता से सलाह लें।`
          : 'मैं आपके विशेष विवाद का विश्लेषण नहीं कर सकता और यह नहीं बता सकता कि परिणाम क्या होगा। अपनी स्थिति के लिए कृपया किसी अधिवक्ता से सलाह लें।';
    }
  } else if (isUpset) {
    answer =
      bestMatch.length > 0
        ? `I'm sorry you're dealing with this. I cannot analyse your specific dispute or predict the result. In general, see ${bestMatch[0].document}, ${bestMatch[0].section} below. Please consult an advocate for your own situation, or call the National Consumer Helpline at 1915.`
        : "I'm sorry you're dealing with this. I cannot analyse your specific dispute or predict the result. Please consult an advocate for your own situation, or call the National Consumer Helpline at 1915.";
  } else {
    answer =
      bestMatch.length > 0
        ? `I cannot analyse your specific dispute or predict the result. In general, see ${bestMatch[0].document}, ${bestMatch[0].section} below. Please consult an advocate for your own situation.`
        : 'I cannot analyse your specific dispute or predict the result, and there is no matching passage in the documents I cover. Please consult an advocate for your own situation.';
  }

  return {
    type: 'refusal',
    answer,
    citations,
    procedure,
    disclaimer: getDisclaimerForLang(lang),
    lang,
  };
}

export function buildOutOfScopeResponse(
  rule: OutOfScopeRule,
  lang: ChatLanguage,
): ChatApiResponse {
  return {
    type: 'out_of_scope',
    answer:
      lang === 'hi'
        ? OUT_OF_SCOPE_MESSAGE_HI
        : `Questions about ${rule.area} are outside the Consumer Protection Act, 2019 and its rules, which are the only documents I cover. For help with ${rule.area}, please consult ${rule.guidance}. If your question is about a purchase or a service you paid for, ask it in that way and I'll look at the Consumer Protection Act.`,
    citations: [],
    procedure: [],
    disclaimer: getDisclaimerForLang(lang),
    lang,
  };
}

export function buildClosestPassagesResponse(
  passages: Passage[],
  procedureSourceText: string,
  lang: ChatLanguage,
): ChatApiResponse {
  return {
    type: 'answer',
    answer: lang === 'hi' ? CLOSEST_PASSAGES_INTRO_HI : CLOSEST_PASSAGES_INTRO,
    citations: passages.slice(0, 2).map((p) => toCitation(p, true)),
    procedure: buildProcedureSteps(procedureSourceText, lang),
    disclaimer: getDisclaimerForLang(lang),
    lang,
    isClosestMatch: true,
  };
}

export function buildFriendlyGuidanceResponse(
  lang: ChatLanguage = 'en',
  answer?: string,
): ChatApiResponse {
  const defaultAnswer = lang === 'hi' ? NOT_FOUND_MESSAGE_HI : NOT_FOUND_MESSAGE;
  return {
    type: 'not_found',
    answer: answer ?? defaultAnswer,
    citations: [],
    procedure: [],
    disclaimer: getDisclaimerForLang(lang),
    suggestions: (lang === 'hi' ? HINDI_TOPICS : ALL_TOPICS).slice(0, 6),
    lang,
  };
}

export function getOffTopicGuidanceText(lang: ChatLanguage): string {
  return lang === 'hi' ? OFF_TOPIC_MESSAGE_HI : OFF_TOPIC_MESSAGE;
}
