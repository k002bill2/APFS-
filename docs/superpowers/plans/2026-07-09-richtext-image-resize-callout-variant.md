# 이미지 드래그 리사이즈 + 콜아웃 종류 전환 UI 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** APFS 리치텍스트 에디터에 (1) 이미지 좌·우 드래그 핸들 리사이즈, (2) 콜아웃 삽입 후 종류(variant) 전환 드롭다운을 platejs.org와 동일하게 추가한다.

**Architecture:** 이미지 리사이즈는 `@platejs/resizable`의 `ResizeHandle` 프리미티브만 사용하고 폭 계산·커밋은 직접 제어한다 — 드래그 중엔 로컬 React state로 미리보기(에디터 미접촉), `finished:true`일 때 `setNodes` 1회만 커밋(표 컬럼 리사이즈에서 실증된 무루프 패턴). 콜아웃은 고정 아이콘 span을 `DropdownMenu` 트리거 버튼으로 교체하고 선택 시 `setNodes({variant})`한다.

**Tech Stack:** Plate v53 (`platejs`, `@platejs/resizable`), React 18, TypeScript, Radix `DropdownMenu`(`../ui/dropdown-menu`), lucide-react.

## Global Constraints

- **렌더 루프 금지 벡터:** 드래그 중 `setNodes`/editor 변형 절대 금지. 커밋은 `finished:true` 1회만. (`@platejs/resizable`의 전체 `Resizable` 래퍼는 과거 "Maximum update depth" 루프의 원인 — 사용 금지.)
- **색은 토큰만:** `tokens.css`/기존 richtext.css 변수(`var(--accent)`, `var(--popover)`, `color-mix`)만. hex 하드코딩 금지.
- **selection 보존:** 콜아웃 버튼·이미지 핸들의 상호작용이 에디터 selection을 빼앗지 않게 `onMouseDown`에서 `preventDefault`.
- **read-only 비활성:** `useReadOnly()`가 true면 핸들·버튼 미렌더(비대화 span으로 대체).
- **검증은 브라우저 필수:** 이 프로젝트엔 Plate 엘리먼트 단위 테스트 인프라가 없음. 관문 = `npm run build` green + 브라우저 콘솔 런타임 확인(빌드로는 렌더 루프가 안 잡힘).
- **변경 범위 한정:** 워킹 트리에 미커밋된 richtext 파일 변경분(직전 세션)이 있음. 이 두 기능 외 코드는 건드리지 않음. 커밋 시 관련 파일만 surgical add.

**대상 파일**
- Modify: `src/dash/fields/RichTextElements.tsx` — `ImageElement`(L141~182), `CalloutElement`(L522~534), import(L28 `ResizeHandle` 기존, L36~41 lucide, 신규 dropdown-menu import).
- Modify: `src/dash/fields/richtext.css` — 이미지 핸들 CSS(`.apfs-rt-imgbox` 블록 L204~243 부근), 콜아웃 버튼 CSS(L556~576 부근).

---

### Task 1: 이미지 드래그 리사이즈

**Files:**
- Modify: `src/dash/fields/RichTextElements.tsx` — `ImageElement` (L141~182)
- Modify: `src/dash/fields/richtext.css` — `.apfs-rt-imgbox` 블록 부근 (L204~212)

**Interfaces:**
- Consumes: `useEditorRef`, `useSelected`, `useReadOnly` (이미 import됨, L9), `useRef`/`useState` (L8), `ResizeHandle` from `@platejs/resizable` (L28), `Caption`/`CaptionTextarea`(L31).
- Produces: 없음(리프 컴포넌트). `element.width`에 px 문자열(`"320px"`) 또는 기존 % 문자열 저장.

- [ ] **Step 1: `ImageElement`에 드래그 상태·핸들 로직 추가**

`src/dash/fields/RichTextElements.tsx`의 `ImageElement`(L141~182)를 아래로 교체한다. 기존 정렬/프리셋/삭제 툴바와 캡션은 그대로 두고, ① `imgboxRef` + 드래그 상태 추가, ② `width` 계산에 `dragW` 반영, ③ imgbox 안에 좌·우 `ResizeHandle` 추가.

```tsx
export function ImageElement(props: any) {
  const { element } = props;
  const editor = useEditorRef();
  const selected = useSelected();
  const readOnly = useReadOnly();
  const align = element.align || 'left';
  const imgboxRef = useRef<HTMLSpanElement>(null);
  const startW = useRef(0);
  const [dragW, setDragW] = useState<number | null>(null);
  const width = dragW != null ? `${Math.round(dragW)}px` : (element.width || '100%');
  const set = (patch: any) => { const p = editor.api.findPath(element); if (p) editor.tf.setNodes(patch, { at: p }); };
  const del = () => { const p = editor.api.findPath(element); if (p) editor.tf.removeNodes({ at: p }); editor.tf.focus(); };
  const stop = (e: any) => e.preventDefault(); // 툴바/핸들 클릭이 이미지 선택을 빼앗지 않게
  // 드래그 리사이즈: mousedown에 현재 imgbox 폭을 기준으로 고정, onResize에서 로컬 state만 갱신(에디터 미접촉),
  // finished:true에 setNodes 1회 커밋 → "Maximum update depth" 루프 벡터 회피(표 컬럼 리사이즈와 동일 패턴).
  const onHandleDown = () => { startW.current = imgboxRef.current?.offsetWidth || 0; };
  const onHandleResize = (direction: 'left' | 'right') => (e: any) => {
    const mult = (align === 'center' ? 2 : 1) * (direction === 'left' ? -1 : 1);
    const maxW = imgboxRef.current?.parentElement?.clientWidth || 9999; // .apfs-rt-imgwrap 폭
    const next = Math.max(64, Math.min(startW.current + e.delta * mult, maxW));
    if (e.finished) {
      setDragW(null);
      set({ width: `${Math.round(next)}px` });
    } else {
      setDragW(next);
    }
  };
  return (
    <PlateElement {...props}>
      <div className="apfs-rt-imgwrap" contentEditable={false} style={{ textAlign: align as any }}>
        <span ref={imgboxRef} className={'apfs-rt-imgbox' + (selected ? ' is-sel' : '')} style={{ width }}>
          <img src={element.url} alt="" />
          {selected && !readOnly && (
            <>
              <ResizeHandle
                options={{ direction: 'left', onMouseDown: onHandleDown, onResize: onHandleResize('left') } as any}
                className="apfs-rt-imgresize is-left" contentEditable={false} aria-label="이미지 너비 조절(왼쪽)" />
              <ResizeHandle
                options={{ direction: 'right', onMouseDown: onHandleDown, onResize: onHandleResize('right') } as any}
                className="apfs-rt-imgresize is-right" contentEditable={false} aria-label="이미지 너비 조절(오른쪽)" />
            </>
          )}
          {selected && !readOnly && (
            <span className="apfs-rt-imgbar" role="toolbar" aria-label="이미지 편집">
              {[{ k: 'left', I: AlignLeft, t: '왼쪽' }, { k: 'center', I: AlignCenter, t: '가운데' }, { k: 'right', I: AlignRight, t: '오른쪽' }].map((a) => (
                <button key={a.k} type="button" title={`${a.t} 정렬`} aria-label={`${a.t} 정렬`} aria-pressed={align === a.k}
                  className={'apfs-rt-imgbtn' + (align === a.k ? ' is-active' : '')} onMouseDown={stop} onClick={() => set({ align: a.k })}>
                  <a.I size={15} strokeWidth={2} aria-hidden={true} /></button>
              ))}
              <span className="apfs-rt-imgsep" aria-hidden="true" />
              {IMG_WIDTHS.map((w) => (
                <button key={w.v} type="button" title={`너비 ${w.label}`} aria-label={`너비 ${w.label}`} aria-pressed={width === w.v}
                  className={'apfs-rt-imgbtn is-text' + (width === w.v ? ' is-active' : '')} onMouseDown={stop} onClick={() => set({ width: w.v })}>{w.label}</button>
              ))}
              <span className="apfs-rt-imgsep" aria-hidden="true" />
              <button type="button" title="이미지 삭제" aria-label="이미지 삭제" className="apfs-rt-imgbtn is-danger" onMouseDown={stop} onClick={del}>
                <Trash2 size={15} strokeWidth={2} aria-hidden={true} /></button>
            </span>
          )}
        </span>
        <Caption style={{ width }}>
          <CaptionTextarea className="apfs-rt-caption" placeholder="캡션 입력…" />
        </Caption>
      </div>
      {props.children}
    </PlateElement>
  );
}
```

- [ ] **Step 2: 이미지 핸들 CSS 추가**

`src/dash/fields/richtext.css`의 `.apfs-rt-imgbox.is-sel img { ... }`(L212) 바로 다음 줄에 아래를 삽입한다.

```css
/* ── 이미지 드래그 리사이즈 핸들 — 선택 시 좌·우 세로 바. 컬럼 리사이즈와 동일한 히트영역/시각 바 분리. ── */
.apfs-rt-imgresize {
  position: absolute;
  top: 0;
  width: 14px;
  height: 100%;
  z-index: 1;               /* imgbar(z:2) 아래, 이미지 위 */
  cursor: ew-resize;
  user-select: none;
  touch-action: none;
  background: transparent;
}
.apfs-rt-imgresize.is-left { left: -7px; }
.apfs-rt-imgresize.is-right { right: -7px; }
.apfs-rt-imgresize::after {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 40px;
  max-height: 56%;
  border-radius: 4px;
  background: var(--accent);
  box-shadow: 0 0 0 2px var(--popover);
  opacity: 0;
  transition: opacity .12s var(--ease, ease);
}
.apfs-rt-imgresize.is-left::after { left: 5px; }
.apfs-rt-imgresize.is-right::after { right: 5px; }
.apfs-rt-imgbox.is-sel .apfs-rt-imgresize::after,
.apfs-rt-imgresize:hover::after { opacity: 1; }
```

- [ ] **Step 3: 빌드 검증**

Run: `npm run build`
Expected: green (타입/번들 에러 0). esbuild는 타입체크 안 하지만 문법·import 오류는 잡힘.

- [ ] **Step 4: 브라우저 런타임 검증 (필수 — 렌더 루프)**

Vite dev(`npm run dev`, http://localhost:5273)로 등록/수정 모달의 리치텍스트 필드를 연다(리스트 페이지 행 더블클릭 → 리치텍스트 항목이 있는 스키마). 없으면 designsystem/에디터 프리뷰 화면 사용.

1. 이미지 삽입(툴바 이미지 URL 삽입) → **콘솔에 "Maximum update depth exceeded" 0건** 확인.
2. 이미지 선택 → 좌·우 세로 바가 보임(hover/선택 시). 우측 바를 오른쪽으로 드래그 → 폭이 실시간 증가, mouseup 후 값 고정.
3. 좌측 바를 왼쪽으로 드래그 → 폭 증가(부호 방향 확인). 안쪽으로 드래그 → 축소.
4. 클램프: 64px 이하로 안 줄고, imgwrap 폭 초과 안 함.
5. 드래그 후 프리셋 버튼(S/M/L) 클릭 → px→% 복귀 정상.
6. 정렬(가운데)로 바꾼 뒤 드래그 → 좌우 대칭(×2)으로 커짐.

⚠️ `ResizeHandle`은 mousedown 후 window에 mousemove/mouseup 리스너를 붙임. 자동화(Chrome MCP)로 검증 시 mousedown→(태스크 양보)→mousemove→mouseup 순서 필수(동기 연사는 무반응). `<div>` in `<span>` 1회성 DOMNesting 경고는 무해(기존 문서화된 허용 범위).

- [ ] **Step 5: 저장 왕복 검증**

이미지 폭을 드래그로 바꾼 뒤 모달 저장 → 재오픈 → px 폭 유지, 정렬·캡션 유지 확인.

- [ ] **Step 6: 커밋**

```bash
git add src/dash/fields/RichTextElements.tsx src/dash/fields/richtext.css
git commit -m "feat(editor): 이미지 좌우 드래그 핸들 리사이즈 추가"
```

---

### Task 2: 콜아웃 종류(variant) 전환 UI

**Files:**
- Modify: `src/dash/fields/RichTextElements.tsx` — `CalloutElement` (L522~534), lucide import(L36~41), 신규 dropdown-menu import
- Modify: `src/dash/fields/richtext.css` — 콜아웃 블록(L556~576 부근)

**Interfaces:**
- Consumes: `useEditorRef`(L9), `useReadOnly`(L9), `DropdownMenu`/`DropdownMenuTrigger`/`DropdownMenuContent`/`DropdownMenuItem` from `../ui/dropdown-menu`, `CALLOUT_ICONS`(L523, 기존), lucide `Info`/`TriangleAlert`/`CircleCheck`/`Lightbulb`(L38, 기존).
- Produces: `element.variant`에 `'info' | 'warning' | 'success' | 'tip'` 저장(기존 모델 유지).

- [ ] **Step 1: dropdown-menu import 추가**

`src/dash/fields/RichTextElements.tsx` 상단 import 구역(다른 상대경로 import 근처)에 추가한다.

```tsx
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
```

- [ ] **Step 2: `CalloutElement`를 종류 전환 드롭다운으로 교체**

`CalloutElement`(L522~534)와 그 위의 `CALLOUT_ICONS`(L523) 블록을 아래로 교체한다.

```tsx
/* ── 콜아웃(callout) = 블록 컨테이너. variant/icon을 element에 저장. 아이콘 버튼→종류 전환 드롭다운. ── */
const CALLOUT_ICONS: Record<string, any> = { info: Info, warning: TriangleAlert, success: CircleCheck, tip: Lightbulb };
const CALLOUT_VARIANTS = [
  { key: 'info', label: '정보', Icon: Info },
  { key: 'warning', label: '경고', Icon: TriangleAlert },
  { key: 'success', label: '성공', Icon: CircleCheck },
  { key: 'tip', label: '팁', Icon: Lightbulb },
];
export function CalloutElement(props: any) {
  const { element } = props;
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const variant = element.variant || 'info';
  const Ico = CALLOUT_ICONS[variant] || Info;
  const setVariant = (v: string) => { const p = editor.api.findPath(element); if (p) editor.tf.setNodes({ variant: v } as any, { at: p }); };
  return (
    <PlateElement {...props} className={'apfs-rt-callout is-' + variant}>
      {readOnly ? (
        <span className="apfs-rt-callout__ico" contentEditable={false} aria-hidden="true"><Ico size={18} strokeWidth={2} /></span>
      ) : (
        <span className="apfs-rt-callout__ico-wrap" contentEditable={false}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="apfs-rt-callout__ico apfs-rt-callout__btn" aria-label="알림 종류 변경"
                aria-haspopup="menu" onMouseDown={(e) => e.preventDefault()}>
                <Ico size={18} strokeWidth={2} aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onCloseAutoFocus={(e) => { e.preventDefault(); editor.tf.focus(); }}>
              {CALLOUT_VARIANTS.map((v) => (
                <DropdownMenuItem key={v.key} onSelect={() => setVariant(v.key)}>
                  <v.Icon size={15} strokeWidth={2} aria-hidden style={{ marginRight: 8 }} />{v.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      )}
      <div className="apfs-rt-callout__body">{props.children}</div>
    </PlateElement>
  );
}
```

- [ ] **Step 3: 콜아웃 버튼 CSS 추가**

`src/dash/fields/richtext.css`의 `.apfs-rt-callout__ico { ... }`(L565) 다음에 아래를 삽입한다. (`__ico` variant 색은 `.is-{variant} .apfs-rt-callout__ico`가 이미 지정하므로 버튼도 클래스 공유로 상속.)

```css
.apfs-rt-callout__ico-wrap { flex: none; }
.apfs-rt-callout__btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 2px; margin: -1px -2px 0;
  border: 0; background: transparent; border-radius: 6px;
  cursor: pointer; color: inherit;
  transition: background .12s var(--ease, ease);
}
.apfs-rt-callout__btn:hover { background: color-mix(in srgb, currentColor 14%, transparent); }
```

- [ ] **Step 4: 빌드 검증**

Run: `npm run build`
Expected: green.

- [ ] **Step 5: 브라우저 런타임 검증**

1. 콜아웃 삽입(툴바/슬래시 '콜아웃') → 아이콘이 버튼으로 렌더, hover 시 배경 하이라이트.
2. 아이콘 버튼 클릭 → 드롭다운 4종(정보/경고/성공/팁) 열림, **모달이 닫히지 않음**(DismissableLayer 안전) 확인.
3. 각 항목 선택 → 콜아웃 배경/테두리/아이콘 색 즉시 변경, **본문 텍스트·커서 selection 유지**.
4. 콘솔 에러 0건.
5. read-only(있으면): 아이콘이 비대화 span, 클릭 불가.

- [ ] **Step 6: 저장 왕복 검증**

variant 변경 후 저장 → 재오픈 → 바뀐 종류 유지 확인.

- [ ] **Step 7: 커밋**

```bash
git add src/dash/fields/RichTextElements.tsx src/dash/fields/richtext.css
git commit -m "feat(editor): 콜아웃 삽입 후 종류 전환 드롭다운 추가"
```

---

## 최종 통합 검증

- [ ] `npm run build` green.
- [ ] 이미지 리사이즈 + 콜아웃 전환을 한 문서에서 함께 사용해도 콘솔 "Maximum update depth" 0건.
- [ ] `/codex:review`로 두 커밋 diff 검증 → 지적사항 반영 후 승인(프로젝트 조언자–작업자–Codex 규약).

## Self-Review 결과 (작성자 점검)

- **Spec 커버리지:** 이미지 드래그(Task 1)·콜아웃 전환(Task 2)·렌더루프 회피(Global Constraints + Task1 Step1 로직)·저장 왕복(각 Step)·a11y(aria-label/버튼)·범위밖(비디오/이모지 제외) 모두 매핑됨.
- **Placeholder:** 없음. 모든 코드 블록은 실제 붙여넣기 가능한 전체 코드.
- **타입 일관성:** `element.width`(문자열), `element.variant`(4종 문자열), `onHandleResize(direction)`, `setVariant(v)` 시그니처가 두 태스크 간 충돌 없음. `IMG_WIDTHS`(L140)·`CALLOUT_ICONS`는 기존 심볼 재사용.
- **좌측 핸들 부호:** Plate 소스(`initialSize + delta * ((center?2:1)*(left?-1:1))`)를 그대로 이식 — 추측 아님.
