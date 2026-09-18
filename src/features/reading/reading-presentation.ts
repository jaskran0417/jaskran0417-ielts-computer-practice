const RANGE_PREFIX = /^\s*Questions?\s+\d+\s*[-–—]\s*\d+\s*/i;
const NUMBERED_QUESTION = /(?:^|\s)\d{1,3}[.)]\s+/;
const PRACTICE_FOOTER =
  /^(?:After you(?:['’])?ve tried these questions|Note:\s*This is not a real IELTS test|IELTS Advantage Practice Reading Test\s*\d*)/i;

export function readingGroupDisplayInstruction(text: string): string {
  const output: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim();

    if (!line) continue;
    line = line.replace(RANGE_PREFIX, '').trim();
    if (!line) continue;

    if (PRACTICE_FOOTER.test(line) || /^List of Headings\b/i.test(line)) {
      break;
    }

    const numberedIndex = line.search(NUMBERED_QUESTION);
    if (numberedIndex === 0) break;
    if (numberedIndex > 0) {
      const before = line.slice(0, numberedIndex).trim();
      if (before) output.push(before);
      break;
    }

    output.push(line);
  }

  return output.join('\n').trim();
}
