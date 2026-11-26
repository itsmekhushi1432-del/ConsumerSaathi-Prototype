import type { ChatLanguage } from '../chat/types';
import { BalanceScaleIcon } from './Icons';

interface ChatHeaderProps {
  lang: ChatLanguage;
  onChangeLanguage: (nextLang: ChatLanguage) => void;
}

export function ChatHeader({ lang, onChangeLanguage }: ChatHeaderProps) {
  const isHi = lang === 'hi';

  return (
    <header className="chat-header">
      <div className="chat-header-inner">
        <div className="chat-header-brand-group">
          <div className="chat-header-avatar" aria-hidden="true">
            <BalanceScaleIcon size={22} />
          </div>
          <div className="chat-header-text">
            <p className="chat-brand">ConsumerSaathi</p>
            <p className="chat-header-subtitle">
              {isHi
                ? 'उपभोक्ता कानून की जानकारी · कानूनी सलाह नहीं'
                : 'Consumer law information · not legal advice'}
            </p>
          </div>
        </div>

        <div className="chat-header-right">
          <p className="chat-header-scope">
            {isHi
              ? 'उपभोक्ता संरक्षण अधिनियम, 2019 · ई-कॉमर्स नियम, 2020'
              : 'Consumer Protection Act, 2019 · E-Commerce Rules, 2020'}
          </p>
          <div
            className="lang-toggle"
            role="group"
            aria-label={isHi ? 'भाषा चुनें' : 'Language toggle'}
          >
            <button
              type="button"
              className={`lang-toggle-btn${lang === 'en' ? ' lang-toggle-btn-active' : ''}`}
              aria-pressed={lang === 'en'}
              onClick={() => onChangeLanguage('en')}
            >
              English
            </button>
            <span className="lang-toggle-sep" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              className={`lang-toggle-btn${lang === 'hi' ? ' lang-toggle-btn-active' : ''}`}
              aria-pressed={lang === 'hi'}
              onClick={() => onChangeLanguage('hi')}
            >
              हिन्दी
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
