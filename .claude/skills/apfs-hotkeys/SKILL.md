---
name: apfs-hotkeys
description: APFS 대시보드 키보드 단축키 규약 — 모든 앱-스코프 단축키는 `use-hotkey.ts`의 `HOTKEYS`(힌트+바인딩 단일 소스)와 `useHotkey` 훅으로만 만들고, mod(⌘/Ctrl) 조합과 ⌥(Alt) 조합의 2티어 규약을 지킨다. 단축키·hotkey·shortcut·키보드·키바인딩·⌘·⌥·Ctrl·Alt를 추가/변경/충돌해결할 때, DropdownMenuShortcut 힌트나 명령 팔레트(⌘K)를 다룰 때, 단축키가 Mac/Windows 어디서 동작하는지 물을 때 사용. Use when adding, changing, or resolving conflicts for any keyboard shortcut / hotkey / key binding in the dashboard, wiring a DropdownMenuShortcut hint, touching the ⌘K command palette, or asking whether a shortcut works on Mac vs Windows.
---

# apfs-hotkeys Skill

## 컨텍스트
APFS의 앱-스코프 키보드 단축키는 **단일 훅 + 단일 레지스트리**로 통일돼 있다. 새 단축키를 만들거나 기존 것을 바꿀 때 개별 `addEventListener`를 새로 쓰지 말고 이 시스템을 쓴다.

- **정본 파일**: `src/dash/use-hotkey.ts` — `HOTKEYS`(레지스트리) + `useHotkey(combo, handler, opts)`(바인딩 훅).
- **`HOTKEYS`는 힌트+바인딩 단일 소스** — 메뉴 표시(`DropdownMenuShortcut`)와 실제 키 바인딩(`useHotkey`)이 **같은 정의**를 참조한다. 한 곳만 바꾸면 표시와 동작이 동시에 따라온다.
- **소비처**: `shell.tsx`(사용자 메뉴 ⌥ 단축키), `asset_funding.tsx`·`subfund_manage.tsx`(리스트 페이지 등록/인쇄/내보내기).

## 단축키 레지스트리 (SSOT — 충돌 검사표)

새 단축키 추가 전 **이 표로 충돌을 검사**한다. 이게 이 스킬의 실사용 가치다.

| Mac / Windows | 동작 | 정의 | 소비처 | 검증 상태 |
|---|---|---|---|---|
| `⌘K` / `Ctrl+K` | 명령 팔레트 토글 | (HOTKEYS 밖·직접 리스너) | `shell.tsx` | Mac 실측 |
| `⌘⏎` / `Ctrl+Enter` | 등록(register) | `HOTKEYS.register` | asset_funding·subfund_manage | Mac 실측 |
| `⌘P` / `Ctrl+P` | 인쇄(print) | `HOTKEYS.print` | asset_funding·subfund_manage | Mac 실측 |
| `⌥D` / `Alt+D` | 내보내기 Excel(export) | `HOTKEYS.export` | subfund_manage | **미실측**(빌드 green·브라우저 확인 대기) / **Windows 미실측** |
| `⌥M` / `Alt+M` | 메모 모달 | `HOTKEYS.memo` | shell | Mac 실측 / **Windows 미실측** |
| `⌥E` / `Alt+E` | 일정 모달 | `HOTKEYS.schedule` | shell | Mac 실측 / **Windows 미실측** |
| `⌥L` / `Alt+L` | 로그아웃 모달 | `HOTKEYS.logout` | shell | Mac 실측 / **Windows 미실측** |

- **`⌘K`는 HOTKEYS 밖의 직접 리스너**(`shell.tsx`, `(e.key==="k"||"K") && (metaKey||ctrlKey)`)다. `useHotkey`가 바로 이 ⌘K 명령팔레트 패턴을 재사용 훅으로 일반화한 것 — 신규 단축키는 반드시 `HOTKEYS`+`useHotkey`로 만든다.

## Mac / Windows 대응 (질문 자주 나옴)
**둘 다 정의돼 있다.** 코드가 플랫폼을 분기한다:
- 바인딩: `const mod = e.metaKey || e.ctrlKey` → Windows에선 **Ctrl**이 mod 역할. `e.altKey` → **Alt** 발화.
- 힌트: `MOD = isMac ? '⌘' : 'Ctrl+'`, `ALT = isMac ? '⌥' : 'Alt+'`, register는 `isMac ? '⌘⏎' : 'Ctrl+Enter'`. 즉 Windows에선 `Ctrl+Enter`·`Ctrl+P`·`Alt+D`로 자동 표기·동작.
- `isMac`은 `navigator.platform`(deprecated 경고 있으나 동작)으로 판별 → Windows='Win32'→`isMac=false`.

**⚠️ 미검증 함정 — Windows에서 ⌥(Alt) 조합의 브라우저 충돌:**
Windows Chromium은 `Alt+D`(주소창)·`Alt+E`(메뉴) 등 일부 단축키를 **렌더러에 도달하기 전**에 처리할 수 있다. 이 훅은 `capture` 단계 + `preventDefault`로 되찾으려 하지만 **Windows 브라우저에서 실측되지 않았다**(Mac만 확인). ⌥ 티어 단축키(D/M/E/L) 전부 이 리스크를 공유한다.
- **판별 테스트**(Windows 브라우저): 페이지에 포커스 → 해당 ⌥/Alt 단축키 → **의도한 동작이 나면 통과**, **주소창/메뉴가 포커스되면** ⌥ 티어가 Windows에선 안전하지 않은 것(그 키만 mod 조합으로 이동 검토).
- Codex 리뷰(2026-09-11)도 `Alt+D`가 Windows Chromium에서 주소창에 선점될 수 있다는 동일 우려를 제기했으나 **양쪽 다 미실측**(preventDefault 가능 여부는 버전별 편차). Windows 실측 전까지는 ⌥D를 유지하되 이 표의 검증 상태로 관리한다.

## 새 단축키 추가 절차 (3단)
1. `use-hotkey.ts`의 `HOTKEYS`에 항목 추가 — `{ combo: {...}, hint: ... }`.
2. 메뉴에 노출하면 `<DropdownMenuShortcut>{HOTKEYS.<name>.hint}</DropdownMenuShortcut>`.
3. `useHotkey(HOTKEYS.<name>.combo, handler)`로 바인딩.
   - **모달을 여는 액션**은 `{ enabled: modal === null }`(또는 그 페이지의 열림 상태) 가드로 **이중 열림 방지**. 예: `subfund_manage.tsx` register.
   - handler가 뒤에 정의된 `const`(예: `exportExcel`)를 참조하면 `() => exportExcel()`로 감싼다(TDZ 회피 — 직접 참조는 선언 전 접근이 됨).

## 2티어 규약 (어떤 수식어를 고를지)
- **mod 조합(⌘/Ctrl)**: 입력창에서도 발화한다(전역). 브라우저 계층 키(⌘P/⌘S/⌘F/⌘E…)는 capture+preventDefault로 되찾을 수 있다. 인쇄·저장류 전역 액션에.
- **⌥(Alt) 조합**: 입력창(INPUT/TEXTAREA/SELECT/contentEditable)에선 **자동 무시**(타이핑·특수문자 입력 보호). `⌥`+letter는 Mac에서 `e.key`가 특수문자('µ' 등)로 변질되므로 **`e.code`(물리 키, `KeyD`)로 매칭**한다(훅이 이미 처리). "표를 보는 중 쓰는" 페이지 액션(내보내기 등)에 적합.
- **OS 계층 금지**: `⌘M`(최소화)·`⌘Q`(종료)·`⌘W`(닫기)·`⌘T`(새탭)·`⌘Tab`은 페이지에 도달조차 안 하므로 **쓰지 말 것**.
- **키 선택은 한 번에** — 충돌이 나도 추측으로 연달아 바꾸지 말고 위 레지스트리 표로 확인 후 확정. (⌘E→⌥D 사례: 사용자 보고 충돌 후 ⌥ 티어로 이동.)

## 검증 규약
- **`page.keyboard`(trusted 이벤트)로만 검증**한다. `dispatchEvent`로 만든 합성 KeyboardEvent는 `preventDefault`가 브라우저 기본동작을 실제로 억제하는지 **증명하지 못한다**(→ 메모리 `context-menu-keyboard-focus-snapback`의 함정과 동류: 프로그래밍 이벤트는 가짜 성공).
- 순서: `vite build` green → Codex 정적 리뷰 → **브라우저 런타임 확인**(단축키가 실제로 발화하고 기본동작을 억제하는지). 정적 통과가 런타임 통과를 보장하지 않는다.

## 알려진 잠복 이슈
- `useHotkey`의 `useEffect` deps는 `[enabled, combo.mod, combo.shift, combo.key]`로 **`combo.alt`가 빠져 있다**. `HOTKEYS`가 `const`(정적)라 현재는 무해하지만, **동적으로 바뀌는 alt 콤보를 넘기면** 리스너가 갱신되지 않아 깨진다. 동적 콤보가 필요해지면 deps에 `combo.alt` 추가.

## 관련 스킬
- 메뉴 항목 자체(kebab DropdownMenu 구조·항목 순서)는 → `apfs-form-modal`/각 페이지 스킬. 이 스킬은 **키 바인딩·힌트 레지스트리**만 담당.
- 리스트 페이지 툴바 골격 → `apfs-grid`.
