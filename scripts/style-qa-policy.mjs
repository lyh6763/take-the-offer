export const POLICY = Object.freeze({
  version: 1,
  maxDiffPixels: 150,
  maxDiffRatio: 0.0002,
  geometryPrecision: 4,
  locale: 'ko-KR',
  timezoneId: 'Asia/Seoul',
  port: 5183,
  tabSteps: 16,
  reverseTabSteps: 4,
});

export function judgeComparison(row, policy = POLICY) {
  const reasons = [];
  if (!row.sameDimensions) reasons.push('이미지 크기 차이');
  if (!Number.isInteger(row.differentPixels) || row.differentPixels < 0 || !Number.isFinite(row.totalPixels) || row.totalPixels <= 0) {
    reasons.push('유효하지 않은 픽셀 집계');
  } else {
    if (row.differentPixels > policy.maxDiffPixels) reasons.push('픽셀 수 한도 초과');
    if (row.differentPixels / row.totalPixels > policy.maxDiffRatio) reasons.push('픽셀 비율 한도 초과');
  }
  if (!row.computedEqual) reasons.push('계산된 색 차이');
  if (!row.geometryEqual) reasons.push('요소 위치·크기 차이');
  if (!row.keyboardEqual) reasons.push('키보드 포커스 차이');
  if (!row.accessibilityEqual) reasons.push('접근성 검사 차이');
  return { passed: reasons.length === 0, reasons };
}
