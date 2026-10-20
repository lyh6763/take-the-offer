import { describe, expect, it } from 'vitest';

import { analyzeAnswer, countFillers, countSyllables, isConclusionFirst } from './analysis';

describe('countSyllables', () => {
  it('counts Hangul syllables and Latin/number words', () => {
    expect(countSyllables('안녕하세요 React 19')).toBe(5 + 2);
  });
});

describe('countFillers', () => {
  it('counts standalone 음/어 and prefix habit words', () => {
    const fillers = countFillers('음 그러니까 어어 제가 사실은 약간 그냥요 음... 이제 시작');
    const map = Object.fromEntries(fillers.map((item) => [item.word, item.count]));
    expect(map).toEqual({ 음: 2, 어: 1, 사실: 1, 약간: 1, 그냥: 1, 이제: 1 });
  });

  it('does not count 음/어 inside real words', () => {
    expect(countFillers('음악을 좋아하고 어려운 문제를 풉니다')).toEqual([]);
  });
});

describe('isConclusionFirst', () => {
  it('finds a conclusion marker in the opening', () => {
    expect(isConclusionFirst('결론부터 말씀드리면 저는 접근성을 우선합니다')).toBe(true);
    expect(isConclusionFirst('제가 대학교 2학년 때 동아리에서 웹사이트를 만들던 일인데요 그때 ... 결론적으로')).toBe(false);
  });
});

describe('analyzeAnswer', () => {
  const strong =
    '결론부터 말씀드리면 저는 성능 문제를 숫자로 해결한 경험이 있습니다. 당시 팀 프로젝트에서 첫 화면이 5초 걸리는 문제가 있었고 ' +
    '제가 맡은 과제는 이를 2초 안으로 줄이는 것이었습니다. 그래서 웹폰트를 분석해 필요한 글자만 남기고 이미지를 줄였습니다. ' +
    '그 결과 첫 화면 표시가 1.5초로 줄었고 성능 점수가 68점에서 100점으로 올랐습니다.';

  it('scores a structured answer highly', () => {
    const result = analyzeAnswer(strong, 50);
    expect(result.conclusionFirst).toBe(true);
    expect(result.star).toEqual({ situation: true, task: true, action: true, result: true });
    expect(result.hasNumbers).toBe(true);
    expect(result.fillerTotal).toBe(0);
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it('flags a short rambling answer', () => {
    const result = analyzeAnswer('음 어 그냥 열심히 하겠습니다 음', 6);
    expect(result.score).toBeLessThan(30);
    expect(result.weaknesses.some((line) => line.includes('짧습니다'))).toBe(true);
    expect(result.weaknesses.some((line) => line.includes('군말'))).toBe(true);
  });

  it('rescales to 100 when duration is unknown (typed answers)', () => {
    const result = analyzeAnswer(strong, 0);
    expect(result.pace).toBeNull();
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it('returns zero for an empty answer', () => {
    expect(analyzeAnswer('   ', 10).score).toBe(0);
  });
});
