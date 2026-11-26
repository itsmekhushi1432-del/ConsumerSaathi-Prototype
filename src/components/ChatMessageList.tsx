import { useEffect, useRef, useState } from 'react';
import { containsDevanagari, formatCitationLabel } from '../chat/chatLogic';
import type { ChatLanguage, ChatMessage } from '../chat/types';
import { BalanceScaleIcon, ChevronIcon } from './Icons';

interface ChatMessageListProps {
  lang: ChatLanguage;
  messages: ChatMessage[];
  isSending: boolean;
  onSelectSuggestion: (text: string) => void;
}

interface ReplyTagMeta {
  label: string;
  variant: 'teal' | 'amber' | 'grey';
}

function getReplyTag(
  type: string,
  isHindi: boolean,
  isClosestMatch?: boolean,
): ReplyTagMeta | null {
  if (type === 'refusal') {
    return {
      label: isHindi ? 'इस भाग में सहायता नहीं कर सकता' : "Can't help with that part",
      variant: 'amber',
    };
  }
  if (type === 'out_of_scope') {
    return {
      label: isHindi ? 'उपलब्ध दस्तावेज़ों से बाहर' : 'Outside my documents',
      variant: 'amber',
    };
  }
  if (type === 'not_found') {
    return {
      label: isHindi ? 'मार्गदर्शन' : 'Guidance',
      variant: 'grey',
    };
  }
  if (type === 'chitchat') {
    return null;
  }
  if (isClosestMatch) {
    return {
      label: isHindi ? 'निकटतम मिलान' : 'Closest match',
      variant: 'amber',
    };
  }
  return {
    label: isHindi ? 'उत्तर' : 'Answer',
    variant: 'teal',
  };
}

function BotAvatar() {
  return (
    <div className="bot-avatar" aria-hidden="true">
      <BalanceScaleIcon size={16} />
    </div>
  );
}

export function ChatMessageList({
  lang,
  messages,
  isSending,
  onSelectSuggestion,
}: ChatMessageListProps) {
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (messages.length === 0 && !isSending) {
      return;
    }
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    bottomAnchorRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [messages.length, isSending]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopy = async (messageId: string, text: string) => {
    let copied = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied && typeof document !== 'undefined') {
      try {
        const helper = document.createElement('textarea');
        helper.value = text;
        helper.setAttribute('readonly', '');
        helper.style.position = 'fixed';
        helper.style.left = '-9999px';
        document.body.appendChild(helper);
        helper.select();
        copied = document.execCommand('copy');
        document.body.removeChild(helper);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      setCopiedId(messageId);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedId(null);
        copyTimerRef.current = null;
      }, 2000);
    }
  };

  return (
    <main
      className="chat-thread"
      aria-label={lang === 'hi' ? 'चैट संदेश' : 'Chat messages'}
      aria-live="polite"
    >
      <div className="chat-thread-inner">
        {messages.map((message) => {
          if (message.role === 'user') {
            return (
              <div key={message.id} className="message-row message-row-user">
                <div className="user-bubble">{message.text}</div>
              </div>
            );
          }

          const { response, isError } = message;
          const isHindiReply =
            response.lang === 'hi' ||
            (!response.lang && (lang === 'hi' || containsDevanagari(response.answer)));
          const isChitchat = !isError && response.type === 'chitchat';
          const tag = isChitchat
            ? null
            : getReplyTag(response.type, isHindiReply, response.isClosestMatch);
          const suggestions = !isError ? response.suggestions ?? [] : [];
          const isCopied = copiedId === message.id;

          return (
            <div key={message.id} className="message-row message-row-bot">
              <BotAvatar />
              <div className="bot-message-col">
                <article
                  className="bot-bubble"
                  aria-label={isHindiReply ? 'ConsumerSaathi उत्तर' : 'ConsumerSaathi reply'}
                >
                  <div className="bot-tag-row">
                    <div className="bot-tag-slot">
                      {tag && (
                        <span className={`bot-tag bot-tag-${tag.variant}`}>{tag.label}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="bot-copy-btn"
                      onClick={() => {
                        void handleCopy(message.id, response.answer);
                      }}
                      aria-label={
                        isHindiReply
                          ? isCopied
                            ? 'उत्तर कॉपी हो गया'
                            : 'उत्तर कॉपी करें'
                          : isCopied
                            ? 'Copied answer'
                            : 'Copy answer'
                      }
                    >
                      {isHindiReply
                        ? isCopied
                          ? 'कॉपी हो गया'
                          : 'कॉपी करें'
                        : isCopied
                          ? 'Copied'
                          : 'Copy'}
                    </button>
                  </div>

                  <p className="bot-answer">{response.answer}</p>

                  {!isChitchat && response.citations.length > 0 && (
                    <details className="bot-collapsible">
                      <summary className="bot-collapsible-summary">
                        <span>{isHindiReply ? 'स्रोत' : 'Sources'}</span>
                        <ChevronIcon />
                      </summary>
                      <div className="bot-collapsible-body">
                        <ul className="citation-list">
                          {response.citations.map((citation, index) => (
                            <li
                              key={`${citation.document}-${citation.section}-${index}`}
                              className="citation-item"
                            >
                              <div className="citation-meta">
                                <span>{formatCitationLabel(citation)}</span>
                                {citation.url && (
                                  <>
                                    <span aria-hidden="true"> · </span>
                                    <a
                                      href={citation.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="citation-link"
                                    >
                                      {isHindiReply ? 'आधिकारिक स्रोत' : 'Official source'}
                                    </a>
                                  </>
                                )}
                              </div>
                              <p className="citation-text">{citation.text}</p>
                              {(citation.isClosestMatch || response.isClosestMatch) && (
                                <p className="citation-verify-note">
                                  {isHindiReply
                                    ? 'निकटतम मिलान — यह आपके प्रश्न का पूरा उत्तर नहीं भी दे सकता है।'
                                    : 'Closest match — may not fully answer your question.'}
                                </p>
                              )}
                              {citation.needsVerification && (
                                <p className="citation-verify-note">
                                  {isHindiReply
                                    ? 'यह नियम का सारांश है। कृपया आधिकारिक स्रोत पर सटीक पाठ अवश्य जाँचें।'
                                    : 'Summary of the rule. Check the exact wording at the official source.'}
                                </p>
                              )}
                              {isHindiReply && (
                                <p className="citation-lang-note">मूल पाठ अंग्रेज़ी में है।</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  )}

                  {!isChitchat && response.procedure.length > 0 && (
                    <details className="bot-collapsible">
                      <summary className="bot-collapsible-summary">
                        <span>
                          {isHindiReply ? 'प्रक्रिया और प्राधिकारी' : 'Procedure and authority'}
                        </span>
                        <ChevronIcon />
                      </summary>
                      <div className="bot-collapsible-body">
                        <ol className="procedure-list">
                          {response.procedure.map((item, index) => (
                            <li key={index} className="procedure-item">
                              <p className="procedure-step">{item.step}</p>
                              <p className="procedure-authority">
                                {isHindiReply ? 'प्राधिकारी' : 'Authority'}: {item.authority}
                              </p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </details>
                  )}

                  <p className="bot-disclaimer" data-testid="reply-disclaimer">
                    {response.disclaimer}
                  </p>
                </article>

                {suggestions.length > 0 && (
                  <div
                    className="bot-suggestions"
                    role="group"
                    aria-label={isHindiReply ? 'सुझाए गए विषय' : 'Suggested topics'}
                  >
                    {suggestions.map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        className="suggestion-chip"
                        disabled={isSending}
                        onClick={() => onSelectSuggestion(topic)}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="message-row message-row-bot">
            <BotAvatar />
            <div className="bot-bubble bot-typing-bubble">
              <div
                className="typing-dots"
                role="status"
                aria-label={lang === 'hi' ? 'ConsumerSaathi लिख रहा है' : 'ConsumerSaathi is typing'}
              >
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomAnchorRef} className="chat-scroll-anchor" />
      </div>
    </main>
  );
}
