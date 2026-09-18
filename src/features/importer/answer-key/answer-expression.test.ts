import { describe, expect, it } from 'vitest';
import { expandAnswerExpression } from './answer-expression';

describe('expandAnswerExpression', () => {
  it('expands one optional parenthetical prefix', () => {
    expect(expandAnswerExpression('(The) corona')).toEqual({
      state: 'VERIFIED',
      accepted: ['corona', 'the corona'],
      reasons: [],
    });
  });

  it('expands one optional prefix plus one simple slash alternative', () => {
    expect(expandAnswerExpression('(around) six/6 years')).toEqual({
      state: 'VERIFIED',
      accepted: ['six years', '6 years', 'around six years', 'around 6 years'],
      reasons: [],
    });
  });

  it('requires review for chained ambiguous slash notation', () => {
    expect(expandAnswerExpression('ninety/90 percent/per cent/%')).toMatchObject({
      state: 'REVIEW_REQUIRED',
      accepted: [],
    });
  });

  it('keeps a simple answer as one normalized accepted value', () => {
    expect(expandAnswerExpression('Radiative zone')).toEqual({
      state: 'VERIFIED',
      accepted: ['radiative zone'],
      reasons: [],
    });
  });
});
