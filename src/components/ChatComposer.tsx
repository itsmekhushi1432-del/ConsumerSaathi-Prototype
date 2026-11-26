import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { ChatLanguage } from '../chat/types';
import {
  getNextPlaceholderIndex,
  PLACEHOLDER_CYCLE_MS,
  WELCOME_PLACEHOLDER_HI,
  WELCOME_PLACEHOLDERS,
} from '../chat/welcomeMotion';
import { SendArrowIcon } from './Icons';

interface ChatComposerProps {
  lang: ChatLanguage;
  value: string;
  isSending: boolean;
  isWelcomeActive: boolean;
  onChange: (nextValue: string) => void;
  onSubmit: () => void;
}

export function ChatComposer({
  lang,
  value,
  isSending,
  isWelcomeActive,
  onChange,
  onSubmit,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState<number>(0);
  const [hasFocusedInput, setHasFocusedInput] = useState<boolean>(false);
  const canSubmit = value.trim().length > 0 && !isSending;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(Math.max(el.scrollHeight, 44), 140);
    el.style.height = `${nextHeight}px`;
  }, [value]);

  // Cycle placeholder every 4s only on welcome panel and before user focuses the input
  useEffect(() => {
    if (!isWelcomeActive || hasFocusedInput) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setPlaceholderIndex((prev) => getNextPlaceholderIndex(prev, WELCOME_PLACEHOLDERS.length));
    }, PLACEHOLDER_CYCLE_MS);

    return () => window.clearInterval(timer);
  }, [isWelcomeActive, hasFocusedInput]);

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSubmit) {
      onSubmit();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      if (value.length > 0) {
        event.preventDefault();
        onChange('');
      } else {
        textareaRef.current?.blur();
      }
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSubmit) {
        onSubmit();
      }
    }
  };

  const activePlaceholder =
    lang === 'hi'
      ? WELCOME_PLACEHOLDER_HI
      : isWelcomeActive
        ? WELCOME_PLACEHOLDERS[placeholderIndex]
        : WELCOME_PLACEHOLDERS[0];

  const isHi = lang === 'hi';

  return (
    <footer className="chat-composer-bar">
      <form className="chat-composer-form" onSubmit={handleFormSubmit} noValidate>
        <label htmlFor="chat-input" className="sr-only">
          {isHi
            ? WELCOME_PLACEHOLDER_HI
            : 'Ask ConsumerSaathi a general consumer law question'}
        </label>
        <textarea
          ref={textareaRef}
          id="chat-input"
          className="chat-input"
          rows={1}
          maxLength={1000}
          value={value}
          onFocus={() => setHasFocusedInput(true)}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={activePlaceholder}
          disabled={isSending}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!canSubmit}
          aria-label={
            isHi
              ? isSending
                ? 'संदेश भेजा जा रहा है'
                : 'संदेश भेजें'
              : isSending
                ? 'Sending message'
                : 'Send message'
          }
        >
          <SendArrowIcon />
        </button>
      </form>
    </footer>
  );
}
