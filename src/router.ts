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

/** 맞지 않는 주소일 때 보여 주는 화면의 주소 */
const FALLBACK_HASH = '#/hideout';

function splitHash(hash: string) {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, search = ''] = raw.split('?');
  return { path, search };
}

export function parseHash(hash: string): Route {
  const { path, search } = splitHash(hash);
  for (const [pattern, name] of PATTERNS) {
    const match = pattern.exec(path);
    if (match) return { name, id: match[1] ?? null, query: new URLSearchParams(search) };
  }
  return { name: 'hideout', id: null, query: new URLSearchParams() };
}

/** 알려진 화면 주소인지. 아니면 parseHash가 아지트를 돌려준다. */
export function isKnownHash(hash: string): boolean {
  const { path } = splitHash(hash);
  return PATTERNS.some(([pattern]) => pattern.test(path));
}

/**
 * 없는 화면 주소(예: #/nope)로 들어오면 화면은 아지트인데 주소창에는 틀린 주소가 남는다.
 * 보이는 화면과 주소가 맞도록 바꾼다. replaceState라 뒤로 가기 기록은 늘지 않는다.
 */
function normalizeUnknownHash() {
  if (!isKnownHash(location.hash)) history.replaceState(null, '', FALLBACK_HASH);
}

if (typeof window !== 'undefined') normalizeUnknownHash();

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
  // 주소창에서 해시를 직접 고쳐도 popstate가 온다. 그때도 없는 주소면 맞춘다.
  window.addEventListener('popstate', () => {
    normalizeUnknownHash();
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
