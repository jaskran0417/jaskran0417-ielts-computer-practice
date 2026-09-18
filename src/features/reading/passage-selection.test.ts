import { describe, expect, it } from 'vitest';
import { passageRangeFromSelection } from './passage-selection';

function selectText(
  startNode: Node,
  startOffset: number,
  endNode: Node,
  endOffset: number,
): Selection {
  const selection = window.getSelection();
  if (!selection) throw new Error('Selection unavailable in test environment');
  selection.removeAllRanges();
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  selection.addRange(range);
  return selection;
}

describe('passageRangeFromSelection', () => {
  it('converts a selection inside one paragraph to semantic offsets', () => {
    const container = document.createElement('div');
    const paragraph = document.createElement('p');
    paragraph.dataset.paragraphIndex = '0';
    paragraph.textContent = 'Urban green spaces';
    container.append(paragraph);
    document.body.append(container);

    const textNode = paragraph.firstChild!;
    const result = passageRangeFromSelection(
      selectText(textNode, 0, textNode, 5),
      'passage-1',
      container,
    );

    expect(result).toEqual({
      passageId: 'passage-1',
      paragraphIndex: 0,
      startOffset: 0,
      endOffset: 5,
      text: 'Urban',
    });

    container.remove();
  });

  it('rejects a selection spanning more than one paragraph', () => {
    const container = document.createElement('div');
    const first = document.createElement('p');
    first.dataset.paragraphIndex = '0';
    first.textContent = 'First paragraph';
    const second = document.createElement('p');
    second.dataset.paragraphIndex = '1';
    second.textContent = 'Second paragraph';
    container.append(first, second);
    document.body.append(container);

    const result = passageRangeFromSelection(
      selectText(first.firstChild!, 0, second.firstChild!, 6),
      'passage-1',
      container,
    );

    expect(result).toBeNull();
    container.remove();
  });

  it('rejects a selection outside the passage container', () => {
    const container = document.createElement('div');
    const outside = document.createElement('p');
    outside.dataset.paragraphIndex = '0';
    outside.textContent = 'Outside text';
    document.body.append(container, outside);

    const result = passageRangeFromSelection(
      selectText(outside.firstChild!, 0, outside.firstChild!, 7),
      'passage-1',
      container,
    );

    expect(result).toBeNull();
    container.remove();
    outside.remove();
  });
});
