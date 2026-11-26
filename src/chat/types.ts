export const CONSUMERSAATHI_DISCLAIMER =
  'ConsumerSaathi provides general legal information, not legal advice. It does not analyse individual ongoing cases or disputes. For your own situation, consult an advocate or call the National Consumer Helpline at 1915.';

export const CONSUMERSAATHI_DISCLAIMER_HI =
  'ConsumerSaathi केवल सामान्य कानूनी जानकारी देता है, कानूनी सलाह नहीं। यह किसी व्यक्ति के चल रहे मामले या विवाद का विश्लेषण नहीं करता। अपनी स्थिति के लिए कृपया किसी अधिवक्ता से परामर्श करें या राष्ट्रीय उपभोक्ता हेल्पलाइन 1915 पर कॉल करें।';

export type ChatLanguage = 'en' | 'hi';

export type ChatFontSize = 14 | 16 | 20;

export type ChatReplyType = 'answer' | 'refusal' | 'out_of_scope' | 'not_found' | 'chitchat';

export interface ChatCitation {
  document: string;
  section: string;
  authority: string;
  text: string;
  url: string;
  needsVerification: boolean;
  isClosestMatch?: boolean;
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
  suggestions?: string[];
  lang?: ChatLanguage;
  isClosestMatch?: boolean;
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
