import test from 'node:test';
import assert from 'node:assert/strict';
import { KNOWLEDGE_BASE } from '../knowledgeBase.ts';
import {
  containsDevanagari,
  createBotMessage,
  createErrorBotMessage,
  createUserMessage,
  formatCitationLabel,
  getPortalLinks,
  loadFirstVisitAccepted,
  loadStoredFontSize,
  loadStoredHighContrast,
  loadStoredLanguage,
  normalizeChatResponse,
  saveFirstVisitAccepted,
  saveStoredFontSize,
  saveStoredHighContrast,
  saveStoredLanguage,
  validateUserInput,
} from './chatLogic.ts';
import {
  CONSUMERSAATHI_DISCLAIMER,
  CONSUMERSAATHI_DISCLAIMER_HI,
  type ChatCitation,
  type ProcedureStep,
} from './types.ts';

const SAMPLE_CITATION: ChatCitation = {
  document: 'Consumer Protection Act, 2019',
  section: 'Section 2(10)',
  authority: 'Ministry of Law and Justice',
  url: 'https://www.indiacode.nic.in/handle/123456789/15256',
  needsVerification: false,
  text: "Section 2(10): 'defect' means any fault...",
};

const SAMPLE_PROCEDURE: ProcedureStep[] = [
  {
    step: 'Raise an informal complaint with the National Consumer Helpline: call 1915 or register on consumerhelpline.gov.in.',
    authority: 'National Consumer Helpline',
  },
];

test('validateUserInput rejects blank strings and trims valid input', () => {
  assert.deepEqual(validateUserInput('   \n\t  '), { valid: false, trimmed: '' });
  assert.deepEqual(validateUserInput('  Consumer rights?  '), {
    valid: true,
    trimmed: 'Consumer rights?',
  });
});

test('normalizeChatResponse parses valid backend response with citations, procedure, and disclaimer', () => {
  const normalized = normalizeChatResponse({
    type: 'answer',
    answer: 'See Consumer Protection Act, 2019, Section 2(10) below.',
    citations: [SAMPLE_CITATION],
    procedure: SAMPLE_PROCEDURE,
    disclaimer: CONSUMERSAATHI_DISCLAIMER,
    suggestions: ['Consumer Rights', '  Defective Products  ', '', 123],
  });

  assert.equal(normalized.type, 'answer');
  assert.equal(normalized.answer, 'See Consumer Protection Act, 2019, Section 2(10) below.');
  assert.deepEqual(normalized.citations, [SAMPLE_CITATION]);
  assert.deepEqual(normalized.procedure, SAMPLE_PROCEDURE);
  assert.equal(normalized.disclaimer, CONSUMERSAATHI_DISCLAIMER);
  assert.deepEqual(normalized.suggestions, ['Consumer Rights', 'Defective Products']);
});

test('normalizeChatResponse falls back to canonical disclaimer if omitted', () => {
  const normalized = normalizeChatResponse({
    type: 'refusal',
    answer: 'General info.',
    citations: [SAMPLE_CITATION],
    procedure: SAMPLE_PROCEDURE,
  });

  assert.equal(normalized.disclaimer, CONSUMERSAATHI_DISCLAIMER);
  assert.equal(normalized.citations.length, 1);
  assert.deepEqual(normalized.procedure, SAMPLE_PROCEDURE);
});

test('normalizeChatResponse throws on invalid or empty response payload', () => {
  assert.throws(() => normalizeChatResponse(null), /Invalid response/);
  assert.throws(() => normalizeChatResponse({ type: 'answer', answer: '   ' }), /empty reply/);
});

test('message builders and citation formatter produce expected structures', () => {
  const userMsg = createUserMessage('Hello', 'u-1');
  assert.equal(userMsg.role, 'user');
  assert.equal(userMsg.text, 'Hello');

  const botMsg = createBotMessage(
    {
      type: 'answer',
      answer: 'Test',
      citations: [SAMPLE_CITATION],
      procedure: SAMPLE_PROCEDURE,
      disclaimer: CONSUMERSAATHI_DISCLAIMER,
    },
    'b-1',
  );
  assert.equal(botMsg.role, 'bot');
  assert.equal(botMsg.isError, undefined);

  const errMsg = createErrorBotMessage('Network unavailable', 'b-2');
  assert.equal(errMsg.isError, true);
  assert.equal(errMsg.response.disclaimer, CONSUMERSAATHI_DISCLAIMER);

  const errMsgHi = createErrorBotMessage('संपर्क विफल', 'b-3', 'hi');
  assert.equal(errMsgHi.response.lang, 'hi');
  assert.equal(errMsgHi.response.disclaimer, CONSUMERSAATHI_DISCLAIMER_HI);

  assert.equal(
    formatCitationLabel(SAMPLE_CITATION),
    'Consumer Protection Act, 2019 · Section 2(10) · Ministry of Law and Justice',
  );
});

test('Hindi helpers detect Devanagari, default Hindi disclaimer, and handle missing localStorage safely', () => {
  assert.equal(containsDevanagari('शिकायत की समय-सीमा'), true);
  assert.equal(containsDevanagari('Consumer rights'), false);

  // In Node environment without window, loadStoredLanguage / saveStoredLanguage must not throw
  assert.equal(loadStoredLanguage(), 'en');
  assert.doesNotThrow(() => saveStoredLanguage('hi'));

  const hiNormalized = normalizeChatResponse({
    type: 'answer',
    answer: 'नीचे अधिनियम का संबंधित अंश दिया गया है।',
    citations: [SAMPLE_CITATION],
    procedure: SAMPLE_PROCEDURE,
    lang: 'hi',
  });
  assert.equal(hiNormalized.lang, 'hi');
  assert.equal(hiNormalized.disclaimer, CONSUMERSAATHI_DISCLAIMER_HI);
});

test('normalizeChatResponse preserves isClosestMatch flag on response and citations', () => {
  const closestNormalized = normalizeChatResponse({
    type: 'answer',
    answer:
      "I don't have an exact passage for that, but these are the closest parts of the Act. They may not fully answer your question.",
    citations: [{ ...SAMPLE_CITATION, isClosestMatch: true }],
    procedure: SAMPLE_PROCEDURE,
    isClosestMatch: true,
  });

  assert.equal(closestNormalized.isClosestMatch, true);
  assert.equal(closestNormalized.citations[0].isClosestMatch, true);
});

test('portal preference storage helpers and getPortalLinks work safely without window', () => {
  assert.equal(loadStoredFontSize(), 16);
  assert.doesNotThrow(() => saveStoredFontSize(20));

  assert.equal(loadStoredHighContrast(), false);
  assert.doesNotThrow(() => saveStoredHighContrast(true));

  assert.equal(loadFirstVisitAccepted(), false);
  assert.doesNotThrow(() => saveFirstVisitAccepted());

  const links = getPortalLinks(KNOWLEDGE_BASE);
  assert.equal(links.length, 3);
  assert.equal(links[0].url, 'https://consumerhelpline.gov.in/');
  assert.equal(links[1].url, 'https://edaakhil.nic.in');
  assert.equal(
    links[2].url,
    'https://consumeraffairs.nic.in/acts-and-rules/consumer-protection',
  );
});

