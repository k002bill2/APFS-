/* 앱-스코프 키보드 단축키 — shell.tsx의 ⌘K 명령팔레트 패턴을 재사용 훅으로 일반화.

   "여기서만" 원리: JS keydown 리스너는 이 브라우저 탭이 포커스일 때만 도므로 이미 앱-스코프다.
   충돌은 2계층 — 브라우저 계층(⌘P/⌘S/⌘F/⌘E…)은 capture keydown+preventDefault로 되찾을 수 있고,
   OS 계층(⌘M 최소화·⌘Q 종료·⌘W 닫기·⌘T 새탭·⌘Tab…)은 페이지에 도달조차 안 하니 사용 금지.

   규약:
   - mod = metaKey || ctrlKey (Mac ⌘ / Win·Linux Ctrl 동시 허용).
   - capture 단계 등록: 다른 리스너보다 먼저 잡되, 매치될 때만 stopPropagation(비매치는 통과 → shell의 ⌘K 등 공존).
   - mod 조합은 입력창에서도 발화(⌘P 인쇄는 전역). 수식어 없는 leader/단일키만 입력 중 무시(타이핑 보호).
   - handler는 ref로 보관 → 소비처가 매 렌더 새 함수를 줘도 리스너를 재부착하지 않음. */
import * as React from 'react';

/* code(선택) = 물리 키 코드 직접 지정 — ⌥+글자 아닌 기호 키(⌥\ = 'Backslash')용. 없으면 글자 키는 'Key'+대문자로 유도. */
export type HotkeyCombo = { mod?: boolean; alt?: boolean; shift?: boolean; key: string; code?: string };

const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl+';
const ALT = isMac ? '⌥' : 'Alt+';

/* 힌트 + 바인딩 단일 소스 — DropdownMenuShortcut 표시와 useHotkey 바인딩을 같은 정의에서 구동.
   ⌥(alt) 조합: mod 조합이 아니라 입력창에서 자동 무시(타이핑 보호) + OS 예약이 아니라 도달 가능. */
export const HOTKEYS = {
  register: { combo: { mod: true, key: 'Enter' } as HotkeyCombo, hint: isMac ? '⌘⏎' : 'Ctrl+Enter' },
  print: { combo: { mod: true, key: 'p' } as HotkeyCombo, hint: MOD + 'P' },
  export: { combo: { alt: true, key: 'd' } as HotkeyCombo, hint: ALT + 'D' },   // D=Download/내보내기(⌥ 티어: OS 예약 아님·입력창 자동 무시)
  memo: { combo: { alt: true, key: 'm' } as HotkeyCombo, hint: ALT + 'M' },
  schedule: { combo: { alt: true, key: 'e' } as HotkeyCombo, hint: ALT + 'E' },
  logout: { combo: { alt: true, key: 'l' } as HotkeyCombo, hint: ALT + 'L' },
  history: { combo: { alt: true, key: 'h' } as HotkeyCombo, hint: ALT + 'H' },     // 방문기록 드롭다운(PageHeader)
  favorites: { combo: { alt: true, key: 'b' } as HotkeyCombo, hint: ALT + 'B' },   // 즐겨찾기 FAB 메뉴(B=Bookmark — ⌥F는 Win Chrome 메뉴라 회피)
  refresh: { combo: { alt: true, key: 'r' } as HotkeyCombo, hint: ALT + 'R' },     // 리스트 툴바 조회(⌘R은 새로고침이라 회피)
  notif: { combo: { alt: true, key: 'n' } as HotkeyCombo, hint: ALT + 'N' },       // GNB 알림센터 열기(N=Notifications)
  lnb: { combo: { alt: true, key: '\\', code: 'Backslash' } as HotkeyCombo, hint: ALT + '\\' },   // GNB 메뉴(LNB) 접기/펴기 — 한글 자판에선 ₩ 키(같은 물리 키)
  wide: { combo: { alt: true, key: 'w' } as HotkeyCombo, hint: ALT + 'W' },        // GNB 고정/전체 너비(⌘W 는 탭 닫기라 ⌥)
  theme: { combo: { alt: true, key: 't' } as HotkeyCombo, hint: ALT + 'T' },       // GNB 라이트/다크
  showAll: { combo: { alt: true, key: 'a' } as HotkeyCombo, hint: ALT + 'A' },     // 푸터 전체보기(⌥F 는 Win Chrome 메뉴라 회피)
  newWindow: { combo: { alt: true, key: 'o' } as HotkeyCombo, hint: ALT + 'O' },   // 푸터 새 창(O=Open)
} as const;

/* aria-keyshortcuts 값(WAI-ARIA 표기) — 힌트와 같은 플랫폼 기준: mod 는 Mac=Meta(⌘) / 그 외=Control.
   예: {alt,key:'r'} → "Alt+R", {mod,key:'p'} → Mac "Meta+P" · Win "Control+P". */
export const ariaShortcut = (c: HotkeyCombo) => [c.mod && (isMac ? 'Meta' : 'Control'), c.alt && 'Alt', c.shift && 'Shift', c.key.length === 1 ? c.key.toUpperCase() : c.key].filter(Boolean).join('+');

export function useHotkey(combo: HotkeyCombo, handler: () => void, opts: { enabled?: boolean } = {}) {
  const { enabled = true } = opts;
  const ref = React.useRef(handler);
  ref.current = handler;
  React.useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!!combo.mod !== mod) return;
      if (!!combo.alt !== e.altKey) return;
      if (!!combo.shift !== e.shiftKey) return;
      // ⌥+letter(Mac)는 특수문자를 내므로 code(물리 키, KeyM 등)로 매칭 — e.key는 'µ' 등으로 변질됨.
      const match = combo.code ? e.code === combo.code
        : combo.alt && combo.key.length === 1
        ? e.code === 'Key' + combo.key.toUpperCase()
        : combo.key.length === 1 ? e.key.toLowerCase() === combo.key.toLowerCase() : e.key === combo.key;
      if (!match) return;
      // mod(⌘/Ctrl) 조합만 입력창에서도 발화(⌘P 등 전역). alt·수식어없는 조합은 입력창에선 무시(타이핑·특수문자 입력 보호).
      if (!combo.mod) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      }
      e.preventDefault();
      e.stopPropagation();
      // 키를 누르고 있으면 브라우저가 keydown 을 자동 반복한다 — 기본동작은 계속 막되 액션은 첫 입력 1회만
      // (⌥O 새 창이 탭을 여러 개 열거나, ⌥A/⌥T/⌥W/⌥\ 토글이 홀짝으로 끝나는 것 방지).
      if (e.repeat) return;
      ref.current();
    };
    window.addEventListener('keydown', onKey, true); // capture: 브라우저 기본 동작보다 먼저 가로챔
    return () => window.removeEventListener('keydown', onKey, true);
  }, [enabled, combo.mod, combo.alt, combo.shift, combo.key, combo.code]);
}
