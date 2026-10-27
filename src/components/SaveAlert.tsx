import { useEffect, useState } from 'react';

import { useSaveFailed } from '../store/store';
import { linkHandler } from './Hud';

/**
 * 기록을 브라우저에 저장하지 못했을 때 띄운다(저장 공간이 꽉 찼거나 막힌 경우).
 * 지금 기록은 메모리에만 있어 새로고침하면 사라지므로 파일로 내보내기를 권한다.
 */
export function SaveAlert() {
  const failed = useSaveFailed();
  const [dismissed, setDismissed] = useState(false);

  // 저장이 다시 성공하면 닫은 상태를 풀어, 다음에 또 실패하면 다시 알린다.
  useEffect(() => {
    if (!failed) setDismissed(false);
  }, [failed]);

  if (!failed || dismissed) return null;

  return (
    <div className="save-alert" role="alert">
      <p className="save-alert__text">
        <strong>기록을 이 브라우저에 저장하지 못했습니다.</strong> 저장 공간이 가득 찼거나 막혀 있을 수 있습니다. 새로고침하거나 창을 닫으면 지금까지 바뀐 내용이
        사라지니, 설정에서 파일로 내보내 두세요.
      </p>
      <div className="save-alert__actions">
        <a className="save-alert__link" href="#/settings" onClick={linkHandler('/settings')}>
          설정으로
        </a>
        <button type="button" className="save-alert__close" onClick={() => setDismissed(true)}>
          닫기
        </button>
      </div>
    </div>
  );
}
