import {
  CONSUMERSAATHI_DISCLAIMER,
  type BotChatMessage,
  type ChatApiResponse,
  type ChatCitation,
  type ProcedureStep,
  type UserChatMessage,
} from './types.ts';

export function validateUserInput(raw: string): { valid: boolean; trimmed: string } {
  const trimmed = raw.trim();
  return {
    valid: trimmed.length > 0,
    trimmed,
  };
}

export function createUserMessage(text: string, id: string): UserChatMessage {
  return {
    id,
    role: 'user',
    text,
  };
}

function isValidChatCitation(item: unknown): item is ChatCitation {
  if (!item || typeof item !== 'object') return false;
  const c = item as Record<string, unknown>;
  return (
    typeof c.document === 'string' &&
    typeof c.section === 'string' &&
    typeof c.authority === 'string' &&
    typeof c.text === 'string' &&
    typeof c.url === 'string' &&
    typeof c.needsVerification === 'boolean'
  );
}

function isValidProcedureStep(item: unknown): item is ProcedureStep {
  if (!item || typeof item !== 'object') return false;
  const p = item as Record<string, unknown>;
  return (
    typeof p.step === 'string' &&
    p.step.trim().length > 0 &&
    typeof p.authority === 'string' &&
    p.authority.trim().length > 0
  );
}

export function normalizeChatResponse(payload: unknown): ChatApiResponse {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid response from server.');
  }

  const record = payload as Record<string, unknown>;
  const type = typeof record.type === 'string' && record.type.trim() ? record.type : 'answer';
  const answer = typeof record.answer === 'string' ? record.answer : '';

  if (!answer.trim()) {
    throw new Error('Server returned an empty reply.');
  }

  const citations: ChatCitation[] = Array.isArray(record.citations)
    ? record.citations.filter(isValidChatCitation)
    : [];

  const procedure: ProcedureStep[] = Array.isArray(record.procedure)
    ? record.procedure.filter(isValidProcedureStep)
    : [];

  const disclaimer =
    typeof record.disclaimer === 'string' && record.disclaimer.trim().length > 0
      ? record.disclaimer
      : CONSUMERSAATHI_DISCLAIMER;

  return {
    type,
    answer,
    citations,
    procedure,
    disclaimer,
  };
}

export function createBotMessage(response: ChatApiResponse, id: string): BotChatMessage {
  return {
    id,
    role: 'bot',
    response,
  };
}

export function createErrorBotMessage(errorMessage: string, id: string): BotChatMessage {
  return {
    id,
    role: 'bot',
    isError: true,
    response: {
      type: 'error',
      answer: errorMessage,
      citations: [],
      procedure: [],
      disclaimer: CONSUMERSAATHI_DISCLAIMER,
    },
  };
}

export function formatCitationLabel(citation: ChatCitation): string {
  return `${citation.document} · ${citation.section} · ${citation.authority}`;
}
