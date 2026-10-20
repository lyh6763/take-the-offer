import { useEffect, useMemo, useRef, useState } from 'react';

import { CutIn } from '../components/CutIn';
import { loadRansomFonts } from '../components/RansomText';
import { SlashTitle } from '../components/SlashTitle';
import { shouldReduceMotion } from '../lib/motion';
import { BACKDROP_LABEL, drawRansom, layoutRansom, RANSOM_WEB_FONTS, type Backdrop, type Segment } from '../lib/ransom';
import { hashString } from '../lib/rng';
import { markCardSent } from '../store/actions';
import { useStore } from '../store/store';

const CARD_WIDTH = 960;
const PADDING = 64;
const DEFAULT_MESSAGE = '당신의 압박 질문을 모두 받아 내고 합격을 훔치겠다.';

/** 그리기 전에 예고장 글꼴을 불러 둔다. 이미 불러 왔으면 바로 끝난다. */
async function loadFonts(text: string) {
  await loadRansomFonts();
  const sample = text || '가';
  return Promise.all(
    RANSOM_WEB_FONTS.map((family) => document.fonts.load(`${family === 'Nanum Myeongjo' ? 800 : 400} 40px "${family}"`, sample)),
  );
}

export function CallingCardScreen({ companyId }: { companyId: string | null }) {
  const companies = useStore((state) => state.companies);
  const [targetId, setTargetId] = useState(companyId ?? '');
  const target = companies.find((company) => company.id === targetId) ?? null;
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [backdrop, setBackdrop] = useState<Backdrop>('red');
  const [seed, setSeed] = useState(1);
  const [ready, setReady] = useState(false);
  const [cutIn, setCutIn] = useState(false);
  const [notice, setNotice] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const recipient = target ? `${target.name} 면접관 귀하` : '압박 면접관 귀하';
  const segments: Segment[] = useMemo(
    () => [
      { text: '예고장', size: 96, align: 'left' },
      { text: recipient, size: 46, align: 'left' },
      { text: message.trim() || DEFAULT_MESSAGE, size: 58, align: 'left' },
      { text: '— TAKE THE OFFER', size: 40, align: 'right' },
    ],
    [recipient, message],
  );
  const fullText = segments.map((segment) => segment.text).join(' ');

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    loadFonts(fullText).then(() => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return;
      const measure = (char: string, font: string) => {
        context.font = font;
        return context.measureText(char).width;
      };
      const layout = layoutRansom(segments, hashString(`${targetId}:${seed}`), CARD_WIDTH, measure);
      const scale = 2;
      canvas.width = (layout.width + PADDING * 2) * scale;
      canvas.height = (layout.height + PADDING * 2) * scale;
      context.setTransform(scale, 0, 0, scale, 0, 0);
      drawRansom(context, layout, backdrop, PADDING);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [segments, seed, backdrop, fullText, targetId]);

  const download = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `예고장-${target?.name ?? '면접관'}.png`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice('PNG로 저장했습니다.');
    }, 'image/png');
  };

  const send = () => {
    markCardSent(target?.id ?? null);
    setNotice(target ? `${target.name}에 예고장을 보냈다.` : '예고장을 보냈다.');
    if (!shouldReduceMotion()) setCutIn(true);
  };

  return (
    <div className="calling-card">
      <div className="screen-head">
        <SlashTitle kicker="CALLING CARD">예고장</SlashTitle>
        <p className="screen-head__lead">면접 전에 선전포고. 다짐 한 줄을 오려 붙인 글자로 남기고 PNG로 저장하자.</p>
      </div>

      <div className="calling-card__layout">
        <form className="panel p-form" onSubmit={(event) => event.preventDefault()}>
          <label className="field">
            <span className="field__label">받는 팰리스</span>
            <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
              <option value="">특정 회사 없음 (압박 면접관)</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">예고 문장</span>
            <textarea rows={4} maxLength={80} value={message} onChange={(event) => setMessage(event.target.value)} aria-describedby="message-count" />
            <span id="message-count" className="field__hint">
              {message.length}/80자
            </span>
          </label>
          <fieldset className="field field--choices">
            <legend className="field__label">바탕</legend>
            {(Object.keys(BACKDROP_LABEL) as Backdrop[]).map((key) => (
              <label key={key} className="choice">
                <input type="radio" name="backdrop" value={key} checked={backdrop === key} onChange={() => setBackdrop(key)} />
                <span>{BACKDROP_LABEL[key]}</span>
              </label>
            ))}
          </fieldset>
          <div className="button-row">
            <button type="button" className="p-btn p-btn--ghost" onClick={() => setSeed((value) => value + 1)}>
              글자 다시 섞기
            </button>
            <button type="button" className="p-btn p-btn--ghost" onClick={download} disabled={!ready}>
              PNG로 저장
            </button>
            <button type="button" className="p-btn" onClick={send}>
              예고장 보내기
            </button>
          </div>
          <p className="save-status" role="status">
            {notice}
          </p>
        </form>

        <figure className="calling-card__preview">
          <canvas ref={canvasRef} role="img" aria-label={`예고장: ${fullText}`} className={ready ? 'is-ready' : ''} />
          <figcaption className="visually-hidden">예고장 미리보기</figcaption>
        </figure>
      </div>

      {cutIn && <CutIn tone="attack" title="예고장 발송" subtitle={recipient} duration={1500} onDone={() => setCutIn(false)} />}
    </div>
  );
}
