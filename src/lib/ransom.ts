import { between, createRng, pick, type Rng } from './rng';

/**
 * 예고장: 신문·잡지에서 오려 붙인 것 같은 글자 조각 배치와 그리기.
 * 배치(layoutRansom)는 순수 함수라 글자 폭 재는 함수만 바꿔 끼우면 테스트할 수 있고,
 * 미리보기와 PNG 저장이 같은 배치·같은 그리기 함수를 쓴다.
 */

export type Segment = {
  text: string;
  /** 기준 글자 크기(px) */
  size: number;
  align: 'left' | 'center' | 'right';
};

type Typeface = { family: string; weight: number };

export type Piece = {
  char: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  typeface: Typeface;
  fontSize: number;
  paper: string;
  ink: string;
  /** 네 꼭짓점을 조금씩 어긋나게 해 손으로 오린 느낌을 낸다 */
  corners: [number, number][];
};

export type Layout = { pieces: Piece[]; width: number; height: number };

/** font 문자열로 글자 하나의 폭을 잰다 (브라우저에서는 canvas measureText) */
export type Measure = (char: string, font: string) => number;

const HANGUL_FACES: Typeface[] = [
  { family: '"Black Han Sans"', weight: 400 },
  { family: '"Do Hyeon"', weight: 400 },
  { family: '"Jua"', weight: 400 },
  { family: '"Nanum Myeongjo"', weight: 800 },
  { family: '"Song Myung"', weight: 400 },
];

const LATIN_FACES: Typeface[] = [
  { family: '"Anton"', weight: 400 },
  { family: '"Anton"', weight: 400 },
  { family: '"Black Han Sans"', weight: 400 },
  { family: '"Nanum Myeongjo"', weight: 800 },
  { family: 'Georgia, serif', weight: 700 },
  { family: '"Courier New", monospace', weight: 700 },
];

/** 예고장에 쓰는 웹폰트 (그리기 전에 불러 둔다) */
export const RANSOM_WEB_FONTS = ['Black Han Sans', 'Do Hyeon', 'Jua', 'Nanum Myeongjo', 'Song Myung', 'Anton'];

const PAPERS = [
  { paper: '#ffffff', ink: '#111111' },
  { paper: '#111111', ink: '#ffffff' },
  { paper: '#d7191c', ink: '#ffffff' },
  { paper: '#efe6d2', ink: '#1a1a1a' },
  { paper: '#f4d23c', ink: '#111111' },
  { paper: '#ffffff', ink: '#d7191c' },
];

export function fontString(face: Typeface, size: number) {
  return `${face.weight} ${Math.round(size)}px ${face.family}`;
}

function stylePiece(char: string, baseSize: number, rng: Rng, previousPaper: string | null) {
  const typeface = pick(rng, /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(char) ? HANGUL_FACES : LATIN_FACES);
  const fontSize = baseSize * between(rng, 0.82, 1.22);
  let colors = pick(rng, PAPERS);
  // 같은 종이가 연달아 붙으면 한 덩어리로 보여서 한 번 더 뽑는다.
  if (colors.paper === previousPaper) colors = pick(rng, PAPERS);
  return { typeface, fontSize, ...colors };
}

export function layoutRansom(segments: Segment[], seed: number, maxWidth: number, measure: Measure): Layout {
  const rng = createRng(seed);
  const pieces: Piece[] = [];
  let y = 0;
  let previousPaper: string | null = null;

  for (const segment of segments) {
    const gap = segment.size * 0.08;
    const wordGap = segment.size * 0.4;
    const lineGap = segment.size * 0.22;

    for (const line of segment.text.split('\n')) {
      // 단어 단위로 조각을 만들고, 줄 폭을 넘으면 다음 줄로 넘긴다.
      const words = line.split(/\s+/).filter(Boolean).map((word) =>
        [...word].map((char) => {
          const style = stylePiece(char, segment.size, rng, previousPaper);
          previousPaper = style.paper;
          const padX = style.fontSize * 0.14;
          const padY = style.fontSize * 0.1;
          const w = measure(char, fontString(style.typeface, style.fontSize)) + padX * 2;
          const h = style.fontSize * 1.18 + padY * 2;
          const corners = Array.from({ length: 4 }, () => [between(rng, -3, 3), between(rng, -3, 3)] as [number, number]);
          return { char, w, h, corners, rotation: between(rng, -0.14, 0.14), jitter: between(rng, -4, 4), ...style };
        }),
      );

      type Draft = (typeof words)[number][number] & { spaceBefore: number };
      const rows: Draft[][] = [];
      let row: Draft[] = [];
      let rowWidth = 0;
      const breakRow = () => {
        if (row.length) rows.push(row);
        row = [];
        rowWidth = 0;
      };

      for (const word of words) {
        const wordWidth = word.reduce((sum, piece) => sum + piece.w, 0) + gap * (word.length - 1);
        if (row.length && rowWidth + wordGap + wordWidth > maxWidth) breakRow();
        word.forEach((piece, index) => {
          // 한 단어가 한 줄보다 길면 글자 단위로 끊는다.
          if (row.length && rowWidth + (index === 0 ? wordGap : gap) + piece.w > maxWidth) breakRow();
          const spaceBefore = row.length === 0 ? 0 : index === 0 ? wordGap : gap;
          row.push({ ...piece, spaceBefore });
          rowWidth += spaceBefore + piece.w;
        });
      }
      breakRow();

      for (const current of rows) {
        const width = current.reduce((sum, piece) => sum + piece.spaceBefore + piece.w, 0);
        const height = Math.max(...current.map((piece) => piece.h));
        let x = segment.align === 'center' ? (maxWidth - width) / 2 : segment.align === 'right' ? maxWidth - width : 0;
        for (const piece of current) {
          x += piece.spaceBefore;
          pieces.push({
            char: piece.char,
            x,
            y: y + (height - piece.h) / 2 + piece.jitter,
            w: piece.w,
            h: piece.h,
            rotation: piece.rotation,
            typeface: piece.typeface,
            fontSize: piece.fontSize,
            paper: piece.paper,
            ink: piece.ink,
            corners: piece.corners,
          });
          x += piece.w;
        }
        y += height + lineGap;
      }
    }
    y += segment.size * 0.35;
  }

  return { pieces, width: maxWidth, height: Math.ceil(y) };
}

export type Backdrop = 'red' | 'black' | 'paper';

export const BACKDROP_LABEL: Record<Backdrop, string> = { red: '빨강', black: '검정', paper: '신문지' };

function drawBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number, backdrop: Backdrop) {
  const base = { red: '#d7191c', black: '#121212', paper: '#e9e1cf' }[backdrop];
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  // 사선 띠
  ctx.save();
  ctx.globalAlpha = backdrop === 'paper' ? 0.08 : 0.16;
  ctx.fillStyle = backdrop === 'black' ? '#d7191c' : '#000000';
  for (let x = -height; x < width; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x + 34, height);
    ctx.lineTo(x + 34 + height * 0.6, 0);
    ctx.lineTo(x + height * 0.6, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 망점
  ctx.save();
  ctx.globalAlpha = backdrop === 'paper' ? 0.12 : 0.18;
  ctx.fillStyle = backdrop === 'black' ? '#ffffff' : '#000000';
  for (let y = 0; y < height; y += 14) {
    for (let x = (y / 14) % 2 ? 7 : 0; x < width; x += 14) {
      const r = 1.6 + 1.4 * (x / width);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawRansom(ctx: CanvasRenderingContext2D, layout: Layout, backdrop: Backdrop, padding: number) {
  const width = layout.width + padding * 2;
  const height = layout.height + padding * 2;
  drawBackdrop(ctx, width, height, backdrop);

  for (const piece of layout.pieces) {
    const cx = padding + piece.x + piece.w / 2;
    const cy = padding + piece.y + piece.h / 2;
    const [a, b, c, d] = piece.corners;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(piece.rotation);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;
    ctx.shadowBlur = 0;
    ctx.fillStyle = piece.paper;
    ctx.beginPath();
    ctx.moveTo(-piece.w / 2 + a[0], -piece.h / 2 + a[1]);
    ctx.lineTo(piece.w / 2 + b[0], -piece.h / 2 + b[1]);
    ctx.lineTo(piece.w / 2 + c[0], piece.h / 2 + c[1]);
    ctx.lineTo(-piece.w / 2 + d[0], piece.h / 2 + d[1]);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = piece.ink;
    ctx.font = fontString(piece.typeface, piece.fontSize);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(piece.char, 0, piece.fontSize * 0.06);
    ctx.restore();
  }

  return { width, height };
}
