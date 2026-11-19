import { BalanceScaleIcon } from './Icons';

export function ChatHeader() {
  return (
    <header className="chat-header">
      <div className="chat-header-inner">
        <div className="chat-header-brand-group">
          <div className="chat-header-avatar" aria-hidden="true">
            <BalanceScaleIcon size={22} />
          </div>
          <div className="chat-header-text">
            <p className="chat-brand">ConsumerSaathi</p>
            <p className="chat-header-subtitle">Consumer law information · not legal advice</p>
          </div>
        </div>
        <p className="chat-header-scope">
          Consumer Protection Act, 2019 · E-Commerce Rules, 2020
        </p>
      </div>
    </header>
  );
}
