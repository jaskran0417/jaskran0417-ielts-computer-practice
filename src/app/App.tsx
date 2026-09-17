import type { AttemptRepository } from '../storage/attempt-repository';
import { ExamProvider } from '../features/exam/ExamProvider';
import { ReadingExam } from '../features/reading/ReadingExam';
import { sampleReadingTest } from '../test-schema/sample-reading';

interface AppProps {
  repository?: AttemptRepository;
  nowMs?: number;
}

export default function App({ repository, nowMs }: AppProps) {
  return (
    <ExamProvider test={sampleReadingTest} repository={repository} nowMs={nowMs}>
      <ReadingExam test={sampleReadingTest} />
    </ExamProvider>
  );
}
