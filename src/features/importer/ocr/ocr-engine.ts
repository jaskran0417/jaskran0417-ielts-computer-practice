export interface OcrResult {
  text: string;
  confidence: number | null;
}

export interface OcrEngine {
  recognize(image: Blob, options: { pass: 'A' | 'B' }): Promise<OcrResult>;
}
