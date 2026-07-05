/* RichTextField — Plate(platejs v53) 기반 리치 텍스트 에디터. 스키마 control: 'richtext'.
   (2026-07 Tiptap v3 → Plate 교체. 툴바 UI·토큰 스타일·a11y 계약은 그대로 유지.)
   ── 데이터 계약(HTML → Slate-JSON) ──
   Plate는 Slate JSON-native다. tiptap의 동기 getHTML()과 달리 Plate의 HTML 직렬화는 async(serializeHtml,
   static 컴포넌트 필요)라 키 입력마다 쓰기엔 부적합하다. 저장 값을 HTML로 읽는 소비처가 없으므로(전 화면
   dangerouslySetInnerHTML 0건) `value`를 **Slate value의 JSON 문자열**로 주고받는다.
   ⚠️ 빈 문서도 `[{type:'p',children:[{text:''}]}]`라 JSON.stringify는 항상 non-empty → 상위 required
      `.trim()` 체크가 항상 false-pass(과거 tiptap `<p></p>` 잠복버그의 악화판)가 된다 → onChange에서
      editor.api.isEmpty()면 '' 를 방출해 required 검증이 정상 동작하게 한다.
   초기화(비제어): value가 '['로 시작하면 JSON.parse, 아니면(레거시 HTML) editor.api.html.deserialize.
   마운트 1회만 초기화(usePlateEditor value 이니셜라이저) → 이후 onChange 단방향. value를 effect로 되쓰지 않는다.
   ── 확장(플러그인) ──
   서식 스파인은 basic-nodes(marks: bold/italic/underline/strike/code, blocks: h1~h3/blockquote/hr) +
   list-classic(ul/ol/li — 시맨틱 태그 유지) + code-block + basic-styles(TextAlign) + link + media(Image).
   Undo/Redo는 Plate 코어(slate-history) 내장 → editor.tf.undo()/redo(), can=editor.history.undos/redos.length.
   ── element/leaf 컴포넌트 ──
   preflight:false라 태그 기본 스타일이 살아있다 → CSS(.apfs-prose h1/p/code…)가 시맨틱 태그를 노린다.
   Plate 기본 paragraph는 <div>로 렌더되므로(‼️) 블록/마크 타입을 명시적 태그로 override해 CSS 셀렉터가 맞물리게 한다.
   (a/img/hr은 각 플러그인 기본이 이미 <a href>/<img>/<hr>을 렌더 → override 불필요.)
   ── 이미지 ──
   백엔드 없음(프로토타입) → URL 삽입만(insertImage(editor,url)). base64/업로드 미지원. content엔 URL만 담긴다.
   ── 툴바 반응성 ──
   Plate에서 active 상태는 <Plate> 컨텍스트 안에서만 반응형이다 → 툴바를 Toolbar 자식으로 분리해 useEditorState()로
   매 변경(키입력+선택이동) 재렌더 후 editor.api.marks()/block()/some()을 동기 조회(tiptap의 transaction→force와 동형).
   ── URL 입력 바(링크·이미지 공용) ──
   window.prompt(스레드 차단)·Radix 팝오버(모달 포커스 경쟁) 대신 툴바 아래 인라인 바. pMode(link|image)로 UI 공유.
   버튼은 mousedown preventDefault로 선택을 보존하지만, URL 입력은 포커스를 정상 수신해야 하므로 걸지 않는다. */
import React from 'react';
import { Plate, PlateContent, PlateElement, PlateLeaf, usePlateEditor, useEditorState } from 'platejs/react';
import type { PlateEditor } from 'platejs/react';
import {
  BoldPlugin, ItalicPlugin, UnderlinePlugin, StrikethroughPlugin, CodePlugin,
  H1Plugin, H2Plugin, H3Plugin, BlockquotePlugin, HorizontalRulePlugin,
} from '@platejs/basic-nodes/react';
import { TextAlignPlugin } from '@platejs/basic-styles/react';
import { CodeBlockPlugin } from '@platejs/code-block/react';   // CodeLinePlugin은 CodeBlockPlugin에 nested 등록됨
import { ListPlugin } from '@platejs/list-classic/react';       // ul/ol/li/lic 하위 플러그인은 ListPlugin에 nested 등록됨
import { LinkPlugin } from '@platejs/link/react';
import { upsertLink, unwrapLink } from '@platejs/link';
import { ImagePlugin } from '@platejs/media/react';
import { insertImage } from '@platejs/media';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, SquareCode,
  Heading1, Heading2, Heading3, Pilcrow, List, ListOrdered, TextQuote,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Minus, Link as LinkIcon, Unlink,
  Image as ImageIcon, Undo2, Redo2, ChevronDown, Check, type LucideIcon,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
import './richtext.css';

const { useRef, useState } = React;

/* element/leaf를 시맨틱 태그로 렌더 — CSS(.apfs-prose <tag>)가 맞물리도록 DOM 태그를 통제. */
const blockEl = (as: string) => function El(props: any) { return <PlateElement as={as} {...props} />; };
const leafEl  = (as: string) => function Lf(props: any) { return <PlateLeaf as={as} {...props} />; };

/* a/img/hr — headless Plate의 기본 플러그인 컴포넌트는 미디어/링크를 실제로 렌더하지 않는다(레지스트리
   컴포넌트를 주라고 가정) → 명시 컴포넌트로 <a href>·<img src>·<hr>을 직접 그린다. */
// 링크 = 인라인 <a href>. element.url을 슬레이트 attributes에 실어 DOM <a>에 href로 전달.
function LinkElement(props: any) {
  return <PlateElement {...props} as="a" attributes={{ ...props.attributes, href: props.element.url, target: '_blank', rel: 'noopener noreferrer' }} />;
}
// 이미지 = 보이드 블록. 시각 <img>는 contentEditable=false 래퍼에, {children}은 보이드 spacer(슬레이트 요구).
function ImageElement(props: any) {
  return (
    <PlateElement {...props}>
      <div contentEditable={false}><img src={props.element.url} alt="" /></div>
      {props.children}
    </PlateElement>
  );
}
// 구분선 = 보이드 블록.
function HrElement(props: any) {
  return (
    <PlateElement {...props}>
      <div contentEditable={false}><hr /></div>
      {props.children}
    </PlateElement>
  );
}

// 노드 타입 → 컴포넌트(=DOM 태그) 매핑. headless라 시맨틱 태그를 직접 통제(기본 렌더는 <div>/미렌더).
//   · code_line→<code>: <pre><code> 유효 마크업(<pre><div> 방지)
//   · lic→<p>: <li><p> 로 .apfs-prose li>p CSS 활성 + TextAlign inject 대상('lic')이 돼 목록 내 정렬 동작
//   · a/img/hr: 기본 플러그인 컴포넌트가 미디어를 안 그림 → 명시 컴포넌트(위)로 <a>/<img>/<hr> 렌더
const COMPONENTS: Record<string, any> = {
  p: blockEl('p'), h1: blockEl('h1'), h2: blockEl('h2'), h3: blockEl('h3'),
  blockquote: blockEl('blockquote'), code_block: blockEl('pre'), code_line: blockEl('code'),
  ul: blockEl('ul'), ol: blockEl('ol'), li: blockEl('li'), lic: blockEl('p'),
  a: LinkElement, img: ImageElement, hr: HrElement,
  bold: leafEl('strong'), italic: leafEl('em'), underline: leafEl('u'),
  strikethrough: leafEl('s'), code: leafEl('code'),
};

// Plate 에디터 플러그인 스택 — 서식 스파인 전체.
const PLUGINS = [
  BoldPlugin, ItalicPlugin, UnderlinePlugin, StrikethroughPlugin, CodePlugin,
  H1Plugin, H2Plugin, H3Plugin, BlockquotePlugin, HorizontalRulePlugin,
  TextAlignPlugin.configure({ inject: { targetPlugins: ['p', 'h1', 'h2', 'h3', 'lic'] } }), // lic=목록 항목(내부 정렬 지원)
  CodeBlockPlugin,   // CodeLinePlugin·CodeSyntaxPlugin nested
  ListPlugin,        // BulletedList(ul)/NumberedList(ol)/ListItem(li)/ListItemContent(lic) nested
  LinkPlugin, ImagePlugin,
];

// 초기값(비제어): JSON이면 parse, 레거시 HTML이면 deserialize, 없으면 기본 빈 문단.
function toInitialValue(editor: PlateEditor, v: string) {
  const s = (v || '').trim();
  if (!s) return undefined;
  if (s.startsWith('[')) { try { return JSON.parse(s); } catch { /* fall through */ } }
  const body = new DOMParser().parseFromString(s, 'text/html').body;
  return editor.api.html.deserialize({ element: body });
}

// ── active 조회 헬퍼(툴바용) ──
// tf.h1/bold/ul 등은 플러그인이 런타임 주입(introspection 확인). 제네릭 PlateEditor 타입엔 안 보여
// Phase 0(strict:false) 컨벤션대로 에디터 파라미터를 any로 둔다(빌드는 esbuild라 타입체크 무관).
const blockType  = (e: any) => e.api.block()?.[0]?.type;
const blockAlign = (e: any) => e.api.block()?.[0]?.align || 'left';
const inNode = (e: any, type: string) => !!e.api.some({ match: { type } });
const markOn = (e: any, mark: string) => !!e.api.marks()?.[mark];

// isAction: 토글이 아닌 삽입 액션(hr) — aria-pressed를 붙이지 않는다(토글 버튼으로 오인 방지, WCAG 4.1.2).
type BtnDef = { key: string; Icon: LucideIcon; title: string; run: (e: any) => void; active: (e: any) => boolean; isAction?: boolean };

// ── Plate 공식 툴바 디자인: 블록 타입은 'Turn into' 드롭다운, 정렬은 'Align' 드롭다운, 나머지는 아이콘 버튼 ──
// Turn into 항목(블록 타입 변환) — 현재 블록을 라벨로 표시하는 드롭다운.
type DDItem = { key: string; Icon: LucideIcon; label: string; run: (e: any) => void };
const TURN_INTO: DDItem[] = [
  { key: 'p',          Icon: Pilcrow,     label: '본문',        run: (e) => e.tf.toggleBlock('p') },
  { key: 'h1',         Icon: Heading1,    label: '제목 1',      run: (e) => e.tf.h1.toggle() },
  { key: 'h2',         Icon: Heading2,    label: '제목 2',      run: (e) => e.tf.h2.toggle() },
  { key: 'h3',         Icon: Heading3,    label: '제목 3',      run: (e) => e.tf.h3.toggle() },
  { key: 'ul',         Icon: List,        label: '글머리 목록', run: (e) => e.tf.ul.toggle() },
  { key: 'ol',         Icon: ListOrdered, label: '번호 목록',   run: (e) => e.tf.ol.toggle() },
  { key: 'blockquote', Icon: TextQuote,   label: '인용',        run: (e) => e.tf.blockquote.toggle() },
  { key: 'code_block', Icon: SquareCode,  label: '코드 블록',   run: (e) => e.tf.code_block.toggle() },
];
// 현재 커서 위치의 블록이 어느 Turn-into 항목인지(래퍼 블록은 some, 헤딩은 최내곽 type).
function currentBlockKey(e: any): string {
  if (inNode(e, 'ul')) return 'ul';
  if (inNode(e, 'ol')) return 'ol';
  if (inNode(e, 'blockquote')) return 'blockquote';
  if (inNode(e, 'code_block')) return 'code_block';
  const t = blockType(e);
  return (t === 'h1' || t === 'h2' || t === 'h3') ? t : 'p';
}

// 정렬 항목 — 드롭다운. 트리거는 현재 정렬 아이콘을 표시.
const ALIGN_ITEMS: { key: string; Icon: LucideIcon; label: string }[] = [
  { key: 'left',    Icon: AlignLeft,    label: '왼쪽 정렬' },
  { key: 'center',  Icon: AlignCenter,  label: '가운데 정렬' },
  { key: 'right',   Icon: AlignRight,   label: '오른쪽 정렬' },
  { key: 'justify', Icon: AlignJustify, label: '양쪽 정렬' },
];

// 인라인 마크 아이콘 버튼(B I U S code) — 그대로 아이콘 토글.
const MARKS: BtnDef[] = [
  { key: 'bold',   Icon: Bold,          title: '굵게',        run: (e) => e.tf.bold.toggle(),          active: (e) => markOn(e, 'bold') },
  { key: 'italic', Icon: Italic,        title: '기울임',      run: (e) => e.tf.italic.toggle(),        active: (e) => markOn(e, 'italic') },
  { key: 'under',  Icon: UnderlineIcon, title: '밑줄',        run: (e) => e.tf.underline.toggle(),     active: (e) => markOn(e, 'underline') },
  { key: 'strike', Icon: Strikethrough, title: '취소선',      run: (e) => e.tf.strikethrough.toggle(), active: (e) => markOn(e, 'strikethrough') },
  { key: 'code',   Icon: Code,          title: '인라인 코드', run: (e) => e.tf.code.toggle(),          active: (e) => markOn(e, 'code') },
];

// 드롭다운 커맨드 실행 — 열릴 때 저장한 선택을 복원하고(포커스 소실 대비) 커맨드 실행 후 재포커스.
function runWithSel(editor: any, sel: any, fn: (e: any) => void) {
  editor.tf.focus();
  if (sel) { try { editor.tf.select(sel); } catch { /* 경로 무효 시 무시 */ } }
  fn(editor);
}

// Turn into 드롭다운 — 현재 블록 라벨 + 화살표. Radix 열림 시 선택 저장(URL 바와 동일한 blur 소실 대비).
function BlockTypeDropdown() {
  const editor = useEditorState();
  const sel = useRef<any>(null);
  const curKey = currentBlockKey(editor);
  const cur = TURN_INTO.find((t) => t.key === curKey) || TURN_INTO[0];
  return (
    <DropdownMenu onOpenChange={(o) => { if (o) sel.current = editor.selection; }}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="apfs-rt-turninto" title="블록 유형" aria-label={`블록 유형: ${cur.label}`}>
          <cur.Icon size={15} strokeWidth={2} aria-hidden={true} />
          <span className="apfs-rt-turninto__label">{cur.label}</span>
          <ChevronDown size={14} strokeWidth={2} aria-hidden={true} className="apfs-rt-turninto__chev" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => { e.preventDefault(); editor.tf.focus(); }}>
        {TURN_INTO.map((t) => (
          <DropdownMenuItem key={t.key} onSelect={() => runWithSel(editor, sel.current, t.run)}>
            <t.Icon size={16} strokeWidth={2} aria-hidden={true} />
            <span style={{ flex: 1 }}>{t.label}</span>
            {curKey === t.key && <Check size={15} strokeWidth={2.4} aria-hidden={true} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Align 드롭다운 — 현재 정렬 아이콘 + 화살표.
function AlignDropdown() {
  const editor = useEditorState();
  const sel = useRef<any>(null);
  const cur = blockAlign(editor);
  const curItem = ALIGN_ITEMS.find((a) => a.key === cur) || ALIGN_ITEMS[0];
  return (
    <DropdownMenu onOpenChange={(o) => { if (o) sel.current = editor.selection; }}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="apfs-rt-btn apfs-rt-btn--dd" title="정렬" aria-label={`정렬: ${curItem.label}`}>
          <curItem.Icon size={16} strokeWidth={2} aria-hidden={true} />
          <ChevronDown size={12} strokeWidth={2} aria-hidden={true} className="apfs-rt-btn__chev" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => { e.preventDefault(); editor.tf.focus(); }}>
        {ALIGN_ITEMS.map((a) => (
          <DropdownMenuItem key={a.key} onSelect={() => runWithSel(editor, sel.current, (ed) => ed.tf.textAlign.setNodes(a.key))}>
            <a.Icon size={16} strokeWidth={2} aria-hidden={true} />
            <span style={{ flex: 1 }}>{a.label}</span>
            {cur === a.key && <Check size={15} strokeWidth={2.4} aria-hidden={true} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type PromptMode = null | 'link' | 'image';

// 툴바 — <Plate> 자식이라 useEditorState()로 매 변경 재렌더 → active 상태 동기 반영.
function Toolbar({ pMode, setPMode, pUrl, setPUrl }: {
  pMode: PromptMode; setPMode: (m: PromptMode) => void; pUrl: string; setPUrl: (u: string) => void;
}) {
  const editor = useEditorState();
  // URL 바의 autoFocus input이 포커스를 뺏으면 slate-react가 editor.selection을 blur로 비운다 →
  // upsertLink/insertImage가 선택 없이 no-op. 바를 열 때 선택을 저장하고 적용 직전 복원한다.
  const savedSel = useRef<any>(null);
  const canUndo = !!editor.history?.undos?.length;
  const canRedo = !!editor.history?.redos?.length;
  const linkActive = inNode(editor, 'a');
  const imageActive = inNode(editor, 'img');

  // URL 바 열기 — 여는 시점의 선택을 저장(직후 input autoFocus로 소실되므로). 링크는 현재 url 프리필.
  function openLink() { savedSel.current = editor.selection; setPUrl((editor.api.node({ match: { type: 'a' } as any }) as any)?.[0]?.url || ''); setPMode('link'); }
  function openImage() { savedSel.current = editor.selection; setPUrl(''); setPMode('image'); }
  // URL 바 닫기 — autoFocus된 input이 언마운트되므로 포커스를 에디터로 되돌린다(body 낙하 방지, WCAG 2.4.3).
  function closeBar() { setPMode(null); editor.tf.focus(); }
  // 적용 — 저장한 선택을 복원(blur로 소실됨)한 뒤 링크=upsert(빈 값이면 제거)·이미지=커서 위치 삽입.
  function applyPrompt() {
    const url = pUrl.trim();
    if (savedSel.current) editor.tf.select(savedSel.current);  // blur로 소실된 선택 복원(op가 이 선택에 적용)
    if (pMode === 'link') { if (url) upsertLink(editor, { url }); else unwrapLink(editor); }
    else if (pMode === 'image' && url) { insertImage(editor, url); }
    setPMode(null);
    editor.tf.focus();
  }

  // 마크 아이콘 버튼 렌더러(공통).
  const markBtn = (b: BtnDef) => {
    const on = b.active(editor);
    return (
      <button key={b.key} type="button" title={b.title} aria-label={b.title} aria-pressed={on}
        className={'apfs-rt-btn' + (on ? ' is-active' : '')}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => { b.run(editor); editor.tf.focus(); }}>
        <b.Icon size={16} strokeWidth={2} aria-hidden={true} />
      </button>
    );
  };

  return (
    <>
      <div className="apfs-richtext__toolbar" role="toolbar" aria-label="서식 도구">
        {/* 실행취소/다시실행 */}
        <button type="button" title="실행취소" aria-label="실행취소" className="apfs-rt-btn"
          disabled={!canUndo} onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.tf.undo()}><Undo2 size={16} strokeWidth={2} aria-hidden={true} /></button>
        <button type="button" title="다시실행" aria-label="다시실행" className="apfs-rt-btn"
          disabled={!canRedo} onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.tf.redo()}><Redo2 size={16} strokeWidth={2} aria-hidden={true} /></button>

        {/* Turn into — 블록 타입 드롭다운(현재 블록 라벨) */}
        <span className="apfs-richtext__sep" aria-hidden="true" />
        <BlockTypeDropdown />

        {/* 인라인 마크 */}
        <span className="apfs-richtext__sep" aria-hidden="true" />
        {MARKS.map(markBtn)}

        {/* Align 드롭다운 */}
        <span className="apfs-richtext__sep" aria-hidden="true" />
        <AlignDropdown />

        {/* 삽입 — 링크/이미지(인라인 URL 바 토글)·구분선. 링크는 제거 버튼도 제공. */}
        <span className="apfs-richtext__sep" aria-hidden="true" />
        <button type="button" title="링크" aria-label="링크" aria-pressed={linkActive || pMode === 'link'}
          className={'apfs-rt-btn' + (linkActive || pMode === 'link' ? ' is-active' : '')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (pMode === 'link' ? closeBar() : openLink())}><LinkIcon size={16} strokeWidth={2} aria-hidden={true} /></button>
        <button type="button" title="링크 제거" aria-label="링크 제거" className="apfs-rt-btn"
          disabled={!linkActive} onMouseDown={(e) => e.preventDefault()}
          onClick={() => { unwrapLink(editor); editor.tf.focus(); }}><Unlink size={16} strokeWidth={2} aria-hidden={true} /></button>
        <button type="button" title="이미지" aria-label="이미지" aria-pressed={imageActive || pMode === 'image'}
          className={'apfs-rt-btn' + (imageActive || pMode === 'image' ? ' is-active' : '')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (pMode === 'image' ? closeBar() : openImage())}><ImageIcon size={16} strokeWidth={2} aria-hidden={true} /></button>
        <button type="button" title="구분선" aria-label="구분선" className="apfs-rt-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { editor.tf.insertNodes({ type: 'hr', children: [{ text: '' }] } as any); editor.tf.focus(); }}><Minus size={16} strokeWidth={2} aria-hidden={true} /></button>
      </div>

      {/* URL 입력 바(링크·이미지 공용) — 텍스트 입력이라 mousedown preventDefault를 걸지 않는다. */}
      {pMode && (
        <div className="apfs-richtext__linkbar">
          <input
            type="url" className="apfs-rt-linkinput" autoFocus
            aria-label={pMode === 'image' ? '이미지 URL' : '링크 URL'}
            placeholder={pMode === 'image' ? 'https://…/image.png' : 'https://example.com'}
            value={pUrl}
            onChange={(e) => setPUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); applyPrompt(); }
              if (e.key === 'Escape') { e.preventDefault(); closeBar(); }
            }}
          />
          <button type="button" className="apfs-rt-linkbtn" onMouseDown={(e) => e.preventDefault()} onClick={applyPrompt}>
            {pMode === 'image' ? '삽입' : '적용'}
          </button>
          <button type="button" className="apfs-rt-linkbtn is-ghost" onMouseDown={(e) => e.preventDefault()} onClick={closeBar}>취소</button>
        </div>
      )}
    </>
  );
}

// required: 필수 필드 상시 표식 — 컨테이너 테두리만 danger(is-required, richtext.css). aria-required로 접근성 표기.
export function RichTextField({ value, onChange, label, required }: { value: string; onChange: (v: string) => void; label?: string; required?: boolean }) {
  const [pMode, setPMode] = useState<PromptMode>(null); // URL 입력 바 모드(링크/이미지 공용)
  const [pUrl, setPUrl] = useState('');
  const lastEmitted = useRef<string | null>(null);

  const editor = usePlateEditor({
    plugins: PLUGINS,
    components: COMPONENTS,
    value: (ed) => toInitialValue(ed as PlateEditor, value), // 마운트 1회 초기화(비제어)
  });

  // 변경 → 직렬화. 빈 문서는 '' 방출(required 검증 정상화). 선택만 바뀐 경우(값 동일)는 스킵.
  function handleChange({ value: v }: { value: any }) {
    const next = (editor as any).api.isEmpty() ? '' : JSON.stringify(v);
    if (next === lastEmitted.current) return;
    lastEmitted.current = next;
    onChange(next);
  }

  return (
    <div className={'apfs-richtext' + (required ? ' is-required' : '')}>
      <Plate editor={editor} onChange={handleChange}>
        <Toolbar pMode={pMode} setPMode={setPMode} pUrl={pUrl} setPUrl={setPUrl} />
        {/* 접근성 이름은 스키마 field.label에서 받는다(contenteditable div라 외부 <label> 암묵연결 불가). */}
        <PlateContent
          className="apfs-prose"
          role="textbox"
          aria-multiline="true"
          aria-label={label || '내용'}
          aria-required={required ? true : undefined}
        />
      </Plate>
    </div>
  );
}
