import { ExamProvider } from '../features/exam/ExamProvider';
import { ReadingExam } from '../features/reading/ReadingExam';
import { sampleReadingTest } from '../test-schema/sample-reading';

export default function App() {
  return (
    <ExamProvider test={sampleReadingTest}>
      <ReadingExam test={sampleReadingTest} />
    </ExamProvider>
  );
}
