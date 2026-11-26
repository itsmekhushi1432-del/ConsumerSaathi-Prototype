// Orchestrates the 9-step ConsumerSaathi reply ladder through a single answer() function.
import { KNOWLEDGE_BASE, type Passage } from '../src/knowledgeBase.ts';
import type { ChatApiResponse, ChatLanguage } from '../src/chat/types.ts';
import {
  classifyQuestionWithGemini,
  createGeminiClient,
  generateGroundedAnswerWithGemini,
  rewriteSearchQueriesWithGemini,
  translateQuestionToEnglishWithGemini,
  type GeminiClientLike,
} from './gemini.ts';
import { buildProcedureSteps } from './procedure.ts';
import {
  buildCacheKey,
  convertDevanagariDigitsToAscii,
  correctQueryTypos,
  getCachedResponse,
  isShortFollowUp,
  pickBestRewriteRetrieval,
  prepareFallbackLookupQuery,
  resolveReplyLanguage,
  safeScoreRetrieval,
  setCachedResponse,
  toCitation,
  type ScoredRetrievalResult,
} from './retrieval.ts';
import {
  PROMPT_INJECTION_PATTERNS,
  PERSONAL_DISPUTE_PATTERNS,
  buildClosestPassagesResponse,
  buildFriendlyGuidanceResponse,
  buildInjectionRefusalResponse,
  buildOutOfScopeResponse,
  buildPersonalDisputeResponse,
  checkSectionReference,
  countLetters,
  findOutOfScopeRule,
  getOffTopicGuidanceText,
  hasUpsetOrHarmSituation,
  isOffTopicRequest,
  isUnclearMessage,
  verifyModelAnswer,
} from './safety.ts';
import { buildChitchatResponse, matchSmallTalk } from './smalltalk.ts';
import {
  EMPTY_INPUT_MESSAGE,
  EMPTY_INPUT_MESSAGE_HI,
  FALLBACK_ANSWER_HI,
  getDisclaimerForLang,
} from './strings.ts';
import { matchTopic } from './topics.ts';

export interface PipelineOptions {
  passages?: Passage[];
  geminiClient?: GeminiClientLike | null;
}

let cachedDefaultGeminiClient: GeminiClientLike | null | undefined;

export async function answer(
  message: string,
  lang: ChatLanguage = 'en',
  previousQuestion?: string,
  options?: PipelineOptions,
): Promise<ChatApiResponse> {
  const passages = options?.passages ?? KNOWLEDGE_BASE;
  const geminiClient =
    options && 'geminiClient' in options
      ? (options.geminiClient ?? null)
      : (cachedDefaultGeminiClient ??= createGeminiClient());

  const safeQuestion = typeof message === 'string' ? message : '';
  const trimmed = safeQuestion.trim().slice(0, 1000);
  const replyLang = resolveReplyLanguage(trimmed, lang === 'hi' ? 'hi' : 'en');

  try {
    if (!trimmed) {
      return buildFriendlyGuidanceResponse(
        replyLang,
        replyLang === 'hi' ? EMPTY_INPUT_MESSAGE_HI : EMPTY_INPUT_MESSAGE,
      );
    }

    const trimmedPrev =
      typeof previousQuestion === 'string' ? previousQuestion.trim().slice(0, 1000) : '';
    const followUp = Boolean(trimmedPrev) && isShortFollowUp(trimmed);
    const combinedText = followUp ? `${trimmedPrev} ${trimmed}`.slice(0, 1000) : trimmed;

    const cacheKey = !followUp ? buildCacheKey(trimmed, replyLang, passages) : null;
    if (cacheKey) {
      const cached = getCachedResponse(geminiClient, cacheKey);
      if (cached) {
        return cached;
      }
    }

    const finalize = (response: ChatApiResponse): ChatApiResponse => {
      if (cacheKey && !followUp) {
        setCachedResponse(geminiClient, cacheKey, response);
      }
      return response;
    };

    // STEP 1: Injection check on current message and follow-up combined text
    const injectionMatched =
      PROMPT_INJECTION_PATTERNS.some((p) => p.test(trimmed)) ||
      (followUp && PROMPT_INJECTION_PATTERNS.some((p) => p.test(combinedText)));
    if (injectionMatched) {
      return finalize(buildInjectionRefusalResponse(replyLang));
    }

    // STEP 2: Small talk and about-the-bot fixed replies (no model call)
    const smallTalkMatch = matchSmallTalk(trimmed, replyLang);
    if (smallTalkMatch) {
      return finalize(buildChitchatResponse(smallTalkMatch, replyLang));
    }

    // STEP 3: Exact 14-topic menu and curated passage lookup
    const topicResponse = matchTopic(trimmed, passages, replyLang);
    if (topicResponse) {
      return finalize(topicResponse);
    }

    const retrievalInput = followUp ? combinedText : trimmed;
    const fallbackLookupQuery = prepareFallbackLookupQuery(retrievalInput, replyLang);

    // STEP 4: Personal dispute, upset situation, and second-opinion safety preparation
    const isPersonalDispute =
      PERSONAL_DISPUTE_PATTERNS.some((p) => p.test(trimmed)) ||
      (followUp && PERSONAL_DISPUTE_PATTERNS.some((p) => p.test(combinedText)));
    const isUpsetMessage =
      hasUpsetOrHarmSituation(trimmed) ||
      (followUp && hasUpsetOrHarmSituation(combinedText));

    if (isPersonalDispute || isUpsetMessage) {
      let disputeLookup = fallbackLookupQuery;
      if (replyLang === 'hi' && geminiClient) {
        const translated = await translateQuestionToEnglishWithGemini(geminiClient, retrievalInput);
        if (translated) {
          disputeLookup = convertDevanagariDigitsToAscii(translated);
        }
      }
      return finalize(
        buildPersonalDisputeResponse(
          disputeLookup,
          retrievalInput,
          passages,
          replyLang,
          isUpsetMessage,
        ),
      );
    }

    // STEP 5: Other areas of law (family, criminal, tax, property) declined with redirect
    const outOfScopeRule =
      findOutOfScopeRule(trimmed) ?? (followUp ? findOutOfScopeRule(combinedText) : null);
    if (outOfScopeRule) {
      return finalize(buildOutOfScopeResponse(outOfScopeRule, replyLang));
    }

    // Fast-path symbols-only, non-legal off-topic, section bounds, and unclear prompts before calling Gemini
    if (countLetters(trimmed) < 2) {
      return finalize(
        buildFriendlyGuidanceResponse(
          replyLang,
          replyLang === 'hi' ? EMPTY_INPUT_MESSAGE_HI : EMPTY_INPUT_MESSAGE,
        ),
      );
    }
    if (isOffTopicRequest(trimmed) && (!followUp || isOffTopicRequest(combinedText))) {
      return finalize(buildFriendlyGuidanceResponse(replyLang, getOffTopicGuidanceText(replyLang)));
    }
    const sectionCheck = checkSectionReference(trimmed, passages, replyLang);
    if (sectionCheck) {
      return finalize(buildFriendlyGuidanceResponse(replyLang, sectionCheck.notFoundMessage));
    }
    if (isUnclearMessage(trimmed)) {
      return finalize(buildFriendlyGuidanceResponse(replyLang));
    }

    // STEP 6: Retrieval (typo correction, follow-up context, Hindi translation, section matching)
    let lookupQuery = fallbackLookupQuery;
    let initialRetrieval: ScoredRetrievalResult = { normal: [], closest: [] };
    let rewriteQueries: string[] | null = null;
    let safetyLabel: 'GENERAL' | 'PERSONAL' | null = null;

    if (replyLang === 'hi' && geminiClient) {
      const [labelResult, translated] = await Promise.all([
        classifyQuestionWithGemini(geminiClient, retrievalInput),
        translateQuestionToEnglishWithGemini(geminiClient, retrievalInput),
      ]);
      safetyLabel = labelResult;

      if (translated) {
        lookupQuery = convertDevanagariDigitsToAscii(translated);

        const translatedPersonal = PERSONAL_DISPUTE_PATTERNS.some((p) => p.test(lookupQuery));
        const translatedUpset = hasUpsetOrHarmSituation(lookupQuery);
        if (translatedPersonal || translatedUpset || safetyLabel === 'PERSONAL') {
          return finalize(
            buildPersonalDisputeResponse(
              lookupQuery,
              retrievalInput,
              passages,
              replyLang,
              isUpsetMessage || translatedUpset,
            ),
          );
        }

        const translatedTopic = matchTopic(lookupQuery, passages, replyLang);
        if (translatedTopic) {
          return finalize(translatedTopic);
        }

        const translatedOosRule = findOutOfScopeRule(lookupQuery);
        if (translatedOosRule) {
          return finalize(buildOutOfScopeResponse(translatedOosRule, replyLang));
        }

        const translatedSectionCheck = checkSectionReference(lookupQuery, passages, replyLang);
        if (translatedSectionCheck) {
          return finalize(
            buildFriendlyGuidanceResponse(replyLang, translatedSectionCheck.notFoundMessage),
          );
        }
      } else if (safetyLabel === 'PERSONAL') {
        return finalize(
          buildPersonalDisputeResponse(
            lookupQuery,
            retrievalInput,
            passages,
            replyLang,
            isUpsetMessage,
          ),
        );
      }

      const scored = safeScoreRetrieval(lookupQuery, passages);
      if (!scored.ok) {
        return finalize(buildFriendlyGuidanceResponse(replyLang));
      }
      initialRetrieval = scored.result;

      // STEP 7: Retry retrieval using up to 3 short Gemini search phrases (Hindi path)
      if (initialRetrieval.normal.length === 0) {
        rewriteQueries = await rewriteSearchQueriesWithGemini(geminiClient, lookupQuery);
      }
    } else {
      const scored = safeScoreRetrieval(lookupQuery, passages);
      if (!scored.ok) {
        return finalize(buildFriendlyGuidanceResponse(replyLang));
      }
      initialRetrieval = scored.result;

      if (geminiClient) {
        const classifierInput = correctQueryTypos(retrievalInput, passages);
        if (initialRetrieval.normal.length === 0) {
          // Run second-opinion classifier and STEP 7 query rewrite in parallel
          const [labelResult, queriesResult] = await Promise.all([
            classifyQuestionWithGemini(geminiClient, classifierInput),
            rewriteSearchQueriesWithGemini(geminiClient, classifierInput),
          ]);
          safetyLabel = labelResult;
          rewriteQueries = queriesResult;
        } else {
          safetyLabel = await classifyQuestionWithGemini(geminiClient, classifierInput);
        }
      }
    }

    if (safetyLabel === 'PERSONAL') {
      return finalize(
        buildPersonalDisputeResponse(
          lookupQuery,
          retrievalInput,
          passages,
          replyLang,
          isUpsetMessage,
        ),
      );
    }

    let retrieved: Passage[] = initialRetrieval.normal.map((x) => x.passage);
    let procedureContextText = `${retrievalInput} ${lookupQuery}`;

    if (retrieved.length === 0 && rewriteQueries && rewriteQueries.length > 0) {
      const rewriteResult = pickBestRewriteRetrieval(rewriteQueries, passages);
      if (rewriteResult.normal.length > 0) {
        retrieved = rewriteResult.normal;
        if (rewriteResult.matchedQuery) {
          procedureContextText = `${procedureContextText} ${rewriteResult.matchedQuery}`;
        }
      } else if (
        initialRetrieval.closest.length === 0 &&
        rewriteResult.closest.length > 0
      ) {
        initialRetrieval = {
          normal: [],
          closest: rewriteResult.closest.map((passage, idx) => ({
            passage,
            score: 2 - idx * 0.1,
          })),
        };
      }
    }

    // STEP 8: Closest passages fallback when match is weak (>40% of normal threshold)
    if (retrieved.length === 0 && initialRetrieval.closest.length > 0) {
      const closestPassages = initialRetrieval.closest.map((x) => x.passage);
      return finalize(
        buildClosestPassagesResponse(closestPassages, procedureContextText, replyLang),
      );
    }

    // STEP 9: Friendly guidance when no passage matches
    if (retrieved.length === 0) {
      return finalize(buildFriendlyGuidanceResponse(replyLang));
    }

    const procedure = buildProcedureSteps(procedureContextText, replyLang);
    const top = retrieved[0];

    if (geminiClient) {
      const modelOutput = await generateGroundedAnswerWithGemini(
        geminiClient,
        retrievalInput,
        retrieved,
        replyLang,
      );
      if (modelOutput) {
        const verification = verifyModelAnswer(modelOutput, retrieved);
        if (verification.status === 'not_covered') {
          return finalize(buildFriendlyGuidanceResponse(replyLang));
        }
        if (verification.status === 'accepted') {
          return finalize({
            type: 'answer',
            answer: verification.answer,
            citations: verification.usedPassages.map((p) => toCitation(p)),
            procedure,
            disclaimer: getDisclaimerForLang(replyLang),
            lang: replyLang,
          });
        }
      }
    }

    return finalize({
      type: 'answer',
      answer:
        replyLang === 'hi'
          ? FALLBACK_ANSWER_HI
          : `See ${top.document}, ${top.section} below.`,
      citations: retrieved.map((p) => toCitation(p)),
      procedure,
      disclaimer: getDisclaimerForLang(replyLang),
      lang: replyLang,
    });
  } catch {
    return buildFriendlyGuidanceResponse(replyLang);
  }
}
