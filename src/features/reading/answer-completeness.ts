import type { StudentQuestion } from '../../test-schema/types';

export function isQuestionAnswered(question: StudentQuestion, value: string | string[] | undefined): boolean {
  if (question.type === 'MULTI_SELECT') {
    if (!Array.isArray(value)) return false;
    const selected = new Set(value.filter(id => question.options.some(option => option.id === id)));
    return selected.size >= question.minSelections && selected.size <= question.maxSelections;
  }
  return typeof value === 'string' && value.trim().length > 0;
}
