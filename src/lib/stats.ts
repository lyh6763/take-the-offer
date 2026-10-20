import type { AnswerRecord, StatKey, Stats } from '../store/types';

export const STAT_KEYS: StatKey[] = ['knowledge', 'guts', 'eloquence', 'attitude', 'charm'];

export const STAT_LABEL: Record<StatKey, string> = {
  knowledge: '지식',
  guts: '담력',
  eloquence: '말솜씨',
  attitude: '태도',
  charm: '매력',
};

/** 랭크 1~5의 이름 */
export const RANK_NAMES: Record<StatKey, string[]> = {
  knowledge: ['초심자', '공부하는 중', '실무 감각', '박식함', '걸어 다니는 문서'],
  guts: ['쫄보', '버티는 편', '침착함', '강심장', '압박면접 사냥꾼'],
  eloquence: ['웅얼웅얼', '또박또박', '술술', '청산유수', '설득의 장인'],
  attitude: ['어색함', '예의 바름', '단정함', '신뢰감', '같이 일하고 싶은 사람'],
  charm: ['무난함', '인상적', '눈에 띔', '기억에 남음', '오늘의 합격자'],
};

/** 각 랭크에 도달하는 누적 경험치 */
export const RANK_THRESHOLDS = [0, 20, 60, 120, 200];

export function rankOf(exp: number) {
  let rank = 1;
  for (let index = 0; index < RANK_THRESHOLDS.length; index++) {
    if (exp >= RANK_THRESHOLDS[index]) rank = index + 1;
  }
  const floor = RANK_THRESHOLDS[rank - 1];
  const next = RANK_THRESHOLDS[rank] ?? null;
  const progress = next === null ? 1 : (exp - floor) / (next - floor);
  return { rank, floor, next, progress };
}

export const emptyStats = (): Stats => ({ knowledge: 0, guts: 0, eloquence: 0, attitude: 0, charm: 0 });

/**
 * 답변 하나로 얻는 경험치.
 * 기본치(점수/10)는 질문 종류에 따라 지식(직무)·담력(압박)·태도(인성)·지식+매력(회사 맞춤)으로 간다.
 * 군말이 적고 말 속도가 알맞으면 말솜씨, 경험을 STAR로 다 말하면 태도를 더 준다.
 */
export function expForAnswer(record: Pick<AnswerRecord, 'category' | 'analysis'>): Stats {
  const gain = emptyStats();
  const { analysis, category } = record;
  const base = Math.round(analysis.score / 10);
  const half = Math.ceil(base / 2);

  if (category === 'job') gain.knowledge += base;
  if (category === 'pressure') gain.guts += base;
  if (category === 'personality') gain.attitude += base;
  if (category === 'company') {
    gain.knowledge += half;
    gain.charm += half;
  }

  const steadyPace = analysis.pace === null || (analysis.pace >= 200 && analysis.pace <= 360);
  if (analysis.chars > 0 && analysis.fillerTotal <= 2 && steadyPace) gain.eloquence += half;
  if (analysis.conclusionFirst) gain.eloquence += 1;
  if (Object.values(analysis.star).every(Boolean)) gain.attitude += 2;

  return gain;
}

export function addStats(a: Stats, b: Stats): Stats {
  return {
    knowledge: a.knowledge + b.knowledge,
    guts: a.guts + b.guts,
    eloquence: a.eloquence + b.eloquence,
    attitude: a.attitude + b.attitude,
    charm: a.charm + b.charm,
  };
}

/** before → after 사이에 랭크가 오른 능력치 */
export function rankUps(before: Stats, after: Stats) {
  return STAT_KEYS.filter((key) => rankOf(after[key]).rank > rankOf(before[key]).rank).map((key) => ({
    key,
    rank: rankOf(after[key]).rank,
  }));
}
