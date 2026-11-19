import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiClient, processChatMessage } from './chatHandler.ts';
import { KNOWLEDGE_BASE } from '../src/knowledgeBase.ts';
import { CONSUMERSAATHI_DISCLAIMER, type ChatApiResponse } from '../src/chat/types.ts';

test('processChatMessage returns 400 when body or message is missing or blank', async () => {
  const missingBody = await processChatMessage(null, KNOWLEDGE_BASE, null);
  assert.equal(missingBody.status, 400);

  const emptyMessage = await processChatMessage({ message: '   ' }, KNOWLEDGE_BASE, null);
  assert.equal(emptyMessage.status, 400);

  const nonStringMessage = await processChatMessage({ message: 123 }, KNOWLEDGE_BASE, null);
  assert.equal(nonStringMessage.status, 400);
});

test('processChatMessage works with no API key and returns grounded citations and procedure', async () => {
  const result = await processChatMessage(
    { message: 'What is a defect under Section 2(10) of Consumer Protection Act?' },
    KNOWLEDGE_BASE,
    null,
  );
  assert.equal(result.status, 200);
  const body = result.body as ChatApiResponse;
  assert.equal(body.type, 'answer');
  assert.equal(body.answer, 'See Consumer Protection Act, 2019, Section 2(10) below.');
  assert.equal(body.disclaimer, CONSUMERSAATHI_DISCLAIMER);
  assert.ok(body.citations.length >= 1 && body.citations.length <= 2);
  assert.equal(body.citations[0].section, 'Section 2(10)');
  assert.equal(body.procedure.length, 2);
});

test('createGeminiClient returns null when API key is missing and client when provided', () => {
  assert.equal(createGeminiClient(''), null);
  assert.equal(createGeminiClient(undefined), null);
  const client = createGeminiClient('test-key-placeholder');
  assert.ok(client !== null);
});
