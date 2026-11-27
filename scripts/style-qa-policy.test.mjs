import { describe, expect, it } from 'vitest';

import { judgeComparison } from './style-qa-policy.mjs';

const identical = {
  sameDimensions: true, differentPixels: 0, totalPixels: 2_000_000,
  computedEqual: true, geometryEqual: true, keyboardEqual: true, accessibilityEqual: true,
};

describe('스타일 검수 판정', () => {
  it('동일한 기준을 통과시킨다', () => expect(judgeComparison(identical).passed).toBe(true));
  it('두 픽셀 한도를 모두 만족하는 반복 편차를 통과시킨다', () => {
    expect(judgeComparison({ ...identical, differentPixels: 149 }).passed).toBe(true);
  });
  it('큰 화면에서도 절대 픽셀 한도를 넘으면 실패한다', () => {
    expect(judgeComparison({ ...identical, differentPixels: 151, totalPixels: 100_000_000 }).passed).toBe(false);
  });
  it('작은 화면에서는 픽셀 비율 한도를 적용한다', () => {
    expect(judgeComparison({ ...identical, differentPixels: 60, totalPixels: 100_000 }).passed).toBe(false);
  });
  it('픽셀 편차 안이어도 색이 달라지면 실패한다', () => {
    expect(judgeComparison({ ...identical, differentPixels: 1, computedEqual: false }).passed).toBe(false);
  });
  it('스크린샷이 같아도 위치·크기가 달라지면 실패한다', () => {
    expect(judgeComparison({ ...identical, geometryEqual: false }).passed).toBe(false);
  });
  it('포커스 차이를 실패로 처리한다', () => {
    expect(judgeComparison({ ...identical, keyboardEqual: false }).passed).toBe(false);
  });
  it('접근성 검사 차이를 실패로 처리한다', () => {
    expect(judgeComparison({ ...identical, accessibilityEqual: false }).passed).toBe(false);
  });
  it('이미지 크기가 다르면 실패한다', () => {
    expect(judgeComparison({ ...identical, sameDimensions: false }).passed).toBe(false);
  });
  it('누락되거나 잘못된 픽셀 집계는 통과시키지 않는다', () => {
    expect(judgeComparison({ ...identical, differentPixels: Number.NaN }).passed).toBe(false);
    expect(judgeComparison({ ...identical, totalPixels: 0 }).passed).toBe(false);
  });
});
