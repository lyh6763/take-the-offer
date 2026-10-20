import type { AnswerRecord, Company } from '../store/types';

/** 팰리스 조사 진행도: 키워드 3개, 예상 질문 3개, 메모 */
export function researchChecks(company: Company) {
  return [
    { label: '인재상 키워드 3개', done: company.keywords.length >= 3 },
    { label: '예상 질문 3개', done: company.questions.filter(Boolean).length >= 3 },
    { label: '조사 메모', done: company.memo.trim().length > 0 },
  ];
}

export function infiltrationSummary(answers: AnswerRecord[], companyId: string) {
  const mine = answers.filter((answer) => answer.companyId === companyId);
  const sessions = new Set(mine.map((answer) => answer.sessionId)).size;
  const scores = mine.map((answer) => answer.analysis.score);
  return {
    sessions,
    answers: mine.length,
    best: scores.length ? Math.max(...scores) : null,
    average: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
  };
}

/** 쉼표·줄바꿈으로 구분된 입력을 목록으로 */
export function splitList(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function gradeOf(score: number) {
  if (score >= 90) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}
