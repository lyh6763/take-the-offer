import { getState } from '../store/store';

const systemQuery = typeof window === 'undefined' ? null : window.matchMedia('(prefers-reduced-motion: reduce)');

/** 앱 설정(시스템 따름 / 항상 줄이기 / 줄이지 않기)과 시스템 설정을 합쳐 모션을 줄일지 정한다. */
export function shouldReduceMotion() {
  const preference = getState().settings.motion;
  if (preference === 'reduce') return true;
  if (preference === 'full') return false;
  return systemQuery?.matches ?? false;
}

/** CSS가 읽을 수 있게 <html data-motion>에 반영한다. */
export function syncMotionAttribute() {
  document.documentElement.dataset.motion = shouldReduceMotion() ? 'reduce' : 'full';
}

systemQuery?.addEventListener('change', syncMotionAttribute);
