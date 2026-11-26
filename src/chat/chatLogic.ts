import { KNOWLEDGE_BASE, type Passage } from '../knowledgeBase.ts';
import {
  CONSUMERSAATHI_DISCLAIMER,
  CONSUMERSAATHI_DISCLAIMER_HI,
  type BotChatMessage,
  type ChatApiResponse,
  type ChatCitation,
  type ChatFontSize,
  type ChatLanguage,
  type ProcedureStep,
  type UserChatMessage,
} from './types.ts';

export const LANGUAGE_STORAGE_KEY = 'consumersaathi-lang';
export const FONT_SIZE_STORAGE_KEY = 'consumersaathi-font-size';
export const HIGH_CONTRAST_STORAGE_KEY = 'consumersaathi-high-contrast';
export const FIRST_VISIT_STORAGE_KEY = 'consumersaathi-notice-accepted';

export interface PortalLink {
  id: string;
  labelEn: string;
  labelHi: string;
  url: string;
}

export function containsDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

export function loadStoredLanguage(): ChatLanguage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'hi' || saved === 'en') {
        return saved;
      }
    }
  } catch {
    // Ignore storage access failures
  }
  return 'en';
}

export function saveStoredLanguage(lang: ChatLanguage): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
  } catch {
    // Ignore storage write failures
  }
}

export function loadStoredFontSize(): ChatFontSize {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(FONT_SIZE_STORAGE_KEY);
      if (saved === '14' || saved === '16' || saved === '20') {
        return Number(saved) as ChatFontSize;
      }
    }
  } catch {
    // Ignore storage access failures
  }
  return 16;
}

export function saveStoredFontSize(size: ChatFontSize): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(size));
    }
  } catch {
    // Ignore storage write failures
  }
}

export function loadStoredHighContrast(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY) === 'true';
    }
  } catch {
    // Ignore storage access failures
  }
  return false;
}

export function saveStoredHighContrast(enabled: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, enabled ? 'true' : 'false');
    }
  } catch {
    // Ignore storage write failures
  }
}

export function loadFirstVisitAccepted(): boolean {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(FIRST_VISIT_STORAGE_KEY) === 'true';
    }
  } catch {
    // Ignore storage access failures
  }
  return false;
}

export function saveFirstVisitAccepted(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(FIRST_VISIT_STORAGE_KEY, 'true');
    }
  } catch {
    // Ignore storage write failures
  }
}

export function getPortalLinks(passages: readonly Passage[] = KNOWLEDGE_BASE): PortalLink[] {
  const byId = new Map(passages.map((p) => [p.id, p]));
  const specs: Array<{ id: string; labelEn: string; labelHi: string }> = [
    {
      id: 'nch-redressal-1915',
      labelEn: 'National Consumer Helpline (1915)',
      labelHi: 'राष्ट्रीय उपभोक्ता हेल्पलाइन (1915)',
    },
    {
      id: 'edaakhil-process-overview',
      labelEn: 'e-Daakhil Online Filing Portal',
      labelHi: 'e-Daakhil ऑनलाइन शिकायत पोर्टल',
    },
    {
      id: 'cdrc-jurisdiction-limits-2021',
      labelEn: 'Consumer Commission Jurisdiction Rules',
      labelHi: 'उपभोक्ता आयोग क्षेत्राधिकार नियम',
    },
  ];

  return specs
    .map((spec) => {
      const url = byId.get(spec.id)?.url;
      return url ? { ...spec, url } : null;
    })
    .filter((item): item is PortalLink => item !== null);
}

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
    ? record.citations.filter(isValidChatCitation).map((c) => ({
        document: c.document,
        section: c.section,
        authority: c.authority,
        text: c.text,
        url: c.url,
        needsVerification: c.needsVerification,
        ...(c.isClosestMatch === true ? { isClosestMatch: true } : {}),
      }))
    : [];

  const procedure: ProcedureStep[] = Array.isArray(record.procedure)
    ? record.procedure.filter(isValidProcedureStep)
    : [];

  const lang: ChatLanguage | undefined =
    record.lang === 'hi' || record.lang === 'en' ? record.lang : undefined;

  const defaultDisclaimer =
    lang === 'hi' || containsDevanagari(answer)
      ? CONSUMERSAATHI_DISCLAIMER_HI
      : CONSUMERSAATHI_DISCLAIMER;

  const disclaimer =
    typeof record.disclaimer === 'string' && record.disclaimer.trim().length > 0
      ? record.disclaimer
      : defaultDisclaimer;

  const suggestions = Array.isArray(record.suggestions)
    ? record.suggestions
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim())
    : [];

  const isClosestMatch = record.isClosestMatch === true;

  return {
    type,
    answer,
    citations,
    procedure,
    disclaimer,
    ...(suggestions.length > 0 ? { suggestions } : {}),
    ...(lang ? { lang } : {}),
    ...(isClosestMatch ? { isClosestMatch: true } : {}),
  };
}

export function createBotMessage(response: ChatApiResponse, id: string): BotChatMessage {
  return {
    id,
    role: 'bot',
    response,
  };
}

export function createErrorBotMessage(
  errorMessage: string,
  id: string,
  lang: ChatLanguage = 'en',
): BotChatMessage {
  return {
    id,
    role: 'bot',
    isError: true,
    response: {
      type: 'error',
      answer: errorMessage,
      citations: [],
      procedure: [],
      disclaimer: lang === 'hi' ? CONSUMERSAATHI_DISCLAIMER_HI : CONSUMERSAATHI_DISCLAIMER,
      lang,
    },
  };
}

export function formatCitationLabel(citation: ChatCitation): string {
  return `${citation.document} · ${citation.section} · ${citation.authority}`;
}
