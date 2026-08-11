export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type QuestionType = 1 | 2 | 3 | 4;

export type Difficulty = "easy" | "medium" | "hard";

export interface UserSession {
  name: string;
  employeeId: string;
  rrnFront: string;
  team?: string;
  position?: string;
  loggedInAt: number;
  isAdmin?: boolean;
}

export interface FlameState {
  level: number;
  streak: number;
  lastStudyDay: string;
  color: string;
}

export interface UserSettings {
  examDate: string;
  targetLevel: Level;
  currentLevel?: Level;
  hchatApiKey: string;
  hchatEndpoint: string;
  hchatModel?: string;
  setupCompleted: boolean;
  onboardingSeen?: boolean;
  onboardingSkipForever?: boolean;
  noticesAccepted?: boolean;
  flame?: FlameState;
}

export interface StudyRecord {
  id: string;
  questionId: string;
  type: QuestionType;
  userAnswer: string;
  feedback?: AiFeedback;
  score?: number;
  bookmarked: boolean;
  noteText?: string;
  createdAt: number;
}

export interface ScoreCriteria {
  pronunciation: number;
  listening: number;
  vocabulary: number;
  grammar: number;
  fluency: number;
}

export const CRITERIA_MAX = {
  pronunciation: 12,
  listening: 36,
  vocabulary: 12,
  grammar: 24,
  fluency: 12,
} as const;

export type CriteriaKey = keyof ScoreCriteria;

/** 영역별(발음/청취·답변/어휘/문법/유창성) 세부 분석 */
export interface AreaAnalysis {
  summary: string;
  strengths: string[];
  improvements: string[];
}

/** 세부 피드백 항목 — 영역별 탭에 노출 */
export interface DetailTip {
  area: CriteriaKey;
  label: string;
  text: string;
  example?: string;
}

/** 고급 어휘·표현 제안 그룹 */
export interface VocabGroup {
  title: string;
  items: string[];
}

/** 추천 학습 액션 (진행률 표시용) */
export interface LearningAction {
  label: string;
  target: number;
  unit: string;
}

/** 발화 내용 구성 비율 */
export interface ContentSlice {
  label: string;
  percent: number;
}

/** 클라이언트에서 계산하는 발화 지표 (AI 호출 없이 측정 가능한 값) */
export interface SpeakingMetrics {
  responseSec?: number;
  speakingSec?: number;
  wordCount: number;
  sentenceCount: number;
  repeatedWords: number;
}

export interface AiFeedback {
  grammarIssues: string[];
  vocabularySuggestions: string[];
  betterExpressions: string[];
  modelAnswer: string;
  estimatedLevel: Level;
  scoreEstimate: number;
  strengths: string[];
  improvements: string[];
  criteria?: ScoreCriteria;

  // ── 확장 리포트용 필드 (AI 응답에 없으면 로컬 폴백으로 채움) ──
  summaryComment?: string;
  overallComment?: string;
  areas?: Partial<Record<CriteriaKey, AreaAnalysis>>;
  detailTips?: DetailTip[];
  vocabularyGroups?: VocabGroup[];
  learningActions?: LearningAction[];
  contentBreakdown?: ContentSlice[];
  topicRelevance?: number;
  confidence?: number;
}

export interface VocabEntry {
  word: string;
  meaning: string;
  example: string;
  source: string;
  addedAt: number;
}

export interface MockExamResult {
  examId: string;
  startedAt: number;
  finishedAt: number;
  type1: { questionId: string; answer: string; feedback?: AiFeedback };
  type2: { questionId: string; answer: string; feedback?: AiFeedback };
  type3: { questionId: string; answer: string; feedback?: AiFeedback };
  type4: { questionId: string; answer: string; feedback?: AiFeedback };
  totalScore: number;
  estimatedLevel: Level;
}

export interface LearnerProfile {
  name: string;
  employeeId: string;
  team: string;
  position: string;
  targetLevel: Level;
  examDate: string;
  startedAt: number;
  lastActiveAt: number;
  totalStudyMinutes: number;
  totalProblems: number;
  averageScore: number;
  recentScore: number;
  estimatedLevel: Level;
  mockExamCount: number;
}

export interface Type1Question {
  id: string;
  category: string;
  difficulty: Difficulty;
  question: string;
  follow_ups: string[];
  keywords: string[];
  sample_answer: string;
}

export interface Type2Question {
  id: string;
  category: string;
  difficulty: Difficulty;
  question: string;
  follow_ups: string[];
  arguments: Record<string, string[]>;
  sample_answer: string;
}

export interface Type3Item {
  id: string;
  subtype: string;
  category: string;
  difficulty: Difficulty;
  title?: string;
  chart?: {
    type: string;
    data: any[];
    unit?: string;
    x_label?: string;
    y_label?: string;
  };
  image_url?: string;
  image_description?: string;
  question: string;
  key_vocabulary?: string[];
  sample_answer: string;
}

export interface Type4Passage {
  id: string;
  category: string;
  difficulty: Difficulty;
  passage: string;
  key_points: string[];
  sample_summary: string;
}
