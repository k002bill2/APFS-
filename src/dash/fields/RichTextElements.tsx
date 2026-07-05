/* RichTextElements — Plate 헤드리스 노드의 element/leaf 컴포넌트 + COMPONENTS 매핑.
   (RichTextField.tsx에서 분리 — 노드 렌더링이 커져 편집 신뢰도를 위해 별도 파일로 격리.)
   ── 헤드리스 렌더 원칙 ──
   Plate 기본 element는 <div>로 렌더된다 → 블록/마크 타입을 명시 시맨틱 태그로 override해야 CSS(.apfs-prose <tag>)가
   맞물린다. a/img/hr/table/toggle/callout/column/math/mention/date는 각자 명시 컴포넌트로 실제 DOM을 그린다.
   COMPONENTS는 RichTextField의 usePlateEditor({components})로 주입된다. 배치별로 항목이 늘어난다. */
import { PlateElement, PlateLeaf, useEditorRef, useSelected, useReadOnly } from 'platejs/react';
import { getLinkAttributes } from '@platejs/link';
import { insertTableRow, insertTableColumn, deleteRow, deleteColumn, deleteTable } from '@platejs/table';
import { useToggleButtonState, useToggleButton } from '@platejs/toggle/react';
import { Caption, CaptionTextarea } from '@platejs/caption/react';
import { parseVideoUrl } from '@platejs/media';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  AlignLeft, AlignCenter, AlignRight, Trash2,
  ChevronRight, Info, TriangleAlert, CircleCheck, Lightbulb, Rows3, Columns3,
  Plus, CalendarDays, AtSign,
} from 'lucide-react';

/* 블록/리프를 시맨틱 태그로 렌더 — CSS(.apfs-prose <tag>)가 DOM 태그를 노린다. */
export const blockEl = (as: string) => function El(props: any) { return <PlateElement as={as} {...props} />; };
export const leafEl  = (as: string) => function Lf(props: any) { return <PlateLeaf as={as} {...props} />; };

/* ── 링크 = 인라인 <a href>. getLinkAttributes로 href sanitize(javascript: 등 차단). ── */
export function LinkElement(props: any) {
  const editor = useEditorRef();
  return <PlateElement {...props} as="a" attributes={{ ...props.attributes, ...getLinkAttributes(editor, props.element), target: '_blank', rel: 'noopener noreferrer' }} />;
}

/* ── 이미지 = 보이드 블록. 선택 시 편집 툴바(정렬·너비·삭제) 오버레이. align/width는 element에 저장·적용. ── */
const IMG_WIDTHS = [{ label: 'S', v: '35%' }, { label: 'M', v: '65%' }, { label: 'L', v: '100%' }];
export function ImageElement(props: any) {
  const { element } = props;
  const editor = useEditorRef();
  const selected = useSelected();
  const readOnly = useReadOnly();
  const align = element.align || 'left';
  const width = element.width || '100%';
  const set = (patch: any) => { const p = editor.api.findPath(element); if (p) editor.tf.setNodes(patch, { at: p }); };
  const del = () => { const p = editor.api.findPath(element); if (p) editor.tf.removeNodes({ at: p }); editor.tf.focus(); };
  const stop = (e: any) => e.preventDefault(); // 툴바 클릭이 이미지 선택을 빼앗지 않게
  return (
    <PlateElement {...props}>
      <div className="apfs-rt-imgwrap" contentEditable={false} style={{ textAlign: align as any }}>
        <span className={'apfs-rt-imgbox' + (selected ? ' is-sel' : '')} style={{ width }}>
          <img src={element.url} alt="" />
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
        {/* 이미지 캡션 — CaptionPlugin이 img에 캡션 활성. CaptionTextarea는 자체 편집 처리(void 안 편집 영역). */}
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
export function TableElement(props: any) {
  const editor = useEditorRef();
  const selected = useSelected();
  const readOnly = useReadOnly();
  const stop = (e: any) => e.preventDefault();
  // 표 트랜스폼 = @platejs/table의 export 헬퍼(현재 선택=셀 기준 동작). 버튼 mousedown preventDefault로 셀 선택 보존.
  const addRow = () => { insertTableRow(editor); editor.tf.focus(); };
  const addCol = () => { insertTableColumn(editor); editor.tf.focus(); };
  const delRow = () => { deleteRow(editor); editor.tf.focus(); };
  const delCol = () => { deleteColumn(editor); editor.tf.focus(); };
  const delTable = () => { deleteTable(editor); editor.tf.focus(); };
  // slate 노드 자신을 <table>로 렌더(as="table") → 셀 클릭이 정상 선택 매핑. 툴바는 <table> 안에서 유효한
  // <caption contentEditable=false>로(편집 격리 + 상단 렌더). tbody는 유효 마크업용 비-slate 래퍼.
  // ⚠️ caption을 selected에 따라 조건부 마운트하면 DOM 구조가 바뀌어 셀 입력 중 selection이 이탈한다(첫 글자
  //    후 커서가 상단 블록으로 튐). → 항상 렌더하고 가시성만 className(is-visible)으로 토글해 구조를 고정한다.
  const barOn = selected && !readOnly;
  return (
    <PlateElement {...props} as="table" className="apfs-rt-table">
      <caption className={'apfs-rt-tablebar' + (barOn ? ' is-visible' : '')} contentEditable={false} role="toolbar" aria-label="표 편집" aria-hidden={!barOn}>
        <button type="button" className="apfs-rt-imgbtn" title="행 추가" aria-label="행 추가" tabIndex={barOn ? 0 : -1} onMouseDown={stop} onClick={addRow}><Rows3 size={14} aria-hidden /><Plus size={11} aria-hidden /></button>
        <button type="button" className="apfs-rt-imgbtn" title="열 추가" aria-label="열 추가" tabIndex={barOn ? 0 : -1} onMouseDown={stop} onClick={addCol}><Columns3 size={14} aria-hidden /><Plus size={11} aria-hidden /></button>
        <span className="apfs-rt-imgsep" aria-hidden="true" />
        <button type="button" className="apfs-rt-imgbtn" title="행 삭제" aria-label="행 삭제" tabIndex={barOn ? 0 : -1} onMouseDown={stop} onClick={delRow}><Rows3 size={14} aria-hidden /><Trash2 size={11} aria-hidden /></button>
        <button type="button" className="apfs-rt-imgbtn" title="열 삭제" aria-label="열 삭제" tabIndex={barOn ? 0 : -1} onMouseDown={stop} onClick={delCol}><Columns3 size={14} aria-hidden /><Trash2 size={11} aria-hidden /></button>
        <span className="apfs-rt-imgsep" aria-hidden="true" />
        <button type="button" className="apfs-rt-imgbtn is-danger" title="표 삭제" aria-label="표 삭제" tabIndex={barOn ? 0 : -1} onMouseDown={stop} onClick={delTable}><Trash2 size={14} aria-hidden /></button>
      </caption>
      <tbody>{props.children}</tbody>
    </PlateElement>
  );
}
// td/th — colSpan/rowSpan을 element에서 반영. blockEl 대신 명시(속성 주입).
export function TableCellElement(props: any) {
  const { element } = props;
  const Tag = element.type === 'th' ? 'th' : 'td';
  return <PlateElement {...props} as={Tag as any} attributes={{ ...props.attributes, colSpan: element.colSpan, rowSpan: element.rowSpan }} />;
}

/* ── 콜아웃(callout) = 블록 컨테이너. variant/icon을 element에 저장. ── */
const CALLOUT_ICONS: Record<string, any> = { info: Info, warning: TriangleAlert, success: CircleCheck, tip: Lightbulb };
export function CalloutElement(props: any) {
  const { element } = props;
  const variant = element.variant || 'info';
  const Ico = CALLOUT_ICONS[variant] || Info;
  return (
    <PlateElement {...props} className={'apfs-rt-callout is-' + variant}>
      <span className="apfs-rt-callout__ico" contentEditable={false} aria-hidden="true"><Ico size={18} strokeWidth={2} /></span>
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

// 노드 타입 → 컴포넌트(=DOM 태그) 매핑. 배치별로 추가.
export const COMPONENTS: Record<string, any> = {
  p: blockEl('p'), h1: blockEl('h1'), h2: blockEl('h2'), h3: blockEl('h3'),
  h4: blockEl('h4'), h5: blockEl('h5'), h6: blockEl('h6'),
  blockquote: blockEl('blockquote'), code_block: blockEl('pre'), code_line: blockEl('code'),
  ul: blockEl('ul'), ol: blockEl('ol'), li: blockEl('li'), lic: blockEl('p'),
  a: LinkElement, img: ImageElement, hr: HrElement,
  video: VideoElement, media_embed: MediaEmbedElement,
  // 표
  table: TableElement, tr: blockEl('tr'), td: TableCellElement, th: TableCellElement,
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
