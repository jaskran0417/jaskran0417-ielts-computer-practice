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

export interface QuestionBase {
  id: string;
  number: number;
  prompt: string;
}

export interface SingleChoiceQuestion extends QuestionBase {
  type: 'SINGLE_CHOICE';
  options: Array<{ id: string; label: string }>;
}

export interface GapFillQuestion extends QuestionBase {
  type: 'GAP_FILL';
  placeholder?: string;
}

export type StudentQuestion = SingleChoiceQuestion | GapFillQuestion;
