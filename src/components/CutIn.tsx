import { useEffect, useRef } from 'react';

import { MaskIcon } from './MaskIcon';

type CutInProps = {
  title: string;
  subtitle?: string;
  /** 'attack'은 총공격(빨강), 'weak'은 약점 간파(검정) */
  tone: 'attack' | 'weak';
  onDone: () => void;
  /** 자동으로 닫히는 시간(ms) */
  duration?: number;
};

/**
 * 풀스크린 컷인. 아무 키나 누르거나 클릭하면 건너뛴다.
 * 모션을 줄이면 CSS가 슬래시 애니메이션 대신 짧은 페이드만 보여 준다.
 */
export function CutIn({ title, subtitle, tone, onDone, duration = 1900 }: CutInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const timer = window.setTimeout(() => done.current(), duration);
    const skip = (event: KeyboardEvent) => {
      event.preventDefault();
      done.current();
    };
    window.addEventListener('keydown', skip);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', skip);
      previous?.focus?.();
    };
  }, [duration]);

  return (
    <div
      ref={ref}
      className={`cutin cutin--${tone}`}
      role="alertdialog"
      aria-label={subtitle ? `${title}. ${subtitle}` : title}
      tabIndex={-1}
      onClick={() => done.current()}
    >
      <div className="cutin__slash cutin__slash--a" aria-hidden="true" />
      <div className="cutin__slash cutin__slash--b" aria-hidden="true" />
      <div className="cutin__band" aria-hidden="true">
        <MaskIcon className="cutin__mask" />
        <span className="cutin__title">{title}</span>
      </div>
      {subtitle && (
        <p className="cutin__subtitle" aria-hidden="true">
          {subtitle}
        </p>
      )}
      <p className="cutin__skip" aria-hidden="true">
        아무 키나 누르면 넘어갑니다
      </p>
    </div>
  );
}
