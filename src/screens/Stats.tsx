import { useMemo } from 'react';

import { SlashTitle } from '../components/SlashTitle';
import { gradeOf } from '../lib/palace';
import { rankOf, RANK_NAMES, STAT_KEYS, STAT_LABEL } from '../lib/stats';
import { useStore } from '../store/store';
import { CATEGORY_LABEL } from '../store/types';

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 118;

function pointAt(index: number, ratio: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / STAT_KEYS.length;
  return [CENTER + Math.cos(angle) * RADIUS * ratio, CENTER + Math.sin(angle) * RADIUS * ratio];
}

export function StatsScreen() {
  const exp = useStore((state) => state.exp);
  const answers = useStore((state) => state.answers);
  const ranks = STAT_KEYS.map((key) => rankOf(exp[key]));
  const polygon = ranks.map((rank, index) => pointAt(index, rank.rank / 5).join(',')).join(' ');
  const recent = useMemo(() => answers.slice(-12).reverse(), [answers]);
  const trend = useMemo(() => answers.slice(-20).map((answer) => answer.analysis.score), [answers]);

  return (
    <div className="stats">
      <div className="screen-head">
        <SlashTitle kicker="STATS">괴도 능력치</SlashTitle>
        <p className="screen-head__lead">잠입할수록 오른다. 직무 질문은 지식, 압박 질문은 담력, 인성 질문은 태도, 군말 없는 답변은 말솜씨, 예고장과 회사 맞춤 질문은 매력.</p>
      </div>

      <div className="stats__layout">
        <figure className="panel radar">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-labelledby="radar-caption">
            {[1, 2, 3, 4, 5].map((level) => (
              <polygon
                key={level}
                className="radar__ring"
                points={STAT_KEYS.map((_, index) => pointAt(index, level / 5).join(',')).join(' ')}
              />
            ))}
            {STAT_KEYS.map((key, index) => {
              const [x, y] = pointAt(index, 1);
              return <line key={key} className="radar__axis" x1={CENTER} y1={CENTER} x2={x} y2={y} />;
            })}
            <polygon className="radar__shape" points={polygon} />
            {STAT_KEYS.map((key, index) => {
              const [x, y] = pointAt(index, 1.2);
              return (
                <text key={key} className="radar__label" x={x} y={y} textAnchor="middle" dominantBaseline="middle">
                  {STAT_LABEL[key]} {ranks[index].rank}
                </text>
              );
            })}
          </svg>
          <figcaption id="radar-caption" className="visually-hidden">
            능력치 랭크: {STAT_KEYS.map((key, index) => `${STAT_LABEL[key]} ${ranks[index].rank}`).join(', ')} (최대 5)
          </figcaption>
        </figure>

        <ul className="stat-list">
          {STAT_KEYS.map((key, index) => {
            const rank = ranks[index];
            return (
              <li key={key} className="stat-row">
                <span className="stat-row__rank" aria-hidden="true">
                  {rank.rank}
                </span>
                <span className="stat-row__body">
                  <span className="stat-row__label">
                    {STAT_LABEL[key]} <span className="visually-hidden">랭크 {rank.rank}</span>
                  </span>
                  <span className="stat-row__name">{RANK_NAMES[key][rank.rank - 1]}</span>
                  <span className="meter" aria-hidden="true">
                    <span style={{ width: `${Math.round(rank.progress * 100)}%` }} />
                  </span>
                  <span className="stat-row__exp">
                    {rank.next === null ? `최고 랭크 · 경험치 ${exp[key]}` : `다음 랭크까지 ${rank.next - exp[key]}`}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <section className="panel history" aria-labelledby="history-title">
        <h2 id="history-title" className="panel__title">
          최근 잠입 기록
        </h2>
        {trend.length > 1 && (
          <svg className="trend" viewBox={`0 0 ${(trend.length - 1) * 20} 100`} preserveAspectRatio="none" role="img" aria-label={`최근 ${trend.length}개 답변 점수 추이: ${trend.join(', ')}점`}>
            <polyline points={trend.map((score, index) => `${index * 20},${100 - score}`).join(' ')} />
          </svg>
        )}
        {recent.length ? (
          <ol className="history__list">
            {recent.map((answer) => (
              <li key={answer.id}>
                <span className={`grade grade--${gradeOf(answer.analysis.score)}`}>{gradeOf(answer.analysis.score)}</span>
                <span className="tag">{CATEGORY_LABEL[answer.category]}</span>
                <span className="history__question">{answer.question}</span>
                <span className="history__score">{answer.analysis.score}점</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-note">아직 잠입 기록이 없다.</p>
        )}
      </section>
    </div>
  );
}
