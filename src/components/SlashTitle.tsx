import { useEffect, useRef, type ReactNode } from 'react';

type SlashTitleProps = {
  children: ReactNode;
  /** 제목 뒤에 비스듬히 깔리는 영문 */
  kicker?: string;
  /** 화면이 바뀌면 이 제목으로 포커스를 옮긴다 (기본 true) */
  focusOnMount?: boolean;
};

/** 화면 제목: 검은 사선 판 위의 흰 글씨 + 빨간 그림자 판. 각 화면의 h1이다. */
export function SlashTitle({ children, kicker, focusOnMount = true }: SlashTitleProps) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusOnMount) ref.current?.focus({ preventScroll: true });
  }, [focusOnMount]);

  return (
    <div className="slash-title">
      {kicker && (
        <span className="slash-title__kicker" aria-hidden="true">
          {kicker}
        </span>
      )}
      <h1 ref={ref} tabIndex={-1} className="slash-title__text">
        {children}
      </h1>
    </div>
  );
}
