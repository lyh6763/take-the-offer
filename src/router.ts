import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';

import { shouldReduceMotion } from './lib/motion';

export type RouteName = 'title' | 'hideout' | 'palaces' | 'palace' | 'card' | 'infiltrate' | 'result' | 'stats' | 'settings';

export type Route = { name: RouteName; id: string | null; query: URLSearchParams };

const PATTERNS: [RegExp, RouteName][] = [
  [/^\/$/, 'title'],
  [/^\/hideout$/, 'hideout'],
  [/^\/palace$/, 'palaces'],
  [/^\/palace\/([\w-]+)$/, 'palace'],
  [/^\/card$/, 'card'],
  [/^\/infiltrate$/, 'infiltrate'],
  [/^\/result\/([\w-]+)$/, 'result'],
  [/^\/stats$/, 'stats'],
  [/^\/settings$/, 'settings'],
];

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, search = ''] = raw.split('?');
  for (const [pattern, name] of PATTERNS) {
    const match = pattern.exec(path);
    if (match) return { name, id: match[1] ?? null, query: new URLSearchParams(search) };
  }
  return { name: 'hideout', id: null, query: new URLSearchParams() };
}

let route = parseHash(typeof location === 'undefined' ? '' : location.hash);
const listeners = new Set<() => void>();

function setRoute(next: Route) {
  route = next;
  listeners.forEach((listener) => listener());
}

/**
 * 지원 브라우저에서는 View Transitions로 컷을 넘기고, 모션을 줄이면 바로 바꾼다.
 * 전환 도중 창 크기가 바뀌는 등으로 연출이 중단돼도 화면 갱신(update)은 이미 끝났으므로 연출 쪽 실패는 무시한다.
 */
function withTransition(update: () => void) {
  if (shouldReduceMotion() || !('startViewTransition' in document)) {
    update();
    return;
  }
  const transition = document.startViewTransition(update);
  transition.ready.catch(() => {});
  transition.finished.catch(() => {});
}

export function navigate(to: string, options: { replace?: boolean } = {}) {
  withTransition(() => {
    if (options.replace) history.replaceState(null, '', `#${to}`);
    else history.pushState(null, '', `#${to}`);
    flushSync(() => setRoute(parseHash(to)));
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const next = parseHash(location.hash);
    withTransition(() => flushSync(() => setRoute(next)));
  });
}

export function useRoute() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => route,
  );
}
