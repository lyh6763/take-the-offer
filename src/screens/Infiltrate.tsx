import { useEffect, useRef, useState, type FormEvent } from 'react';

import { CutIn } from '../components/CutIn';
import { Interviewer } from '../components/Interviewer';
import { SlashTitle } from '../components/SlashTitle';
import { drawQuestions, type Question } from '../data/questions';
import { ALL_OUT_THRESHOLD, analyzeAnswer } from '../lib/analysis';
import { gradeOf } from '../lib/palace';
import { listen, speak, speechSupport, stopSpeaking, type Listener } from '../lib/speech';
import { navigate } from '../router';
import { recordSession } from '../store/actions';
import { createId, useStore } from '../store/store';
import { CATEGORY_LABEL, type Analysis, type Category } from '../store/types';

type Kind = Category | 'mixed';
type Turn = { question: Question; transcript: string; mode: 'voice' | 'text'; analysis: Analysis };
type CutInState = { tone: 'attack' | 'weak'; title: string; subtitle?: string; then: () => void } | null;

const KIND_LABEL: Record<Kind, string> = { mixed: '섞어서', ...CATEGORY_LABEL };

function formatClock(seconds: number) {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function InfiltrateScreen({ companyId }: { companyId: string | null }) {
  const companies = useStore((state) => state.companies);
  const settings = useStore((state) => state.settings);
  const voiceAvailable = speechSupport.recognition && settings.microphone;

  const [targetId, setTargetId] = useState(companyId ?? '');
  const target = companies.find((company) => company.id === targetId) ?? null;
  const [kind, setKind] = useState<Kind>(companyId ? 'company' : 'mixed');
  const [count, setCount] = useState(3);
  const [mode, setMode] = useState<'voice' | 'text'>(voiceAvailable ? 'voice' : 'text');
  const [readAloud, setReadAloud] = useState(settings.voice && speechSupport.synthesis);

  const [phase, setPhase] = useState<'setup' | 'question' | 'review'>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [interim, setInterim] = useState('');
  const [answer, setAnswer] = useState('');
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [cutIn, setCutIn] = useState<CutInState>(null);

  const sessionId = useRef(createId());
  const listener = useRef<Listener | null>(null);
  const startedAt = useRef(0);
  const questionRef = useRef<HTMLHeadingElement>(null);
  // 낭독할 때마다 1씩 올린다. 끝난 낭독이 새로 시작한 낭독의 상태를 지우지 않게 번호를 비교한다.
  const readingRun = useRef(0);
  const current = questions[index];
  const lastTurn = turns[turns.length - 1];

  const readQuestion = (text: string) => {
    const run = ++readingRun.current;
    setSpeaking(true);
    speak(text, settings.voiceRate).then(() => {
      if (readingRun.current === run) setSpeaking(false);
    });
  };

  const stopReading = () => {
    readingRun.current++;
    stopSpeaking();
    setSpeaking(false);
  };

  // 화면을 떠나면 낭독과 녹음을 멈춘다.
  useEffect(
    () => () => {
      listener.current?.abort();
      stopSpeaking();
    },
    [],
  );

  // 새 질문이 뜨면 질문으로 포커스를 옮기고, 켜 두었으면 읽어 준다.
  useEffect(() => {
    if (phase !== 'question' || !current) return;
    questionRef.current?.focus();
    if (!readAloud) return;
    readQuestion(current.text);
    return stopReading;
  }, [phase, current, readAloud, settings.voiceRate]);

  // 낭독 중에는 Esc로 멈출 수 있다 (KWCAG 5.4.2: 3초 넘게 나는 소리는 멈출 수단이 있어야 한다).
  useEffect(() => {
    if (!speaking) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stopReading();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [speaking]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  const start = (event: FormEvent) => {
    event.preventDefault();
    const drawn = drawQuestions(kind, count, target);
    sessionId.current = createId();
    setQuestions(drawn);
    setTurns([]);
    setIndex(0);
    resetAnswer();
    setPhase('question');
  };

  const resetAnswer = () => {
    setAnswer('');
    setInterim('');
    setDuration(0);
    setElapsed(0);
    setError('');
  };

  const startRecording = () => {
    stopReading();
    resetAnswer();
    const handle = listen({
      onText: (finalText, interimText) => {
        setAnswer(finalText);
        setInterim(interimText);
      },
      onError: (message) => setError(message),
      onEnd: () => {
        setRecording(false);
        setInterim('');
      },
    });
    if (!handle) {
      setError('이 브라우저는 음성 인식을 지원하지 않습니다. 직접 입력으로 답해 주세요.');
      setMode('text');
      return;
    }
    listener.current = handle;
    startedAt.current = Date.now();
    setRecording(true);
    setStatus('녹음을 시작했습니다. 답변을 말한 뒤 "답변 끝"을 누르세요.');
  };

  const stopRecording = () => {
    listener.current?.stop();
    listener.current = null;
    setRecording(false);
    setDuration((Date.now() - startedAt.current) / 1000);
    setAnswer((value) => [value, interim].filter(Boolean).join(' '));
    setInterim('');
    setStatus('녹음을 마쳤습니다. 인식된 문장을 고친 뒤 판정을 받으세요.');
  };

  const judge = () => {
    if (!current) return;
    const analysis = analyzeAnswer(answer, mode === 'voice' ? duration : 0);
    const turn: Turn = { question: current, transcript: answer.trim(), mode, analysis };
    setTurns((list) => [...list, turn]);
    const showReview = () => {
      setPhase('review');
      setStatus(`판정: ${analysis.score}점, ${gradeOf(analysis.score)}등급.`);
    };
    if (analysis.score >= 85) {
      setCutIn({ tone: 'attack', title: '급소 명중', subtitle: analysis.strengths[0], then: showReview });
    } else if (analysis.score < 60) {
      setCutIn({ tone: 'weak', title: '약점 간파', subtitle: analysis.weaknesses[0], then: showReview });
    } else {
      showReview();
    }
  };

  const next = () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      resetAnswer();
      setPhase('question');
      return;
    }
    finish();
  };

  const finish = () => {
    // 모두 건너뛰었으면 기록할 것이 없으니 설정 화면으로 돌아간다.
    if (!turns.length) {
      setPhase('setup');
      return;
    }
    const records = turns.map((turn) => ({
      sessionId: sessionId.current,
      companyId: target?.id ?? null,
      question: turn.question.text,
      category: turn.question.category,
      transcript: turn.transcript,
      mode: turn.mode,
      analysis: turn.analysis,
      createdAt: Date.now(),
    }));
    recordSession(records);
    const average = Math.round(turns.reduce((sum, turn) => sum + turn.analysis.score, 0) / Math.max(turns.length, 1));
    const goToResult = () => navigate(`/result/${sessionId.current}`, { replace: true });
    if (average >= ALL_OUT_THRESHOLD) {
      setCutIn({ tone: 'attack', title: '총공격', subtitle: `평균 ${average}점 — 합격을 훔쳐라!`, then: goToResult });
    } else {
      setCutIn({ tone: 'weak', title: '일단 철수', subtitle: `평균 ${average}점 — 다음 잠입을 준비하자`, then: goToResult });
    }
  };

  if (phase === 'setup') {
    return (
      <div className="infiltrate">
        <div className="screen-head">
          <SlashTitle kicker="INFILTRATE">잠입</SlashTitle>
          <p className="screen-head__lead">면접관이 질문을 던진다. 말로 답하면 말 속도·군말·구성을 분석하고, 점수가 높으면 총공격이 터진다.</p>
        </div>
        <form className="panel p-form infiltrate__setup" onSubmit={start}>
          <label className="field">
            <span className="field__label">잠입할 팰리스</span>
            <select
              value={targetId}
              onChange={(event) => {
                setTargetId(event.target.value);
                if (!event.target.value && kind === 'company') setKind('mixed');
              }}
            >
              <option value="">특정 회사 없음</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="field field--choices">
            <legend className="field__label">질문 종류</legend>
            {(Object.keys(KIND_LABEL) as Kind[]).map((key) => (
              <label key={key} className="choice">
                <input type="radio" name="kind" value={key} checked={kind === key} disabled={key === 'company' && !target} onChange={() => setKind(key)} />
                <span>{KIND_LABEL[key]}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="field field--choices">
            <legend className="field__label">질문 수</legend>
            {[3, 5].map((value) => (
              <label key={value} className="choice">
                <input type="radio" name="count" value={value} checked={count === value} onChange={() => setCount(value)} />
                <span>{value}문항</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="field field--choices">
            <legend className="field__label">답변 방법</legend>
            <label className="choice">
              <input type="radio" name="mode" checked={mode === 'voice'} disabled={!voiceAvailable} onChange={() => setMode('voice')} />
              <span>말로 답하기</span>
            </label>
            <label className="choice">
              <input type="radio" name="mode" checked={mode === 'text'} onChange={() => setMode('text')} />
              <span>직접 입력</span>
            </label>
            {!speechSupport.recognition && <p className="field__hint">이 브라우저는 음성 인식을 지원하지 않습니다 (Chrome·Edge·Safari에서 가능).</p>}
          </fieldset>
          <label className="choice choice--check">
            <input type="checkbox" checked={readAloud} disabled={!speechSupport.synthesis} onChange={(event) => setReadAloud(event.target.checked)} />
            <span>면접관이 질문을 소리 내어 읽기</span>
          </label>
          <p className="field__hint">음성 인식은 브라우저에 따라 브라우저 제조사의 서버를 거칠 수 있습니다. 답변 기록은 이 기기에만 저장됩니다.</p>
          <button type="submit" className="p-btn p-btn--hero">
            잠입 개시
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="infiltrate infiltrate--live">
      <p className="infiltrate__progress">
        <span className="infiltrate__count">
          QUESTION {index + 1}
          <span aria-hidden="true">/</span>
          <span className="visually-hidden"> 전체 </span>
          {questions.length}
        </span>
        {current && <span className="tag">{CATEGORY_LABEL[current.category]}</span>}
        {target && <span className="tag tag--ghost">{target.name}</span>}
      </p>

      <div className="interrogation">
        <Interviewer speaking={speaking} />
        <div className="speech-bubble" key={index}>
          <h1 ref={questionRef} tabIndex={-1} className="speech-bubble__text">
            {current?.text}
          </h1>
          {/* 같은 자리의 같은 버튼이라 낭독 상태가 바뀌어도 포커스가 유지된다 */}
          {readAloud && speechSupport.synthesis &&
            (speaking ? (
              <button type="button" className="p-btn p-btn--small p-btn--ghost" onClick={stopReading} aria-keyshortcuts="Escape">
                낭독 멈추기
              </button>
            ) : (
              <button type="button" className="p-btn p-btn--small p-btn--ghost" onClick={() => current && readQuestion(current.text)}>
                다시 듣기
              </button>
            ))}
        </div>
      </div>

      {phase === 'question' && (
        <section className="panel answer-panel" aria-label="답변">
          {mode === 'voice' && (
            <div className="recorder">
              <div className={`recorder__clock ${recording ? 'is-live' : ''}`} aria-hidden="true">
                <span>{formatClock(recording ? elapsed : duration)}</span>
                <span className="recorder__target">권장 0:30 ~ 2:00</span>
              </div>
              {!recording ? (
                <button type="button" className="p-btn p-btn--hero" onClick={startRecording}>
                  {answer ? '다시 녹음' : '답변 시작'}
                </button>
              ) : (
                <button type="button" className="p-btn p-btn--hero p-btn--danger" onClick={stopRecording}>
                  답변 끝
                </button>
              )}
              {recording && (
                <p className="recorder__live" aria-hidden="true">
                  {answer} <span className="recorder__interim">{interim}</span>
                </p>
              )}
            </div>
          )}
          {(!recording || mode === 'text') && (
            <label className="field">
              <span className="field__label">{mode === 'voice' ? '인식된 답변 (틀린 글자는 고칠 수 있음)' : '답변 입력'}</span>
              <textarea rows={6} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={mode === 'voice' ? '답변 시작을 누르고 말해 보세요.' : '면접에서 말하듯 적어 보세요.'} />
            </label>
          )}
          {error && (
            <p className="field__error" role="alert">
              {error}
            </p>
          )}
          <div className="button-row">
            <button type="button" className="p-btn" onClick={judge} disabled={recording || !answer.trim()}>
              판정 받기
            </button>
            <button type="button" className="p-btn p-btn--ghost" onClick={next} disabled={recording}>
              이 질문 건너뛰기
            </button>
          </div>
        </section>
      )}

      {phase === 'review' && lastTurn && <Review turn={lastTurn} isLast={index + 1 >= questions.length} onNext={next} />}

      <p className="visually-hidden" role="status">
        {status}
      </p>

      {cutIn && (
        <CutIn
          tone={cutIn.tone}
          title={cutIn.title}
          subtitle={cutIn.subtitle}
          onDone={() => {
            const then = cutIn.then;
            setCutIn(null);
            then();
          }}
        />
      )}
    </div>
  );
}

function Review({ turn, isLast, onNext }: { turn: Turn; isLast: boolean; onNext: () => void }) {
  const { analysis } = turn;
  const grade = gradeOf(analysis.score);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    nextRef.current?.focus();
  }, []);

  return (
    <section className="panel review" aria-labelledby="review-title">
      <div className="review__stamp">
        <span className={`grade grade--${grade}`}>{grade}</span>
        <span className="review__score">
          {analysis.score}
          <small>점</small>
        </span>
      </div>
      <h2 id="review-title" className="visually-hidden">
        판정 결과
      </h2>
      <dl className="review__metrics">
        {analysis.durationSec > 0 && (
          <div>
            <dt>답변 시간</dt>
            <dd>{formatClock(analysis.durationSec)}</dd>
          </div>
        )}
        {analysis.pace !== null && (
          <div>
            <dt>말 속도</dt>
            <dd>분당 {analysis.pace}음절</dd>
          </div>
        )}
        <div>
          <dt>군말</dt>
          <dd>{analysis.fillerTotal}회</dd>
        </div>
        <div>
          <dt>두괄식</dt>
          <dd>{analysis.conclusionFirst ? '예' : '아니요'}</dd>
        </div>
        <div>
          <dt>STAR</dt>
          <dd>
            {[analysis.star.situation && '상황', analysis.star.task && '과제', analysis.star.action && '행동', analysis.star.result && '결과']
              .filter(Boolean)
              .join('·') || '없음'}
          </dd>
        </div>
      </dl>
      <div className="review__lists">
        {analysis.strengths.length > 0 && (
          <div>
            <h3 className="review__heading review__heading--good">통했던 것</h3>
            <ul>
              {analysis.strengths.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
        {analysis.weaknesses.length > 0 && (
          <div>
            <h3 className="review__heading review__heading--bad">약점</h3>
            <ul>
              {analysis.weaknesses.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <button ref={nextRef} type="button" className="p-btn p-btn--hero" onClick={onNext}>
        {isLast ? '작전 종료' : '다음 질문'}
      </button>
    </section>
  );
}
