export interface TestCase {
  id: number;
  input: string;
  expectedOutput: string;
}

export interface Question {
  id: number;
  title: string;
  description: string;
  language: string;
  score: number;
  assessmentId: number;
  testCases?: TestCase[];
}

export interface Assessment {
  id: number;
  name: string;
  description: string | null;
  timeLimit: number;
  questions: Question[];
}

export interface CaseResult {
  testCaseId: number;
  input: string;
  expected: string;
  actualOutput: string;
  passed: boolean;
  stderr: string;
  timedOut: boolean;
}

export interface SubmissionResponse {
  results: CaseResult[];
  saved: boolean;
  summary: {
    totalCases: number;
    passedCount: number;
    scorePercentage: number;
    score: number;
    maxScore: number;
  };
}

export interface QuestionResult {
  questionId: number;
  title: string;
  maxScore: number;
  attempted: boolean;
  passed: boolean;
  obtainedScore: number;
}

export interface ResultsData {
  assessmentId: number;
  candidateId: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  notAttemptedCount: number;
  totalMaxScore: number;
  totalObtainedScore: number;
  percentage: number;
  timeConsumedSeconds: number | null;
  questionResults: QuestionResult[];
}

export interface CandidateSummary {
  candidateId: string;
  submissions: number;
  lastActivity: string | null;
}
