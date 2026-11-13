import { describe, it, expect, beforeEach } from 'vitest';
import { HIDDEN_ROUTES, restorableRoute, purgeHiddenFromHistory } from './hidden_routes';
import { HistoryStore } from './data';

/* 진입점을 숨긴 route(디자인 시스템, 2026-11-13)는 주소로 열 수 있지만 마지막 화면·방문기록에 흔적을 남기지 않는다.
   이 변경 전에 저장된 값(apfs.route·apfs.history.v1)까지 걸러지는지가 핵심이다. */
const HISTORY_KEY = 'apfs.history.v1';

beforeEach(() => {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
  };
  const events: string[] = [];
  (globalThis as { window?: unknown }).window = { dispatchEvent: (e: Event) => { events.push(e.type); return true; } };
  (globalThis as { __events?: string[] }).__events = events;
});
const dispatched = () => (globalThis as { __events?: string[] }).__events ?? [];

describe('숨긴 route', () => {
  it('디자인 시스템이 숨긴 route 다', () => {
    expect(HIDDEN_ROUTES.has('designsystem')).toBe(true);
  });

  it('저장된 마지막 화면이 숨긴 route 면 기본 화면으로 복원한다', () => {
    expect(restorableRoute('designsystem', 'main')).toBe('main');
  });

  it('숨기지 않은 route 는 그대로 복원한다', () => {
    expect(restorableRoute('investee-profile', 'main')).toBe('investee-profile');
  });

  it('이전 방문기록에 남은 숨긴 route 를 지우고 나머지 순서는 유지한다', () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(['schedule', 'designsystem', 'investee-profile']));
    purgeHiddenFromHistory();
    expect(HistoryStore.get()).toEqual(['schedule', 'investee-profile']);
    expect(dispatched()).toContain('apfs-history-change');
  });

  it('지울 것이 없으면 저장소를 쓰지 않고 변경 이벤트도 보내지 않는다', () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(['schedule', 'main']));
    purgeHiddenFromHistory();
    expect(HistoryStore.get()).toEqual(['schedule', 'main']);
    expect(dispatched()).toEqual([]);
  });
});
