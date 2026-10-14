# 리치텍스트 에디터: 이미지 드래그 리사이즈 + 콜아웃 종류 전환 UI

- **날짜**: 2026-07-09
- **대상**: `src/dash/fields/RichTextElements.tsx`, `src/dash/fields/richtext.css` (필요 시 `RichTextField.tsx`)
- **참조**: platejs.org/editors, 메모리 `plate-editor-resizable-selection-render-loop`, `plate-editor-full-feature-expansion`

## 배경 / 문제

Plate v53 기반 리치텍스트 에디터에 두 가지 기능을 platejs.org와 동일하게 추가한다.

1. **이미지 드래그 리사이즈** — 현재 이미지는 정렬(좌/중/우) + 너비 프리셋(S/M/L) + 캡션만 있고, 이미지 좌·우 세로 핸들을 끌어 자유롭게 크기를 조절하는 기능이 없다.
2. **콜아웃 종류 전환 UI** — 콜아웃(알림)은 이미 구현돼 있으나 삽입 시 `variant: 'info'`로 고정되고 삽입 후 종류(info/warning/success/tip)를 바꿀 UI가 없다.

### 핵심 제약: 렌더 루프

과거 `@platejs/resizable`의 **전체 `Resizable` 래퍼**로 이미지 리사이즈를 붙였을 때 이미지 삽입 즉시 "Maximum update depth exceeded" 렌더 루프가 발생해 기능을 제외했다. 원인은 `Resizable`이 `useResizableState` → `setNodeWidth` → **매 드래그 프레임/블록 렌더마다 `setNodes({width})`** write-back을 하기 때문이다(onChange 직렬화·부모 리렌더와 맞물림).

반면 표 컬럼 리사이즈(`useTableCellElementResizable` + `ResizeHandle`)는 **드래그 중엔 스토어에만 기록하고 mouseup(`finished:true`)에 `setNodes` 1회만 커밋**하는 패턴이라 루프가 없음이 실증됐다. `ResizeHandle` 프리미티브 자체는 에디터에 쓰지 않고 `onResize({ delta, direction, finished, initialSize })` 콜백만 발화한다.

→ **이 spec은 이미지 리사이즈를 표 컬럼 리사이즈와 동일한 안전 패턴으로 구현한다.**

## 기능 1: 이미지 드래그 리사이즈 (A안)

### 컴포넌트: `ImageElement` (`RichTextElements.tsx`)

`apfs-rt-imgbox`(현재 `<img>`와 선택 툴바를 감싸는 span) 좌·우 경계에 `<ResizeHandle>`를 추가한다.

**상태 흐름 (무루프 벡터):**
- 로컬 React state: `const [dragWidth, setDragWidth] = useState<number | null>(null)` — 드래그 중에만 px 값 보유.
- **mousedown**: `apfs-rt-imgbox`의 현재 렌더 폭(`offsetWidth`, px)을 읽어 드래그 기준(`initialSize`)으로 삼는다. (표 패턴이 offsetWidth를 읽는 것과 동일.)
- **`onResize`(`finished:false`)**: 방향별로 새 폭 계산 후 `setDragWidth(next)`만 호출 → 인라인 스타일로 미리보기. **에디터 미접촉.**
  - 우측 핸들(`direction:'right'`): `next = initialSize + delta`
  - 좌측 핸들(`direction:'left'`): `next = initialSize - delta`
  - 클램프: `min = 64px`, `max = 이미지 래퍼(apfs-rt-imgwrap) clientWidth`.
- **`onResize`(`finished:true`)**: `setNodes({ width: \`${Math.round(next)}px\` }, { at: path })` **1회 커밋** → `setDragWidth(null)`로 로컬 상태 해제.

**렌더 폭 결정:** `const width = dragWidth != null ? \`${dragWidth}px\` : (element.width || '100%')`. 기존 `style={{ width }}`(imgbox + Caption)에 그대로 주입.

**핸들 렌더 조건:** `selected && !readOnly`일 때만(기존 툴바와 동일 조건). `contentEditable={false}`, `aria-label="이미지 너비 조절"`.

### 저장 모델
- 프리셋 버튼: 기존대로 `'35%' | '65%' | '100%'` 문자열 저장.
- 드래그: `'320px'` 형태 px 문자열 저장.
- `style={{ width }}`가 %·px 모두 수용하므로 역직렬화·정렬·캡션 폭 연동 변경 불필요. 드래그 후에도 S/M/L 프리셋으로 복귀 가능.

### CSS (`richtext.css`)
- `.apfs-rt-imgbox`에 `position: relative`(이미 `is-sel` 오버레이용으로 있을 가능성 — 확인 후 없으면 추가).
- 좌/우 핸들: `position:absolute; top:0; height:100%; width:8px; cursor:ew-resize;` + 좌측 `left:-4px` / 우측 `right:-4px`. 호버 시 가시 바(platejs 스타일: 중앙에 얇은 세로 pill). 드래그 히트영역은 넓게, 시각 바는 얇게.

## 기능 2: 콜아웃 종류 전환 UI (A안)

### 컴포넌트: `CalloutElement` (`RichTextElements.tsx`)

현재 고정 아이콘 span을 **클릭 가능한 버튼 + 드롭다운**으로 교체한다.

- 아이콘 span → `<button contentEditable={false} onMouseDown={preventDefault}>` (selection 보존).
- 클릭 시 드롭다운 열림. 항목 4개: info/warning/success/tip — 각 lucide 아이콘(`CALLOUT_ICONS` 재사용) + 한글 라벨(정보/경고/성공/팁).
- 선택 시: `const path = editor.api.findPath(element); editor.tf.setNodes({ variant }, { at: path })`.
- read-only: 버튼이 아닌 비대화 span으로 렌더(기존과 동일한 모습, 클릭 불가).

**드롭다운 구현:** 프로젝트가 이미 쓰는 드롭다운 프리미티브를 재사용한다(RichTextField 툴바의 드롭다운 패턴). 4개 항목은 `DropdownMenuItem`으로 클릭 시 자동 닫힘 → 스와치 그리드류의 "제어형 open" 특례 불필요.

**variant 색상:** 기존 `.apfs-rt-callout.is-{variant}` CSS 그대로. 버튼 아이콘 색도 기존 `__ico` variant 색 상속.

### 라벨
- info=정보, warning=경고, success=성공, tip=팁. 버튼 `aria-label="알림 종류 변경"`.

## 접근성 / a11y
- 이미지 핸들: `role` 불필요(장식 드래그), `aria-label` 부여, 키보드 대체 경로는 기존 너비 프리셋 버튼이 담당(키보드로도 크기 조절 가능하도록 프리셋 유지).
- 콜아웃 버튼: 실제 `<button>`, `aria-label`, `aria-haspopup`. 드롭다운은 프로젝트 표준(Radix) 키보드 내비 상속.

## 테스트 / 검증 (필수: 브라우저 런타임)

빌드 green으로는 렌더 루프가 잡히지 않는다. **반드시 브라우저 콘솔에서 확인**한다.

1. 이미지 삽입 → 콘솔에 "Maximum update depth exceeded" **0건** 확인.
2. 우측 핸들 드래그 → 폭이 실시간 변함, mouseup 후 값 고정. 드래그 중 `setNodes` 호출이 1회(종료 시)만인지 확인(렌더 카운터 또는 콘솔 로그).
3. 좌측 핸들 드래그 → 반대 방향으로 축소/확대.
4. 클램프: 최소 64px 이하로 안 줄고, 래퍼 폭 초과 안 함.
5. 프리셋 버튼(S/M/L)이 드래그 후에도 동작(px→% 복귀).
6. 저장 → 모달 재오픈 왕복: px 폭 유지, 정렬·캡션 유지.
7. 콜아웃 삽입 → 아이콘 버튼 클릭 → 드롭다운 4종 → 각 선택 시 색/아이콘 즉시 변경, 본문 텍스트·selection 유지.
8. 콜아웃 variant 변경 후 저장 → 재오픈 왕복 유지.
9. read-only 모드: 이미지 핸들·콜아웃 버튼 모두 비활성.
10. `npm run build` green.

**⚠️ 합성 이벤트 검증 주의:** `ResizeHandle`은 mousedown 후 window에 mousemove/mouseup 리스너를 붙이므로 자동화 검증 시 down→(태스크 양보)→move→up 순서 필수(동기 연사는 무반응). 표 리사이즈 검증과 동일.

## 범위 밖 (YAGNI)
- 이미지 종횡비 고정/코너 핸들(좌우 핸들만; platejs 기본과 동일).
- 콜아웃 자유 이모지 피커(사용자가 "종류 바꾸기"를 택함 — variant 4종만).
- 비디오/임베드 드래그 리사이즈(이미지에 한정; 필요 시 후속).

## 구현/검증 워크플로 (프로젝트 규약)
- 구현은 worker에 위임(이 spec을 브리프로), 완료 후 Codex(`/codex:review`)로 diff 검증, 지적 반영 후 승인.
- 미커밋 상태의 richtext 파일들과 섞이지 않게 변경 범위를 이 두 기능으로 한정.
