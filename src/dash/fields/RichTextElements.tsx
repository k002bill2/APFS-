/* RichTextElements — Plate 헤드리스 노드의 element/leaf 컴포넌트 + COMPONENTS 매핑.
   (RichTextField.tsx에서 분리 — 노드 렌더링이 커져 편집 신뢰도를 위해 별도 파일로 격리.)
   ── 헤드리스 렌더 원칙 ──
   Plate 기본 element는 <div>로 렌더된다 → 블록/마크 타입을 명시 시맨틱 태그로 override해야 CSS(.apfs-prose <tag>)가
   맞물린다. a/img/hr/table/toggle/callout/column/math/mention/date는 각자 명시 컴포넌트로 실제 DOM을 그린다.
   COMPONENTS는 RichTextField의 usePlateEditor({components})로 주입된다. 배치별로 항목이 늘어난다. */
import type { CSSProperties } from 'react';
import { createContext, useContext, useRef, useState } from 'react';
import { PlateElement, PlateLeaf, useEditorRef, useSelected, useReadOnly, usePluginOption, usePath } from 'platejs/react';
import { getLinkAttributes, validateUrl } from '@platejs/link';
import { insertTableRow, insertTableColumn, deleteRow, deleteColumn, deleteTable } from '@platejs/table';
// 셀 다중 선택(공식 Plate): useSelectedCells=selection→선택 셀 id 동기화(표 요소에서 1회 마운트),
// useIsCellSelected=셀별 선택 구독(element.id 기반 — NodeIdPlugin이 셀에도 id 부여).
// ⚠️ useSelectedCells는 플러그인 옵션에만 쓰는 가드된 write-back(useEditorSelector+equalityFn 메모)이라
//    editor value를 건드리지 않는다 → resizable류 렌더 루프 벡터 아님(브라우저 콘솔로 무루프 검증).
// 컬럼 리사이즈: useTableColSizes(colgroup 폭)+useTableCellElement(셀 인덱스)+useTableCellElementResizable
// (핸들 props — 드래그 중 tableStore override만, 종료 시 setNodes 1회 커밋 → 이미지 resizable류 루프 벡터 아님).
// tableStore는 TableProvider 스코프라 표 요소를 Provider로 감싼다.
import {
  TablePlugin, TableProvider, useSelectedCells, useIsCellSelected,
  useTableColSizes, useTableCellElement, useTableCellElementResizable, useTableMergeState,
  getOnSelectTableBorderFactory,   // 테두리 토글(none/outer/각 side) — 이웃 셀 협조·caret 셀 폴백 내장
  useTableValue,                   // tableStore 구독 — 행 높이 드래그 중 rowSizeOverrides 미리보기
} from '@platejs/table/react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
// ResizeHandle: div 프리미티브(mousedown 기반). ⚠️ 초기 크기를 event.target.parentElement.offsetWidth로
// 읽으므로 반드시 셀(td)의 직속 자식으로 렌더(래퍼로 감싸면 래퍼 폭을 읽어 오작동).
import { ResizeHandle } from '@platejs/resizable';
import { useTodoListElement, useTodoListElementState } from '@platejs/list-classic/react';  // 체크리스트 li의 checkbox 상태·토글
import { useToggleButtonState, useToggleButton } from '@platejs/toggle/react';
import { Caption, CaptionTextarea, useCaptionButton, useCaptionButtonState } from '@platejs/caption/react';
import { parseVideoUrl } from '@platejs/media';
import { useDraggable, useDropLine } from '@platejs/dnd';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  Trash2, Link2, Captions, Replace,
  ChevronRight, Info, TriangleAlert, CircleCheck, Lightbulb, Rows3, Columns3,
  Plus, CalendarDays, AtSign, GripVertical, FileDown as FileDownIcon, Combine, Ungroup,
  PaintBucket, Grid3x3, Square, SquareDashed, PanelTop, PanelBottom, PanelLeft, PanelRight, X as XIcon,
} from 'lucide-react';

// 문서 콘텐츠 팔레트(고정 절대색 — 문서에 박혀 라이트/다크 무관 유지). 글꼴색/형광(RichTextField)과 표 셀 배경이 공유.
// 공식 Plate 피커와 동일한 구글 독스 계열 10열×8행: 그레이스케일 → 원색 → 밝은 톤 3단 → 어두운 톤 3단.
export const DOC_PALETTE = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
  '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
  '#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47',
  '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130',
];

// 병합 셀 분할 가능 여부 — v53 useTableMergeState.canSplit은 구조적으로 항상 false(패키지 버그:
// getSelectedCellEntries가 셀 1개면 []를 반환하는데 canSplit은 length===1을 요구). 실행부
// splitTableCell은 caret만으로 정상 동작하므로 게이트만 직접 계산한다. sel 지정 시 그 위치 기준.
// ⚠️ editor.api.isExpanded()는 인자를 무시(항상 현재 selection)라 collapsed는 anchor/focus 비교로 자체 판정.
//    (RichTextField·표 캡션 툴바가 공유 — Field→Elements 순환 import 방지 위해 여기 배치.)
export function canSplitCell(editor: any, sel?: any): boolean {
  try {
    const at = sel ?? editor.selection;
    if (!at?.anchor || !at?.focus) return false;
    if (JSON.stringify(at.anchor) !== JSON.stringify(at.focus)) return false;  // expanded → 분할 아닌 병합 영역
    const entry = editor.api.above({ at, match: (n: any) => n.type === 'td' || n.type === 'th' });
    const c = entry?.[0];
    return !!c && ((c.colSpan ?? 1) > 1 || (c.rowSpan ?? 1) > 1);
  } catch { return false; }
}

/* 블록/리프를 시맨틱 태그로 렌더 — CSS(.apfs-prose <tag>)가 DOM 태그를 노린다. */
export const blockEl = (as: string) => function El(props: any) { return <PlateElement as={as} {...props} />; };
export const leafEl  = (as: string) => function Lf(props: any) { return <PlateLeaf as={as} {...props} />; };

/* li 하위에서 첫 텍스트 leaf(text 속성 보유 노드)를 children[0]로 내려가며 찾는다(깊이 제한).
   구조는 보통 li > lic(p) > text 이지만 방어적으로 탐색한다. */
function firstTextLeaf(node: any, depth = 5): any {
  if (!node || depth < 0) return undefined;
  if (typeof node.text === 'string') return node;
  return firstTextLeaf(node.children?.[0], depth - 1);
}

/* ── 목록 항목(li) — ul/ol/taskList가 공유하는 노드. ──
   taskList의 li는 element.checked(boolean)를 갖는다. 'checked' in element로 판별해 체크박스를 렌더.
   훅(useTodoListElement*)은 분기 전에 무조건 호출(React 훅 규칙). 체크박스는 contentEditable=false +
   mousedown preventDefault로 클릭이 에디터 caret을 빼앗지 않게 한다. */
export function ListItemElement(props: any) {
  const { element } = props;
  const isTask = 'checked' in element;
  const state = useTodoListElementState({ element });
  const { checkboxProps } = useTodoListElement(state);
  /* 폰트사이즈·bold·italic·글자색은 텍스트 leaf에 인라인으로 실리지만 ::marker(불릿·번호)는 li 레벨을
     상속한다 → leaf 마크가 안 닿는다. 첫 leaf의 서식을 CSS 변수로 li에 실어 ::marker가 참조하게 우회.
     (underline/strikethrough는 ::marker에 text-decoration 적용 불가라 제외 — CSS 스펙 한계.) */
  const lf = firstTextLeaf(element);
  const markerVars: Record<string, any> = {};
  if (lf?.fontSize) markerVars['--rt-marker-fs'] = lf.fontSize;
  if (lf?.bold) markerVars['--rt-marker-fw'] = 700;
  if (lf?.italic) markerVars['--rt-marker-fst'] = 'italic';
  if (lf?.color) markerVars['--rt-marker-color'] = lf.color;
  const liAttributes = Object.keys(markerVars).length
    ? { ...props.attributes, style: { ...props.attributes?.style, ...markerVars } }
    : props.attributes;
  return (
    <PlateElement {...props} attributes={liAttributes} as="li" className={isTask ? ('apfs-rt-taskitem' + (checkboxProps.checked ? ' is-checked' : '')) : undefined}>
      {isTask && (
        <span className="apfs-rt-taskcheck" contentEditable={false}>
          <input type="checkbox" checked={!!checkboxProps.checked} aria-label="완료 여부"
            onMouseDown={(e) => e.preventDefault()}
            onChange={(e) => checkboxProps.onCheckedChange?.(e.target.checked)} />
        </span>
      )}
      {props.children}
    </PlateElement>
  );
}
/* taskList 컨테이너 = 불릿 없는 <ul>. 헤드리스라 COMPONENTS 등록 없으면 체크리스트가 통째로 안 보임. */
export function TaskListElement(props: any) {
  return <PlateElement {...props} as="ul" className={'apfs-rt-tasklist' + (props.className ? ' ' + props.className : '')} />;
}
/* 번호 목록(ol) — list-classic엔 네이티브 번호 스타일이 없어 element.listStyleType(CSS list-style-type
   키워드: decimal/lower-alpha/upper-alpha/lower-roman/upper-roman)를 노드 속성으로 저장·렌더한다.
   인라인 style이 .apfs-prose ol{list-style:decimal}을 오버라이드(인라인 우선), 미설정 시 기본 decimal 유지.
   속성은 Slate JSON에 실려 왕복하고, HTML 내보내기(DOM 클론)도 인라인 style을 그대로 보존한다.
   ⚠️ 인라인 style은 top-level prop이 아니라 attributes.style로 넘겨야 DOM 노드에 실린다(TableCell/Row 규약). */
export function OrderedListElement(props: any) {
  const t = props.element?.listStyleType;
  return <PlateElement {...props} as="ol"
    attributes={t ? { ...props.attributes, style: { ...props.attributes?.style, listStyleType: t } } : props.attributes} />;
}

/* 글머리 목록(ul) — ol과 동형. 불릿 스타일(disc/circle/square)을 element.listStyleType로 저장·렌더한다.
   인라인 style이 .apfs-prose ul{list-style:disc}를 오버라이드, 미설정 시 기본 disc 유지. */
export function BulletedListElement(props: any) {
  const t = props.element?.listStyleType;
  return <PlateElement {...props} as="ul"
    attributes={t ? { ...props.attributes, style: { ...props.attributes?.style, listStyleType: t } } : props.attributes} />;
}

/* ── 링크 = 인라인 <a href>. getLinkAttributes로 href sanitize(javascript: 등 차단). ── */
export function LinkElement(props: any) {
  const editor = useEditorRef();
  return <PlateElement {...props} as="a" attributes={{ ...props.attributes, ...getLinkAttributes(editor, props.element), target: '_blank', rel: 'noopener noreferrer' }} />;
}

/* ── 이미지 = 보이드 블록. 선택 시 편집 툴바(정렬·너비·삭제) 오버레이. align/width는 element에 저장·적용. ── */
export function ImageElement(props: any) {
  const { element } = props;
  const editor = useEditorRef();
  const selected = useSelected();
  const readOnly = useReadOnly();
  const align = element.align || 'left';
  const imgboxRef = useRef<HTMLSpanElement>(null);
  const [dragW, setDragW] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<null | 'link' | 'src'>(null);   // 인라인 입력 바: 링크(하이퍼링크) vs 소스(이미지 주소)
  const [draft, setDraft] = useState('');
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
  const openLink = () => { setDraft(element.link || ''); setEditMode('link'); };
  const openSrc = () => { setDraft(element.url || ''); setEditMode('src'); };
  const saveEdit = () => {
    const v = draft.trim();
    if (editMode === 'link') {
      if (v && !validateUrl(editor, v)) return;   // javascript: 등 무효/위험 스킴 거부 — 입력 유지
      set({ link: v || undefined });
    } else if (editMode === 'src') {
      if (!v) return;                              // 소스는 필수 — 비우면 무시(입력 유지)
      set({ url: v });                             // 이미지 주소 교체(크기·정렬·캡션·링크 유지)
    }
    setEditMode(null);
    editor.tf.focus();
  };
  const removeLink = () => { set({ link: undefined }); setEditMode(null); editor.tf.focus(); };
  const imgEl = <img src={element.url} alt="" />;
  const safeHref = element.link ? getLinkAttributes(editor, { type: 'a', url: element.link, children: [] } as any).href : undefined;
  return (
    <PlateElement {...props}>
      <div className="apfs-rt-imgwrap" contentEditable={false} style={{ textAlign: align as any }}>
        <span ref={imgboxRef} className={'apfs-rt-imgbox' + (selected ? ' is-sel' : '')} style={{ width }}>
          {readOnly && safeHref
            ? <a href={safeHref} target="_blank" rel="noopener noreferrer">{imgEl}</a>
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
              <button type="button" title="이미지 교체" aria-label="이미지 주소 교체" aria-pressed={editMode === 'src'}
                className={'apfs-rt-imgbtn' + (editMode === 'src' ? ' is-active' : '')} onMouseDown={stop} onClick={openSrc}>
                <Replace size={15} strokeWidth={2} aria-hidden={true} /></button>
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
          {selected && !readOnly && editMode && (
            <span className="apfs-rt-imginput" role="group" aria-label={editMode === 'src' ? '이미지 주소' : '이미지 링크 URL'}>
              <input className="apfs-rt-imginput__field" type="url"
                placeholder={editMode === 'src' ? 'https://.../image.png' : 'https://...'} value={draft}
                autoFocus onMouseDown={(e) => e.stopPropagation()} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') { e.preventDefault(); setEditMode(null); } }} />
              <button type="button" className="apfs-rt-imgbtn is-text" onMouseDown={stop} onClick={saveEdit}>적용</button>
              {editMode === 'link' && element.link && <button type="button" className="apfs-rt-imgbtn is-text" onMouseDown={stop} onClick={removeLink}>제거</button>}
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

/* ── 비디오(video) = 직접 URL의 <video controls>. 캡션 지원. (경량: react-player 없이 파일 재생.) ── */
export function VideoElement(props: any) {
  const { element } = props;
  const selected = useSelected();
  return (
    <PlateElement {...props}>
      <div className="apfs-rt-imgwrap" contentEditable={false}>
        <span className={'apfs-rt-imgbox' + (selected ? ' is-sel' : '')} style={{ width: element.width || '100%' }}>
          <video className="apfs-rt-video" src={element.url} controls />
        </span>
        <Caption><CaptionTextarea className="apfs-rt-caption" placeholder="캡션 입력…" /></Caption>
      </div>
      {props.children}
    </PlateElement>
  );
}

/* ── 미디어 임베드(media_embed) = YouTube/Vimeo 등 iframe. parseVideoUrl로 embed URL 추출. ── */
export function MediaEmbedElement(props: any) {
  const { element } = props;
  const selected = useSelected();
  const parsed = (() => { try { return parseVideoUrl(element.url || ''); } catch { return null; } })() as any;
  const embedId = parsed?.id;
  const provider = parsed?.provider;
  const src = provider === 'youtube' ? `https://www.youtube.com/embed/${embedId}`
    : provider === 'vimeo' ? `https://player.vimeo.com/video/${embedId}`
    : element.url;
  return (
    <PlateElement {...props}>
      <div className="apfs-rt-imgwrap" contentEditable={false}>
        <span className={'apfs-rt-embed' + (selected ? ' is-sel' : '')} style={{ width: element.width || '100%' }}>
          {embedId || provider ? (
            <span className="apfs-rt-embed__frame"><iframe src={src} title="미디어 임베드" allow="encrypted-media" allowFullScreen /></span>
          ) : (
            <span className="apfs-rt-embed__empty">지원하지 않는 임베드 URL</span>
          )}
        </span>
        <Caption><CaptionTextarea className="apfs-rt-caption" placeholder="캡션 입력…" /></Caption>
      </div>
      {props.children}
    </PlateElement>
  );
}

/* ── 파일 첨부(file) = 보이드 블록. base64 dataURL을 다운로드 링크로. (백엔드 없음 → data-URI 다운로드.) ── */
export function FileElement(props: any) {
  const { element } = props;
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const del = () => { const p = editor.api.findPath(element); if (p) editor.tf.removeNodes({ at: p }); editor.tf.focus(); };
  return (
    <PlateElement {...props}>
      <div className="apfs-rt-file" contentEditable={false}>
        <a className="apfs-rt-file__link" href={element.url} download={element.name} target="_blank" rel="noopener noreferrer">
          <FileDownIcon size={16} strokeWidth={2} aria-hidden={true} />
          <span className="apfs-rt-file__name">{element.name || '첨부파일'}</span>
          {element.size ? <span className="apfs-rt-file__size">{element.size}</span> : null}
        </a>
        {!readOnly && (
          <button type="button" className="apfs-rt-imgbtn is-danger" aria-label="첨부 삭제" onMouseDown={(e) => e.preventDefault()} onClick={del}>
            <Trash2 size={14} strokeWidth={2} aria-hidden={true} /></button>
        )}
      </div>
      {props.children}
    </PlateElement>
  );
}

/* ── 구분선 = 보이드 블록. ── */
export function HrElement(props: any) {
  return (
    <PlateElement {...props}>
      <div contentEditable={false}><hr /></div>
      {props.children}
    </PlateElement>
  );
}

/* ── 표(table) ──
   <table><tbody><tr><td|th> 구조. tbody를 명시해 유효 마크업 + slate 자식 매핑 유지.
   표 선택 시 상단 플로팅 툴바(행/열 추가·삭제). 셀은 블록 자식(p)을 담는 편집 컨테이너. */
// 배경/테두리 적용 대상 셀 경로 — 다중 선택 셀 우선, 없으면 caret 셀 폴백(테두리 factory와 동일 규칙).
function targetCellPaths(editor: any): any[] {
  let cells = (editor as any).getApi(TablePlugin).table.getSelectedCells();
  if (!cells?.length) {
    const c = editor.api.block({ match: (n: any) => n.type === 'td' || n.type === 'th' });
    cells = c ? [c[0]] : [];
  }
  return cells.map((c: any) => editor.api.findPath(c)).filter(Boolean);
}

// 셀 배경색 드롭다운(캡션 툴바) — DOC_PALETTE(문서 고정 절대색) 스와치 + 제거.
// Radix 메뉴 열림/닫힘이 slate selection을 파괴하므로(컨텍스트 메뉴와 동일 실측) 열 때 저장→실행 시 복원.
function CellBgDropdown({ editor, on }: { editor: any; on: boolean }) {
  const sel = useRef<any>(null);
  // 제어형 open — 스와치는 DropdownMenuItem이 아닌 일반 버튼이라 자동 닫힘이 없다(ColorDropdown과 동일 이유).
  const [open, setOpen] = useState(false);
  const run = (fn: () => void) => { editor.tf.focus(); if (sel.current) { try { editor.tf.select(sel.current); } catch { /* 경로 무효 시 무시 */ } } fn(); };
  const apply = (c: string | null) => { setOpen(false); run(() => {
    for (const at of targetCellPaths(editor)) {
      if (c) editor.tf.setNodes({ background: c }, { at });
      else editor.tf.unsetNodes('background', { at });
    }
  }); };
  return (
    <DropdownMenu open={open} onOpenChange={(o) => { if (o) sel.current = editor.selection; setOpen(o); }}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="apfs-rt-imgbtn" title="셀 배경색" aria-label="셀 배경색" tabIndex={on ? 0 : -1} onMouseDown={(e) => e.preventDefault()}>
          <PaintBucket size={14} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => { e.preventDefault(); editor.tf.focus(); }}>
        <div className="apfs-rt-swatches" role="group" aria-label="셀 배경색 선택">
          {DOC_PALETTE.map((c) => (
            <button key={c} type="button" className="apfs-rt-swatch" style={{ background: c }} title={c} aria-label={c}
              onMouseDown={(e) => e.preventDefault()} onClick={() => apply(c)} />
          ))}
        </div>
        <DropdownMenuItem onSelect={() => apply(null)}><XIcon size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>배경 제거</span></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 셀 테두리 드롭다운(캡션 툴바) — 공식 Plate 테두리 메뉴(각 side·없음·바깥, 토글식).
// 실제 조작은 getOnSelectTableBorderFactory가 담당(이웃 셀 협조 + caret 셀 폴백 내장).
const BORDER_ITEMS: { key: string; Icon: any; label: string }[] = [
  { key: 'top',    Icon: PanelTop,     label: '위 테두리' },
  { key: 'bottom', Icon: PanelBottom,  label: '아래 테두리' },
  { key: 'left',   Icon: PanelLeft,    label: '왼쪽 테두리' },
  { key: 'right',  Icon: PanelRight,   label: '오른쪽 테두리' },
  { key: 'none',   Icon: SquareDashed, label: '테두리 없음' },
  { key: 'outer',  Icon: Square,       label: '바깥 테두리' },
];
function CellBorderDropdown({ editor, on }: { editor: any; on: boolean }) {
  const sel = useRef<any>(null);
  const run = (fn: () => void) => { editor.tf.focus(); if (sel.current) { try { editor.tf.select(sel.current); } catch { /* 경로 무효 시 무시 */ } } fn(); };
  return (
    <DropdownMenu onOpenChange={(o) => { if (o) sel.current = editor.selection; }}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="apfs-rt-imgbtn" title="셀 테두리" aria-label="셀 테두리" tabIndex={on ? 0 : -1} onMouseDown={(e) => e.preventDefault()}>
          <Grid3x3 size={14} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => { e.preventDefault(); editor.tf.focus(); }}>
        {BORDER_ITEMS.map(({ key, Icon: Ico, label }) => (
          <DropdownMenuItem key={key} onSelect={() => run(() => getOnSelectTableBorderFactory(editor)(key as any)())}>
            <Ico size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// TableProvider가 tableStore(컬럼 폭 override 등 리사이즈 상태)의 표별 스코프를 만든다 — 훅보다 바깥 래퍼 필수.
export function TableElement(props: any) {
  return <TableProvider><TableElementInner {...props} /></TableProvider>;
}
function TableElementInner(props: any) {
  const editor = useEditorRef();
  const selected = useSelected();
  const readOnly = useReadOnly();
  // 셀 다중 선택 동기화(드래그/Shift+방향키로 selection이 셀 경계를 넘으면 선택 셀 id를 플러그인 옵션에 기록).
  useSelectedCells();
  // 셀 선택 진행 중이면 표에 is-cellselecting → 네이티브 텍스트 ::selection을 숨겨 셀 오버레이만 보이게(공식 룩).
  const cellSelecting = !!usePluginOption(TablePlugin as any, '_selectedCellIds' as any);
  // 컬럼 폭 — 노드 colSizes + 드래그 중 tableStore override 합성. 폭 지정 전(전부 0)엔 기존 100% 유동 유지.
  const colSizes = useTableColSizes();
  const hasColSizes = colSizes.some((s: number) => s > 0);
  // 병합/분할 가능 상태(캡션 툴바 버튼) — 컨텍스트 메뉴·툴바 드롭다운과 동일 게이트.
  const merge = useTableMergeState();
  const stop = (e: any) => e.preventDefault();
  // 표 트랜스폼 = @platejs/table의 export 헬퍼(현재 선택=셀 기준 동작). 버튼 mousedown preventDefault로 셀 선택 보존.
  const addRow = () => { insertTableRow(editor); editor.tf.focus(); };
  const addCol = () => { insertTableColumn(editor); editor.tf.focus(); };
  const delRow = () => { deleteRow(editor); editor.tf.focus(); };
  const delCol = () => { deleteColumn(editor); editor.tf.focus(); };
  const delTable = () => { deleteTable(editor); editor.tf.focus(); };
  const mergeCells = () => { (editor as any).tf.table.merge(); editor.tf.focus(); };
  const splitCell = () => { (editor as any).tf.table.split(); editor.tf.focus(); };
  const canSplit = merge?.canSplit || canSplitCell(editor);
  // slate 노드 자신을 <table>로 렌더(as="table") → 셀 클릭이 정상 선택 매핑. 툴바는 <table> 안에서 유효한
  // <caption contentEditable=false>로(편집 격리 + 상단 렌더). tbody는 유효 마크업용 비-slate 래퍼.
  // ⚠️ caption을 selected에 따라 조건부 마운트하면 DOM 구조가 바뀌어 셀 입력 중 selection이 이탈한다(첫 글자
  //    후 커서가 상단 블록으로 튐). → 항상 렌더하고 가시성만 className(is-visible)으로 토글해 구조를 고정한다.
  //    colgroup도 같은 이유로 항상 마운트(col 폭만 갱신).
  const barOn = (selected || cellSelecting) && !readOnly;
  return (
    <PlateElement {...props} as="table" className={'apfs-rt-table' + (cellSelecting ? ' is-cellselecting' : '') + (hasColSizes ? ' has-colsizes' : '')}>
      <caption className={'apfs-rt-tablebar' + (barOn ? ' is-visible' : '')} contentEditable={false} role="toolbar" aria-label="표 편집" aria-hidden={!barOn}>
        <button type="button" className="apfs-rt-imgbtn" title="행 추가" aria-label="행 추가" tabIndex={barOn ? 0 : -1} onMouseDown={stop} onClick={addRow}><Rows3 size={14} aria-hidden /><Plus size={11} aria-hidden /></button>
        <button type="button" className="apfs-rt-imgbtn" title="열 추가" aria-label="열 추가" tabIndex={barOn ? 0 : -1} onMouseDown={stop} onClick={addCol}><Columns3 size={14} aria-hidden /><Plus size={11} aria-hidden /></button>
        <span className="apfs-rt-imgsep" aria-hidden="true" />
        <button type="button" className="apfs-rt-imgbtn" title="셀 병합" aria-label="셀 병합" tabIndex={barOn ? 0 : -1} disabled={!merge?.canMerge} onMouseDown={stop} onClick={mergeCells}><Combine size={14} aria-hidden /></button>
        <button type="button" className="apfs-rt-imgbtn" title="셀 분할" aria-label="셀 분할" tabIndex={barOn ? 0 : -1} disabled={!canSplit} onMouseDown={stop} onClick={splitCell}><Ungroup size={14} aria-hidden /></button>
        <span className="apfs-rt-imgsep" aria-hidden="true" />
        <CellBgDropdown editor={editor} on={barOn} />
        <CellBorderDropdown editor={editor} on={barOn} />
        <span className="apfs-rt-imgsep" aria-hidden="true" />
        <button type="button" className="apfs-rt-imgbtn" title="행 삭제" aria-label="행 삭제" tabIndex={barOn ? 0 : -1} onMouseDown={stop} onClick={delRow}><Rows3 size={14} aria-hidden /><Trash2 size={11} aria-hidden /></button>
        <button type="button" className="apfs-rt-imgbtn" title="열 삭제" aria-label="열 삭제" tabIndex={barOn ? 0 : -1} onMouseDown={stop} onClick={delCol}><Columns3 size={14} aria-hidden /><Trash2 size={11} aria-hidden /></button>
        <span className="apfs-rt-imgsep" aria-hidden="true" />
        <button type="button" className="apfs-rt-imgbtn is-danger" title="표 삭제" aria-label="표 삭제" tabIndex={barOn ? 0 : -1} onMouseDown={stop} onClick={delTable}><Trash2 size={14} aria-hidden /></button>
      </caption>
      <colgroup contentEditable={false}>
        {colSizes.map((w: number, i: number) => <col key={i} style={w > 0 ? { width: w } : undefined} />)}
      </colgroup>
      <tbody>{props.children}</tbody>
    </PlateElement>
  );
}
// 행 드래그 그립 전달 컨텍스트 — tr의 자식은 td/th만 유효해 그립 버튼을 tr에 직접 못 넣는다.
// TableRowElement(드래그 소스/드롭 타겟)가 handleRef를 내려주고, 첫 열 셀(TableCellElement)이 그립을 렌더.
const RowDragContext = createContext<{ handleRef: any } | null>(null);

// tr — 행 높이(세로 리사이즈) + 행 드래그 재정렬(공식 Plate 행 그립).
// 높이: 확정=tr 노드의 element.size(setTableRowSize가 커밋), 미리보기=tableStore rowSizeOverrides.
// dnd: type='table-row'로 문서 블록 DnD와 격리(accept가 type 기준), canDropNode로 같은 표 안 행끼리만.
// 드롭라인은 tr이 position 불가(table-row)라 각 셀의 ::after 조각으로 이어 그린다(is-drop-top/bottom).
export function TableRowElement(props: any) {
  const { element } = props;
  const readOnly = useReadOnly();
  const path = usePath();
  const rowIndex = path ? path[path.length - 1] : -1;
  const overrides = useTableValue('rowSizeOverrides') as Map<number, number> | undefined;
  const height = overrides?.get?.(rowIndex) ?? element.size ?? undefined;
  const { isDragging, nodeRef, handleRef } = useDraggable({
    element,
    type: 'table-row',
    canDropNode: ({ dragEntry, dropEntry }: any) =>
      JSON.stringify(dragEntry[1].slice(0, -1)) === JSON.stringify(dropEntry[1].slice(0, -1)),
  });
  const { dropLine } = useDropLine({ id: element.id });
  // slate DOM ref(attributes.ref)와 dnd 드롭 타겟 ref(nodeRef)를 병합 — 행 전체가 드롭존.
  const slateRef = props.attributes?.ref;
  const mergedRef = (el: any) => {
    if (typeof slateRef === 'function') slateRef(el); else if (slateRef) slateRef.current = el;
    if (nodeRef) (nodeRef as any).current = el;
  };
  const cls = (isDragging ? ' is-dragging' : '') + (dropLine ? ' is-drop-' + dropLine : '');
  return (
    <RowDragContext.Provider value={readOnly ? null : { handleRef }}>
      <PlateElement {...props} as="tr" className={cls || undefined}
        attributes={{ ...props.attributes, ref: mergedRef, style: height ? { height } : undefined }} />
    </RowDragContext.Provider>
  );
}

// td/th — colSpan/rowSpan을 element에서 반영. blockEl 대신 명시(속성 주입).
// 셀 다중 선택 시 is-cellsel → CSS 오버레이(::after) 하이라이트(공식 Plate 셀 선택 룩).
// 컬럼 리사이즈: 셀 우측 경계에 ResizeHandle(드래그로 열 너비 조절). ⚠️ ResizeHandle은 초기 크기를
// parentElement.offsetWidth로 읽으므로 td 직속 자식이어야 한다(래퍼 금지). 행 높이(bottom)는 스코프 밖.
// 테두리 한 변 → CSS 값. useTableCellElement().borders가 첫 행/첫 열 판단까지 끝낸 결과를 주므로
// (기본: 전 셀 bottom/right + 첫 행 top + 첫 열 left, element.borders 오버라이드 반영) 인라인으로만 그린다.
// 이 모델은 border-separate 전제(CSS에서 collapse→separate 전환) — collapse면 이웃 병합이 size:0을 되살림.
const borderSide = (b: any) =>
  b == null ? undefined : (b.size ?? 1) === 0 ? 'none' : `${b.size ?? 1}px ${b.style || 'solid'} ${b.color || 'var(--border-strong)'}`;

export function TableCellElement(props: any) {
  const { element } = props;
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const rowDrag = useContext(RowDragContext);   // 행 드래그 그립(첫 열 셀에만 렌더) — tr이 공급
  const cellSelected = useIsCellSelected(element);
  const { colIndex, colSpan, rowIndex, borders } = useTableCellElement();
  const { rightProps, bottomProps } = useTableCellElementResizable({ colIndex, colSpan, rowIndex });
  // ── 열 리사이즈 컨테이너 제한 ──
  // Plate의 우측 핸들 onResize는 "현재+다음 열 합 고정" 재분배를 내장하지만, 전제는 다음 열 colSizes가 실수(>0).
  // colSizes 미동결(유동 100% 폭) 표에선 다음 열 값이 0 → max 클램프가 풀려 우측으로 무한 확장(실측 버그).
  // ① 드래그 시작 시 colSizes가 비었거나 0이 섞여 있으면 현재 DOM 열 폭을 실측해 1회 동결 → 재분배 경로 활성화.
  // ② 마지막 열은 재분배 상대(다음 열)가 없어 표가 컨테이너를 넘을 수 있으므로 시작 시점 여유폭으로 delta 클램프.
  const colDragMax = useRef<number | null>(null);
  const onColResizeStart = (ev: any) => {
    const table = (ev.target as HTMLElement)?.closest?.('table') as HTMLTableElement | null;
    if (!table) return;
    // 열 폭 실측 — 셀이 가장 많은 행 기준, colSpan은 균등 분할
    let best: HTMLTableRowElement | null = null; let colCount = 0;
    for (const r of Array.from(table.rows)) {
      const n = Array.from(r.cells).reduce((a, c) => a + (c.colSpan || 1), 0);
      if (n > colCount) { colCount = n; best = r; }
    }
    const cellPath = editor.api.findPath(element);
    const entry = cellPath ? (editor.api.above({ at: cellPath, match: (n: any) => n.type === 'table' }) as any) : null;
    if (entry && best) {
      const [tableNode, tablePath] = entry;
      const cur = tableNode.colSizes;
      if (!Array.isArray(cur) || cur.length < colCount || cur.some((s: number) => !(s > 0))) {
        const sizes: number[] = [];
        for (const c of Array.from(best.cells)) {
          const span = c.colSpan || 1;
          for (let i = 0; i < span; i++) sizes.push(Math.round(c.offsetWidth / span));
        }
        editor.tf.setNodes({ colSizes: sizes } as any, { at: tablePath });
      }
    }
    const isLast = colCount > 0 && colIndex + (element.colSpan || 1) >= colCount;
    const container = table.parentElement;
    colDragMax.current = isLast && container ? Math.max(0, container.clientWidth - table.offsetWidth) : null;
  };
  const rightOpts = (rightProps as any)?.options || {};
  const rightPropsClamped = {
    ...(rightProps as any),
    options: {
      ...rightOpts,
      onMouseDown: onColResizeStart,
      onTouchStart: onColResizeStart,
      onResize: (e: any) => {
        const max = colDragMax.current;
        rightOpts.onResize?.(max != null && e.delta > max ? { ...e, delta: max } : e);
      },
    },
  };
  const Tag = element.type === 'th' ? 'th' : 'td';
  const style: CSSProperties = {
    backgroundColor: element.background || undefined,   // 셀 배경(문서 고정 절대색) — th 기본 --muted보다 인라인이 우선
    borderTop: borderSide(borders?.top),
    borderRight: borderSide(borders?.right),
    borderBottom: borderSide(borders?.bottom),
    borderLeft: borderSide(borders?.left),
  };
  return (
    <PlateElement {...props} as={Tag as any} className={cellSelected ? 'is-cellsel' : undefined}
      attributes={{ ...props.attributes, colSpan: element.colSpan, rowSpan: element.rowSpan, style }}>
      {props.children}
      {!readOnly && <ResizeHandle {...(rightPropsClamped as any)} className="apfs-rt-colresize" contentEditable={false} aria-label={`${colIndex + 1}열 너비 조절`} />}
      {!readOnly && <ResizeHandle {...(bottomProps as any)} className="apfs-rt-rowresize" contentEditable={false} aria-label={`${rowIndex + 1}행 높이 조절`} />}
      {/* 행 드래그 그립 — 첫 열 셀 왼쪽 바깥(absolute), 행 hover 시 표시. 드래그 소스는 tr(useDraggable). */}
      {rowDrag && colIndex === 0 && (
        <span ref={rowDrag.handleRef} className="apfs-rt-rowgrip" contentEditable={false} role="button"
          aria-label={`${rowIndex + 1}행 이동`} title="행 이동(드래그)">
          <GripVertical size={13} aria-hidden />
        </span>
      )}
    </PlateElement>
  );
}

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

/* ── 다단 레이아웃(column) — column_group > column. flex 행에 열 배치. ── */
export function ColumnGroupElement(props: any) {
  return <PlateElement {...props} className="apfs-rt-colgroup" />;
}
export function ColumnElement(props: any) {
  const { element } = props;
  return <PlateElement {...props} className="apfs-rt-col" style={{ width: element.width || '100%' }} />;
}

/* ── 토글(collapsible) — 여는 상태는 TogglePlugin 스토어가 관리(element.id 기준). ──
   useToggleButton*로 열림/닫힘 제어. 닫히면 자식 블록을 CSS로 숨긴다(에디터엔 유지). */
export function ToggleElement(props: any) {
  const { element } = props;
  const readOnly = useReadOnly();
  const state = useToggleButtonState(element.id);          // 열림상태 = TogglePlugin 스토어(element.id 기준)
  const { open, buttonProps } = useToggleButton(state);    // buttonProps.onClick/onMouseDown이 토글
  return (
    <PlateElement {...props} className={'apfs-rt-toggle' + (open ? ' is-open' : '')}>
      <span className="apfs-rt-toggle__btn" contentEditable={false} role="button" tabIndex={readOnly ? -1 : 0}
        aria-expanded={open} aria-label={open ? '접기' : '펼치기'} {...buttonProps}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (buttonProps as any).onClick?.(e); } }}>
        <ChevronRight size={16} strokeWidth={2.4} className="apfs-rt-toggle__chev" aria-hidden />
      </span>
      <div className="apfs-rt-toggle__body">{props.children}</div>
    </PlateElement>
  );
}

/* ── 날짜(date) = 인라인 보이드. element.date('YYYY-MM-DD')를 배지로 표시. ── */
export function DateElement(props: any) {
  const { element } = props;
  const selected = useSelected();
  return (
    <PlateElement {...props} as="span" className={'apfs-rt-inline apfs-rt-date' + (selected ? ' is-sel' : '')} attributes={{ ...props.attributes, contentEditable: false }}>
      <CalendarDays size={13} strokeWidth={2} aria-hidden />
      <span>{element.date || '날짜'}</span>
      {props.children}
    </PlateElement>
  );
}

/* ── 멘션(mention) = 인라인 보이드. @value 배지. ── */
export function MentionElement(props: any) {
  const { element } = props;
  const selected = useSelected();
  return (
    <PlateElement {...props} as="span" className={'apfs-rt-inline apfs-rt-mention' + (selected ? ' is-sel' : '')} attributes={{ ...props.attributes, contentEditable: false }}>
      <AtSign size={12} strokeWidth={2.2} aria-hidden />
      <span>{element.value}</span>
      {props.children}
    </PlateElement>
  );
}

/* ── 수식(math) — katex로 렌더. 블록(equation)/인라인(inline_equation). texExpression을 렌더. ── */
function renderTex(tex: string, displayMode: boolean): string {
  try { return katex.renderToString(tex || '', { throwOnError: false, displayMode, output: 'html' }); }
  catch { return tex || ''; }
}
export function EquationElement(props: any) {
  const editor = useEditorRef();
  const { element } = props;
  const selected = useSelected();
  const readOnly = useReadOnly();
  const tex = element.texExpression || '';
  const setTex = (v: string) => { const p = editor.api.findPath(element); if (p) editor.tf.setNodes({ texExpression: v } as any, { at: p }); };
  return (
    <PlateElement {...props} className={'apfs-rt-equation' + (selected ? ' is-sel' : '')}>
      <div contentEditable={false} className="apfs-rt-equation__body">
        <div className="apfs-rt-equation__render">
          {tex ? <span dangerouslySetInnerHTML={{ __html: renderTex(tex, true) }} /> : <span className="apfs-rt-equation__empty">수식(LaTeX)을 입력하세요 — 예: E = mc^2</span>}
        </div>
        {selected && !readOnly && (
          <input className="apfs-rt-eqinput" value={tex} autoFocus spellCheck={false}
            aria-label="수식 LaTeX" placeholder="E = mc^2" onChange={(e) => setTex(e.target.value)} />
        )}
      </div>
      {props.children}
    </PlateElement>
  );
}
export function InlineEquationElement(props: any) {
  const editor = useEditorRef();
  const { element } = props;
  const selected = useSelected();
  const readOnly = useReadOnly();
  const tex = element.texExpression || '';
  const setTex = (v: string) => { const p = editor.api.findPath(element); if (p) editor.tf.setNodes({ texExpression: v } as any, { at: p }); };
  return (
    <PlateElement {...props} as="span" className={'apfs-rt-inline apfs-rt-ieq' + (selected ? ' is-sel' : '')} attributes={{ ...props.attributes, contentEditable: false }}>
      <span className="apfs-rt-ieq__render" dangerouslySetInnerHTML={{ __html: tex ? renderTex(tex, false) : '' }} />
      {!tex && <span className="apfs-rt-ieq__empty">수식</span>}
      {selected && !readOnly && (
        <span className="apfs-rt-ieq__pop" contentEditable={false}>
          <input className="apfs-rt-eqinput" value={tex} autoFocus spellCheck={false}
            aria-label="인라인 수식 LaTeX" placeholder="x^2" onChange={(e) => setTex(e.target.value)} />
        </span>
      )}
      {props.children}
    </PlateElement>
  );
}

/* ── 태그(tag) = 인라인 보이드 칩. ── */
export function TagElement(props: any) {
  const { element } = props;
  const selected = useSelected();
  return (
    <PlateElement {...props} as="span" className={'apfs-rt-inline apfs-rt-tag' + (selected ? ' is-sel' : '')} attributes={{ ...props.attributes, contentEditable: false }}>
      <span>{element.value}</span>
      {props.children}
    </PlateElement>
  );
}

/* ── 드래그앤드롭(dnd) — 블록 좌측 그립 핸들로 순서 변경. ──
   DndPlugin.render.aboveNodes로 최상위 블록만 감싼다(인라인/void/셀 내부 제외). NodeIdPlugin이 부여한
   블록 id로 useDraggable이 드래그, useDropLine이 삽입 위치선을 표시. DndProvider는 aboveSlate가 자동 래핑. */
function DraggableBlock({ element, children }: any) {
  const { isDragging, nodeRef, handleRef } = useDraggable({ element });
  const { dropLine } = useDropLine();
  // 표 블록은 그립을 좌상단 모서리 대각 바깥으로 분리(공식 Plate "Drag to move" 룩) —
  // 기본 위치(left:-22, top:2)는 행 드래그 그립(첫 셀 왼쪽)과 겹쳐 표-이동 그립을 집기 어렵다.
  const isTable = element?.type === 'table';
  const label = isTable ? '표 이동(드래그)' : '블록 이동(드래그)';
  return (
    <div ref={nodeRef} className={'apfs-rt-blockdrag' + (isDragging ? ' is-dragging' : '') + (isTable ? ' is-table' : '')}>
      <div ref={handleRef as any} className="apfs-rt-draghandle" contentEditable={false} role="button" aria-label={label} title={label} tabIndex={-1}>
        <GripVertical size={14} strokeWidth={2} aria-hidden={true} />
      </div>
      <div className="apfs-rt-blockdrag__content">{children}</div>
      {dropLine && <div className={'apfs-rt-dropline is-' + dropLine} contentEditable={false} aria-hidden="true" />}
    </div>
  );
}
// aboveNodes 래퍼 — 최상위 블록(경로 길이 1)에만 드래그 핸들. 그 외(인라인·void·표셀·목록항목)는 미래핑.
export function BlockDraggable(props: any) {
  const { editor, element } = props;
  const path = editor.api.findPath(element);
  if (!path || path.length !== 1 || !editor.api.isBlock(element)) return undefined;
  return function Above({ children }: any) { return <DraggableBlock element={element}>{children}</DraggableBlock>; };
}

// 노드 타입 → 컴포넌트(=DOM 태그) 매핑. 배치별로 추가.
export const COMPONENTS: Record<string, any> = {
  p: blockEl('p'), h1: blockEl('h1'), h2: blockEl('h2'), h3: blockEl('h3'),
  h4: blockEl('h4'), h5: blockEl('h5'), h6: blockEl('h6'),
  blockquote: blockEl('blockquote'), code_block: blockEl('pre'), code_line: blockEl('code'),
  ul: BulletedListElement, ol: OrderedListElement, li: ListItemElement, lic: blockEl('p'),
  taskList: TaskListElement,
  a: LinkElement, img: ImageElement, hr: HrElement, file: FileElement,
  video: VideoElement, media_embed: MediaEmbedElement,
  // 표
  table: TableElement, tr: TableRowElement, td: TableCellElement, th: TableCellElement,
  // 블록 확장
  callout: CalloutElement, column_group: ColumnGroupElement, column: ColumnElement, toggle: ToggleElement,
  equation: EquationElement,
  // 인라인 보이드
  date: DateElement, mention: MentionElement, inline_equation: InlineEquationElement, tag: TagElement,
  // 마크
  bold: leafEl('strong'), italic: leafEl('em'), underline: leafEl('u'),
  strikethrough: leafEl('s'), code: leafEl('code'), kbd: leafEl('kbd'),
  highlight: leafEl('mark'), subscript: leafEl('sub'), superscript: leafEl('sup'),
  // color/backgroundColor/fontSize/fontFamily는 style을 leaf에 inject → 기본 <span>에 적용(태그 override 불필요)
};
