import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { linkHandler } from '../components/Hud';
import { SlashTitle } from '../components/SlashTitle';
import { dDayLabel } from '../lib/date';
import { gradeOf, infiltrationSummary, researchChecks } from '../lib/palace';
import { navigate } from '../router';
import { deleteCompany, updateCompany, type CompanyDraft } from '../store/actions';
import { useStore } from '../store/store';
import type { AnswerRecord, Company } from '../store/types';

function draftOf(company: Company): CompanyDraft {
  const { name, role, interviewDate, keywords, questions, memo } = company;
  return { name, role, interviewDate, keywords, questions, memo };
}

export function PalaceDetailScreen({ id }: { id: string }) {
  const company = useStore((state) => state.companies.find((item) => item.id === id));
  const answers = useStore((state) => state.answers);

  if (!company) {
    return (
      <div className="palace-detail">
        <SlashTitle kicker="LOST">사라진 팰리스</SlashTitle>
        <p className="empty-note">이 팰리스를 찾을 수 없다. 삭제되었거나 다른 기기에서 만든 기록일 수 있다.</p>
        <a className="p-btn" href="#/palace" onClick={linkHandler('/palace')}>
          팰리스 목록으로
        </a>
      </div>
    );
  }
  return <PalaceEditor company={company} answers={answers} />;
}

function PalaceEditor({ company, answers }: { company: Company; answers: AnswerRecord[] }) {
  const [draft, setDraft] = useState<CompanyDraft>(() => draftOf(company));
  const [keywordInput, setKeywordInput] = useState('');
  const [questionInput, setQuestionInput] = useState('');
  const [status, setStatus] = useState('');
  const deleteRef = useRef<HTMLDialogElement>(null);
  // 아직 저장하지 않은 입력. 기다리는 동안 화면을 떠나도 잃지 않게 따로 들고 있는다.
  const pendingRef = useRef<CompanyDraft | null>(null);

  // 입력이 멈추면 저장한다 (저장 버튼 없이 잃어버리지 않게). 저장된 값과 같으면 아무것도 하지 않는다.
  useEffect(() => {
    // 이름을 비우면 원래 이름을 유지한다.
    const next = { ...draft, name: draft.name.trim() || company.name };
    if (JSON.stringify(draftOf(company)) === JSON.stringify(next)) {
      pendingRef.current = null;
      return;
    }
    pendingRef.current = next;
    const timer = window.setTimeout(() => {
      pendingRef.current = null;
      updateCompany(company.id, next);
      setStatus('자동 저장됨');
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft, company]);

  // 기다리던 저장은 다른 화면으로 옮기거나 탭을 닫을 때 바로 한다.
  useEffect(() => {
    const flush = () => {
      if (!pendingRef.current) return;
      updateCompany(company.id, pendingRef.current);
      pendingRef.current = null;
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [company.id]);

  const set = <K extends keyof CompanyDraft>(key: K, value: CompanyDraft[K]) => {
    setStatus('');
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const addKeyword = () => {
    const value = keywordInput.trim();
    if (value && !draft.keywords.includes(value)) set('keywords', [...draft.keywords, value]);
    setKeywordInput('');
  };
  const addQuestion = () => {
    const value = questionInput.trim();
    if (value) set('questions', [...draft.questions, value]);
    setQuestionInput('');
  };
  const onEnter = (action: () => void) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      action();
    }
  };

  const checks = researchChecks({ ...company, ...draft });
  const summary = infiltrationSummary(answers, company.id);

  return (
    <div className="palace-detail">
      <div className="screen-head">
        <SlashTitle kicker="PALACE">{draft.name || company.name}</SlashTitle>
        <p className="screen-head__lead">
          {draft.role || '직무 미정'}
          {draft.interviewDate && <span className="dday dday--inline">{dDayLabel(draft.interviewDate)}</span>}
        </p>
        <div className="screen-head__actions">
          <a className="p-btn" href={`#/infiltrate?company=${company.id}`} onClick={linkHandler(`/infiltrate?company=${company.id}`)}>
            잠입 개시
          </a>
          <a className="p-btn p-btn--ghost" href={`#/card?company=${company.id}`} onClick={linkHandler(`/card?company=${company.id}`)}>
            예고장 보내기
          </a>
        </div>
      </div>

      <div className="palace-detail__grid">
        <section className="panel" aria-labelledby="basic-title">
          <h2 id="basic-title" className="panel__title">
            기본 정보
          </h2>
          <label className="field">
            <span className="field__label">회사 이름</span>
            <input value={draft.name} onChange={(event) => set('name', event.target.value)} autoComplete="organization" />
          </label>
          <label className="field">
            <span className="field__label">직무</span>
            <input value={draft.role} onChange={(event) => set('role', event.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">면접일</span>
            <input type="date" value={draft.interviewDate ?? ''} onChange={(event) => set('interviewDate', event.target.value || null)} />
          </label>
        </section>

        <section className="panel" aria-labelledby="keyword-title">
          <h2 id="keyword-title" className="panel__title">
            인재상 키워드
          </h2>
          <ul className="chips" aria-label="등록한 키워드">
            {draft.keywords.map((keyword) => (
              <li key={keyword} className="chip">
                {keyword}
                <button type="button" className="chip__remove" onClick={() => set('keywords', draft.keywords.filter((item) => item !== keyword))}>
                  <span aria-hidden="true">×</span>
                  <span className="visually-hidden">{keyword} 삭제</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="inline-add">
            <label className="field field--grow">
              <span className="field__label">키워드 추가</span>
              <input value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} onKeyDown={onEnter(addKeyword)} placeholder="예: 주도성" />
            </label>
            <button type="button" className="p-btn p-btn--small" onClick={addKeyword}>
              추가
            </button>
          </div>
        </section>

        <section className="panel panel--wide" aria-labelledby="question-title">
          <h2 id="question-title" className="panel__title">
            예상 질문
          </h2>
          <p className="panel__hint">여기 적은 질문은 이 회사로 잠입할 때 "회사 맞춤" 질문으로 나온다.</p>
          <ol className="question-list">
            {draft.questions.map((question, index) => (
              <li key={`${index}-${question}`}>
                <span>{question}</span>
                <button type="button" className="chip__remove" onClick={() => set('questions', draft.questions.filter((_, i) => i !== index))}>
                  <span aria-hidden="true">×</span>
                  <span className="visually-hidden">질문 {index + 1} 삭제</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="inline-add">
            <label className="field field--grow">
              <span className="field__label">질문 추가</span>
              <input value={questionInput} onChange={(event) => setQuestionInput(event.target.value)} onKeyDown={onEnter(addQuestion)} placeholder="예: 우리 서비스에서 고치고 싶은 화면은?" />
            </label>
            <button type="button" className="p-btn p-btn--small" onClick={addQuestion}>
              추가
            </button>
          </div>
        </section>

        <section className="panel panel--wide" aria-labelledby="memo-title">
          <h2 id="memo-title" className="panel__title">
            조사 메모
          </h2>
          <label className="field">
            <span className="field__label">사업, 최근 소식, 서비스에서 본 점</span>
            <textarea rows={5} value={draft.memo} onChange={(event) => set('memo', event.target.value)} />
          </label>
        </section>

        <section className="panel" aria-labelledby="progress-title">
          <h2 id="progress-title" className="panel__title">
            침투 현황
          </h2>
          <ul className="checklist">
            {checks.map((check) => (
              <li key={check.label} className={check.done ? 'is-done' : ''}>
                <span aria-hidden="true">{check.done ? '★' : '☆'}</span> {check.label}
                <span className="visually-hidden">{check.done ? ' 완료' : ' 미완료'}</span>
              </li>
            ))}
            <li className={company.cardSentAt ? 'is-done' : ''}>
              <span aria-hidden="true">{company.cardSentAt ? '★' : '☆'}</span> 예고장
              <span className="visually-hidden">{company.cardSentAt ? ' 보냄' : ' 아직'}</span>
            </li>
          </ul>
          <p className="panel__hint">
            잠입 {summary.sessions}회 · 답변 {summary.answers}개
            {summary.best !== null && ` · 최고 ${summary.best}점(${gradeOf(summary.best)})`}
          </p>
        </section>
      </div>

      <div className="palace-detail__footer">
        <p className="save-status" role="status">
          {status}
        </p>
        <button type="button" className="p-btn p-btn--danger" onClick={() => deleteRef.current?.showModal()}>
          팰리스 삭제
        </button>
      </div>

      <dialog ref={deleteRef} className="p-dialog" aria-labelledby="delete-title">
        <h2 id="delete-title" className="p-dialog__title">
          {company.name} 팰리스를 삭제할까요?
        </h2>
        <p>조사 내용이 사라집니다. 잠입 기록은 남지만 회사 연결은 풀립니다.</p>
        <div className="p-dialog__actions">
          <button type="button" className="p-btn p-btn--ghost" onClick={() => deleteRef.current?.close()}>
            취소
          </button>
          <button
            type="button"
            className="p-btn p-btn--danger"
            onClick={() => {
              deleteRef.current?.close();
              deleteCompany(company.id);
              navigate('/palace', { replace: true });
            }}
          >
            삭제
          </button>
        </div>
      </dialog>
    </div>
  );
}
