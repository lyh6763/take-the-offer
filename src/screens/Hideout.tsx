import { useMemo, useRef, type KeyboardEvent } from 'react';

import { linkHandler } from '../components/Hud';
import { SlashTitle } from '../components/SlashTitle';
import { dDayLabel, daysUntil, formatDate, toISODate, weekdayOf } from '../lib/date';
import { createRng, hashString, pick } from '../lib/rng';
import { useStore } from '../store/store';

const MENU = [
  { to: '/palace', label: '팰리스 조사', en: 'PALACE', note: '지원 회사의 마음속을 파헤친다' },
  { to: '/card', label: '예고장', en: 'CALLING CARD', note: '오려 붙인 글자로 선전포고' },
  { to: '/infiltrate', label: '잠입', en: 'INFILTRATE', note: '모의 면접으로 합격을 훔친다' },
  { to: '/stats', label: '괴도 능력치', en: 'STATS', note: '지식·담력·말솜씨·태도·매력' },
  { to: '/settings', label: '설정', en: 'CONFIG', note: '모션·음성·데이터' },
];

const TIPS = [
  '첫 문장에 결론을 말하면, 면접관은 나머지를 근거로 듣는다.',
  '경험을 말할 때는 상황 → 과제 → 행동 → 결과 순서로.',
  '"열심히 하겠습니다"보다 "첫 달에 무엇을 하겠다"가 세다.',
  '숫자 하나가 형용사 열 개를 이긴다. 기간·인원·개선 폭을 넣자.',
  '모르는 질문에는 아는 척보다 "확인해 보겠습니다"와 접근 방법을.',
  '역질문은 회사를 조사했다는 가장 짧은 증거다.',
  '"음…"이 나올 것 같으면 차라리 1초 쉬자. 침묵은 생각으로 들린다.',
];

export function HideoutScreen() {
  const companies = useStore((state) => state.companies);
  const menuRef = useRef<HTMLUListElement>(null);
  const today = new Date();
  const todayKey = toISODate(today);

  const upcoming = useMemo(
    () =>
      companies
        .filter((company) => company.interviewDate && daysUntil(company.interviewDate) >= 0)
        .sort((a, b) => (a.interviewDate ?? '').localeCompare(b.interviewDate ?? ''))
        .slice(0, 3),
    [companies],
  );
  const tip = useMemo(() => pick(createRng(hashString(todayKey)), TIPS), [todayKey]);

  // 위아래 방향키로 메뉴를 오간다 (Tab도 그대로 동작).
  const onMenuKey = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const links = [...(menuRef.current?.querySelectorAll('a') ?? [])];
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    const next = links[(index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length];
    event.preventDefault();
    next?.focus();
  };

  return (
    <div className="hideout">
      <section className="calendar-card" aria-label="오늘">
        <p className="calendar-card__month">{today.getMonth() + 1}월</p>
        <p className="calendar-card__day">{today.getDate()}</p>
        <p className="calendar-card__weekday">{weekdayOf(today)}</p>
        <div className="calendar-card__missions">
          <h2 className="calendar-card__label">다음 작전</h2>
          {upcoming.length ? (
            <ul>
              {upcoming.map((company) => (
                <li key={company.id}>
                  <a href={`#/palace/${company.id}`} onClick={linkHandler(`/palace/${company.id}`)}>
                    <span className="dday">{dDayLabel(company.interviewDate!)}</span>
                    <span className="calendar-card__company">{company.name}</span>
                    <span className="calendar-card__date">{formatDate(company.interviewDate!)}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="calendar-card__empty">잡힌 면접이 없다. 팰리스를 등록하고 면접일을 적어 두자.</p>
          )}
        </div>
      </section>

      <div className="hideout__menu-area">
        <SlashTitle kicker="HIDEOUT">아지트</SlashTitle>
        <nav aria-label="아지트 메뉴">
          <ul className="hideout-menu" ref={menuRef} onKeyDown={onMenuKey}>
            {MENU.map((item, index) => (
              <li key={item.to} style={{ ['--i' as string]: index }}>
                <a href={`#${item.to}`} onClick={linkHandler(item.to)} className="hideout-menu__link">
                  <span className="hideout-menu__en" aria-hidden="true">
                    {item.en}
                  </span>
                  <span className="hideout-menu__label">{item.label}</span>
                  <span className="hideout-menu__note">{item.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <aside className="tip-card" aria-label="오늘의 작전 메모">
        <p className="tip-card__label">오늘의 작전 메모</p>
        <p className="tip-card__text">{tip}</p>
      </aside>
    </div>
  );
}
