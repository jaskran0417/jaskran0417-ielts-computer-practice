import type { StudentQuestion } from '../test-schema/types';
import { CompletionQuestion } from './CompletionQuestion';
import { DiagramLabelQuestion } from './DiagramLabelQuestion';
import { GapFillQuestion } from './GapFillQuestion';
import { MatchingQuestion } from './MatchingQuestion';
import { MultiSelectQuestion } from './MultiSelectQuestion';
import { SingleChoiceQuestion } from './SingleChoiceQuestion';
import { TableCompletionQuestion } from './TableCompletionQuestion';
import { TrueFalseNotGivenQuestion } from './TrueFalseNotGivenQuestion';
import { YesNoNotGivenQuestion } from './YesNoNotGivenQuestion';

export interface QuestionRendererProps {
  question: StudentQuestion;
  value: string | string[] | undefined;
  onChange(value: string | string[]): void;
  disabled: boolean;
  assetUrlById?: Record<string, string>;
}

export function QuestionRenderer({
  question,
  value,
  onChange,
  disabled,
  assetUrlById = {},
}: QuestionRendererProps) {
  switch (question.type) {
    case 'SINGLE_CHOICE':
      return (
        <SingleChoiceQuestion
          question={question}
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'MULTI_SELECT':
      return (
        <MultiSelectQuestion
          question={question}
          value={Array.isArray(value) ? value : undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'GAP_FILL':
      return (
        <GapFillQuestion
          question={question}
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'TRUE_FALSE_NOT_GIVEN':
      return (
        <TrueFalseNotGivenQuestion
          question={question}
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'YES_NO_NOT_GIVEN':
      return (
        <YesNoNotGivenQuestion
          question={question}
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
          disabled={disabled}
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
          disabled={disabled}
        />
      );
    case 'SHORT_ANSWER':
    case 'SENTENCE_COMPLETION':
    case 'SUMMARY_COMPLETION':
    case 'NOTE_COMPLETION':
    case 'FLOW_CHART_COMPLETION':
      return (
        <CompletionQuestion
          question={question}
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'DIAGRAM_LABEL_COMPLETION':
      return (
        <DiagramLabelQuestion
          question={question}
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
          disabled={disabled}
          assetUrl={assetUrlById[question.assetId]}
        />
      );
    case 'TABLE_COMPLETION':
      return (
        <TableCompletionQuestion
          question={question}
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
          disabled={disabled}
          assetUrl={assetUrlById[question.assetId]}
        />
      );
  }
}
