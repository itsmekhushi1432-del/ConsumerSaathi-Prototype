// Builds complaint-route procedure steps and authorities for English and Hindi replies.
import type { ChatLanguage, ProcedureStep } from '../src/chat/types.ts';
import { PROCEDURE_TEXT } from './strings.ts';

const ECOMMERCE_TRIGGER_PATTERN =
  /\b(?:online|website|app|e-commerce|platform|marketplace|delivery|booking)\b/i;

const ECOMMERCE_TRIGGER_PATTERN_HI =
  /(?:^|[^\p{L}])(?:ऑनलाइन|वेबसाइट|ऐप|ई-कॉमर्स|प्लेटफॉर्म|प्लेटफ़ॉर्म|मार्केटप्लेस|डिलीवरी|बुकिंग|ऑर्डर)(?=[^\p{L}]|$)/iu;

export function isOnlinePurchaseQuestion(question: string): boolean {
  return (
    ECOMMERCE_TRIGGER_PATTERN.test(question) ||
    ECOMMERCE_TRIGGER_PATTERN_HI.test(question)
  );
}

export function buildProcedureSteps(
  question: string,
  lang: ChatLanguage = 'en',
): ProcedureStep[] {
  const steps: ProcedureStep[] = [];
  const isOnline = isOnlinePurchaseQuestion(question);
  const copy = lang === 'hi' ? PROCEDURE_TEXT.hi : PROCEDURE_TEXT.en;

  if (isOnline) {
    steps.push({
      step: copy.grievanceStep,
      authority: copy.grievanceAuthority,
    });
  }

  steps.push({
    step: copy.nchStep,
    authority: copy.nchAuthority,
  });

  steps.push({
    step: copy.commissionStep,
    authority: copy.commissionAuthority,
  });

  return steps;
}
