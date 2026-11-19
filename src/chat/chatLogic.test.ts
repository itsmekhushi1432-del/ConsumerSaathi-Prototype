import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBotMessage,
  createErrorBotMessage,
  createUserMessage,
  formatCitationLabel,
  normalizeChatResponse,
  validateUserInput,
} from './chatLogic.ts';
import { CONSUMERSAATHI_DISCLAIMER, type ChatCitation, type ProcedureStep } from './types.ts';

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
  });

  assert.equal(normalized.type, 'answer');
  assert.equal(normalized.answer, 'See Consumer Protection Act, 2019, Section 2(10) below.');
  assert.deepEqual(normalized.citations, [SAMPLE_CITATION]);
  assert.deepEqual(normalized.procedure, SAMPLE_PROCEDURE);
  assert.equal(normalized.disclaimer, CONSUMERSAATHI_DISCLAIMER);
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

  assert.equal(
    formatCitationLabel(SAMPLE_CITATION),
    'Consumer Protection Act, 2019 · Section 2(10) · Ministry of Law and Justice',
  );
});
