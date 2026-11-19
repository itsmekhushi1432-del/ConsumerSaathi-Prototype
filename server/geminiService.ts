import { GoogleGenAI, Type } from '@google/genai';
import type { Passage } from '../src/knowledgeBase.ts';

export const GEMINI_MODEL = 'gemini-3.1-flash-lite';

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

export async function classifyQuestionWithGemini(
  client: GeminiClientLike,
  question: string,
): Promise<QuestionSafetyLabel | null> {
  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: question,
      config: {
        temperature: 0,
        systemInstruction:
          'Classify the user question into JSON {"label":"GENERAL"|"PERSONAL"}. Return "PERSONAL" if the person describes their own specific dispute or problem and wants it assessed, judged, or their outcome predicted. Otherwise return "GENERAL".',
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
    if (!rawText) return null;

    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    if (parsed.label === 'PERSONAL' || parsed.label === 'GENERAL') {
      return parsed.label;
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateGroundedAnswerWithGemini(
  client: GeminiClientLike,
  question: string,
  retrievedPassages: Passage[],
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

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Numbered passages:\n${numberedPassages}\n\nUser question: ${question}`,
      config: {
        temperature: 0.2,
        systemInstruction:
          'Use ONLY the numbered passages. If they do not answer the question, set answer to NOT_COVERED. Mention a Section or Rule number only if it appears in a passage you used. Explain the law in general terms; never judge a personal dispute or predict an outcome. 2-4 sentences.',
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
    if (!rawText) return null;

    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    if (typeof parsed.answer !== 'string' || !Array.isArray(parsed.used_ids)) {
      return null;
    }

    const usedIds = parsed.used_ids.filter((id): id is string => typeof id === 'string');
    return {
      answer: parsed.answer.trim(),
      used_ids: usedIds,
    };
  } catch {
    return null;
  }
}
