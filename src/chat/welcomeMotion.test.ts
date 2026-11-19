import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceRotatingState,
  CARD_STAGGER_MS,
  createInitialRotatingState,
  getDisplayedRotatingText,
  getNextPlaceholderIndex,
  getRotatingDelayMs,
  GREETING_CHAR_INTERVAL_MS,
  GREETING_CURSOR_HOLD_MS,
  PLACEHOLDER_CYCLE_MS,
  ROTATING_DELETE_MS,
  ROTATING_PAUSE_MS,
  ROTATING_PHRASES,
  ROTATING_TYPE_MS,
  SUBTITLE_FADE_MS,
  WELCOME_HEADING,
  WELCOME_PLACEHOLDERS,
  WELCOME_STARTER_CARDS,
  WELCOME_SUBTITLE,
} from './welcomeMotion.ts';

test('welcome copy and timing constants match specification', () => {
  assert.equal(WELCOME_HEADING, 'Hi Consumer, how can I help you today?');
  assert.equal(
    WELCOME_SUBTITLE,
    'Ask me about your consumer rights and how to complain, based on the Consumer Protection Act, 2019 and the E-Commerce Rules, 2020.',
  );
  assert.equal(GREETING_CHAR_INTERVAL_MS, 45);
  assert.equal(GREETING_CURSOR_HOLD_MS, 1000);
  assert.equal(SUBTITLE_FADE_MS, 400);
  assert.equal(CARD_STAGGER_MS, 80);
  assert.equal(ROTATING_TYPE_MS, 40);
  assert.equal(ROTATING_PAUSE_MS, 1500);
  assert.equal(ROTATING_DELETE_MS, 20);
  assert.equal(PLACEHOLDER_CYCLE_MS, 4000);
  assert.deepEqual(ROTATING_PHRASES, [
    'Know your refund rights',
    'Learn how to file a complaint online',
    'Find the right Commission',
    'See what the Act says',
  ]);
  assert.deepEqual(WELCOME_PLACEHOLDERS, [
    'Ask a consumer law question...',
    'How long do I have to file a complaint?',
    'Can a website charge cancellation fees?',
    'Which Commission handles my complaint?',
  ]);
  assert.equal(WELCOME_STARTER_CARDS.length, 4);
});

test('rotating line state machine types, pauses, deletes, and loops forever', () => {
  let state = createInitialRotatingState();
  assert.equal(getDisplayedRotatingText(state), '');
  assert.equal(getRotatingDelayMs(state), 40);

  const firstPhrase = ROTATING_PHRASES[0];
  for (let i = 0; i < firstPhrase.length; i += 1) {
    state = advanceRotatingState(state);
  }
  assert.equal(state.phase, 'pausing');
  assert.equal(getDisplayedRotatingText(state), firstPhrase);
  assert.equal(getRotatingDelayMs(state), 1500);

  // Pause finishes -> enter deleting
  state = advanceRotatingState(state);
  assert.equal(state.phase, 'deleting');
  assert.equal(getRotatingDelayMs(state), 20);

  // Delete all characters
  for (let i = 0; i < firstPhrase.length; i += 1) {
    state = advanceRotatingState(state);
  }
  assert.equal(state.phase, 'typing');
  assert.equal(state.phraseIndex, 1);
  assert.equal(state.charCount, 0);
  assert.equal(getDisplayedRotatingText(state), '');

  // Wrap around from last phrase back to 0
  state = {
    phraseIndex: ROTATING_PHRASES.length - 1,
    charCount: 1,
    phase: 'deleting',
  };
  state = advanceRotatingState(state);
  assert.equal(state.phraseIndex, 0);
  assert.equal(state.charCount, 0);
  assert.equal(state.phase, 'typing');
});

test('placeholder cycling wraps around through all 4 placeholders', () => {
  assert.equal(getNextPlaceholderIndex(0), 1);
  assert.equal(getNextPlaceholderIndex(1), 2);
  assert.equal(getNextPlaceholderIndex(2), 3);
  assert.equal(getNextPlaceholderIndex(3), 0);
});
