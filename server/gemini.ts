// Handles all @google/genai model calls with an 8-second timeout and 1 retry.
import { GoogleGenAI, Type } from '@google/genai';
import type { ChatLanguage } from '../src/chat/types.ts';
import type { Passage } from '../src/knowledgeBase.ts';

export const GEMINI_MODEL = 'gemini-3.1-flash-lite';
export const GEMINI_TIMEOUT_MS = 8000;

export interface GeminiClientLike {
  models: {
    generateContent: (params: {
      model: string;
      contents: string;
      config?: Record<string, unknown>;
    }) => Promise<{ text?: string }>;
  };
}

export interface ModelAnswerPayload {
  answer: string;
  used_ids: string[];
}

export type QuestionSafetyLabel = 'GENERAL' | 'PERSONAL';

export function createGeminiClient(apiKey = process.env.GEMINI_API_KEY): GoogleGenAI | null {
  const trimmedKey = apiKey?.trim();
  if (!trimmedKey) {
    return null;
  }

  return new GoogleGenAI({
    apiKey: trimmedKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function callGeminiWithTimeoutAndRetry<T>(
  operation: () => Promise<T>,
  timeoutMs: number = GEMINI_TIMEOUT_MS,
): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let timerId: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          timerId = setTimeout(() => {
            reject(new Error('Gemini request timed out'));
          }, timeoutMs);
        }),
      ]);
      return result;
    } catch {
      // Retry once on failure/timeout; otherwise fall through to null
    } finally {
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }
    }
  }
  return null;
}

export async function classifyQuestionWithGemini(
  client: GeminiClientLike,
  question: string,
  timeoutMs: number = GEMINI_TIMEOUT_MS,
): Promise<QuestionSafetyLabel | null> {
  return callGeminiWithTimeoutAndRetry(async () => {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: question,
      config: {
        temperature: 0,
        systemInstruction:
          'Classify the user question into JSON {"label":"GENERAL"|"PERSONAL"}. Return "PERSONAL" ONLY if the user describes their own specific real-life dispute or transaction and asks you to judge it, predict if they will win, or advise on their case. Return "GENERAL" for general questions asking about consumer law rules, rights, procedures, deadlines, or definitions (even if imperfectly phrased or misspelled).',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            label: {
              type: Type.STRING,
              description: 'Either GENERAL or PERSONAL.',
            },
          },
          required: ['label'],
        },
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      throw new Error('Empty classifier response');
    }

    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    if (parsed.label === 'PERSONAL' || parsed.label === 'GENERAL') {
      return parsed.label;
    }
    return null;
  }, timeoutMs);
}

export async function translateQuestionToEnglishWithGemini(
  client: GeminiClientLike,
  question: string,
  timeoutMs: number = GEMINI_TIMEOUT_MS,
): Promise<string | null> {
  return callGeminiWithTimeoutAndRetry(async () => {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: question,
      config: {
        temperature: 0,
        systemInstruction:
          'Translate the user question into plain English without adding anything. Return JSON {"english": "..."}.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            english: {
              type: Type.STRING,
              description: 'Plain English translation of the user question.',
            },
          },
          required: ['english'],
        },
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      throw new Error('Empty translation response');
    }

    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    if (typeof parsed.english === 'string' && parsed.english.trim().length > 0) {
      return parsed.english.trim();
    }
    return null;
  }, timeoutMs);
}

export async function rewriteSearchQueriesWithGemini(
  client: GeminiClientLike,
  question: string,
  timeoutMs: number = GEMINI_TIMEOUT_MS,
): Promise<string[] | null> {
  return callGeminiWithTimeoutAndRetry(async () => {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: question,
      config: {
        temperature: 0,
        systemInstruction:
          'Rewrite the user message as up to 3 short search phrases using only everyday consumer-law words: refund, defective product, complaint, deadline, Commission, online order, cancellation, advertisement, helpline. Never answer the question and use only these topics. Return JSON {"queries": ["...", "..."]}.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            queries: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Up to 3 short consumer-law search phrases.',
            },
          },
          required: ['queries'],
        },
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      throw new Error('Empty rewrite response');
    }

    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    if (!Array.isArray(parsed.queries)) {
      return null;
    }

    const queries = parsed.queries
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim())
      .slice(0, 3);

    return queries.length > 0 ? queries : null;
  }, timeoutMs);
}

export async function generateGroundedAnswerWithGemini(
  client: GeminiClientLike,
  question: string,
  retrievedPassages: Passage[],
  lang: ChatLanguage = 'en',
  timeoutMs: number = GEMINI_TIMEOUT_MS,
): Promise<ModelAnswerPayload | null> {
  if (retrievedPassages.length === 0) {
    return null;
  }

  const numberedPassages = retrievedPassages
    .map(
      (passage, index) =>
        `[${index + 1}] id: ${passage.id}\nDocument: ${passage.document}\nSection: ${passage.section}\nText: ${passage.text}`,
    )
    .join('\n\n');

  const systemInstruction =
    lang === 'hi'
      ? 'Write the answer in simple Hindi (Devanagari) in 2-4 sentences. Use ONLY the numbered passages. Keep section and rule numbers, rupee amounts and terms like Grievance Officer and e-Daakhil in their original form. Never add facts that are not in the passages.'
      : 'Use ONLY the numbered passages. If they do not answer the question, set answer to NOT_COVERED. Mention a Section or Rule number only if it appears in a passage you used. Explain the law in general terms; never judge a personal dispute or predict an outcome. 2-4 sentences.';

  return callGeminiWithTimeoutAndRetry(async () => {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Numbered passages:\n${numberedPassages}\n\nUser question: ${question}`,
      config: {
        temperature: 0.2,
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: {
              type: Type.STRING,
              description: '2-4 sentence general legal explanation based only on the passages, or NOT_COVERED.',
            },
            used_ids: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of passage id strings used from the numbered passages.',
            },
          },
          required: ['answer', 'used_ids'],
        },
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      throw new Error('Empty generator response');
    }

    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    if (typeof parsed.answer !== 'string' || !Array.isArray(parsed.used_ids)) {
      return null;
    }

    const usedIds = parsed.used_ids.filter((id): id is string => typeof id === 'string');
    return {
      answer: parsed.answer.trim(),
      used_ids: usedIds,
    };
  }, timeoutMs);
}
