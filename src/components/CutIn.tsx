import { useEffect, useEffectEvent, useRef } from 'react';

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
  // 타이머·키 입력은 effect 안에서 걸지만, 부를 때는 그때의 onDone을 쓴다(onDone이 바뀌어도 다시 걸지 않음).
  const finish = useEffectEvent(() => onDone());

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const timer = window.setTimeout(finish, duration);
    const skip = (event: KeyboardEvent) => {
      event.preventDefault();
      finish();
    };
    window.addEventListener('keydown', skip);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', skip);
      previous?.focus?.();
    };
  }, [duration]);

  return (
    // 키보드로 건너뛰기는 위 effect의 window keydown(아무 키)이 맡는다. 여기 클릭은 마우스·터치용 같은 동작이다.
    // 이 div에 키 처리기를 또 달면 한 번 누를 때 onDone이 두 번 불린다.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={ref}
      className={`cutin cutin--${tone}`}
      role="alertdialog"
      aria-label={subtitle ? `${title}. ${subtitle}` : title}
      tabIndex={-1}
      onClick={onDone}
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
