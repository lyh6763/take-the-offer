import { useEffect, useMemo } from 'react';

import { between, createRng, hashString, pick } from '../lib/rng';

/** 오려 붙인 글자용 글꼴 CSS를 한 번만 불러온다. */
export function loadRansomFonts() {
  return import('../styles/ransomFonts');
}

const PAPERS = ['paper-white', 'paper-black', 'paper-red', 'paper-news', 'paper-yellow', 'paper-white-red'];
const FACES = ['face-hanbit', 'face-dohyeon', 'face-jua', 'face-myeongjo', 'face-songmyung'];

type RansomTextProps = {
  text: string;
  /** 같은 글자라도 시드가 다르면 다른 조각이 된다 */
  seed?: string;
  className?: string;
};

/**
 * 화면용 오려 붙인 글자. 스크린리더에는 원문 한 덩어리로 읽히고, 조각들은 장식으로 숨긴다.
 */
export function RansomText({ text, seed = '', className = '' }: RansomTextProps) {
  useEffect(() => {
    loadRansomFonts();
  }, []);

  // 단어 단위로 묶어서, 줄이 바뀌더라도 단어 중간에서 끊기지 않게 한다.
  const words = useMemo(() => {
    const rng = createRng(hashString(seed + text));
    let previous = '';
    let order = 0;
    return text
      .split(' ')
      .filter(Boolean)
      .map((word) =>
        [...word].map((char) => {
          let paper = pick(rng, PAPERS);
          if (paper === previous) paper = pick(rng, PAPERS);
          previous = paper;
          return {
            char,
            order: order++,
            paper,
            face: pick(rng, FACES),
            rotate: between(rng, -9, 9).toFixed(1),
            scale: between(rng, 0.86, 1.14).toFixed(2),
            lift: between(rng, -0.08, 0.08).toFixed(2),
          };
        }),
      );
  }, [text, seed]);

  return (
    <span className={`ransom ${className}`}>
      <span className="visually-hidden">{text}</span>
      <span className="ransom__pieces" aria-hidden="true">
        {words.map((word, wordIndex) => (
          <span key={wordIndex} className="ransom__word">
            {word.map((piece) => (
              <span
                key={piece.order}
                className={`ransom__piece ${piece.paper} ${piece.face}`}
                style={{
                  transform: `translateY(${piece.lift}em) rotate(${piece.rotate}deg) scale(${piece.scale})`,
                  animationDelay: `${piece.order * 35}ms`,
                }}
              >
                {piece.char}
              </span>
            ))}
          </span>
        ))}
      </span>
    </span>
  );
}
