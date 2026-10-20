import type { MouseEvent } from 'react';

import { navigate, type RouteName } from '../router';
import { MaskIcon } from './MaskIcon';

const LINKS: { to: string; label: string; match: RouteName[] }[] = [
  { to: '/palace', label: '팰리스', match: ['palaces', 'palace'] },
  { to: '/card', label: '예고장', match: ['card'] },
  { to: '/infiltrate', label: '잠입', match: ['infiltrate', 'result'] },
  { to: '/stats', label: '능력치', match: ['stats'] },
  { to: '/settings', label: '설정', match: ['settings'] },
];

/** 해시 링크를 View Transitions로 넘긴다. 새 탭 열기(보조 키) 동작은 그대로 둔다. */
export function linkHandler(to: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    navigate(to);
  };
}

export function Hud({ current }: { current: RouteName }) {
  return (
    <header className="hud">
      <a className="hud__brand" href="#/hideout" onClick={linkHandler('/hideout')} aria-current={current === 'hideout' ? 'page' : undefined}>
        <MaskIcon className="hud__mask" />
        <span className="hud__name">TAKE THE OFFER</span>
        <span className="visually-hidden">— 아지트로</span>
      </a>
      <nav className="hud__nav" aria-label="작전 메뉴">
        <ul>
          {LINKS.map((link) => (
            <li key={link.to}>
              <a href={`#${link.to}`} onClick={linkHandler(link.to)} aria-current={link.match.includes(current) ? 'page' : undefined}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
