import { useSyncExternalStore } from 'react';

import type { State } from './types';

// 이전 가제(interview-thieves) 때 만든 키. 바꾸면 이미 저장된 기록을 못 읽으므로 그대로 둔다.
const STORAGE_KEY = 'interview-thieves:v1';

export const initialState: State = {
  version: 1,
  companies: [],
  answers: [],
  exp: { knowledge: 0, guts: 0, eloquence: 0, attitude: 0, charm: 0 },
  awarded: [],
  settings: { motion: 'system', voice: true, voiceRate: 1, microphone: true },
};

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return initialState;
    }
    return normalize(JSON.parse(raw));
  } catch {
    return initialState;
  }
}

/** 저장된 값이나 가져온 파일을 현재 모양에 맞춘다. 빠진 필드는 기본값으로 채운다. */
export function normalize(value: unknown): State {
  const data = (value && typeof value === 'object' ? value : {}) as Partial<State>;
  return {
    version: 1,
    companies: Array.isArray(data.companies) ? data.companies : [],
    answers: Array.isArray(data.answers) ? data.answers : [],
    exp: { ...initialState.exp, ...(data.exp ?? {}) },
    awarded: Array.isArray(data.awarded) ? data.awarded : [],
    settings: { ...initialState.settings, ...(data.settings ?? {}) },
  };
}

let state: State = typeof localStorage === 'undefined' ? initialState : load();
const listeners = new Set<() => void>();

export function getState() {
  return state;
}

export function setState(update: (current: State) => State) {
  state = update(state);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 저장 공간이 없거나 막혀 있어도 이번 방문 동안은 메모리에서 계속 동작한다.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 상태의 일부만 구독한다. selector가 같은 값을 돌려주면 다시 그리지 않는다. */
export function useStore<T>(selector: (current: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(initialState));
}

export function createId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
