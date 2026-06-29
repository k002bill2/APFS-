---
name: z-index
description: APFS 대시보드 z-index·쌓임맥락 규약 — 떠 있는 오버레이의 z는 tailwind.config.js 토큰 스케일(z-overlay/modal/popover/tooltip)로만 쓰고 임의 숫자로 추월 금지, 비포털 오버레이는 조상(sticky/transform)이 만든 쌓임맥락에 갇히므로 소비처 nav/컨테이너에 양수 z를 준다. z-index·쌓임맥락·레이어 순서·플라이아웃/드롭다운/모달이 카드에 가려지는 작업 시 사용. Use when setting z-index, fixing stacking-context traps, or when an overlay/flyout/dropdown/modal is hidden behind cards in the dashboard.
---

# Z-Index Skill

APFS 대시보드의 z-index·쌓임맥락 규약. 전체 카탈로그·근거는 **`docs/Z_INDEX.md`**. 이 스킬은 레이어를 만지거나 **플라이아웃/드롭다운/모달이 카드에 가려질 때**의 **체크리스트**다.

## 핵심 규칙
1. **오버레이 z는 토큰 스케일 유틸로만** — `z-overlay`(75)/`z-modal`(80)/`z-popover`(85)/`z-tooltip`(90). 출처 `tailwind.config.js`. 임의 정수(`zIndex:9999`, `z-[9999]`)로 추월 금지.
2. **셸 chrome 정수는 토큰 아래(≤60) 유지** — GNB 50·Lnb/RailNav 48·FAB/HistoryMenu 60·모바일 드로어 45·딤 44. 오버레이(75~90)가 항상 chrome 위로 뜨게 한 설계. 이 위로 올리지 말 것.
3. **비포털 fixed 오버레이는 조상이 쌓임맥락을 만드는지 점검** — `position:fixed`는 컨테이닝블록(좌표)만 뷰포트로 탈출하고, 쌓임맥락은 box-tree 조상을 따른다. 조상(nav·래퍼)이 맥락을 만들면 자식 z-85가 그 맥락 '안'에서만 해석돼 갇힌다.
4. **소비처 nav/컨테이너에 양수 z 부여** — 갇힌 오버레이를 띄우려면 맥락 루트(nav)를 형제 `<main>`(z-auto) 위로 칠해야 한다. Lnb/RailNav `zIndex:48`이 그 순서 보정(맥락 생성용이 아님).
5. **dashFade류 `fill:both` transform 주의** — 키프레임 `to{transform:none}`은 종료 후 항등행렬 `matrix(1,0,0,1,0,0)`로 굳어 쌓임맥락을 **생성**한다(`transform:none` 키워드는 안 만들지만 항등행렬은 만든다). main.tsx variant 래퍼가 카드 묶음을 자기 맥락으로 끌어올린 근본원인.

## ★ sticky/transform 조상 트랩 (가장 중요)
판별자는 단 하나 — **`<body>`로 Portal 하는가.** 포털되면 선언 z(75~90)가 곧 실효 z. 비포털이면 '맥락 루트 z'가 실효 상한이고, 선언 z와의 괴리가 곧 버그다.

| 오버레이 그룹 | body Portal | 실효 맥락 루트 | 처방 |
|---|:---:|---|---|
| Radix Dialog/Sheet/DropdownMenu/Tooltip/Command (모달·NotifCenter·UserMenu·역할전환·명령팔레트) | O | `<body>` | 면역 — 토큰 유틸 그대로 |
| `NavigationMenuContent` 접힘 LNB 플라이아웃 (Viewport 미사용→Item 내 인라인) | X | 소비처 `<nav>` | nav `zIndex:48` 필수 |
| HistoryMenu 드롭다운·FavoritesFab | X | dashFade 래퍼/shell 루트 | absolute+양수 z로 우세 |

**문서화된 버그**: 접힘 LNB 플라이아웃(fixed z-85)이 카드 아래로 가려짐 — main.tsx 카드(dashFade 항등행렬 맥락) + Lnb `<nav>`(sticky 맥락)가 둘 다 z-auto라 DOM 순서로 카드가 위로. 수정 = Lnb sticky 분기 `zIndex:48`(RailNav는 이미 48이라 무사했던 대조군).

## 쌓임맥락 빠른 판별
다음 중 하나라도 있으면 그 요소는 **새 쌓임맥락**을 만들어 자식 z를 가둔다:
- `position:fixed`/`sticky` (z-index 무관)
- `transform`·`filter`·`backdrop-filter`(none 아님; **fill:both 키프레임 종료 항등행렬 포함**)
- `opacity < 1`
- `position:relative/absolute` **+** `z-index ≠ auto`
- `will-change`/`contain`/`isolation:isolate`

비-맥락(앵커일 뿐): `position:relative` (z-index 없음) · `overflow-hidden` 단독.

## 정당한 raw 정수 (토큰 안 씀)
- 셸 chrome 계층 44~60(GNB/Lnb/RailNav/FAB/HistoryMenu/딤) — 토큰 아래여야 하므로 의도적 정수.
- 카드/위젯 내부 로컬 스택: 차트 툴팁 `z:5`·일러스트 `z:3`·타임라인 노드 `z-10`·GridFrame sticky 푸터 `z:20`(FAB 60보다 낮게).
- Tweaks 패널 `z-index:2147483646`(모든 것 위 강제 노출).

## 함정표 (증상→원인→처방)
| 증상 | 원인 | 처방 |
|------|------|------|
| 플라이아웃/드롭다운이 인접 카드 **아래로 가림** | 비포털 오버레이 조상(nav `sticky` / dashFade 항등행렬)이 쌓임맥락 생성→z 갇힘 | 소비처 nav/컨테이너에 양수 z(=48), 또는 body Portal |
| 임의 z 숫자를 키워도 **안 올라옴** | 다른 쌓임맥락에 갇힘(선언 z ≠ 실효 z) | 숫자가 아니라 **맥락 루트**에 z 부여 |
| `fixed inset-0` 백드롭이 전체화면을 **못 덮음**(클릭아웃 범위 축소) | 조상 transform(dashFade 항등행렬)이 컨테이닝블록이 됨 | body Portal로 띄우거나 조상 transform 제거 |
| 셸 chrome가 **모달 위로** 뜸 | raw 정수가 토큰(75~90)을 추월 | chrome는 ≤60 유지 |

## 안티패턴
- 임의 큰 정수(`zIndex:9999`)로 토큰/chrome 추월 → 토큰 스케일 사용.
- 비포털 fixed 오버레이를 transform/sticky 조상 안에 두고 z만 올림(무효) → 소비처 양수 z 또는 body Portal.
- `transform:none`이면 안전하다고 가정 → `fill:both` 종료상태는 항등행렬로 맥락 생성.
- 주석의 옛 정수(`tailwind.config.js:35` '모달 71/플라이아웃 47', `dialog.tsx:3`) 신뢰 → 코드/config가 정본(토큰 80, shell 실최고 60).

## 검증 (필수, 빌드 green ≠ 레이어 검증)
```bash
# 임의 z 잔여 점검 — 현재 0건(green)이어야 한다
grep -rnE 'zIndex: *[0-9]{3,}|z-\[[0-9]+\]' src/dash --include='*.tsx'
npm run build
```
- 겹침 좌표에서 `document.elementsFromPoint(x,y)[0]` 확인(Chrome MCP): 카드면 **버그**, 패널/오버레이면 정상.
- 라이트/다크·모바일/데스크톱 양쪽에서 플라이아웃·드롭다운·모달이 카드 위로 뜨는지 렌더 확인.

## 관련
`docs/Z_INDEX.md` · [[color-tokens]] · [[dashboard-ui]] · [[responsive-ui]]
