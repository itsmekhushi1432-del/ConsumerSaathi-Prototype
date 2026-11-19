export const CONSUMERSAATHI_DISCLAIMER =
  'ConsumerSaathi provides general legal information, not legal advice. It does not analyse individual ongoing cases or disputes. For your own situation, consult an advocate or call the National Consumer Helpline at 1915.';

export type ChatReplyType = 'answer' | 'refusal' | 'out_of_scope' | 'not_found' | 'chitchat';

export interface ChatCitation {
  document: string;
  section: string;
  authority: string;
  text: string;
  url: string;
  needsVerification: boolean;
}

export interface ProcedureStep {
  step: string;
  authority: string;
}

export interface ChatApiResponse {
  type: ChatReplyType | string;
  answer: string;
  citations: ChatCitation[];
  procedure: ProcedureStep[];
  disclaimer: string;
}

export interface UserChatMessage {
  id: string;
  role: 'user';
  text: string;
}

export interface BotChatMessage {
  id: string;
  role: 'bot';
  response: ChatApiResponse;
  isError?: boolean;
}

export type ChatMessage = UserChatMessage | BotChatMessage;
