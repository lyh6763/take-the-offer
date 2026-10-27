import { useRef, useState, type ChangeEvent } from 'react';

import { SlashTitle } from '../components/SlashTitle';
import { RECOGNITION_NOTICE, speak, speechSupport } from '../lib/speech';
import { exportData, importData, resetData, updateSettings } from '../store/actions';
import { useStore } from '../store/store';
import type { MotionPref } from '../store/types';

const MOTION_LABEL: Record<MotionPref, string> = {
  system: '기기 설정 따르기',
  reduce: '항상 줄이기 (컷인·흔들림 대신 페이드)',
  full: '줄이지 않기',
};

export function SettingsScreen() {
  const settings = useStore((state) => state.settings);
  const [notice, setNotice] = useState('');
  const resetRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `take-the-offer-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice('기록을 파일로 내보냈습니다.');
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      importData(await file.text());
      setNotice('기록을 불러왔습니다.');
    } catch {
      setNotice('파일을 읽지 못했습니다. 이 앱에서 내보낸 JSON 파일인지 확인해 주세요.');
    }
  };

  return (
    <div className="settings">
      <div className="screen-head">
        <SlashTitle kicker="CONFIG">설정</SlashTitle>
      </div>

      <div className="settings__grid">
        <section className="panel" aria-labelledby="motion-title">
          <h2 id="motion-title" className="panel__title">
            모션
          </h2>
          <fieldset className="field field--choices field--stack">
            <legend className="visually-hidden">모션 줄이기</legend>
            {(Object.keys(MOTION_LABEL) as MotionPref[]).map((key) => (
              <label key={key} className="choice">
                <input type="radio" name="motion" checked={settings.motion === key} onChange={() => updateSettings({ motion: key })} />
                <span>{MOTION_LABEL[key]}</span>
              </label>
            ))}
          </fieldset>
        </section>

        <section className="panel" aria-labelledby="voice-title">
          <h2 id="voice-title" className="panel__title">
            음성
          </h2>
          <label className="choice choice--check">
            <input type="checkbox" checked={settings.voice} disabled={!speechSupport.synthesis} onChange={(event) => updateSettings({ voice: event.target.checked })} />
            <span>면접관이 질문을 소리 내어 읽기</span>
          </label>
          <label className="field">
            <span className="field__label">읽는 속도 ({settings.voiceRate.toFixed(1)}배)</span>
            <input type="range" min={0.7} max={1.5} step={0.1} value={settings.voiceRate} onChange={(event) => updateSettings({ voiceRate: Number(event.target.value) })} />
          </label>
          <button type="button" className="p-btn p-btn--small p-btn--ghost" disabled={!speechSupport.synthesis} onClick={() => speak('지원 동기를 1분 안에 말씀해 주세요.', settings.voiceRate)}>
            목소리 들어 보기
          </button>
          <label className="choice choice--check">
            <input type="checkbox" checked={settings.microphone} disabled={!speechSupport.recognition} onChange={(event) => updateSettings({ microphone: event.target.checked })} />
            <span>말로 답하기(마이크) 사용</span>
          </label>
          {speechSupport.recognition && <p className="field__hint">{RECOGNITION_NOTICE}</p>}
          {!speechSupport.synthesis && <p className="field__hint">이 브라우저는 음성 합성을 지원하지 않습니다.</p>}
          {!speechSupport.recognition && <p className="field__hint">이 브라우저는 음성 인식을 지원하지 않습니다. 잠입에서는 직접 입력으로 답합니다.</p>}
        </section>

        <section className="panel" aria-labelledby="data-title">
          <h2 id="data-title" className="panel__title">
            기록
          </h2>
          <p className="panel__hint">팰리스·잠입 기록·능력치는 이 브라우저에만 저장됩니다. 다른 기기로 옮기려면 파일로 내보내세요.</p>
          <div className="button-row">
            <button type="button" className="p-btn p-btn--small" onClick={download}>
              파일로 내보내기
            </button>
            <button type="button" className="p-btn p-btn--small p-btn--ghost" onClick={() => fileRef.current?.click()}>
              파일 불러오기
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="visually-hidden" tabIndex={-1} onChange={upload} aria-hidden="true" />
            <button type="button" className="p-btn p-btn--small p-btn--danger" onClick={() => resetRef.current?.showModal()}>
              모두 지우기
            </button>
          </div>
          <p className="save-status" role="status">
            {notice}
          </p>
        </section>
      </div>

      <dialog ref={resetRef} className="p-dialog" aria-labelledby="reset-title">
        <h2 id="reset-title" className="p-dialog__title">
          모든 기록을 지울까요?
        </h2>
        <p>팰리스, 잠입 기록, 능력치, 설정이 처음 상태로 돌아갑니다. 되돌릴 수 없습니다.</p>
        <div className="p-dialog__actions">
          <button type="button" className="p-btn p-btn--ghost" onClick={() => resetRef.current?.close()}>
            취소
          </button>
          <button
            type="button"
            className="p-btn p-btn--danger"
            onClick={() => {
              resetData();
              resetRef.current?.close();
              setNotice('모든 기록을 지웠습니다.');
            }}
          >
            모두 지우기
          </button>
        </div>
      </dialog>
    </div>
  );
}
