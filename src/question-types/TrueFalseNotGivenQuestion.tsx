import type {
  TrueFalseNotGivenQuestion as TrueFalseNotGivenQuestionModel,
  YesNoNotGivenQuestion as YesNoNotGivenQuestionModel,
} from '../test-schema/types';

type Model = TrueFalseNotGivenQuestionModel | YesNoNotGivenQuestionModel;

interface Props {
  question: Model;
  value?: string;
  onChange(value: string): void;
}

export function TrueFalseNotGivenQuestion({ question, value, onChange }: Props) {
  const options =
    question.type === 'TRUE_FALSE_NOT_GIVEN'
      ? [
          ['TRUE', 'True'],
          ['FALSE', 'False'],
          ['NOT_GIVEN', 'Not Given'],
        ]
      : [
          ['YES', 'Yes'],
          ['NO', 'No'],
          ['NOT_GIVEN', 'Not Given'],
        ];

  return (
    <fieldset
      className="question-options"
      data-testid={`question-type-${question.type}`}
    >
      <legend className="sr-only">Question {question.number} choices</legend>
      {options.map(([id, label]) => (
        <label className="choice-row" key={id}>
          <input
            type="radio"
            name={question.id}
            value={id}
            checked={value === id}
            onChange={() => onChange(id)}
          />
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}
