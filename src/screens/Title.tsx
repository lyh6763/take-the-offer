import { useEffect, useRef } from 'react';

import { MaskIcon } from '../components/MaskIcon';
import { RansomText } from '../components/RansomText';
import { navigate } from '../router';

export function TitleScreen() {
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // 타이틀에서는 Enter 한 번으로 시작할 수 있게 시작 버튼에 포커스를 둔다.
    startRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="title-screen">
      <div className="title-screen__rays" aria-hidden="true" />
      <div className="title-screen__inner">
        <MaskIcon className="title-screen__mask" />
        <h1 className="title-screen__logo">
          <RansomText text="TAKE THE OFFER" seed="logo" />
        </h1>
        <p className="title-screen__subtitle">면접 리허설 작전</p>
        <p className="title-screen__tagline">압박 면접관의 왜곡된 마음을 훔쳐라.</p>
        <button ref={startRef} type="button" className="p-btn p-btn--hero" onClick={() => navigate('/hideout')}>
          작전 개시
        </button>
      </div>
      <p className="title-screen__note">
        페르소나 5의 스타일에서 영감을 받은 팬 스타일 작업이며 ATLUS·SEGA와 관계없습니다. 기록은 이 브라우저에만 저장됩니다.
      </p>
    </div>
  );
}
