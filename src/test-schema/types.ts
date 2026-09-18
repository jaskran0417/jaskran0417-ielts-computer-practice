export type ModuleKind = 'READING' | 'LISTENING' | 'WRITING';

export interface StudentTestPackage {
  id: string;
  versionId: string;
  title: string;
  durationSeconds: number;
  modules: ReadingModule[];
}

export interface ReadingModule {
  id: string;
  kind: 'READING';
  title: string;
  sections: ReadingSection[];
}

export interface ReadingSection {
  id: string;
  title: string;
  passage: ReadingPassage;
  questionGroups: QuestionGroup[];
}

export interface ReadingPassage {
  id: string;
  title: string;
  paragraphs: string[];
}

export interface QuestionGroup {
  id: string;
  instruction: string;
  questions: StudentQuestion[];
}

export interface InstructionConstraints {
  maxWords?: number;
  numbersAllowed?: boolean;
  optionReuse?: 'ONCE' | 'MULTIPLE';
  requiredSelections?: number;
}

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QuestionBase {
  id: string;
  number: number;
  prompt: string;
  constraints?: InstructionConstraints;
}

export interface ChoiceOption {
  id: string;
  label: string;
}

export interface SingleChoiceQuestion extends QuestionBase {
  type: 'SINGLE_CHOICE';
  options: ChoiceOption[];
}

export interface MultiSelectQuestion extends QuestionBase {
  type: 'MULTI_SELECT';
  options: ChoiceOption[];
}

export interface TrueFalseNotGivenQuestion extends QuestionBase {
  type: 'TRUE_FALSE_NOT_GIVEN';
}

export interface YesNoNotGivenQuestion extends QuestionBase {
  type: 'YES_NO_NOT_GIVEN';
}

export interface MatchingQuestion extends QuestionBase {
  type:
    | 'MATCHING_INFORMATION'
    | 'MATCHING_HEADINGS'
    | 'MATCHING_FEATURES'
    | 'MATCHING_SENTENCE_ENDINGS';
  options: ChoiceOption[];
}

export interface CompletionQuestion extends QuestionBase {
  type:
    | 'SHORT_ANSWER'
    | 'SENTENCE_COMPLETION'
    | 'SUMMARY_COMPLETION'
    | 'NOTE_COMPLETION'
    | 'TABLE_COMPLETION'
    | 'FLOW_CHART_COMPLETION';
  placeholder?: string;
}

export interface DiagramLabelQuestion extends QuestionBase {
  type: 'DIAGRAM_LABEL_COMPLETION';
  assetId: string;
  anchor?: NormalizedRect;
  placeholder?: string;
}

export interface GapFillQuestion extends QuestionBase {
  type: 'GAP_FILL';
  placeholder?: string;
}

export type StudentQuestion =
  | SingleChoiceQuestion
  | MultiSelectQuestion
  | TrueFalseNotGivenQuestion
  | YesNoNotGivenQuestion
  | MatchingQuestion
  | CompletionQuestion
  | DiagramLabelQuestion
  | GapFillQuestion;
