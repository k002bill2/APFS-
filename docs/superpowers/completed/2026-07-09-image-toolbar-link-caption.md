# 이미지 툴바: Edit link · Caption · 삭제 (platejs 스타일) 구현 계획

> **For agentic workers:** 이 계획을 태스크대로 구현. 체크박스로 추적.

**Goal:** 이미지 선택 툴바를 platejs.org처럼 **[링크 편집 | 캡션 | 삭제]** 3개로 재구성한다(정렬·S/M/L 프리셋 제거, 드래그 핸들 리사이즈는 유지).

**Architecture:** `ImageElement`(RichTextElements.tsx)의 `apfs-rt-imgbar`에서 정렬/프리셋 버튼을 제거하고 링크·캡션 버튼을 추가. 캡션은 `@platejs/caption`의 `useCaptionButton` 토글(정석). 링크는 이미지 전용 `element.link`(URL)를 자체 도입 — 인라인 URL 입력으로 설정/제거, read-only에서 `<img>`를 `<a href>`로 감쌈.

**Tech Stack:** Plate v53, `@platejs/caption/react`(useCaptionButton/State), React, lucide(Link2·Captions·Trash2).

## Global Constraints
- 툴바 클릭이 selection을 뺏지 않게 `onMouseDown` preventDefault(기존 `stop` 헬퍼). 링크 입력 필드는 focus 받아야 하므로 mousedown에서 preventDefault 금지(대신 필요 시 stopPropagation).
- 색은 CSS 토큰만(`var(--popover)`, `var(--border)`, `var(--ring)`, `color-mix`). hex 금지.
- read-only(`useReadOnly()`)면 편집 버튼·입력 미렌더. 링크는 read-only에서 `<a>` 래핑만.
- `element.link`(선택적 문자열 URL) 외 저장모델 변경 없음. width/align/caption 기존대로.
- 드래그 리사이즈 핸들과 `onHandleResize`(e.finished 1커밋) 구조 절대 변경 금지.
- 정렬·프리셋 제거로 미사용이 되는 `AlignLeft/AlignCenter/AlignRight` import와 `IMG_WIDTHS` 상수는 제거(dead code 금지). Trash2는 유지.

**대상 파일**
- Modify: `src/dash/fields/RichTextElements.tsx` — import(L31 caption, L36~41 lucide), `IMG_WIDTHS`(L140) 제거, `ImageElement`(L141~205)
- Modify: `src/dash/fields/richtext.css` — 링크 입력 바 CSS 추가(`.apfs-rt-imgbar` 블록 근처 L251~276)

---

### Task 1: 이미지 툴바 재구성 + 링크/캡션

- [ ] **Step 1: import 조정**

`src/dash/fields/RichTextElements.tsx`:
- L31 `import { Caption, CaptionTextarea } from '@platejs/caption/react';` → `import { Caption, CaptionTextarea, useCaptionButton, useCaptionButtonState } from '@platejs/caption/react';`
- lucide import(L36~41)에서 `AlignLeft, AlignCenter, AlignRight,` 를 제거하고 `Link2, Captions,` 를 추가(같은 줄의 `Trash2`는 유지). 예: `  Trash2, Link2, Captions,` 형태로.

- [ ] **Step 2: `IMG_WIDTHS` 상수 제거**

L140 `const IMG_WIDTHS = [...]` 줄을 삭제(더 이상 안 씀).

- [ ] **Step 3: `ImageElement`(L141~205) 교체**

아래로 전체 교체. (드래그 핸들·`onHandleResize`는 기존과 동일 유지, 툴바 내용만 링크/캡션/삭제로 교체, 링크 인라인 입력·read-only `<a>` 래핑 추가.)

```tsx
export function ImageElement(props: any) {
  const { element } = props;
  const editor = useEditorRef();
  const selected = useSelected();
  const readOnly = useReadOnly();
  const align = element.align || 'left';
  const imgboxRef = useRef<HTMLSpanElement>(null);
  const [dragW, setDragW] = useState<number | null>(null);
  const [linkEditing, setLinkEditing] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const width = dragW != null ? `${Math.round(dragW)}px` : (element.width || '100%');
  const capBtn = useCaptionButton(useCaptionButtonState());   // 캡션 토글(정석): onClick이 visibleId=element.id + 포커스
  const set = (patch: any) => { const p = editor.api.findPath(element); if (p) editor.tf.setNodes(patch, { at: p }); };
  const del = () => { const p = editor.api.findPath(element); if (p) editor.tf.removeNodes({ at: p }); editor.tf.focus(); };
  const stop = (e: any) => e.preventDefault(); // 툴바 클릭이 이미지 선택을 빼앗지 않게
  // 드래그 리사이즈: 시작 폭은 e.initialSize(마우스·터치 공통), onResize에서 로컬 state만, finished:true에 setNodes 1회 커밋.
  const onHandleResize = (direction: 'left' | 'right') => (e: any) => {
    const mult = (align === 'center' ? 2 : 1) * (direction === 'left' ? -1 : 1);
    const maxW = imgboxRef.current?.parentElement?.clientWidth || 9999;
    const next = Math.max(64, Math.min((e.initialSize || 0) + e.delta * mult, maxW));
    if (e.finished) { setDragW(null); set({ width: `${Math.round(next)}px` }); } else { setDragW(next); }
  };
  const openLink = () => { setLinkDraft(element.link || ''); setLinkEditing(true); };
  const saveLink = () => { const u = linkDraft.trim(); set({ link: u || undefined }); setLinkEditing(false); editor.tf.focus(); };
  const removeLink = () => { set({ link: undefined }); setLinkEditing(false); editor.tf.focus(); };
  const imgEl = <img src={element.url} alt="" />;
  return (
    <PlateElement {...props}>
      <div className="apfs-rt-imgwrap" contentEditable={false} style={{ textAlign: align as any }}>
        <span ref={imgboxRef} className={'apfs-rt-imgbox' + (selected ? ' is-sel' : '')} style={{ width }}>
          {readOnly && element.link
            ? <a href={element.link} target="_blank" rel="noreferrer">{imgEl}</a>
            : imgEl}
          {selected && !readOnly && (
            <>
              <ResizeHandle
                options={{ direction: 'left', onResize: onHandleResize('left') } as any}
                className="apfs-rt-imgresize is-left" contentEditable={false} aria-label="이미지 너비 조절(왼쪽)" />
              <ResizeHandle
                options={{ direction: 'right', onResize: onHandleResize('right') } as any}
                className="apfs-rt-imgresize is-right" contentEditable={false} aria-label="이미지 너비 조절(오른쪽)" />
            </>
          )}
          {selected && !readOnly && (
            <span className="apfs-rt-imgbar" role="toolbar" aria-label="이미지 편집">
              <button type="button" title="링크 편집" aria-label="링크 편집" aria-pressed={!!element.link}
                className={'apfs-rt-imgbtn' + (element.link ? ' is-active' : '')} onMouseDown={stop} onClick={openLink}>
                <Link2 size={15} strokeWidth={2} aria-hidden={true} /></button>
              <button type="button" title="캡션" aria-label="캡션 추가" className="apfs-rt-imgbtn"
                onMouseDown={stop} onClick={capBtn.props.onClick}>
                <Captions size={15} strokeWidth={2} aria-hidden={true} /></button>
              <span className="apfs-rt-imgsep" aria-hidden="true" />
              <button type="button" title="이미지 삭제" aria-label="이미지 삭제" className="apfs-rt-imgbtn is-danger"
                onMouseDown={stop} onClick={del}>
                <Trash2 size={15} strokeWidth={2} aria-hidden={true} /></button>
            </span>
          )}
          {selected && !readOnly && linkEditing && (
            <span className="apfs-rt-imginput" role="group" aria-label="이미지 링크 URL">
              <input className="apfs-rt-imginput__field" type="url" placeholder="https://..." value={linkDraft}
                autoFocus onMouseDown={(e) => e.stopPropagation()} onChange={(e) => setLinkDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveLink(); } if (e.key === 'Escape') { e.preventDefault(); setLinkEditing(false); } }} />
              <button type="button" className="apfs-rt-imgbtn is-text" onMouseDown={stop} onClick={saveLink}>적용</button>
              {element.link && <button type="button" className="apfs-rt-imgbtn is-text" onMouseDown={stop} onClick={removeLink}>제거</button>}
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

- [ ] **Step 4: 링크 입력 바 CSS 추가**

`src/dash/fields/richtext.css`의 `.apfs-rt-imgsep { ... }`(L276) 다음에 삽입:

```css
/* 이미지 링크 URL 입력 바 — 툴바 아래 팝오버. */
.apfs-rt-imginput {
  position: absolute;
  top: 46px; left: 50%;
  transform: translateX(-50%);
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 6px;
  background: var(--popover);
  border: 1px solid var(--border);
  border-radius: 9px;
  box-shadow: 0 4px 14px rgb(0 0 0 / .16);
  z-index: 3;
  white-space: nowrap;
}
.apfs-rt-imginput__field {
  width: 220px; height: 26px; padding: 0 8px;
  font-size: 12px; color: var(--foreground);
  background: var(--background);
  border: 1px solid var(--border); border-radius: 6px; outline: none;
}
.apfs-rt-imginput__field:focus { border-color: var(--ring); }
```

- [ ] **Step 5: 빌드 검증**

Run: `npm run build`
Expected: green(500kB 청크 경고는 기존 것, 무시). 미정의 심볼(제거한 AlignLeft 등이 남아 참조) 없어야 함.

- [ ] **Step 6: 커밋**

```bash
git add src/dash/fields/RichTextElements.tsx src/dash/fields/richtext.css
git commit -m "$(printf 'feat(editor): 이미지 툴바를 링크편집·캡션·삭제로 재구성\n\n- 정렬·S/M/L 프리셋 버튼 제거(드래그 핸들 리사이즈는 유지), platejs 스타일\n- 캡션 버튼=@platejs/caption useCaptionButton 토글(내용 없으면 자동 숨김)\n- 이미지 링크=element.link 자체 도입, 인라인 URL 입력·제거, read-only에서 <a href> 래핑\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01J3kyZMA5yA3FGCLHXYUTM2')"
```

**컨트롤러 검증(구현자 범위 밖):** 브라우저에서 링크 설정/제거·캡션 토글·정렬버튼 제거 확인은 컨트롤러가 직접.

## Self-Review
- 스펙 커버리지: 링크편집(Task1 openLink/saveLink/removeLink + read-only `<a>`), 캡션(useCaptionButton), 삭제(기존 del), 정렬·프리셋 제거(Step1~3), 드래그핸들 유지(onHandleResize 불변) 모두 매핑.
- Placeholder 없음(전체 코드 제공).
- 타입 일관: `element.link`(문자열), `set({link})`, `capBtn.props.onClick` 시그니처 정합.
