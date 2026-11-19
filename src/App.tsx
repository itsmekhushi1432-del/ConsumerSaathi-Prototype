import { useState } from 'react';
import { ChatComposer } from './components/ChatComposer';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessageList } from './components/ChatMessageList';
import { WelcomePanel } from './components/WelcomePanel';
import {
  createBotMessage,
  createErrorBotMessage,
  createUserMessage,
  normalizeChatResponse,
  validateUserInput,
} from './chat/chatLogic';
import type { ChatMessage } from './chat/types';

function makeMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const isWelcomeActive = messages.length === 0;

  const sendMessage = async (rawText: string) => {
    const { valid, trimmed } = validateUserInput(rawText);
    if (!valid || isSending) {
      return;
    }

    const userMessage = createUserMessage(trimmed, makeMessageId('user'));
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error('Request failed');
      }

      const normalized = normalizeChatResponse(payload);
      setMessages((prev) => [...prev, createBotMessage(normalized, makeMessageId('bot'))]);
    } catch {
      const fallbackMessage =
        "I'm having trouble responding right now. Please try asking your consumer law question again in a moment.";
      setMessages((prev) => [...prev, createErrorBotMessage(fallbackMessage, makeMessageId('err'))]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="chat-shell">
      <ChatHeader />
      {isWelcomeActive ? (
        <WelcomePanel
          isSending={isSending}
          onSelectStarter={(prompt) => {
            void sendMessage(prompt);
          }}
        />
      ) : (
        <ChatMessageList messages={messages} isSending={isSending} />
      )}
      <ChatComposer
        value={input}
        isSending={isSending}
        isWelcomeActive={isWelcomeActive}
        onChange={setInput}
        onSubmit={() => {
          void sendMessage(input);
        }}
      />
    </div>
  );
}
