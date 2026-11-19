import { useEffect, useRef, useState } from 'react';
import { CONSUMERSAATHI_DISCLAIMER } from '../chat/types';
import {
  advanceRotatingState,
  CARD_STAGGER_MS,
  createInitialRotatingState,
  getDisplayedRotatingText,
  getRotatingDelayMs,
  GREETING_CHAR_INTERVAL_MS,
  GREETING_CURSOR_HOLD_MS,
  ROTATING_PHRASES,
  SUBTITLE_FADE_MS,
  WELCOME_HEADING,
  WELCOME_STARTER_CARDS,
  WELCOME_SUBTITLE,
} from '../chat/welcomeMotion';
import { BalanceScaleIcon, StarterCardIcon } from './Icons';

interface WelcomePanelProps {
  isSending: boolean;
  onSelectStarter: (prompt: string) => void;
}

function getInitialReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function WelcomePanel({ isSending, onSelectStarter }: WelcomePanelProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(
    getInitialReducedMotion,
  );
  const [greetingLength, setGreetingLength] = useState<number>(() =>
    getInitialReducedMotion() ? WELCOME_HEADING.length : 0,
  );
  const [greetingComplete, setGreetingComplete] = useState<boolean>(() =>
    getInitialReducedMotion(),
  );
  const [showCursor, setShowCursor] = useState<boolean>(() => !getInitialReducedMotion());
  const [rotatingState, setRotatingState] = useState(createInitialRotatingState);

  const cursorTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    return undefined;
  }, []);

  // When reduced motion is turned on, show heading & subtitle instantly and hide cursor
  useEffect(() => {
    if (!prefersReducedMotion) return undefined;
    if (cursorTimerRef.current !== null) {
      window.clearTimeout(cursorTimerRef.current);
      cursorTimerRef.current = null;
    }
    setGreetingLength(WELCOME_HEADING.length);
    setGreetingComplete(true);
    setShowCursor(false);
    return undefined;
  }, [prefersReducedMotion]);

  // Greeting typewriter interval (~45ms per character)
  useEffect(() => {
    if (prefersReducedMotion || greetingComplete) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setGreetingLength((prev) => Math.min(prev + 1, WELCOME_HEADING.length));
    }, GREETING_CHAR_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [greetingComplete, prefersReducedMotion]);

  // Trigger subtitle/cards/rotating line when greeting finishes, then hide cursor after 1s
  useEffect(() => {
    if (prefersReducedMotion || greetingComplete || greetingLength < WELCOME_HEADING.length) {
      return undefined;
    }

    setGreetingComplete(true);
    cursorTimerRef.current = window.setTimeout(() => {
      setShowCursor(false);
      cursorTimerRef.current = null;
    }, GREETING_CURSOR_HOLD_MS);
    return undefined;
  }, [greetingLength, greetingComplete, prefersReducedMotion]);

  // Clear cursor hold timer on unmount
  useEffect(() => {
    return () => {
      if (cursorTimerRef.current !== null) {
        window.clearTimeout(cursorTimerRef.current);
        cursorTimerRef.current = null;
      }
    };
  }, []);

  // Rotating teal line after greeting finishes (disabled under prefers-reduced-motion)
  useEffect(() => {
    if (prefersReducedMotion || !greetingComplete) {
      return undefined;
    }

    const delay = getRotatingDelayMs(rotatingState);
    const timer = window.setTimeout(() => {
      setRotatingState((prev) => advanceRotatingState(prev, ROTATING_PHRASES));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [greetingComplete, prefersReducedMotion, rotatingState]);

  const handleHeadingClick = () => {
    if (greetingComplete) return;
    setGreetingLength(WELCOME_HEADING.length);
    setGreetingComplete(true);
    if (!prefersReducedMotion) {
      setShowCursor(true);
      if (cursorTimerRef.current !== null) {
        window.clearTimeout(cursorTimerRef.current);
      }
      cursorTimerRef.current = window.setTimeout(() => {
        setShowCursor(false);
        cursorTimerRef.current = null;
      }, GREETING_CURSOR_HOLD_MS);
    } else {
      setShowCursor(false);
    }
  };

  const displayedHeading = prefersReducedMotion
    ? WELCOME_HEADING
    : WELCOME_HEADING.slice(0, greetingLength);

  const displayedRotatingText = getDisplayedRotatingText(rotatingState, ROTATING_PHRASES);

  return (
    <main className="welcome-panel" aria-label="Welcome to ConsumerSaathi">
      <div className="welcome-panel-inner">
        <div className="welcome-hero">
          <div className="welcome-avatar" aria-hidden="true">
            <BalanceScaleIcon size={28} />
          </div>

          <h1
            className={`welcome-heading${greetingComplete ? '' : ' welcome-heading-typing'}`}
            onClick={handleHeadingClick}
            aria-label={WELCOME_HEADING}
          >
            <span>{displayedHeading}</span>
            {showCursor && !prefersReducedMotion && (
              <span className="welcome-cursor" aria-hidden="true" />
            )}
          </h1>

          {!prefersReducedMotion && (
            <p className="welcome-rotating-line" aria-live="off">
              {greetingComplete && (
                <>
                  <span>{displayedRotatingText}</span>
                  <span className="welcome-rotating-cursor" aria-hidden="true" />
                </>
              )}
            </p>
          )}

          <p
            className={`welcome-subtitle${
              greetingComplete || prefersReducedMotion ? ' welcome-subtitle-visible' : ''
            }`}
          >
            {WELCOME_SUBTITLE}
          </p>
        </div>

        <div className="welcome-cards-grid" aria-label="Suggested questions">
          {WELCOME_STARTER_CARDS.map((card, index) => (
            <div
              key={card.question}
              className={`welcome-card-slot${
                greetingComplete || prefersReducedMotion ? ' welcome-card-slot-visible' : ''
              }`}
              style={
                !prefersReducedMotion && greetingComplete
                  ? { animationDelay: `${SUBTITLE_FADE_MS + index * CARD_STAGGER_MS}ms` }
                  : undefined
              }
            >
              <button
                type="button"
                className="welcome-card"
                onClick={() => onSelectStarter(card.question)}
                disabled={isSending}
              >
                <span className="welcome-card-icon" aria-hidden="true">
                  <StarterCardIcon kind={card.icon} />
                </span>
                <span className="welcome-card-text">{card.question}</span>
              </button>
            </div>
          ))}
        </div>

        <p className="welcome-disclaimer">{CONSUMERSAATHI_DISCLAIMER}</p>
      </div>
    </main>
  );
}
