import { expect, it } from 'vitest';
import { isQuestionAnswered } from './answer-completeness';

it('requires the requested number of different multi-select answers', () => {
  const question = { id: 'q1', number: 1, type: 'MULTI_SELECT' as const, prompt: 'Choose two',
    options: [{ id: 'A', label: 'Alpha' }, { id: 'B', label: 'Beta' }], minSelections: 2, maxSelections: 2 };
  expect(isQuestionAnswered(question, ['A'])).toBe(false);
  expect(isQuestionAnswered(question, ['A', 'A'])).toBe(false);
  expect(isQuestionAnswered(question, ['A', 'B'])).toBe(true);
});

it('does not count whitespace-only text as answered', () => {
  expect(isQuestionAnswered({ id: 'q1', number: 1, type: 'GAP_FILL', prompt: 'Answer' }, '   ')).toBe(false);
});
