import type { ReactNode } from 'react';
import type { AnswerValue } from '../exam-engine/types';
import type { StudentQuestion } from '../test-schema/types';
import { CompletionQuestion } from './CompletionQuestion';
import { DiagramLabelQuestion } from './DiagramLabelQuestion';
import { GapFillQuestion } from './GapFillQuestion';
import { MatchingQuestion } from './MatchingQuestion';
import { MultiSelectQuestion } from './MultiSelectQuestion';
import { SingleChoiceQuestion } from './SingleChoiceQuestion';
import { TrueFalseNotGivenQuestion } from './TrueFalseNotGivenQuestion';

function assertNever(value: never): never {
  throw new Error(`Unsupported question type: ${JSON.stringify(value)}`);
}

export function renderStudentQuestion(
  question: StudentQuestion,
  value: AnswerValue | undefined,
  onChange: (value: AnswerValue) => void,
): ReactNode {
  switch (question.type) {
    case 'SINGLE_CHOICE':
      return (
        <div data-testid="question-type-SINGLE_CHOICE">
          <SingleChoiceQuestion
            question={question}
            value={typeof value === 'string' ? value : undefined}
            onChange={onChange}
          />
        </div>
      );
    case 'MULTI_SELECT':
      return (
        <MultiSelectQuestion
          question={question}
          value={Array.isArray(value) ? value : undefined}
          onChange={onChange}
        />
      );
    case 'TRUE_FALSE_NOT_GIVEN':
    case 'YES_NO_NOT_GIVEN':
      return (
        <TrueFalseNotGivenQuestion
          question={question}
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
        />
      );
    case 'MATCHING_INFORMATION':
    case 'MATCHING_HEADINGS':
    case 'MATCHING_FEATURES':
    case 'MATCHING_SENTENCE_ENDINGS':
      return (
        <MatchingQuestion
          question={question}
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
        />
      );
    case 'SHORT_ANSWER':
    case 'SENTENCE_COMPLETION':
    case 'SUMMARY_COMPLETION':
    case 'NOTE_COMPLETION':
    case 'TABLE_COMPLETION':
    case 'FLOW_CHART_COMPLETION':
      return (
        <CompletionQuestion
          question={question}
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
        />
      );
    case 'DIAGRAM_LABEL_COMPLETION':
      return (
        <DiagramLabelQuestion
          question={question}
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
        />
      );
    case 'GAP_FILL':
      return (
        <div data-testid="question-type-GAP_FILL">
          <GapFillQuestion
            question={question}
            value={typeof value === 'string' ? value : undefined}
            onChange={onChange}
          />
        </div>
      );
    default:
      return assertNever(question);
  }
}
