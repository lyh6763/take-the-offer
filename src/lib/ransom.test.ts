import { describe, expect, it } from 'vitest';

import { layoutRansom, type Segment } from './ransom';

// 글자 폭을 글자 크기의 0.9배로 가정한다 (font 문자열의 px 값을 읽음).
const measure = (_char: string, font: string) => Number(/(\d+)px/.exec(font)?.[1] ?? 40) * 0.9;

const segments: Segment[] = [
  { text: '예고장', size: 80, align: 'left' },
  { text: '압박 면접관 귀하\n당신의 질문을 모두 받아내고 합격을 훔치겠다', size: 48, align: 'left' },
  { text: '— TAKE THE OFFER', size: 40, align: 'right' },
];

describe('layoutRansom', () => {
  it('places one piece per visible character', () => {
    const layout = layoutRansom(segments, 42, 900, measure);
    const visible = segments.map((segment) => segment.text.replace(/\s/g, '')).join('');
    expect(layout.pieces.map((piece) => piece.char).join('')).toBe(visible);
  });

  it('is deterministic for the same seed and varies with the seed', () => {
    const a = layoutRansom(segments, 7, 900, measure);
    const b = layoutRansom(segments, 7, 900, measure);
    const c = layoutRansom(segments, 8, 900, measure);
    expect(a).toEqual(b);
    expect(a.pieces.map((piece) => piece.paper)).not.toEqual(c.pieces.map((piece) => piece.paper));
  });

  it('keeps every piece inside the width and wraps long text', () => {
    const narrow = layoutRansom(segments, 3, 360, measure);
    for (const piece of narrow.pieces) {
      expect(piece.x).toBeGreaterThanOrEqual(0);
      expect(piece.x + piece.w).toBeLessThanOrEqual(360 + 0.001);
    }
    expect(narrow.height).toBeGreaterThan(layoutRansom(segments, 3, 900, measure).height);
  });

  it('right-aligns the signature', () => {
    const layout = layoutRansom([{ text: '괴도단', size: 40, align: 'right' }], 1, 600, measure);
    const last = layout.pieces[layout.pieces.length - 1];
    expect(last.x + last.w).toBeCloseTo(600, 0);
  });
});
