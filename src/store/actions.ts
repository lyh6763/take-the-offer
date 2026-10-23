import { addStats, emptyStats, expForAnswer, rankUps } from '../lib/stats';
import { createId, getState, initialState, isExport, normalize, setState } from './store';
import type { AnswerRecord, Company, Settings, StatKey, Stats } from './types';

export type CompanyDraft = Omit<Company, 'id' | 'createdAt' | 'cardSentAt'>;

export function addCompany(draft: CompanyDraft) {
  const company: Company = { ...draft, id: createId(), createdAt: Date.now(), cardSentAt: null };
  setState((state) => ({ ...state, companies: [...state.companies, company] }));
  awardResearch(company.id);
  return company;
}

export function updateCompany(id: string, patch: Partial<CompanyDraft>) {
  setState((state) => ({
    ...state,
    companies: state.companies.map((company) => (company.id === id ? { ...company, ...patch } : company)),
  }));
  awardResearch(id);
}

export function deleteCompany(id: string) {
  setState((state) => ({
    ...state,
    companies: state.companies.filter((company) => company.id !== id),
    answers: state.answers.map((answer) => (answer.companyId === id ? { ...answer, companyId: null } : answer)),
  }));
}

/** 한 번만 주는 보너스. 이미 받았으면 아무것도 하지 않는다. */
function awardOnce(key: string, stat: StatKey, amount: number) {
  if (getState().awarded.includes(key)) return;
  setState((state) => ({
    ...state,
    awarded: [...state.awarded, key],
    exp: { ...state.exp, [stat]: state.exp[stat] + amount },
  }));
}

/** 인재상 키워드 3개 + 예상 질문 3개를 채우면 그 팰리스 조사 완료 보너스 */
function awardResearch(companyId: string) {
  const company = getState().companies.find((item) => item.id === companyId);
  if (company && company.keywords.length >= 3 && company.questions.filter(Boolean).length >= 3) {
    awardOnce(`research:${companyId}`, 'knowledge', 4);
  }
}

export function markCardSent(companyId: string | null) {
  awardOnce('card:first', 'charm', 5);
  if (!companyId) return;
  setState((state) => ({
    ...state,
    companies: state.companies.map((company) =>
      company.id === companyId ? { ...company, cardSentAt: company.cardSentAt ?? Date.now() } : company,
    ),
  }));
  awardOnce(`card:${companyId}`, 'charm', 3);
}

/** 잠입 한 번의 답변들을 저장하고 경험치를 준다. 결과 화면이 쓸 전후 능력치를 돌려준다. */
export function recordSession(records: Omit<AnswerRecord, 'id'>[]) {
  const before = getState().exp;
  const gained = records.reduce<Stats>((sum, record) => addStats(sum, expForAnswer(record)), emptyStats());
  const after = addStats(before, gained);
  setState((state) => ({
    ...state,
    answers: [...state.answers, ...records.map((record) => ({ ...record, id: createId() }))],
    exp: after,
  }));
  return { before, after, gained, ups: rankUps(before, after) };
}

export function updateSettings(patch: Partial<Settings>) {
  setState((state) => ({ ...state, settings: { ...state.settings, ...patch } }));
}

export function exportData() {
  return JSON.stringify(getState(), null, 2);
}

/** 내보낸 파일이 아니면 던진다(설정 화면이 안내문을 띄운다). 개별 필드가 어긋난 것은 normalize가 고친다. */
export function importData(json: string) {
  const parsed: unknown = JSON.parse(json);
  if (!isExport(parsed)) throw new Error('not an export file');
  setState(() => normalize(parsed));
}

export function resetData() {
  setState(() => initialState);
}
