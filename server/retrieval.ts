// Handles query normalization, Hindi word mapping, typo correction, follow-up detection, and passage scoring.
import { createHash } from 'node:crypto';
import type { Passage } from '../src/knowledgeBase.ts';
import type { ChatApiResponse, ChatCitation, ChatLanguage } from '../src/chat/types.ts';
import { containsDevanagari } from '../src/chat/chatLogic.ts';
import { ALL_TOPICS } from './strings.ts';

export const MIN_RETRIEVAL_SCORE = 2.8;
export const CLOSEST_MIN_SCORE = 0.4 * MIN_RETRIEVAL_SCORE;

export function resolveReplyLanguage(
  message: string,
  requestedLang: ChatLanguage = 'en',
): ChatLanguage {
  if (requestedLang === 'hi' || containsDevanagari(message)) {
    return 'hi';
  }
  return 'en';
}

export function convertDevanagariDigitsToAscii(text: string): string {
  return text.replace(/[\u0966-\u096F]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x0966 + 48),
  );
}

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

const HINGLISH_FILLER_WORDS = new Set([
  'kya', 'hai', 'hain', 'ho', 'ki', 'ka', 'ke', 'ko', 'se', 'mein',
  'aur', 'ya', 'kar', 'karna', 'karne', 'karen', 'kaise', 'kab', 'kahan',
  'kitna', 'kitne', 'kitni', 'kaun', 'koi', 'bhi', 'toh', 'agar', 'yadi',
  'liye', 'baare', 'sakta', 'sakti', 'sakte', 'chahiye', 'hota', 'hoti',
  'hote', 'mera', 'meri', 'mere', 'apna', 'apni', 'aap', 'maine', 'humne',
  'yeh', 'ye', 'woh', 'wo', 'kis', 'kisi', 'mujhe', 'hume', 'kehte', 'kehti',
  'hoga', 'hogi', 'honge',
]);

const SYNONYM_GROUPS: string[][] = [
  ['refund', 'return', 'cancellation', 'cancel'],
  ['court', 'commission'],
  ['deadline', 'limitation'],
  ['fees', 'fee', 'charges', 'charge'],
  ['lawyer', 'advocate'],
];

const HINDI_TO_ENGLISH_ENTRIES: Array<[string, string]> = [
  ['अनुचित व्यापार प्रथाएँ', 'unfair trade practice'],
  ['अनुचित व्यापार प्रथाएं', 'unfair trade practice'],
  ['अनुचित व्यापार प्रथा', 'unfair trade practice'],
  ['भ्रामक विज्ञापन', 'misleading advertisement'],
  ['झूठा विज्ञापन', 'misleading advertisement'],
  ['रद्दीकरण शुल्क', 'cancellation charges'],
  ['उत्पाद दायित्व', 'product liability'],
  ['सेवा में कमी', 'deficiency in service'],
  ['पैसे वापस', 'refund return'],
  ['समय सीमा', 'time limit limitation'],
  ['समय-सीमा', 'time limit limitation'],
  ['कितने दिन', 'time limit limitation'],
  ['कब तक', 'time limit limitation'],
  ['ई-कॉमर्स', 'online e-commerce'],
  ['ई-दाखिल', 'e-daakhil'],
  ['कैंसिलेशन', 'cancellation charges'],
  ['अधिवक्ता', 'advocate'],
  ['हेल्पलाइन', 'helpline 1915'],
  ['दोषपूर्ण', 'defective'],
  ['उपभोक्ताओं', 'consumer'],
  ['उपभोक्ता', 'consumer'],
  ['विक्रेताओं', 'seller'],
  ['विक्रेता', 'seller'],
  ['शिकायतों', 'complaint'],
  ['शिकायतें', 'complaint'],
  ['शिकायत', 'complaint'],
  ['अधिकारों', 'rights'],
  ['अधिकार', 'rights'],
  ['धाराओं', 'section'],
  ['धारा', 'section'],
  ['नियमों', 'rule'],
  ['नियम', 'rule'],
  ['आयोगों', 'commission'],
  ['आयोग', 'commission'],
  ['ऑनलाइन', 'online e-commerce'],
  ['खरीदारी', 'purchase'],
  ['जुर्माना', 'penalty'],
  ['ख़राब', 'defective'],
  ['खराब', 'defective'],
  ['रिफंड', 'refund return'],
  ['वापसी', 'refund return'],
  ['वकील', 'advocate'],
  ['फोरम', 'commission'],
  ['कोर्ट', 'commission'],
  ['रद्द', 'cancellation charges'],
  ['दंड', 'penalty'],
];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function mapHindiWordsToEnglish(input: string): string {
  let result = convertDevanagariDigitsToAscii(input);
  for (const [hiTerm, enTerm] of HINDI_TO_ENGLISH_ENTRIES) {
    const pattern = new RegExp(`(?<=^|[^\\p{L}])${escapeRegExp(hiTerm)}(?=[^\\p{L}]|$)`, 'gu');
    result = result.replace(pattern, ` ${enTerm} `);
  }
  return result.replace(/\s+/g, ' ').trim();
}

export function prepareFallbackLookupQuery(trimmed: string, replyLang: ChatLanguage): string {
  const asciiDigits = convertDevanagariDigitsToAscii(trimmed);
  if (replyLang === 'hi' || containsDevanagari(asciiDigits)) {
    return mapHindiWordsToEnglish(asciiDigits);
  }
  return asciiDigits;
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
  const lower = convertDevanagariDigitsToAscii(input).toLowerCase();
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
  const hinglishCount = rawTokens.filter((t) => HINGLISH_FILLER_WORDS.has(t)).length;
  const stripHinglish = hinglishCount >= 2;
  const stems: string[] = [];
  for (const token of rawTokens) {
    if (FILLER_WORDS.has(token)) continue;
    if (stripHinglish && HINGLISH_FILLER_WORDS.has(token)) continue;
    const stemmed = stemWord(token);
    if (!stemmed || FILLER_WORDS.has(stemmed)) continue;
    if (stripHinglish && HINGLISH_FILLER_WORDS.has(stemmed)) continue;
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
    });
  }

  return { entries, df };
}

function computeIdf(dfCount: number, totalDocs: number): number {
  return Math.max(0.15, Math.log((totalDocs + 1) / (dfCount + 0.5)));
}

function levenshteinDistance(a: string, b: string, maxLimit: number): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > maxLimit) return maxLimit + 1;

  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j += 1) {
    prev[j] = j;
  }

  for (let i = 1; i <= m; i += 1) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxLimit) {
      return maxLimit + 1;
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[n];
}

function buildTypoVocabulary(passages: Passage[]): {
  allWords: string[];
  topicWords: Set<string>;
  exactSet: Set<string>;
} {
  const exactSet = new Set<string>();
  const topicWords = new Set<string>();

  const collectWords = (text: string, intoTopic = false) => {
    const matches = text.toLowerCase().match(/[a-z]+/g);
    if (!matches) return;
    for (const word of matches) {
      if (word.length >= 4) {
        exactSet.add(word);
        if (intoTopic) {
          topicWords.add(word);
        }
      }
    }
  };

  for (const topic of ALL_TOPICS) {
    collectWords(topic, true);
  }
  for (const passage of passages) {
    collectWords(passage.document);
    collectWords(passage.section);
    for (const kw of passage.keywords) {
      collectWords(kw, true);
    }
    collectWords(passage.text);
  }

  return {
    allWords: Array.from(exactSet),
    topicWords,
    exactSet,
  };
}

export function correctQueryTypos(query: string, passages: Passage[]): string {
  const vocab = buildTypoVocabulary(passages);

  return query.replace(/\b[a-zA-Z]+\b/g, (rawWord) => {
    const lower = rawWord.toLowerCase();
    if (lower.length < 5) {
      return rawWord;
    }
    if (
      lower === 'section' ||
      lower === 'sections' ||
      lower === 'sec' ||
      lower === 'rule' ||
      lower === 'rules'
    ) {
      return rawWord;
    }
    if (
      vocab.exactSet.has(lower) ||
      FILLER_WORDS.has(lower) ||
      HINGLISH_FILLER_WORDS.has(lower)
    ) {
      return rawWord;
    }

    const maxEdits = lower.length >= 8 ? 2 : 1;
    let bestCandidate: string | null = null;
    let bestDist = maxEdits + 1;
    let bestSameFirst = false;
    let bestLenDiff = Number.MAX_SAFE_INTEGER;
    let bestIsTopic = false;

    for (const candidate of vocab.allWords) {
      if (candidate.length < 4) continue;
      if (Math.abs(candidate.length - lower.length) > maxEdits) continue;

      const dist = levenshteinDistance(lower, candidate, maxEdits);
      if (dist > maxEdits) continue;

      const sameFirst = candidate[0] === lower[0];
      const lenDiff = Math.abs(candidate.length - lower.length);
      const isTopic = vocab.topicWords.has(candidate);

      if (
        dist < bestDist ||
        (dist === bestDist && sameFirst && !bestSameFirst) ||
        (dist === bestDist && sameFirst === bestSameFirst && lenDiff < bestLenDiff) ||
        (dist === bestDist &&
          sameFirst === bestSameFirst &&
          lenDiff === bestLenDiff &&
          isTopic &&
          !bestIsTopic)
      ) {
        bestCandidate = candidate;
        bestDist = dist;
        bestSameFirst = sameFirst;
        bestLenDiff = lenDiff;
        bestIsTopic = isTopic;
      }
    }

    return bestCandidate ?? rawWord;
  });
}

export interface ScoredRetrievalResult {
  normal: Array<{ passage: Passage; score: number }>;
  closest: Array<{ passage: Passage; score: number }>;
}

export function scorePassagesForQuery(question: string, passages: Passage[]): ScoredRetrievalResult {
  const meaningfulStems = Array.from(new Set(extractMeaningfulStems(question)));
  if (meaningfulStems.length < 2) {
    return { normal: [], closest: [] };
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
    return { normal: [], closest: [] };
  }

  const normal: Array<{ passage: Passage; score: number }> = [];
  const closest: Array<{ passage: Passage; score: number }> = [];

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

    if (score > CLOSEST_MIN_SCORE) {
      closest.push({ passage: entry.passage, score });
    }

    if (matchedOriginalCount === 1 && !strongSingleMatch) continue;

    if (score >= MIN_RETRIEVAL_SCORE) {
      normal.push({ passage: entry.passage, score });
    }
  }

  normal.sort((a, b) => b.score - a.score);
  closest.sort((a, b) => b.score - a.score);

  const normalTop =
    normal.length > 0
      ? normal.filter((item) => item.score >= 0.7 * normal[0].score).slice(0, 2)
      : [];

  const closestTop =
    closest.length > 0
      ? closest.filter((item) => item.score >= 0.7 * closest[0].score).slice(0, 2)
      : [];

  return { normal: normalTop, closest: closestTop };
}

export function safeScoreRetrieval(
  query: string,
  passages: Passage[],
): { ok: true; result: ScoredRetrievalResult } | { ok: false } {
  try {
    const corrected = correctQueryTypos(query, passages);
    return {
      ok: true,
      result: scorePassagesForQuery(corrected, passages),
    };
  } catch {
    return { ok: false };
  }
}

export function pickBestRewriteRetrieval(
  queries: string[],
  passages: Passage[],
): { normal: Passage[]; closest: Passage[]; matchedQuery?: string } {
  let bestNormalScore = -1;
  let bestNormalPassages: Passage[] = [];
  let bestNormalQuery: string | undefined;

  let bestClosestScore = -1;
  let bestClosestPassages: Passage[] = [];
  let bestClosestQuery: string | undefined;

  for (const query of queries) {
    const res = safeScoreRetrieval(query, passages);
    if (!res.ok) continue;

    if (res.result.normal.length > 0 && res.result.normal[0].score > bestNormalScore) {
      bestNormalScore = res.result.normal[0].score;
      bestNormalPassages = res.result.normal.map((x) => x.passage);
      bestNormalQuery = query;
    }

    if (res.result.closest.length > 0 && res.result.closest[0].score > bestClosestScore) {
      bestClosestScore = res.result.closest[0].score;
      bestClosestPassages = res.result.closest.map((x) => x.passage);
      bestClosestQuery = query;
    }
  }

  return {
    normal: bestNormalPassages,
    closest: bestClosestPassages,
    matchedQuery: bestNormalQuery ?? bestClosestQuery,
  };
}

export function retrievePassages(question: string, passages: Passage[]): Passage[] {
  const corrected = correctQueryTypos(question, passages);
  const { normal } = scorePassagesForQuery(corrected, passages);
  return normal.map((item) => item.passage);
}

export function retrieveClosestPassages(question: string, passages: Passage[]): Passage[] {
  const corrected = correctQueryTypos(question, passages);
  const { normal, closest } = scorePassagesForQuery(corrected, passages);
  if (normal.length > 0) {
    return normal.map((item) => item.passage);
  }
  return closest.map((item) => item.passage);
}

export function toCitation(passage: Passage, isClosestMatch = false): ChatCitation {
  return {
    document: passage.document,
    section: passage.section,
    authority: passage.authority,
    text: passage.text,
    url: passage.url,
    needsVerification: passage.needsVerification,
    ...(isClosestMatch ? { isClosestMatch: true } : {}),
  };
}

const FOLLOW_UP_TRIGGER_EN =
  /\b(?:what\s+about|and|also|why|how|can\s+you\s+explain|more|that|it|those)\b/i;

const FOLLOW_UP_TRIGGER_HI =
  /(?:^|[^\p{L}])(?:और|इसके\s+अलावा|क्यों|कैसे|समझाएं|समझाइए|और\s+बताएं|उसके\s+बारे\s+में|वह|यह|उनके)(?=[^\p{L}]|$)/iu;

export function isShortFollowUp(input: string): boolean {
  const words = input.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length >= 8) {
    return false;
  }
  return FOLLOW_UP_TRIGGER_EN.test(input) || FOLLOW_UP_TRIGGER_HI.test(input);
}

// 10-minute in-memory SHA-256 response cache (stores no raw user text)
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

interface CacheEntry {
  response: ChatApiResponse;
  expiresAt: number;
}

const clientCache = new WeakMap<object, Map<string, CacheEntry>>();
const offlineCache = new Map<string, CacheEntry>();

export function clearPipelineCache(): void {
  offlineCache.clear();
}

function getCacheStore(cacheScope: object | null): Map<string, CacheEntry> {
  if (!cacheScope) {
    return offlineCache;
  }
  let store = clientCache.get(cacheScope);
  if (!store) {
    store = new Map<string, CacheEntry>();
    clientCache.set(cacheScope, store);
  }
  return store;
}

export function buildCacheKey(
  trimmedQuestion: string,
  replyLang: ChatLanguage,
  passages: Passage[],
): string {
  const normalized = trimmedQuestion.toLowerCase().replace(/\s+/g, ' ').trim();
  return createHash('sha256')
    .update(`${replyLang}|${passages.length}|${normalized}`)
    .digest('hex');
}

function cloneResponse(res: ChatApiResponse): ChatApiResponse {
  return {
    ...res,
    citations: res.citations.map((c) => ({ ...c })),
    procedure: res.procedure.map((p) => ({ ...p })),
    ...(res.suggestions ? { suggestions: [...res.suggestions] } : {}),
  };
}

export function getCachedResponse(
  cacheScope: object | null,
  key: string,
): ChatApiResponse | null {
  const store = getCacheStore(cacheScope);
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return cloneResponse(entry.response);
}

export function setCachedResponse(
  cacheScope: object | null,
  key: string,
  response: ChatApiResponse,
): void {
  const store = getCacheStore(cacheScope);
  if (store.size >= CACHE_MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of store.entries()) {
      if (v.expiresAt <= now) {
        store.delete(k);
      }
    }
    if (store.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = store.keys().next().value;
      if (oldestKey !== undefined) {
        store.delete(oldestKey);
      }
    }
  }
  store.set(key, {
    response: cloneResponse(response),
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}
