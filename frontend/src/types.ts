export type Role = 'ADMIN' | 'EVALUATOR' | 'CANDIDATE';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface ManagedUser extends User {
  active: boolean;
  createdAt: string;
}

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
  testCaseCount?: number;
}

export interface Assessment {
  id: number;
  name: string;
  description: string | null;
  timeLimit: number;
  questions: Question[];
}

export interface AttemptInfo {
  startedAt: string | null;
  deadline: string | null;
  serverNow: string;
  timeLimit: number;
}

export interface CaseResult {
  testCaseId: number;
  hidden: boolean;
  input: string;
  expected: string;
  actualOutput: string;
  passed: boolean;
  stderr: string;
  timedOut: boolean;
  compileError: boolean;
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
  candidate: { id: number; name: string; email: string };
  startedAt: string | null;
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

export interface AssignedCandidate {
  userId: number;
  name: string;
  email: string;
  assignedAt: string;
  started: boolean;
}

export interface CandidateSummary {
  userId: number;
  name: string;
  email: string;
  startedAt: string;
  submissions: number;
  lastActivity: string | null;
}

export interface ReviewData {
  questions: {
    questionId: number;
    title: string;
    maxScore: number;
    submissions: {
      id: number;
      language: string;
      code: string;
      passed: boolean | null;
      score: number | null;
      createdAt: string;
    }[];
  }[];
}
