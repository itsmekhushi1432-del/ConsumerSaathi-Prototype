import { useEffect, useRef } from 'react';
import { formatCitationLabel } from '../chat/chatLogic';
import type { ChatMessage } from '../chat/types';
import { BalanceScaleIcon, ChevronIcon } from './Icons';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isSending: boolean;
}

interface ReplyTagMeta {
  label: string;
  variant: 'teal' | 'amber' | 'grey';
}

function getReplyTag(type: string, isError?: boolean): ReplyTagMeta | null {
  if (isError) {
    return { label: 'Unable to respond', variant: 'amber' };
  }
  if (type === 'refusal') {
    return { label: "Can't help with that part", variant: 'amber' };
  }
  if (type === 'out_of_scope') {
    return { label: 'Outside my documents', variant: 'amber' };
  }
  if (type === 'not_found' || type === 'chitchat') {
    return null;
  }
  return { label: 'Answer', variant: 'teal' };
}

function BotAvatar() {
  return (
    <div className="bot-avatar" aria-hidden="true">
      <BalanceScaleIcon size={16} />
    </div>
  );
}

export function ChatMessageList({ messages, isSending }: ChatMessageListProps) {
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <main className="chat-thread" aria-label="Chat messages">
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
          const isChitchat = !isError && response.type === 'chitchat';
          const tag = isChitchat ? null : getReplyTag(response.type, isError);

          return (
            <div key={message.id} className="message-row message-row-bot">
              <BotAvatar />
              <article
                className="bot-bubble"
                aria-label="ConsumerSaathi reply"
              >
                {tag && (
                  <div className="bot-tag-row">
                    <span className={`bot-tag bot-tag-${tag.variant}`}>{tag.label}</span>
                  </div>
                )}
                <p className="bot-answer">{response.answer}</p>

                {!isChitchat && response.citations.length > 0 && (
                  <details className="bot-collapsible">
                    <summary className="bot-collapsible-summary">
                      <span>Sources</span>
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
                                    Official source
                                  </a>
                                </>
                              )}
                            </div>
                            <p className="citation-text">{citation.text}</p>
                            {citation.needsVerification && (
                              <p className="citation-verify-note">
                                Summary of the rule. Check the exact wording at the official source.
                              </p>
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
                      <span>Procedure and authority</span>
                      <ChevronIcon />
                    </summary>
                    <div className="bot-collapsible-body">
                      <ol className="procedure-list">
                        {response.procedure.map((item, index) => (
                          <li key={index} className="procedure-item">
                            <p className="procedure-step">{item.step}</p>
                            <p className="procedure-authority">Authority: {item.authority}</p>
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
            </div>
          );
        })}

        {isSending && (
          <div className="message-row message-row-bot" aria-live="polite">
            <BotAvatar />
            <div className="bot-bubble bot-typing-bubble">
              <div
                className="typing-dots"
                role="status"
                aria-label="ConsumerSaathi is typing"
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
