import { KNOWLEDGE_BASE, type Passage } from '../src/knowledgeBase.ts';
import type { ChatApiResponse } from '../src/chat/types.ts';
import { createGeminiClient, type GeminiClientLike } from './geminiService.ts';
import { runChatPipelineAsync } from './pipeline.ts';

export { createGeminiClient };

export interface ChatRequestResult {
  status: number;
  body: ChatApiResponse | { error: string };
}

export async function processChatMessage(
  payload: unknown,
  passages: Passage[] = KNOWLEDGE_BASE,
  geminiClient: GeminiClientLike | null = null,
): Promise<ChatRequestResult> {
  if (!payload || typeof payload !== 'object') {
    return {
      status: 400,
      body: { error: 'Request body must be a JSON object containing a message.' },
    };
  }

  const message = (payload as Record<string, unknown>).message;
  if (typeof message !== 'string' || message.trim().length === 0) {
    return {
      status: 400,
      body: { error: 'Please provide a non-empty message.' },
    };
  }

  const body = await runChatPipelineAsync(message, passages, geminiClient);
  return {
    status: 200,
    body,
  };
}
