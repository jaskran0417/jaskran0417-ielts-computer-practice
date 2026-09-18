import type { PassageTextRange } from '../../exam-engine/types';

function elementForNode(node: Node): Element | null {
  return node.nodeType === Node.ELEMENT_NODE
    ? (node as Element)
    : node.parentElement;
}

function paragraphForNode(node: Node, container: HTMLElement): HTMLElement | null {
  const element = elementForNode(node);
  const paragraph = element?.closest<HTMLElement>('[data-paragraph-index]') ?? null;
  if (!paragraph || !container.contains(paragraph)) {
    return null;
  }
  return paragraph;
}

function offsetWithinParagraph(
  paragraph: HTMLElement,
  node: Node,
  offset: number,
): number {
  const prefix = document.createRange();
  prefix.selectNodeContents(paragraph);
  prefix.setEnd(node, offset);
  return prefix.toString().length;
}

export function passageRangeFromSelection(
  selection: Selection | null,
  passageId: string,
  container: HTMLElement,
): PassageTextRange | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const startParagraph = paragraphForNode(range.startContainer, container);
  const endParagraph = paragraphForNode(range.endContainer, container);

  if (!startParagraph || !endParagraph || startParagraph !== endParagraph) {
    return null;
  }

  const paragraphIndex = Number(startParagraph.dataset.paragraphIndex);
  if (!Number.isInteger(paragraphIndex) || paragraphIndex < 0) {
    return null;
  }

  const startOffset = offsetWithinParagraph(
    startParagraph,
    range.startContainer,
    range.startOffset,
  );
  const endOffset = offsetWithinParagraph(
    startParagraph,
    range.endContainer,
    range.endOffset,
  );

  if (endOffset <= startOffset) {
    return null;
  }

  const paragraphText = startParagraph.textContent ?? '';
  const text = paragraphText.slice(startOffset, endOffset);

  if (!text.trim()) {
    return null;
  }

  return {
    passageId,
    paragraphIndex,
    startOffset,
    endOffset,
    text,
  };
}
