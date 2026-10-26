import { beforeEach, describe, expect, it } from 'vitest';

import { exportData, importData, resetData } from './actions';
import { getState, initialState, isExport, normalize } from './store';

// 테스트 환경(node)에는 localStorage가 없어서 상태는 메모리에만 남는다.
const exported = (patch: Record<string, unknown>) => JSON.stringify({ ...JSON.parse(exportData()), ...patch });

describe('저장값·가져온 파일 정리', () => {
  beforeEach(() => resetData());

  it('읽는 속도가 숫자가 아니면 기본값, 범위를 넘으면 슬라이더 범위로 맞춘다', () => {
    expect(normalize({ settings: { voiceRate: 'fast' } }).settings.voiceRate).toBe(1);
    expect(normalize({ settings: { voiceRate: 3 } }).settings.voiceRate).toBe(1.5);
    expect(normalize({ settings: { voiceRate: 0.1 } }).settings.voiceRate).toBe(0.7);
  });

  it('설정의 다른 필드도 형식이 어긋나면 기본값을 쓴다', () => {
    const { settings } = normalize({ settings: { motion: 'wild', voice: 'yes', microphone: 0 } });
    expect(settings).toEqual(initialState.settings);
  });

  it('능력치는 숫자인 것만 남긴다', () => {
    const { exp } = normalize({ exp: { knowledge: 12, guts: 'many', charm: Infinity } });
    expect(exp).toEqual({ ...initialState.exp, knowledge: 12 });
  });

  it('팰리스는 id와 이름이 없으면 버리고, 나머지는 빈 값으로 채운다', () => {
    const { companies } = normalize({
      companies: [{ name: 'id 없음' }, { id: 'a1', name: '오퍼 상사', keywords: '열정', questions: ['자기소개', 3] }],
    });
    expect(companies).toHaveLength(1);
    expect(companies[0]).toMatchObject({ id: 'a1', role: '', memo: '', keywords: [], questions: ['자기소개'], interviewDate: null });
  });

  it('분석 결과가 빠진 답변 기록은 버린다', () => {
    expect(normalize({ answers: [{ id: 'r1', sessionId: 's1', question: 'Q', transcript: 'A' }] }).answers).toEqual([]);
  });
});

describe('기록 가져오기', () => {
  beforeEach(() => resetData());

  it('읽는 속도가 잘못된 파일을 가져와도 화면이 쓰는 값은 숫자다', () => {
    importData(exported({ settings: { ...initialState.settings, voiceRate: 'fast' } }));
    expect(getState().settings.voiceRate).toBe(1);
    expect(() => getState().settings.voiceRate.toFixed(1)).not.toThrow();
  });

  it('이 앱에서 내보낸 파일이 아니면 거부하고 지금 기록을 그대로 둔다', () => {
    importData(exported({ awarded: ['card:first'] }));
    expect(isExport({})).toBe(false);
    expect(() => importData('{}')).toThrow();
    expect(() => importData('[]')).toThrow();
    expect(getState().awarded).toEqual(['card:first']);
  });

  it('JSON이 아니면 던진다', () => {
    expect(() => importData('not json')).toThrow();
  });
});
