// Central repository of all fixed English and Hindi text strings and topic chip lists.
import {
  CONSUMERSAATHI_DISCLAIMER,
  CONSUMERSAATHI_DISCLAIMER_HI,
  type ChatLanguage,
} from '../src/chat/types.ts';

export const ALL_TOPICS: readonly string[] = [
  'Consumer Rights',
  'Consumer Protection Act 2019',
  'E-Commerce Rules 2020',
  'Refunds and Replacements',
  'Defective Products',
  'Deficient Services',
  'Online Shopping Issues',
  'Product Liability',
  'Misleading Advertisements',
  'Unfair Trade Practices',
  'Complaint Filing Process',
  'Consumer Commissions',
  'Complaint Deadlines',
  'Consumer Awareness',
];

export const HINDI_TOPICS: readonly string[] = [
  'उपभोक्ता अधिकार',
  'उपभोक्ता संरक्षण अधिनियम 2019',
  'ई-कॉमर्स नियम 2020',
  'रिफंड और वापसी',
  'खराब उत्पाद',
  'सेवा में कमी',
  'ऑनलाइन खरीदारी की समस्याएँ',
  'उत्पाद दायित्व',
  'भ्रामक विज्ञापन',
  'अनुचित व्यापार प्रथाएँ',
  'शिकायत दर्ज करने की प्रक्रिया',
  'उपभोक्ता आयोग',
  'शिकायत की समय-सीमा',
  'उपभोक्ता जागरूकता',
];

export function getDisclaimerForLang(lang: ChatLanguage): string {
  return lang === 'hi' ? CONSUMERSAATHI_DISCLAIMER_HI : CONSUMERSAATHI_DISCLAIMER;
}

export const EMPTY_INPUT_MESSAGE =
  "Type a question about consumer rights and I'll do my best to help.";

export const EMPTY_INPUT_MESSAGE_HI =
  'उपभोक्ता अधिकारों के बारे में कोई प्रश्न लिखें और मैं आपकी मदद करने की पूरी कोशिश करूँगा।';

export const NOT_FOUND_MESSAGE =
  "I'm not sure I understood that. I can help with consumer rights under the Consumer Protection Act, 2019 and the E-Commerce Rules, 2020, such as refunds, defective products, online shopping issues, complaint deadlines and which Commission to approach. Which of these are you asking about? You can also rephrase your question.";

export const NOT_FOUND_MESSAGE_HI =
  'मैं यह पूरी तरह समझ नहीं पाया। मैं उपभोक्ता संरक्षण अधिनियम, 2019 और ई-कॉमर्स नियम, 2020 के अंतर्गत उपभोक्ता अधिकारों—जैसे रिफंड, खराब उत्पाद, ऑनलाइन खरीदारी की समस्याएँ, शिकायत की समय-सीमा और कौन-से आयोग में शिकायत करनी है—में मदद कर सकता हूँ। आप इनमें से किस बारे में पूछ रहे हैं? आप अपना प्रश्न दोबारा भी लिख सकते हैं।';

export const OFF_TOPIC_MESSAGE =
  "That's outside what I can help with, since I only cover consumer protection law. I'd be glad to help with refunds, defective products, online orders or complaints.";

export const OFF_TOPIC_MESSAGE_HI =
  'यह मेरे दायरे से बाहर है, क्योंकि मैं केवल उपभोक्ता संरक्षण कानून से जुड़े प्रश्नों में मदद करता हूँ। मैं रिफंड, खराब उत्पाद, ऑनलाइन ऑर्डर या शिकायतों के बारे में आपकी मदद करने के लिए तैयार हूँ।';

export const INJECTION_REFUSAL_EN =
  'I cannot follow instructions that override my guidelines or expose system instructions. I can only provide general legal information from the Consumer Protection Act, 2019 and related consumer rules in my knowledge base.';

export const INJECTION_REFUSAL_HI =
  'मैं ऐसे निर्देशों का पालन नहीं कर सकता जो मेरे काम करने का तरीका बदलते हैं। मैं उपभोक्ता संरक्षण अधिनियम, 2019 और ई-कॉमर्स नियम, 2020 से जुड़े प्रश्नों का उत्तर दे सकता हूँ।';

export const OUT_OF_SCOPE_MESSAGE_HI =
  'यह प्रश्न उपभोक्ता संरक्षण अधिनियम, 2019 और ई-कॉमर्स नियम, 2020 के दायरे से बाहर है। कृपया किसी अधिवक्ता या संबंधित विभाग से संपर्क करें। यदि आपका प्रश्न किसी खरीदारी या भुगतान की गई सेवा से जुड़ा है, तो कृपया उसे उसी रूप में पूछें ताकि मैं उपभोक्ता संरक्षण अधिनियम में देख सकूँ।';

export const CLOSEST_PASSAGES_INTRO =
  "I don't have an exact passage for that, but these are the closest parts of the Act. They may not fully answer your question.";

export const CLOSEST_PASSAGES_INTRO_HI =
  'मेरे पास इसके लिए बिल्कुल सटीक अंश नहीं है, लेकिन अधिनियम के सबसे निकटतम भाग नीचे दिए गए हैं। ये आपके प्रश्न का पूरा उत्तर नहीं भी दे सकते हैं।';

export const GREETING_REPLY =
  "Hello! I'm ConsumerSaathi, your AI assistant for consumer rights and the Consumer Protection Act, 2019.\n\nI'm here to help you understand your consumer rights, complaint procedures, refunds, online shopping issues, and much more.\n\nHow may I assist you today?";

export const GREETING_REPLY_HI =
  'नमस्ते! मैं ConsumerSaathi हूँ। उपभोक्ता अधिकार, शिकायत की प्रक्रिया और अधिनियम की धाराओं के बारे में आप क्या जानना चाहते हैं?';

export const HOW_ARE_YOU_REPLY =
  "I'm doing well, thank you for asking! I'm here and ready to help you with any questions related to consumer rights or consumer law.";

export const NICE_TO_MEET_REPLY =
  "It's lovely to hear from you! Feel free to ask any questions you have about consumer rights, refunds, online shopping rules, or complaint procedures.";

export const HOW_ARE_YOU_REPLY_HI =
  'मैं ठीक हूँ, धन्यवाद! उपभोक्ता कानून से जुड़ा आपका क्या प्रश्न है?';

export const THANKS_SHORT_REPLY =
  "You're very welcome! I'm glad I could help. If you ever have more questions about consumer rights or consumer protection, feel free to ask.";

export const THANKS_PLEASURE_REPLY =
  "It's my pleasure! If you have any more questions about consumer rights, refunds, complaint procedures, or consumer protection laws, I'm always here to help.";

export const THANKS_MUCH_REPLY =
  "You're most welcome! I'm happy I could assist you.\n\nWhenever you need guidance about consumer rights or consumer law, don't hesitate to ask.";

export const THANKS_ACK_REPLY =
  'Glad to help! Whenever you have a question about consumer rights, refunds, or consumer law, feel free to ask.';

export const THANKS_REPLY_HI =
  'आपका स्वागत है! उपभोक्ता अधिकारों या शिकायत की प्रक्रिया के बारे में कुछ और पूछना हो तो बताइए।';

export const BYE_REPLY =
  'Goodbye!\n\nThank you for using ConsumerSaathi.\n\nTake care, and remember that being aware of your consumer rights helps you make informed decisions.\n\nHave a wonderful day!';

export const BYE_REPLY_HI =
  'अलविदा! अपना ध्यान रखिए। शिकायत में मदद चाहिए तो राष्ट्रीय उपभोक्ता हेल्पलाइन 1915 है।';

export const HELP_ASK_REPLY =
  "Of course, I'm happy to help! Tell me what you'd like to know about consumer rights. Pick a topic below or ask your own question. I give general information, not legal advice.";

export const HELP_REPLY_HI =
  'ज़रूर, मुझे मदद करके खुशी होगी! बताइए आप क्या जानना चाहते हैं, जैसे रिफंड, खराब सामान, ऑनलाइन खरीदारी के नियम, शिकायत की समय-सीमा या राष्ट्रीय उपभोक्ता हेल्पलाइन (1915)। मैं सामान्य जानकारी देता हूँ, कानूनी सलाह नहीं।';

export const CAPABILITY_REPLY =
  "I'm ConsumerSaathi, an AI assistant designed to provide general information and guidance about consumer rights in India. Tap any topic below to explore, or ask your own consumer law question.\n\nPlease note that I provide general legal information and not legal advice.";

export const CAPABILITY_REPLY_HI =
  'मैं ConsumerSaathi हूँ, जो भारत में उपभोक्ता संरक्षण अधिनियम, 2019 और ई-कॉमर्स नियम, 2020 के आधार पर उपभोक्ता अधिकारों, रिफंड, खराब उत्पादों, ऑनलाइन खरीदारी के नियमों और शिकायत प्रक्रिया की सामान्य जानकारी देता है। नीचे दिए गए किसी विषय को चुनें या अपना प्रश्न पूछें। मैं कानूनी सलाह नहीं देता।';

export const FALLBACK_ANSWER_HI = 'नीचे अधिनियम का संबंधित अंश दिया गया है।';

export const BOT_IDENTITY_AI_REPLY =
  "I'm ConsumerSaathi, an AI chatbot. I explain consumer protection law in general terms, and I'm not a person or a lawyer.";

export const BOT_IDENTITY_AI_REPLY_HI =
  'मैं ConsumerSaathi हूँ, एक AI चैटबॉट। मैं उपभोक्ता संरक्षण कानून की सामान्य जानकारी देता हूँ, और मैं कोई व्यक्ति या वकील नहीं हूँ।';

export const BOT_LAWYER_REPLY =
  "No, I'm not a lawyer and I can't give legal advice. I can explain what the Consumer Protection Act, 2019 and the E-Commerce Rules, 2020 say in general, and point you to the right authority.";

export const BOT_LAWYER_REPLY_HI =
  'नहीं, मैं वकील नहीं हूँ और मैं कानूनी सलाह नहीं दे सकता। मैं केवल यह सामान्य जानकारी दे सकता हूँ कि उपभोक्ता संरक्षण अधिनियम, 2019 और ई-कॉमर्स नियम, 2020 क्या कहते हैं, और आपको सही प्राधिकारी के बारे में बता सकता हूँ।';

export const BOT_ACCURACY_REPLY =
  'I give general information only, taken from a fixed set of passages from the Consumer Protection Act, 2019 and the E-Commerce Rules, 2020, which I show under each answer. Please check the official source linked there, and ask an advocate about your own situation.';

export const BOT_ACCURACY_REPLY_HI =
  'मैं केवल सामान्य जानकारी देता हूँ, जो उपभोक्ता संरक्षण अधिनियम, 2019 और ई-कॉमर्स नियम, 2020 के निश्चित अंशों से ली गई है और प्रत्येक उत्तर के नीचे दिखाई जाती है। कृपया वहाँ दिए गए आधिकारिक स्रोत की जाँच करें और अपनी स्थिति के लिए किसी अधिवक्ता से सलाह लें।';

export const BOT_HOW_IT_WORKS_REPLY =
  "I check your question, search a fixed set of passages from the Consumer Protection Act, 2019 and the E-Commerce Rules, 2020, and show you the exact passage, the complaint route and the authority. I don't use the internet and I don't judge personal cases.";

export const BOT_HOW_IT_WORKS_REPLY_HI =
  'मैं आपका प्रश्न देखता हूँ, उपभोक्ता संरक्षण अधिनियम, 2019 और ई-कॉमर्स नियम, 2020 के निश्चित अंशों में खोज करता हूँ, और आपको सटीक अंश, शिकायत की प्रक्रिया और संबंधित प्राधिकारी दिखाता हूँ। मैं इंटरनेट का उपयोग नहीं करता और व्यक्तिगत मामलों का निर्णय नहीं करता।';

export const BOT_FREE_REPLY = 'Yes, ConsumerSaathi is free to use.';

export const BOT_FREE_REPLY_HI = 'हाँ, ConsumerSaathi का उपयोग पूरी तरह नि:शुल्क है।';

export const PROCEDURE_TEXT = {
  en: {
    grievanceStep:
      "Write to the e-commerce entity's Grievance Officer. It must acknowledge within 48 hours and resolve within one month.",
    grievanceAuthority: 'Grievance Officer of the e-commerce entity',
    nchStep:
      'Raise an informal complaint with the National Consumer Helpline: call 1915 or register on consumerhelpline.gov.in.',
    nchAuthority: 'National Consumer Helpline',
    commissionStep:
      'If unresolved, file a complaint within two years of the cause of action. The Commission depends on the value paid: District up to Rs 50 lakh, State above Rs 50 lakh up to Rs 2 crore, National above Rs 2 crore. Complaints can be filed online on e-Daakhil.',
    commissionAuthority:
      'District / State / National Consumer Disputes Redressal Commission',
  },
  hi: {
    grievanceStep:
      'ऑनलाइन खरीदारी में ई-कॉमर्स कंपनी के शिकायत अधिकारी (Grievance Officer) को लिखित शिकायत दें। वह 48 घंटे के भीतर शिकायत की प्राप्ति स्वीकार करेगा और एक महीने के भीतर निवारण करेगा।',
    grievanceAuthority: 'ई-कॉमर्स कंपनी का शिकायत अधिकारी',
    nchStep:
      'राष्ट्रीय उपभोक्ता हेल्पलाइन पर अनौपचारिक शिकायत दर्ज करें: 1915 पर कॉल करें या consumerhelpline.gov.in पर पंजीकरण करें।',
    nchAuthority: 'राष्ट्रीय उपभोक्ता हेल्पलाइन',
    commissionStep:
      'यदि समस्या हल न हो, तो शिकायत का कारण उत्पन्न होने के दो वर्ष के भीतर शिकायत दर्ज करें। कौन-सा आयोग सुनेगा, यह चुकाई गई राशि पर निर्भर करता है: जिला आयोग 50 लाख रुपये तक, राज्य आयोग 50 लाख से अधिक और 2 करोड़ रुपये तक, राष्ट्रीय आयोग 2 करोड़ रुपये से अधिक। शिकायत e-Daakhil पर ऑनलाइन भी दर्ज की जा सकती है।',
    commissionAuthority: 'जिला / राज्य / राष्ट्रीय उपभोक्ता विवाद निवारण आयोग',
  },
} as const;
