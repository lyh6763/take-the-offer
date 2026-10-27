/** 지원 회사 = 팰리스 */
export type Company = {
  id: string;
  name: string;
  role: string;
  /** YYYY-MM-DD, 정하지 않았으면 null */
  interviewDate: string | null;
  /** 인재상·핵심 키워드 */
  keywords: string[];
  /** 이 회사에서 나올 것 같은 질문 */
  questions: string[];
  memo: string;
  createdAt: number;
  /** 예고장을 보낸(만든) 시각 */
  cardSentAt: number | null;
};

export type Category = 'personality' | 'job' | 'pressure' | 'company';

export const CATEGORY_LABEL: Record<Category, string> = {
  personality: '인성',
  job: '직무',
  pressure: '압박',
  company: '회사 맞춤',
};

export type Analysis = {
  /** 공백을 뺀 글자 수 */
  chars: number;
  /** 한글 음절 + 영문·숫자 단어 */
  syllables: number;
  durationSec: number;
  /** 분당 음절. 시간을 모르면 null */
  pace: number | null;
  fillers: { word: string; count: number }[];
  fillerTotal: number;
  conclusionFirst: boolean;
  star: { situation: boolean; task: boolean; action: boolean; result: boolean };
  hasNumbers: boolean;
  score: number;
  strengths: string[];
  weaknesses: string[];
};

export type AnswerRecord = {
  id: string;
  sessionId: string;
  companyId: string | null;
  question: string;
  category: Category;
  transcript: string;
  /** 'voice'는 음성 인식, 'text'는 직접 입력 */
  mode: 'voice' | 'text';
  analysis: Analysis;
  createdAt: number;
};

export type InterviewTurn = {
  question: { text: string; category: Category };
  transcript: string;
  mode: AnswerRecord['mode'];
  analysis: Analysis;
};

/** 완료 기록과 경험치에 반영하기 전까지 보관하는 면접 초안. */
export type InterviewDraft = {
  sessionId: string;
  companyId: string | null;
  phase: 'question' | 'review';
  questions: InterviewTurn['question'][];
  index: number;
  turns: InterviewTurn[];
  mode: AnswerRecord['mode'];
  answer: string;
  duration: number;
};

export type StatKey = 'knowledge' | 'guts' | 'eloquence' | 'attitude' | 'charm';

export type Stats = Record<StatKey, number>;

export type MotionPref = 'system' | 'reduce' | 'full';

export type Settings = {
  motion: MotionPref;
  voice: boolean;
  voiceRate: number;
  microphone: boolean;
};

export type State = {
  version: 1;
  companies: Company[];
  answers: AnswerRecord[];
  interviewDraft: InterviewDraft | null;
  /** 능력치별 누적 경험치 */
  exp: Stats;
  /** 한 번만 주는 보너스를 이미 받았는지 */
  awarded: string[];
  settings: Settings;
};
