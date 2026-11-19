export const WELCOME_HEADING = 'Hi Consumer, how can I help you today?';
export const WELCOME_SUBTITLE =
  'Ask me about your consumer rights and how to complain, based on the Consumer Protection Act, 2019 and the E-Commerce Rules, 2020.';

export const GREETING_CHAR_INTERVAL_MS = 45;
export const GREETING_CURSOR_HOLD_MS = 1000;
export const SUBTITLE_FADE_MS = 400;
export const CARD_STAGGER_MS = 80;

export const ROTATING_PHRASES = [
  'Know your refund rights',
  'Learn how to file a complaint online',
  'Find the right Commission',
  'See what the Act says',
] as const;

export const ROTATING_TYPE_MS = 40;
export const ROTATING_PAUSE_MS = 1500;
export const ROTATING_DELETE_MS = 20;

export const PLACEHOLDER_CYCLE_MS = 4000;
export const WELCOME_PLACEHOLDERS = [
  'Ask a consumer law question...',
  'How long do I have to file a complaint?',
  'Can a website charge cancellation fees?',
  'Which Commission handles my complaint?',
] as const;

export type StarterIconKind = 'defect' | 'ecommerce' | 'helpline' | 'commission';

export interface StarterCardItem {
  question: string;
  icon: StarterIconKind;
}

export const WELCOME_STARTER_CARDS: readonly StarterCardItem[] = [
  {
    question: 'What counts as a defect in goods or deficiency in service?',
    icon: 'defect',
  },
  {
    question: 'What are the rules for e-commerce cancellation charges and refunds?',
    icon: 'ecommerce',
  },
  {
    question: 'How does the National Consumer Helpline (1915) complaint process work?',
    icon: 'helpline',
  },
  {
    question: 'What is the deadline and Commission limit for filing a consumer complaint?',
    icon: 'commission',
  },
];

export type RotatingPhase = 'typing' | 'pausing' | 'deleting';

export interface RotatingLineState {
  phraseIndex: number;
  charCount: number;
  phase: RotatingPhase;
}

export function createInitialRotatingState(): RotatingLineState {
  return {
    phraseIndex: 0,
    charCount: 0,
    phase: 'typing',
  };
}

export function getRotatingDelayMs(state: RotatingLineState): number {
  if (state.phase === 'typing') return ROTATING_TYPE_MS;
  if (state.phase === 'pausing') return ROTATING_PAUSE_MS;
  return ROTATING_DELETE_MS;
}

export function advanceRotatingState(
  state: RotatingLineState,
  phrases: readonly string[] = ROTATING_PHRASES,
): RotatingLineState {
  if (phrases.length === 0) {
    return state;
  }

  const normalizedIndex = ((state.phraseIndex % phrases.length) + phrases.length) % phrases.length;
  const currentPhrase = phrases[normalizedIndex];

  if (state.phase === 'typing') {
    const nextCount = Math.min(state.charCount + 1, currentPhrase.length);
    if (nextCount >= currentPhrase.length) {
      return {
        phraseIndex: normalizedIndex,
        charCount: currentPhrase.length,
        phase: 'pausing',
      };
    }
    return {
      phraseIndex: normalizedIndex,
      charCount: nextCount,
      phase: 'typing',
    };
  }

  if (state.phase === 'pausing') {
    return {
      phraseIndex: normalizedIndex,
      charCount: currentPhrase.length,
      phase: 'deleting',
    };
  }

  // deleting
  if (state.charCount <= 1) {
    return {
      phraseIndex: (normalizedIndex + 1) % phrases.length,
      charCount: 0,
      phase: 'typing',
    };
  }

  return {
    phraseIndex: normalizedIndex,
    charCount: state.charCount - 1,
    phase: 'deleting',
  };
}

export function getDisplayedRotatingText(
  state: RotatingLineState,
  phrases: readonly string[] = ROTATING_PHRASES,
): string {
  if (phrases.length === 0) return '';
  const normalizedIndex = ((state.phraseIndex % phrases.length) + phrases.length) % phrases.length;
  return phrases[normalizedIndex].slice(0, state.charCount);
}

export function getNextPlaceholderIndex(
  currentIndex: number,
  total: number = WELCOME_PLACEHOLDERS.length,
): number {
  if (total <= 0) return 0;
  return (currentIndex + 1) % total;
}
