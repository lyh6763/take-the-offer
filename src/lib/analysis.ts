import type { Analysis } from '../store/types';

/**
 * 답변 분석. 음성 인식 결과(문장 부호가 거의 없음)와 직접 입력한 글 모두를 받는다.
 * 점수 100 = 길이 20 + 말 속도 15 + 군말 20 + 두괄식 15 + STAR 20 + 수치 근거 10.
 * 시간을 모르면(직접 입력) 말 속도 항목을 빼고 나머지를 100점 만점으로 환산한다.
 */

// "음", "어", "아"는 단독으로 쓰였을 때만 군말로 센다 (예: "음", "으음", "어어").
const SOLO_FILLER = /^(으?음+|어+|아)$/;
// 뒤에 조사가 붙어도 군말로 센다 (예: "사실은", "그냥요").
const PREFIX_FILLERS = ['약간', '뭔가', '이제', '사실', '그냥', '일단'];

const CONCLUSION_MARKERS = ['결론', '핵심', '요약하면', '한마디로', '두 가지', '세 가지', '첫째', '첫 번째'];

const STAR_PATTERNS = {
  situation: /(당시|그때|상황|프로젝트에서|팀에서|회사에서|수업에서|동아리에서|인턴)/,
  task: /(목표|과제|맡았|맡은|담당|역할|해야 했|문제는|요구)/,
  action: /(그래서|해결|시도|구현|개선했|도입|제안|분석했|정리했|바꿨|만들었)/,
  result: /(결과|덕분에|성과|줄였|늘렸|향상|개선되|달성|올랐|줄었)/,
};

const NUMBER_PATTERN = /\d|[일이삼사오육칠팔구십백천만]\s?(퍼센트|프로|배|명|개|초|건|위|등)/;

const SPLIT_PATTERN = /[\s,.!?…·~"'“”‘’()]+/;

export function countSyllables(text: string) {
  const hangul = (text.match(/[가-힣]/g) ?? []).length;
  const words = (text.match(/[A-Za-z0-9]+/g) ?? []).length;
  return hangul + words;
}

export function countFillers(text: string) {
  const tokens = text.split(SPLIT_PATTERN).filter(Boolean);
  const counts = new Map<string, number>();
  for (const token of tokens) {
    const solo = SOLO_FILLER.test(token) ? (token.includes('음') ? '음' : token[0]) : undefined;
    const hit = solo ?? PREFIX_FILLERS.find((word) => token.startsWith(word));
    if (hit) {
      counts.set(hit, (counts.get(hit) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
}

export function isConclusionFirst(text: string) {
  // 음성 인식 결과에는 마침표가 거의 없어서 첫 문장 대신 처음 30자(말로 3~5초)를 본다.
  const opening = text.trim().slice(0, 30);
  return CONCLUSION_MARKERS.some((marker) => opening.includes(marker));
}

export function analyzeAnswer(transcript: string, durationSec: number): Analysis {
  const text = transcript.trim();
  const chars = text.replace(/\s/g, '').length;
  const syllables = countSyllables(text);
  const timed = durationSec > 0;
  const pace = timed ? Math.round((syllables / durationSec) * 60) : null;
  const fillers = countFillers(text);
  const fillerTotal = fillers.reduce((sum, item) => sum + item.count, 0);
  const minutes = timed ? Math.max(durationSec / 60, 0.25) : Math.max(syllables / 300, 0.25);
  const fillersPerMinute = fillerTotal / minutes;
  const conclusionFirst = isConclusionFirst(text);
  const star = {
    situation: STAR_PATTERNS.situation.test(text),
    task: STAR_PATTERNS.task.test(text),
    action: STAR_PATTERNS.action.test(text),
    result: STAR_PATTERNS.result.test(text),
  };
  const hasNumbers = NUMBER_PATTERN.test(text);

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // 길이: 시간을 알면 30~120초, 모르면 150~600자를 적정으로 본다.
  let lengthScore: number;
  if (timed) {
    lengthScore = durationSec < 15 ? 4 : durationSec < 30 ? 12 : durationSec <= 120 ? 20 : durationSec <= 180 ? 12 : 6;
    if (durationSec < 30) weaknesses.push(`답변이 짧습니다 (${Math.round(durationSec)}초). 30초~2분이 적당합니다.`);
    else if (durationSec > 120) weaknesses.push(`답변이 깁니다 (${Math.round(durationSec)}초). 2분 안으로 줄여 보세요.`);
    else strengths.push(`길이가 알맞습니다 (${Math.round(durationSec)}초).`);
  } else {
    lengthScore = chars < 60 ? 4 : chars < 150 ? 12 : chars <= 600 ? 20 : 12;
    if (chars < 150) weaknesses.push(`답변이 짧습니다 (${chars}자). 근거와 사례를 더해 보세요.`);
    else if (chars > 600) weaknesses.push(`답변이 깁니다 (${chars}자). 핵심만 남겨 보세요.`);
    else strengths.push('길이가 알맞습니다.');
  }

  let paceScore = 0;
  if (pace !== null) {
    if (pace < 200) {
      paceScore = 8;
      weaknesses.push(`말이 느립니다 (분당 ${pace}음절). 250~330음절이 듣기 편합니다.`);
    } else if (pace > 360) {
      paceScore = 6;
      weaknesses.push(`말이 빠릅니다 (분당 ${pace}음절). 숨을 고르며 말해 보세요.`);
    } else {
      paceScore = 15;
      strengths.push(`말 속도가 안정적입니다 (분당 ${pace}음절).`);
    }
  }

  const fillerScore = fillersPerMinute <= 2 ? 20 : fillersPerMinute <= 5 ? 12 : fillersPerMinute <= 9 ? 6 : 0;
  if (fillerTotal === 0) {
    strengths.push('군말이 없습니다.');
  } else if (fillerScore < 20) {
    const top = fillers.slice(0, 2).map((item) => `"${item.word}" ${item.count}번`).join(', ');
    weaknesses.push(`군말이 잦습니다: ${top}.`);
  }

  if (conclusionFirst) strengths.push('결론부터 말했습니다.');
  else weaknesses.push('첫 문장에 결론이 없습니다. "결론부터 말씀드리면"으로 시작해 보세요.');

  const starCount = Object.values(star).filter(Boolean).length;
  if (starCount === 4) strengths.push('상황·과제·행동·결과가 모두 들어 있습니다.');
  else {
    const missing = (Object.keys(star) as (keyof typeof star)[])
      .filter((key) => !star[key])
      .map((key) => ({ situation: '상황', task: '과제', action: '행동', result: '결과' })[key]);
    weaknesses.push(`경험을 말할 때 ${missing.join('·')}이 빠졌습니다.`);
  }

  if (hasNumbers) strengths.push('숫자로 근거를 댔습니다.');
  else weaknesses.push('숫자 근거가 없습니다. 기간·인원·개선 폭을 넣어 보세요.');

  const raw = lengthScore + paceScore + fillerScore + (conclusionFirst ? 15 : 0) + starCount * 5 + (hasNumbers ? 10 : 0);
  const max = pace === null ? 85 : 100;
  const score = text ? Math.round((raw / max) * 100) : 0;

  return {
    chars,
    syllables,
    durationSec: Math.round(durationSec),
    pace,
    fillers,
    fillerTotal,
    conclusionFirst,
    star,
    hasNumbers,
    score,
    strengths,
    weaknesses: text ? weaknesses : ['답변이 비어 있습니다.'],
  };
}

/** 총공격 기준 점수 */
export const ALL_OUT_THRESHOLD = 70;
