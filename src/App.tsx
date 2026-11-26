import { useEffect, useState } from 'react';
import { ChatComposer } from './components/ChatComposer';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessageList } from './components/ChatMessageList';
import { WelcomePanel } from './components/WelcomePanel';
import {
  createBotMessage,
  createUserMessage,
  loadStoredLanguage,
  normalizeChatResponse,
  saveStoredLanguage,
  validateUserInput,
} from './chat/chatLogic';
import {
  CONSUMERSAATHI_DISCLAIMER,
  CONSUMERSAATHI_DISCLAIMER_HI,
  type ChatLanguage,
  type ChatMessage,
} from './chat/types';
import { HINDI_WELCOME_CHIPS } from './chat/welcomeMotion';

const ENGLISH_FALLBACK_TOPICS = [
  'Consumer Rights',
  'Consumer Protection Act 2019',
  'E-Commerce Rules 2020',
  'Refunds and Replacements',
  'Defective Products',
  'Deficient Services',
];

function makeMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const [lang, setLang] = useState<ChatLanguage>(() => loadStoredLanguage());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const isWelcomeActive = messages.length === 0;

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    document.documentElement.classList.remove('high-contrast');
    document.documentElement.style.fontSize = '';
  }, []);

  const handleLanguageChange = (nextLang: ChatLanguage) => {
    setLang(nextLang);
    saveStoredLanguage(nextLang);
  };

  const sendMessage = async (rawText: string) => {
    const { valid, trimmed } = validateUserInput(rawText);
    if (!valid || isSending) {
      return;
    }

    const activeLang = lang;
    let previousQuestion: string | undefined;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (msg.role === 'user') {
        previousQuestion = msg.text;
        break;
      }
    }

    const userMessage = createUserMessage(trimmed, makeMessageId('user'));
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          lang: activeLang,
          ...(previousQuestion ? { previousQuestion } : {}),
        }),
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error('Request failed');
      }

      const normalized = normalizeChatResponse(payload);
      setMessages((prev) => [...prev, createBotMessage(normalized, makeMessageId('bot'))]);
    } catch {
      const guidanceAnswer =
        activeLang === 'hi'
          ? 'मैं यह पूरी तरह समझ नहीं पाया। मैं उपभोक्ता संरक्षण अधिनियम, 2019 और ई-कॉमर्स नियम, 2020 के अंतर्गत उपभोक्ता अधिकारों—जैसे रिफंड, खराब उत्पाद, ऑनलाइन खरीदारी की समस्याएँ, शिकायत की समय-सीमा और कौन-से आयोग में शिकायत करनी है—में मदद कर सकता हूँ। आप इनमें से किस बारे में पूछ रहे हैं? आप अपना प्रश्न दोबारा भी लिख सकते हैं।'
          : "I'm not sure I understood that. I can help with consumer rights under the Consumer Protection Act, 2019 and the E-Commerce Rules, 2020, such as refunds, defective products, online shopping issues, complaint deadlines and which Commission to approach. Which of these are you asking about? You can also rephrase your question.";
      const suggestions =
        activeLang === 'hi'
          ? [...HINDI_WELCOME_CHIPS.slice(0, 6)]
          : ENGLISH_FALLBACK_TOPICS;

      setMessages((prev) => [
        ...prev,
        createBotMessage(
          {
            type: 'not_found',
            answer: guidanceAnswer,
            citations: [],
            procedure: [],
            disclaimer:
              activeLang === 'hi' ? CONSUMERSAATHI_DISCLAIMER_HI : CONSUMERSAATHI_DISCLAIMER,
            suggestions,
            lang: activeLang,
          },
          makeMessageId('bot'),
        ),
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="chat-shell">
      <ChatHeader lang={lang} onChangeLanguage={handleLanguageChange} />
      {isWelcomeActive ? (
        <WelcomePanel
          lang={lang}
          isSending={isSending}
          onSelectStarter={(prompt) => {
            void sendMessage(prompt);
          }}
        />
      ) : (
        <ChatMessageList
          lang={lang}
          messages={messages}
          isSending={isSending}
          onSelectSuggestion={(suggestion) => {
            void sendMessage(suggestion);
          }}
        />
      )}
      <ChatComposer
        lang={lang}
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
