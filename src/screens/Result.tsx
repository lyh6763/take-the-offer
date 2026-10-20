import { useMemo } from 'react';

import { linkHandler } from '../components/Hud';
import { SlashTitle } from '../components/SlashTitle';
import { gradeOf } from '../lib/palace';
import { addStats, emptyStats, expForAnswer, rankOf, RANK_NAMES, STAT_KEYS, STAT_LABEL } from '../lib/stats';
import { useStore } from '../store/store';
import { CATEGORY_LABEL, type Stats } from '../store/types';

export function ResultScreen({ sessionId }: { sessionId: string }) {
  const answers = useStore((state) => state.answers);
  const exp = useStore((state) => state.exp);
  const companies = useStore((state) => state.companies);

  const records = useMemo(() => answers.filter((answer) => answer.sessionId === sessionId), [answers, sessionId]);
  const gained = useMemo(() => records.reduce<Stats>((sum, record) => addStats(sum, expForAnswer(record)), emptyStats()), [records]);
  // 가장 최근 작전이면 "작전 전" 능력치를 되돌려 계산해 랭크업을 보여 준다.
  const isLatest = answers.length > 0 && answers[answers.length - 1].sessionId === sessionId;

  if (!records.length) {
    return (
      <div className="result">
        <SlashTitle kicker="RESULT">작전 기록 없음</SlashTitle>
        <p className="empty-note">이 작전의 기록을 찾을 수 없다.</p>
        <a className="p-btn" href="#/infiltrate" onClick={linkHandler('/infiltrate')}>
          잠입하러 가기
        </a>
      </div>
    );
  }

  const average = Math.round(records.reduce((sum, record) => sum + record.analysis.score, 0) / records.length);
  const company = companies.find((item) => item.id === records[0].companyId);
  const grade = gradeOf(average);

  return (
    <div className="result">
      <p className="result__backdrop" aria-hidden="true">
        RESULT
      </p>
      <div className="screen-head">
        <SlashTitle kicker="RESULT">작전 결과</SlashTitle>
        <p className="screen-head__lead">
          {company ? `${company.name} 팰리스 · ` : ''}
          {records.length}문항 · 평균 {average}점
        </p>
      </div>

      <div className="result__layout">
        <section className="panel result__total" aria-labelledby="total-title">
          <h2 id="total-title" className="panel__title">
            종합 판정
          </h2>
          <p className={`grade grade--big grade--${grade}`}>{grade}</p>
          <p className="result__average">
            평균 <strong>{average}</strong>점
          </p>
        </section>

        <section className="panel result__answers" aria-labelledby="answers-title">
          <h2 id="answers-title" className="panel__title">
            문항별
          </h2>
          <ol>
            {records.map((record) => (
              <li key={record.id} className="result-row">
                <span className={`grade grade--${gradeOf(record.analysis.score)}`}>{gradeOf(record.analysis.score)}</span>
                <span className="result-row__body">
                  <span className="tag">{CATEGORY_LABEL[record.category]}</span>
                  <span className="result-row__question">{record.question}</span>
                  {record.analysis.weaknesses[0] && <span className="result-row__weak">약점: {record.analysis.weaknesses[0]}</span>}
                </span>
                <span className="result-row__score">{record.analysis.score}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel result__exp" aria-labelledby="exp-title">
          <h2 id="exp-title" className="panel__title">
            얻은 경험치
          </h2>
          <ul className="exp-list">
            {STAT_KEYS.map((key) => {
              const now = rankOf(exp[key]);
              const before = isLatest ? rankOf(exp[key] - gained[key]) : now;
              const rankedUp = now.rank > before.rank;
              return (
                <li key={key} className={rankedUp ? 'is-up' : ''}>
                  <span className="exp-list__label">{STAT_LABEL[key]}</span>
                  <span className="exp-list__gain">+{gained[key]}</span>
                  <span className="meter" aria-hidden="true">
                    <span style={{ width: `${Math.round(now.progress * 100)}%` }} />
                  </span>
                  <span className="exp-list__rank">
                    랭크 {now.rank} · {RANK_NAMES[key][now.rank - 1]}
                    {rankedUp && <strong className="rank-up"> 랭크 업!</strong>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="button-row button-row--center">
        <a className="p-btn p-btn--hero" href={`#/infiltrate${company ? `?company=${company.id}` : ''}`} onClick={linkHandler(`/infiltrate${company ? `?company=${company.id}` : ''}`)}>
          다시 잠입
        </a>
        <a className="p-btn p-btn--ghost" href="#/stats" onClick={linkHandler('/stats')}>
          능력치 보기
        </a>
        <a className="p-btn p-btn--ghost" href="#/hideout" onClick={linkHandler('/hideout')}>
          아지트로
        </a>
      </div>
    </div>
  );
}
