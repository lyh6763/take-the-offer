import { useSyncExternalStore } from 'react';

import type { Analysis, AnswerRecord, Category, Company, InterviewDraft, InterviewTurn, MotionPref, Settings, State, Stats } from './types';

// 이전 가제(interview-thieves) 때 만든 키. 바꾸면 이미 저장된 기록을 못 읽으므로 그대로 둔다.
const STORAGE_KEY = 'interview-thieves:v1';

export const initialState: State = {
  version: 1,
  companies: [],
  answers: [],
  interviewDraft: null,
  exp: { knowledge: 0, guts: 0, eloquence: 0, attitude: 0, charm: 0 },
  awarded: [],
  settings: { motion: 'system', voice: true, voiceRate: 1, microphone: true },
};

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return initialState;
    }
    return normalize(JSON.parse(raw));
  } catch {
    return initialState;
  }
}

type Loose<T> = { [K in keyof T]?: unknown };

const MOTIONS: MotionPref[] = ['system', 'reduce', 'full'];

const asObject = <T,>(value: unknown): Loose<T> => (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Loose<T>;
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isNonNegative = (value: unknown): value is number => isFiniteNumber(value) && value >= 0;
const isCount = (value: unknown): value is number => isNonNegative(value) && Number.isInteger(value);
const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');
const isCategory = (value: unknown): value is Category => value === 'personality' || value === 'job' || value === 'pressure' || value === 'company';
const isMode = (value: unknown): value is AnswerRecord['mode'] => value === 'voice' || value === 'text';
const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

/** 설정은 화면이 바로 쓰는 값이라(읽는 속도의 toFixed 등) 필드마다 형식을 확인하고, 어긋나면 기본값을 쓴다. */
function normalizeSettings(value: unknown): Settings {
  const data = asObject<Settings>(value);
  const fallback = initialState.settings;
  return {
    motion: MOTIONS.includes(data.motion as MotionPref) ? (data.motion as MotionPref) : fallback.motion,
    voice: typeof data.voice === 'boolean' ? data.voice : fallback.voice,
    // 설정 화면의 슬라이더 범위(0.7–1.5)에 맞춘다.
    voiceRate: isFiniteNumber(data.voiceRate) ? Math.min(1.5, Math.max(0.7, data.voiceRate)) : fallback.voiceRate,
    microphone: typeof data.microphone === 'boolean' ? data.microphone : fallback.microphone,
  };
}

function normalizeExp(value: unknown): Stats {
  const data = asObject<Stats>(value);
  const exp = { ...initialState.exp };
  for (const key of Object.keys(exp) as (keyof Stats)[]) {
    const amount = data[key];
    if (isFiniteNumber(amount)) exp[key] = amount;
  }
  return exp;
}

/** id와 이름이 없는 항목은 버리고, 나머지 필드는 형식이 어긋나면 빈 값으로 채운다. */
function normalizeCompany(value: unknown): Company | null {
  const data = asObject<Company>(value);
  if (typeof data.id !== 'string' || typeof data.name !== 'string') return null;
  return {
    id: data.id,
    name: data.name,
    role: typeof data.role === 'string' ? data.role : '',
    interviewDate: typeof data.interviewDate === 'string' ? data.interviewDate : null,
    keywords: strings(data.keywords),
    questions: strings(data.questions),
    memo: typeof data.memo === 'string' ? data.memo : '',
    createdAt: isFiniteNumber(data.createdAt) ? data.createdAt : Date.now(),
    cardSentAt: isFiniteNumber(data.cardSentAt) ? data.cardSentAt : null,
  };
}

/** 배열의 원소와 중첩 객체까지 검사해 가져온 값이 그대로 화면에 전달되지 않게 한다. */
function isAnalysis(value: unknown): value is Analysis {
  const data = asObject<Analysis>(value);
  const star = asObject<Analysis['star']>(data.star);
  return (
    isCount(data.chars) && isCount(data.syllables) && isNonNegative(data.durationSec) &&
    (data.pace === null || isNonNegative(data.pace)) &&
    Array.isArray(data.fillers) && data.fillers.every((value) => {
      const filler = asObject<Analysis['fillers'][number]>(value);
      return typeof filler.word === 'string' && isCount(filler.count);
    }) &&
    isCount(data.fillerTotal) && typeof data.conclusionFirst === 'boolean' &&
    typeof star.situation === 'boolean' && typeof star.task === 'boolean' &&
    typeof star.action === 'boolean' && typeof star.result === 'boolean' &&
    typeof data.hasNumbers === 'boolean' &&
    isNonNegative(data.score) && data.score <= 100 &&
    isStrings(data.strengths) && isStrings(data.weaknesses)
  );
}

function isQuestion(value: unknown): value is InterviewTurn['question'] {
  const data = asObject<InterviewTurn['question']>(value);
  return typeof data.text === 'string' && isCategory(data.category);
}

function isTurn(value: unknown): value is InterviewTurn {
  const data = asObject<InterviewTurn>(value);
  return isQuestion(data.question) && typeof data.transcript === 'string' && isMode(data.mode) && isAnalysis(data.analysis);
}

function isInterviewDraft(value: unknown): value is InterviewDraft {
  const data = asObject<InterviewDraft>(value);
  return (
    typeof data.sessionId === 'string' &&
    (data.companyId === null || typeof data.companyId === 'string') &&
    (data.phase === 'question' || data.phase === 'review') &&
    Array.isArray(data.questions) && data.questions.length > 0 && data.questions.length <= 5 && data.questions.every(isQuestion) &&
    isCount(data.index) && data.index < data.questions.length &&
    Array.isArray(data.turns) && data.turns.length <= data.questions.length && data.turns.every(isTurn) &&
    (data.phase !== 'review' || data.turns.length > 0) &&
    isMode(data.mode) && typeof data.answer === 'string' && isNonNegative(data.duration)
  );
}

/** 답변 기록은 분석 결과가 여러 화면에 쓰이므로, 화면이 읽는 필드가 다 있는 것만 남긴다. */
function isAnswerRecord(value: unknown): value is AnswerRecord {
  const data = asObject<AnswerRecord>(value);
  return (
    typeof data.id === 'string' &&
    typeof data.sessionId === 'string' &&
    (typeof data.companyId === 'string' || data.companyId === null) &&
    typeof data.question === 'string' &&
    isCategory(data.category) &&
    typeof data.transcript === 'string' &&
    isMode(data.mode) &&
    isFiniteNumber(data.createdAt) &&
    isAnalysis(data.analysis)
  );
}

/** 저장된 값이나 가져온 파일을 현재 모양에 맞춘다. 빠지거나 형식이 어긋난 필드는 기본값으로 채운다. */
export function normalize(value: unknown): State {
  const data = asObject<State>(value);
  const answers = Array.isArray(data.answers) ? data.answers.filter(isAnswerRecord) : [];
  const draft = isInterviewDraft(data.interviewDraft) ? data.interviewDraft : null;
  return {
    version: 1,
    companies: Array.isArray(data.companies)
      ? data.companies.map(normalizeCompany).filter((company): company is Company => company !== null)
      : [],
    answers,
    // 완료 직후 새로고침해도 같은 면접의 경험치를 다시 받지 않는다.
    interviewDraft: draft && !answers.some((answer) => answer.sessionId === draft.sessionId) ? draft : null,
    exp: normalizeExp(data.exp),
    awarded: strings(data.awarded),
    settings: normalizeSettings(data.settings),
  };
}

/** 이 앱에서 내보낸 파일인지. 아니면 가져오기가 지금 기록을 빈 값으로 덮어 버린다. */
export function isExport(value: unknown): boolean {
  const data = asObject<State>(value);
  return Array.isArray(data.companies) && Array.isArray(data.answers) && data.answers.every(isAnswerRecord) &&
    typeof data.settings === 'object' && data.settings !== null;
}

let state: State = typeof localStorage === 'undefined' ? initialState : load();
let saveFailed = false;
const listeners = new Set<() => void>();

export function getState() {
  return state;
}

/** 마지막 저장이 실패했는지. 다음 저장이 성공하면 다시 false가 된다. */
export function getSaveFailed() {
  return saveFailed;
}

export function setState(update: (current: State) => State) {
  state = update(state);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    saveFailed = false;
  } catch {
    // 저장 공간이 없거나 막혀 있어도 이번 방문 동안은 메모리에서 계속 동작한다.
    // 새로고침하면 사라지므로 화면에 알린다(SaveAlert).
    saveFailed = true;
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 상태의 일부만 구독한다. selector가 같은 값을 돌려주면 다시 그리지 않는다. */
export function useStore<T>(selector: (current: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(initialState));
}

export function useSaveFailed(): boolean {
  return useSyncExternalStore(subscribe, getSaveFailed, () => false);
}

export function createId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
