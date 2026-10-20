import { describe, expect, it } from 'vitest';

import { analyzeAnswer } from './analysis';
import { emptyStats, expForAnswer, rankOf, rankUps } from './stats';

describe('rankOf', () => {
  it('maps cumulative exp to ranks 1-5', () => {
    expect(rankOf(0).rank).toBe(1);
    expect(rankOf(19).rank).toBe(1);
    expect(rankOf(20).rank).toBe(2);
    expect(rankOf(200).rank).toBe(5);
    expect(rankOf(999)).toMatchObject({ rank: 5, next: null, progress: 1 });
  });

  it('reports progress inside a rank', () => {
    expect(rankOf(40).progress).toBeCloseTo(0.5);
  });
});

describe('expForAnswer', () => {
  it('routes base exp by question category', () => {
    const analysis = analyzeAnswer('결론부터 말씀드리면 당시 팀에서 맡은 과제를 그래서 해결했고 결과 30% 줄였습니다', 0);
    expect(expForAnswer({ category: 'pressure', analysis }).guts).toBeGreaterThan(0);
    expect(expForAnswer({ category: 'pressure', analysis }).knowledge).toBe(0);
    const company = expForAnswer({ category: 'company', analysis });
    expect(company.knowledge).toBeGreaterThan(0);
    expect(company.charm).toBe(company.knowledge);
  });

  it('gives nothing for an empty answer', () => {
    expect(expForAnswer({ category: 'job', analysis: analyzeAnswer('', 0) })).toEqual(emptyStats());
  });
});

describe('rankUps', () => {
  it('lists stats whose rank went up', () => {
    const before = { ...emptyStats(), guts: 18 };
    const after = { ...emptyStats(), guts: 25, charm: 5 };
    expect(rankUps(before, after)).toEqual([{ key: 'guts', rank: 2 }]);
  });
});
