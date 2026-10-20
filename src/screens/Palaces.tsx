import { useRef, useState, type FormEvent } from 'react';

import { linkHandler } from '../components/Hud';
import { SlashTitle } from '../components/SlashTitle';
import { dDayLabel, formatDate } from '../lib/date';
import { infiltrationSummary, researchChecks, splitList } from '../lib/palace';
import { navigate } from '../router';
import { addCompany } from '../store/actions';
import { useStore } from '../store/store';

export function PalacesScreen() {
  const companies = useStore((state) => state.companies);
  const answers = useStore((state) => state.answers);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    if (!name) {
      setError('회사 이름을 적어 주세요.');
      (event.currentTarget.elements.namedItem('name') as HTMLInputElement).focus();
      return;
    }
    const company = addCompany({
      name,
      role: String(form.get('role') ?? '').trim(),
      interviewDate: String(form.get('date') ?? '') || null,
      keywords: splitList(String(form.get('keywords') ?? '')),
      questions: [],
      memo: '',
    });
    dialogRef.current?.close();
    navigate(`/palace/${company.id}`);
  };

  return (
    <div className="palaces">
      <div className="screen-head">
        <SlashTitle kicker="PALACES">팰리스</SlashTitle>
        <p className="screen-head__lead">지원한 회사마다 면접관의 마음속 팰리스가 있다. 조사하고, 예고장을 보내고, 잠입하자.</p>
        <button
          type="button"
          className="p-btn"
          onClick={() => {
            setError('');
            dialogRef.current?.showModal();
          }}
        >
          새 팰리스 등록
        </button>
      </div>

      {companies.length === 0 ? (
        <p className="empty-note">아직 발견한 팰리스가 없다. 지원한 회사를 등록해 보자.</p>
      ) : (
        <ul className="palace-grid">
          {companies.map((company, index) => {
            const checks = researchChecks(company);
            const done = checks.filter((check) => check.done).length;
            const summary = infiltrationSummary(answers, company.id);
            return (
              <li key={company.id} className="palace-card" style={{ ['--tilt' as string]: `${index % 2 ? 1.2 : -1.4}deg` }}>
                <a href={`#/palace/${company.id}`} onClick={linkHandler(`/palace/${company.id}`)} className="palace-card__link">
                  {company.interviewDate && <span className="palace-card__dday dday">{dDayLabel(company.interviewDate)}</span>}
                  <span className="palace-card__name">{company.name}</span>
                  <span className="palace-card__role">{company.role || '직무 미정'}</span>
                  {company.interviewDate && <span className="palace-card__date">면접 {formatDate(company.interviewDate)}</span>}
                </a>
                <dl className="palace-card__stats">
                  <div>
                    <dt>조사</dt>
                    <dd>
                      <span className="segments" aria-hidden="true">
                        {checks.map((check) => (
                          <span key={check.label} className={check.done ? 'is-on' : ''} />
                        ))}
                      </span>
                      {done}/3
                    </dd>
                  </div>
                  <div>
                    <dt>예고장</dt>
                    <dd>{company.cardSentAt ? '보냄' : '아직'}</dd>
                  </div>
                  <div>
                    <dt>잠입</dt>
                    <dd>{summary.sessions}회</dd>
                  </div>
                  <div>
                    <dt>최고점</dt>
                    <dd>{summary.best ?? '—'}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}

      <dialog ref={dialogRef} className="p-dialog" aria-labelledby="new-palace-title">
        <form method="dialog" className="p-form" onSubmit={onSubmit} noValidate>
          <h2 id="new-palace-title" className="p-dialog__title">
            새 팰리스 등록
          </h2>
          <label className="field">
            <span className="field__label">회사 이름 (필수)</span>
            <input name="name" type="text" autoComplete="organization" required aria-describedby={error ? 'new-palace-error' : undefined} aria-invalid={error ? true : undefined} />
          </label>
          {error && (
            <p id="new-palace-error" className="field__error" role="alert">
              {error}
            </p>
          )}
          <label className="field">
            <span className="field__label">직무</span>
            <input name="role" type="text" placeholder="예: 웹 퍼블리셔" />
          </label>
          <label className="field">
            <span className="field__label">면접일</span>
            <input name="date" type="date" />
          </label>
          <label className="field">
            <span className="field__label">인재상 키워드 (쉼표로 구분)</span>
            <input name="keywords" type="text" placeholder="예: 주도성, 협업, 고객 집착" />
          </label>
          <div className="p-dialog__actions">
            <button type="button" className="p-btn p-btn--ghost" onClick={() => dialogRef.current?.close()}>
              취소
            </button>
            <button type="submit" className="p-btn">
              등록하고 조사 시작
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
