import { describe, expect, it } from 'vitest';
import type { AnswerDefinition } from '../../../scoring/answer-definition';
import type { AnswerDefinitionMapping } from '../answer-key/map-answer-definitions';
import type {
  ReadingQuestionType,
  StructuredReadingDraft,
  StructuredQuestionDraft,
} from './reading-structure';
import { buildReadingPublication } from './build-reading-package';

function question(number: number, type: ReadingQuestionType = 'SHORT_ANSWER'): StructuredQuestionDraft {
  return {
    id: `q${number}`,
    number,
    questionType: type,
    prompt: `Question ${number}`,
    evidence: [{ documentId: 'doc-1', pageNumber: Math.ceil(number / 4), method: 'PDF_TEXT' }],
  };
}

function draft(): StructuredReadingDraft {
  const sections = [1, 2, 3].map((ordinal) => {
    const start = ordinal === 1 ? 1 : ordinal === 2 ? 15 : 28;
    const end = ordinal === 1 ? 14 : ordinal === 2 ? 27 : 40;
    return {
      id: `passage-${ordinal}`,
      ordinal,
      title: `Passage ${ordinal}`,
      passageText: [`Passage ${ordinal} verified text`],
      evidence: [{ documentId: 'doc-1', pageNumber: ordinal, method: 'PDF_TEXT' as const }],
      questionGroups: [{
        id: `questions-${start}-${end}`,
        range: [start, end] as const,
        pageNumber: ordinal,
        sourceText: `Questions ${start}-${end} Answer the questions.`,
        questionType: 'SHORT_ANSWER' as const,
        instructionConstraints: { maxWords: 2, numbersAllowed: true },
        questions: Array.from({ length: end - start + 1 }, (_, index) => question(start + index)),
        evidence: [{ documentId: 'doc-1', pageNumber: ordinal, method: 'PDF_TEXT' as const }],
      }],
    };
  });

  return {
    module: 'READING',
    title: 'Imported Reading Test',
    sections,
    reviewItems: [],
  };
}

function answers(): AnswerDefinitionMapping {
  const definitions: Record<string, AnswerDefinition> = {};
  for (let number = 1; number <= 40; number += 1) {
    definitions[`q${number}`] = {
      kind: 'TEXT',
      questionId: `q${number}`,
      accepted: [`answer ${number}`],
      policy: {
        caseSensitive: false,
        collapseWhitespace: true,
        punctuation: 'LENIENT',
        maxWords: 2,
        numbersAllowed: true,
        orderSensitive: false,
      },
      sourceEvidence: [{ documentId: 'answer-key', pageNumber: 13, method: 'ANSWER_KEY_A' }],
      verificationState: 'VERIFIED',
    };
  }
  return {
    definitions,
    unmappedQuestionNumbers: [],
    duplicateQuestionNumbers: [],
    unusedAnswerNumbers: [],
    reviewQuestionNumbers: [],
    publicationReady: true,
  };
}

describe('buildReadingPublication', () => {
  it('builds three passages and forty student questions without protected answers', () => {
    const result = buildReadingPublication({
      testId: 'test-1',
      versionId: 'version-1',
      draft: draft(),
      answers: answers(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reasons.join(', '));

    expect(result.value.studentPackage.modules[0].sections).toHaveLength(3);
    const questions = result.value.studentPackage.modules[0].sections.flatMap((section) =>
      section.questionGroups.flatMap((group) => group.questions),
    );
    expect(questions).toHaveLength(40);
    expect(Object.keys(result.value.protectedAnswers)).toHaveLength(40);

    const json = JSON.stringify(result.value.studentPackage);
    expect(json).not.toContain('accepted');
    expect(json).not.toContain('acceptedOptionIds');
    expect(json).not.toContain('correctAnswer');
    expect(json).not.toContain('answerDefinitions');
    expect(json).not.toContain('protectedAnswers');
  });

  it('blocks publication while a critical structure review item is unresolved', () => {
    const unsafe = draft();
    unsafe.reviewItems.push({
      id: 'q17-prompt',
      critical: true,
      reason: 'Question 17 prompt requires review',
      evidence: [{ documentId: 'doc-1', pageNumber: 6, method: 'PDF_TEXT' }],
    });

    expect(buildReadingPublication({
      testId: 'test-1',
      versionId: 'version-1',
      draft: unsafe,
      answers: answers(),
    })).toMatchObject({
      ok: false,
      reasons: [expect.stringContaining('critical structure')],
    });
  });

  it('blocks publication when answer coverage is incomplete', () => {
    const incomplete = answers();
    incomplete.publicationReady = false;
    incomplete.unmappedQuestionNumbers = [17];

    expect(buildReadingPublication({
      testId: 'test-1',
      versionId: 'version-1',
      draft: draft(),
      answers: incomplete,
    })).toMatchObject({
      ok: false,
      reasons: [expect.stringContaining('answer coverage')],
    });
  });

  it('blocks a diagram question until a confirmed visual asset is linked', () => {
    const visualDraft = draft();
    visualDraft.sections[0].questionGroups[0].questions[0] = question(1, 'DIAGRAM_LABEL_COMPLETION');

    expect(buildReadingPublication({
      testId: 'test-1',
      versionId: 'version-1',
      draft: visualDraft,
      answers: answers(),
    })).toMatchObject({
      ok: false,
      reasons: [expect.stringContaining('visual asset')],
    });
  });
});
