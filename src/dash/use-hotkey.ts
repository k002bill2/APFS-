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

export type HotkeyCombo = { mod?: boolean; alt?: boolean; shift?: boolean; key: string };

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
} as const;

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
      const match = combo.alt && combo.key.length === 1
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
      ref.current();
    };
    window.addEventListener('keydown', onKey, true); // capture: 브라우저 기본 동작보다 먼저 가로챔
    return () => window.removeEventListener('keydown', onKey, true);
  }, [enabled, combo.mod, combo.shift, combo.key]);
}
