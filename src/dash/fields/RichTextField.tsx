/* RichTextField — Plate(platejs v53) 기반 리치 텍스트 에디터. 스키마 control: 'richtext'.
   (2026-07 Tiptap v3 → Plate 교체. 2026-07 유료 제외 전 기능 확장: 표·콜아웃·다단·토글·날짜·수식·태그·
    멘션·슬래시·이모지·글꼴·H4~6·Kbd·마크다운 단축. 2026-07 추가: 체크리스트(taskList)·이미지/파일 업로드
    (base64+1MB 상한)·파일 첨부 칩·선택 서식 플로팅 툴바·우클릭 컨텍스트 메뉴(복사/복제/삭제)·문서 입출력
    (MD/HTML/JSON import·export).)
   ⚠️ 드래그 리사이즈(@platejs/resizable)는 CRUD 모달+DnD+onChange 직렬화 환경에서 "Maximum update depth"
      렌더 루프를 유발해 제외 — 이미지 크기는 선택 오버레이의 S/M/L 프리셋으로 조절. 블록 마퀴 선택
      (@platejs/selection)은 렌더트리 재구성(PlateContainer)+블록별 훅이 같은 루프 벡터라 보류(드래그 재정렬로 대체).
   ── 데이터 계약(HTML → Slate-JSON) ──
   Plate는 Slate JSON-native다. tiptap의 동기 getHTML()과 달리 Plate의 HTML 직렬화는 async라 키 입력마다
   쓰기엔 부적합. 저장 값을 HTML로 읽는 소비처가 없으므로 `value`를 **Slate value의 JSON 문자열**로 주고받는다.
   ⚠️ 빈 문서도 non-empty JSON이라 상위 required `.trim()`이 false-pass → onChange에서 진짜 빈 문서면 '' 방출.
      "진짜 빈 문서" = 텍스트가 공백뿐 + 원자 노드(img/video/media_embed/file/hr/table/수식/날짜/멘션/태그/콜아웃/다단/토글)도 없음.
   초기화(비제어): value가 '['로 시작하면 JSON.parse, 아니면(레거시 HTML) editor.api.html.deserialize.
   ── 확장(플러그인) ──
   서식 스파인(basic-nodes marks/blocks) + list-classic + code-block + basic-styles(정렬/색/크기/글꼴) + indent +
   link + media(Image/Video/MediaEmbed/File) 에 더해: table / callout / layout(다단) / toggle / date / math(수식) / tag /
   list-classic의 taskList(체크리스트, ul/ol와 공존). 멘션·슬래시·이모지(콤보박스)·dnd 배선 완료.
   선택 서식 플로팅 툴바=@platejs/floating(플러그인 불필요), 컨텍스트 메뉴=Radix ContextMenu(우클릭 블록 직접 조작).
   마크다운 단축(# , - , > , **bold**)은 v53에서 각 플러그인 inputRules에 내장 → 별도 AutoformatPlugin 불필요.
   ── element/leaf 컴포넌트 ──
   헤드리스라 시맨틱 태그를 직접 통제(RichTextElements.tsx의 COMPONENTS). Plate 기본 paragraph는 <div>라 override 필수.
   ── 툴바 ──
   버튼 나열을 피하려 블록타입·정렬·색·글꼴·삽입을 드롭다운으로 묶는다. active 상태는 <Plate> 컨텍스트 안에서만
   반응형 → 툴바를 Toolbar 자식으로 분리해 useEditorState()로 매 변경 재렌더 후 동기 조회. */
import React from 'react';
import { Plate, PlateContent, usePlateEditor, useEditorState } from 'platejs/react';
import type { PlateEditor } from 'platejs/react';
import {
  BoldPlugin, ItalicPlugin, UnderlinePlugin, StrikethroughPlugin, CodePlugin, KbdPlugin,
  H1Plugin, H2Plugin, H3Plugin, H4Plugin, H5Plugin, H6Plugin, BlockquotePlugin, HorizontalRulePlugin,
  HighlightPlugin, SubscriptPlugin, SuperscriptPlugin,
} from '@platejs/basic-nodes/react';
// 마크다운 입력 단축(v53 feature-owned inputRules) — 각 플러그인 .configure({inputRules:[XxxRules.markdown()]}).
import {
  BoldRules, ItalicRules, UnderlineRules, StrikethroughRules, CodeRules,
  HighlightRules, SubscriptRules, SuperscriptRules, HeadingRules, BlockquoteRules, HorizontalRuleRules,
} from '@platejs/basic-nodes';
import { TextAlignPlugin, FontColorPlugin, FontBackgroundColorPlugin, FontSizePlugin, FontFamilyPlugin, LineHeightPlugin } from '@platejs/basic-styles/react';
import { IndentPlugin } from '@platejs/indent/react';
import { indent, outdent } from '@platejs/indent';
import { CodeBlockPlugin } from '@platejs/code-block/react';   // CodeLinePlugin은 CodeBlockPlugin에 nested 등록됨
import { toggleCodeBlock, CodeBlockRules } from '@platejs/code-block'; // tf.code_block.toggle()은 code_line을 텍스트노드로 오생성 → helper 사용
import { ListPlugin } from '@platejs/list-classic/react';       // ul/ol/li/lic + taskList 하위 플러그인은 ListPlugin에 nested 등록됨(taskList=체크리스트)
import { BulletedListRules, OrderedListRules, TaskListRules } from '@platejs/list-classic';
import { LinkPlugin } from '@platejs/link/react';
import { upsertLink, unwrapLink, LinkRules } from '@platejs/link';
import { ImagePlugin, VideoPlugin, MediaEmbedPlugin, FilePlugin } from '@platejs/media/react';
import { insertImage, insertMediaEmbed, insertImageFromFiles } from '@platejs/media';
import { CaptionPlugin } from '@platejs/caption/react';
import { TablePlugin, TableRowPlugin, TableCellPlugin, TableCellHeaderPlugin, useTableMergeState } from '@platejs/table/react';
import { insertTable } from '@platejs/table';
import { CalloutPlugin } from '@platejs/callout/react';
import { insertCallout } from '@platejs/callout';
import { ColumnPlugin, ColumnItemPlugin } from '@platejs/layout/react';
import { insertColumnGroup } from '@platejs/layout';
import { TogglePlugin } from '@platejs/toggle/react';
import { DatePlugin } from '@platejs/date/react';
import { insertDate } from '@platejs/date';
import { EquationPlugin, InlineEquationPlugin } from '@platejs/math/react';
import { insertEquation, insertInlineEquation, MathRules } from '@platejs/math';
import { TagPlugin } from '@platejs/tag/react';
import { MentionPlugin, MentionInputPlugin } from '@platejs/mention/react';
import { SlashPlugin, SlashInputPlugin } from '@platejs/slash-command/react';
import { EmojiPlugin, EmojiInputPlugin } from '@platejs/emoji/react';
import emojiMartData from '@emoji-mart/data';
import { MarkdownPlugin } from '@platejs/markdown';
import { NodeIdPlugin } from '@platejs/core';        // dnd는 블록 id 필수(getBlocksWithId)
import { DndPlugin } from '@platejs/dnd';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useFloatingToolbar, useFloatingToolbarState, offset, flip, shift } from '@platejs/floating';  // 선택 서식 플로팅 툴바(플러그인 불필요)
import { MentionInputElement, SlashInputElement, EmojiInputElement } from './RichTextCombobox';
import { COMPONENTS, BlockDraggable, canSplitCell, DOC_PALETTE } from './RichTextElements';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, SquareCode, Keyboard,
  Heading1, Heading2, Heading3, Heading4, Heading5, Heading6, Pilcrow, List, ListOrdered, ListChecks, TextQuote,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Minus, Link as LinkIcon, Unlink,
  Image as ImageIcon, Undo2, Redo2, ChevronDown, Check, MoreHorizontal,
  Highlighter, Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
  Baseline, PaintBucket, CaseSensitive, IndentIncrease, IndentDecrease, MoveVertical,
  Plus, Table as TableIcon, Info, Columns3, ListCollapse, CalendarDays, Sigma, Radical, FileDown,
  Video, Clapperboard, Tag as TagIcon, ImagePlus, Paperclip,
  FileText, FileCode2, Braces, FileUp, Copy, CopyPlus, Trash2,
  ArrowUpToLine, ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine, Combine, Ungroup, X,
  type LucideIcon,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '../ui/context-menu';
import './richtext.css';

const { useRef, useState } = React;

// 정렬/줄간격/들여쓰기 대상 블록(lic=목록 항목). 헤딩 h4~h6까지 포함.
const ALIGN_TARGETS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'lic'];
// 각 플러그인에 마크다운 입력 단축(inputRules)을 주입. HeadingRules는 H1에만 붙여도 #~###### 전 레벨 담당.
const PLUGINS = [
  BoldPlugin.configure({ inputRules: [BoldRules.markdown({ variant: '*' }), BoldRules.markdown({ variant: '_' })] }),
  ItalicPlugin.configure({ inputRules: [ItalicRules.markdown({ variant: '*' }), ItalicRules.markdown({ variant: '_' })] }),
  UnderlinePlugin.configure({ inputRules: [UnderlineRules.markdown()] }),
  StrikethroughPlugin.configure({ inputRules: [StrikethroughRules.markdown()] }),
  CodePlugin.configure({ inputRules: [CodeRules.markdown()] }),
  KbdPlugin,
  HighlightPlugin.configure({ inputRules: [HighlightRules.markdown()] }),
  SubscriptPlugin.configure({ inputRules: [SubscriptRules.markdown()] }),
  SuperscriptPlugin.configure({ inputRules: [SuperscriptRules.markdown()] }),
  FontColorPlugin, FontBackgroundColorPlugin, FontSizePlugin, FontFamilyPlugin,   // 글꼴 색/배경/크기/서체(style inject)
  H1Plugin.configure({ inputRules: [HeadingRules.markdown()] }),                    // # ~ ###### 전 레벨
  H2Plugin, H3Plugin, H4Plugin, H5Plugin, H6Plugin,
  BlockquotePlugin.configure({ inputRules: [BlockquoteRules.markdown()] }),
  HorizontalRulePlugin.configure({ inputRules: [HorizontalRuleRules.markdown({ variant: '-' })] }),
  TextAlignPlugin.configure({ inject: { targetPlugins: ALIGN_TARGETS } }),
  LineHeightPlugin.configure({ inject: { targetPlugins: ALIGN_TARGETS } }),
  IndentPlugin.configure({ inject: { targetPlugins: ALIGN_TARGETS } }),
  CodeBlockPlugin.configure({ inputRules: [CodeBlockRules.markdown({ on: 'match' })] }),  // ``` → 코드블록
  ListPlugin.configure({ inputRules: [BulletedListRules.markdown({ variant: '-' }), OrderedListRules.markdown({ variant: '.' }), TaskListRules.markdown()] }),  // - / 1. / [ ]
  LinkPlugin.configure({ inputRules: [LinkRules.markdown(), LinkRules.autolink({ variant: 'space' }), LinkRules.autolink({ variant: 'break' })] }),
  ImagePlugin, VideoPlugin, MediaEmbedPlugin, FilePlugin,   // FilePlugin: 파일 첨부(file, 보이드) 노드
  CaptionPlugin.configure({ options: { query: { allow: ['img', 'video', 'media_embed'] } } }),  // img/비디오/임베드에 캡션
  // ── 확장 블록/보이드 ──
  // minColumnWidth: 열 리사이즈 재분배 시 이웃 열이 0으로 뭉개지지 않는 하한(CSS td min-width 48과 동일 기준)
  TablePlugin.configure({ options: { minColumnWidth: 48 } }), TableRowPlugin, TableCellPlugin, TableCellHeaderPlugin,
  CalloutPlugin, ColumnPlugin, ColumnItemPlugin, TogglePlugin,
  DatePlugin, TagPlugin,
  InlineEquationPlugin.configure({ inputRules: [MathRules.markdown({ variant: '$' })] }),    // $..$ → 인라인 수식
  EquationPlugin.configure({ inputRules: [MathRules.markdown({ on: 'break', variant: '$$' })] }), // $$ → 수식 블록
  // 콤보박스 트리거 — @ 멘션 / 슬래시 커맨드. Input 플러그인이 트리거 시 *_input 노드를 삽입.
  MentionPlugin, MentionInputPlugin,
  SlashPlugin, SlashInputPlugin,
  EmojiPlugin.configure({ options: { data: emojiMartData as any } }), EmojiInputPlugin,   // : 이모지
  MarkdownPlugin,   // 마크다운 직렬화(내보내기) — editor.api.markdown.serialize()
  // ── 드래그앤드롭 ── NodeIdPlugin이 블록 id 부여(dnd 필수), DndPlugin이 aboveSlate로 DndProvider 자동 래핑.
  NodeIdPlugin,
  DndPlugin.configure({
    options: { enableScroller: true },
    render: {
      aboveNodes: BlockDraggable,
      aboveSlate: ({ children }: any) => <DndProvider backend={HTML5Backend}>{children}</DndProvider>,
    },
  }),
];

// 콤보박스 input-element 컴포넌트 — COMPONENTS(RichTextElements)에 병합. 순환 import 방지로 여기서 결합.
const ALL_COMPONENTS = { ...COMPONENTS, mention_input: MentionInputElement, slash_input: SlashInputElement, emoji_input: EmojiInputElement };

// 표 셀 자식 정규화 — HTML deserialize는 <td>텍스트</td>를 텍스트/인라인 직접 자식으로 만들 수 있는데,
// Plate 표 트랜스폼(병합 등)은 셀 자식이 블록(p)임을 전제라 isEmpty가 "children is not iterable"로
// 크래시한다(셀 병합 실측 버그 — 툴바 표 드롭다운 병합에도 있던 잠복 버그). 셀 자식이 전부
// 텍스트/인라인이면 p 하나로 감싸고, 빈 셀은 빈 p를 넣는다. 트리 전체 재귀(셀 안 중첩 표 포함).
const CELL_INLINE_TYPES = new Set(['a', 'mention', 'date', 'tag', 'inline_equation']);
function normalizeTableCells(nodes: any): any {
  if (!Array.isArray(nodes)) return nodes;
  for (const n of nodes) {
    if (!n || typeof n !== 'object' || !Array.isArray(n.children)) continue;
    if (n.type === 'td' || n.type === 'th') {
      if (!n.children.length) { n.children = [{ type: 'p', children: [{ text: '' }] }]; continue; }
      if (n.children.every((c: any) => c && (typeof c.text === 'string' || CELL_INLINE_TYPES.has(c.type)))) {
        n.children = [{ type: 'p', children: n.children }];
        continue;
      }
    }
    normalizeTableCells(n.children);
  }
  return nodes;
}

// 초기값(비제어): JSON이면 parse, 레거시 HTML이면 deserialize, 없으면 기본 빈 문단.
// 어느 경로든 표 셀 구조를 정규화(과거 HTML 유래 JSON에도 비정규 셀이 저장돼 있을 수 있음).
function toInitialValue(editor: PlateEditor, v: string) {
  const s = (v || '').trim();
  if (!s) return undefined;
  if (s.startsWith('[')) { try { return normalizeTableCells(JSON.parse(s)); } catch { /* fall through */ } }
  const body = new DOMParser().parseFromString(s, 'text/html').body;
  return normalizeTableCells(editor.api.html.deserialize({ element: body }));
}

// 원자/미디어 노드 존재 여부 — 재귀. 텍스트가 비어도 이런 노드만 있으면 "빈 문서" 아님(required false-pass 방지).
const ATOMIC_TYPES = new Set(['img', 'video', 'media_embed', 'file', 'hr', 'table', 'equation', 'inline_equation', 'date', 'mention', 'tag', 'callout', 'column_group', 'toggle']);
function hasAtomicNode(nodes: any[]): boolean {
  return Array.isArray(nodes) && nodes.some((n) => n && (ATOMIC_TYPES.has(n.type) || hasAtomicNode(n.children)));
}

// ── active 조회 헬퍼(툴바용) ── tf.h1/bold/ul 등은 플러그인 런타임 주입 → 에디터 파라미터를 any로.
const blockType  = (e: any) => e.api.block()?.[0]?.type;
const blockAlign = (e: any) => e.api.block()?.[0]?.align || 'left';
const inNode = (e: any, type: string) => !!e.api.some({ match: { type } });
const markOn = (e: any, mark: string) => !!e.api.marks()?.[mark];

type BtnDef = { key: string; Icon: LucideIcon; title: string; run: (e: any) => void; active: (e: any) => boolean };

// ── Turn into(블록 타입 변환) 드롭다운 항목 ──
type DDItem = { key: string; Icon: LucideIcon; label: string; run: (e: any) => void };
const TURN_INTO: DDItem[] = [
  { key: 'p',          Icon: Pilcrow,     label: '본문',        run: (e) => e.tf.toggleBlock('p') },
  { key: 'h1',         Icon: Heading1,    label: '제목 1',      run: (e) => e.tf.h1.toggle() },
  { key: 'h2',         Icon: Heading2,    label: '제목 2',      run: (e) => e.tf.h2.toggle() },
  { key: 'h3',         Icon: Heading3,    label: '제목 3',      run: (e) => e.tf.h3.toggle() },
  { key: 'h4',         Icon: Heading4,    label: '제목 4',      run: (e) => e.tf.h4.toggle() },
  { key: 'h5',         Icon: Heading5,    label: '제목 5',      run: (e) => e.tf.h5.toggle() },
  { key: 'h6',         Icon: Heading6,    label: '제목 6',      run: (e) => e.tf.h6.toggle() },
  { key: 'ul',         Icon: List,        label: '글머리 목록', run: (e) => e.tf.ul.toggle() },
  { key: 'ol',         Icon: ListOrdered, label: '번호 목록',   run: (e) => e.tf.ol.toggle() },
  { key: 'taskList',   Icon: ListChecks,  label: '체크리스트',  run: (e) => e.tf.taskList.toggle() },
  { key: 'blockquote', Icon: TextQuote,   label: '인용',        run: (e) => e.tf.blockquote.toggle() },
  { key: 'code_block', Icon: SquareCode,  label: '코드 블록',   run: (e) => toggleCodeBlock(e) },
];
function currentBlockKey(e: any): string {
  if (inNode(e, 'taskList')) return 'taskList';
  if (inNode(e, 'ul')) return 'ul';
  if (inNode(e, 'ol')) return 'ol';
  if (inNode(e, 'blockquote')) return 'blockquote';
  if (inNode(e, 'code_block')) return 'code_block';
  const t = blockType(e);
  return (t && /^h[1-6]$/.test(t)) ? t : 'p';
}

// ── 삽입 드롭다운 항목(원자/블록 노드 삽입) ──
// run: 즉시 실행 / prompt: URL 입력 바를 해당 모드로 열기(비디오·임베드는 URL 필요).
type InsertItem = { key: string; Icon: LucideIcon; label: string; run?: (e: any) => void; prompt?: 'video' | 'embed'; action?: 'file' };
function insertHr(e: any) { e.tf.insertNodes([{ type: 'hr', children: [{ text: '' }] }, { type: 'p', children: [{ text: '' }] }], { select: true }); e.tf.focus(); }
function insertToggle(e: any) { const id = 't' + Math.random().toString(36).slice(2, 9); e.tf.insertNodes({ type: 'toggle', id, children: [{ text: '' }] }, { select: true }); e.tf.focus(); }
function insertTag(e: any) { e.tf.insertNodes({ type: 'tag', value: '태그', children: [{ text: '' }] } as any, { select: true }); e.tf.focus(); }
const INSERT_ITEMS: InsertItem[] = [
  { key: 'table',           Icon: TableIcon,    label: '표',           run: (e) => insertTable(e, { rowCount: 3, colCount: 3, header: true }) },
  { key: 'callout',         Icon: Info,         label: '콜아웃',       run: (e) => insertCallout(e, { variant: 'info' }) },
  { key: 'columns',         Icon: Columns3,     label: '2단 레이아웃', run: (e) => insertColumnGroup(e, { columns: 2 }) },
  { key: 'toggle',          Icon: ListCollapse, label: '토글 목록',    run: (e) => insertToggle(e) },
  { key: 'date',            Icon: CalendarDays, label: '날짜',         run: (e) => insertDate(e) },
  { key: 'equation',        Icon: Sigma,        label: '수식 블록',    run: (e) => insertEquation(e) },
  { key: 'inline_equation', Icon: Radical,      label: '인라인 수식',  run: (e) => insertInlineEquation(e) },
  { key: 'video',           Icon: Video,        label: '비디오',       prompt: 'video' },
  { key: 'embed',           Icon: Clapperboard, label: '미디어 임베드', prompt: 'embed' },
  { key: 'tag',             Icon: TagIcon,      label: '태그',         run: (e) => insertTag(e) },
  { key: 'file',            Icon: Paperclip,    label: '파일 첨부',    action: 'file' },
  { key: 'hr',              Icon: Minus,        label: '구분선',       run: (e) => insertHr(e) },
];

// 정렬 항목 — 드롭다운.
const ALIGN_ITEMS: { key: string; Icon: LucideIcon; label: string }[] = [
  { key: 'left',    Icon: AlignLeft,    label: '왼쪽 정렬' },
  { key: 'center',  Icon: AlignCenter,  label: '가운데 정렬' },
  { key: 'right',   Icon: AlignRight,   label: '오른쪽 정렬' },
  { key: 'justify', Icon: AlignJustify, label: '양쪽 정렬' },
];

// 번호 목록 스타일 항목 — key는 CSS list-style-type 키워드 그대로(ol 노드 listStyleType 속성으로 저장).
const OL_STYLES: { key: string; label: string }[] = [
  { key: 'decimal',     label: 'Decimal (1, 2, 3)' },
  { key: 'lower-alpha', label: 'Lower Alpha (a, b, c)' },
  { key: 'upper-alpha', label: 'Upper Alpha (A, B, C)' },
  { key: 'lower-roman', label: 'Lower Roman (i, ii, iii)' },
  { key: 'upper-roman', label: 'Upper Roman (I, II, III)' },
];

// 글머리 목록 불릿 항목 — key는 CSS list-style-type 키워드(ul 노드 listStyleType 속성으로 저장). Default=disc.
const UL_STYLES: { key: string; label: string }[] = [
  { key: 'disc',   label: 'Default (●)' },
  { key: 'circle', label: 'Circle (○)' },
  { key: 'square', label: 'Square (■)' },
];

// 인라인 마크 아이콘 버튼(B I U S code kbd 형광 첨자).
const MARKS: BtnDef[] = [
  { key: 'bold',   Icon: Bold,          title: '굵게',        run: (e) => e.tf.bold.toggle(),          active: (e) => markOn(e, 'bold') },
  { key: 'italic', Icon: Italic,        title: '기울임',      run: (e) => e.tf.italic.toggle(),        active: (e) => markOn(e, 'italic') },
  { key: 'under',  Icon: UnderlineIcon, title: '밑줄',        run: (e) => e.tf.underline.toggle(),     active: (e) => markOn(e, 'underline') },
  { key: 'strike', Icon: Strikethrough, title: '취소선',      run: (e) => e.tf.strikethrough.toggle(), active: (e) => markOn(e, 'strikethrough') },
  { key: 'code',   Icon: Code,          title: '인라인 코드', run: (e) => e.tf.code.toggle(),          active: (e) => markOn(e, 'code') },
  { key: 'kbd',    Icon: Keyboard,      title: '단축키',      run: (e) => e.tf.kbd.toggle(),           active: (e) => markOn(e, 'kbd') },
  { key: 'hl',     Icon: Highlighter,   title: '형광펜',      run: (e) => e.tf.highlight.toggle(),     active: (e) => markOn(e, 'highlight') },
  { key: 'sub',    Icon: SubscriptIcon, title: '아래 첨자',   run: (e) => e.tf.subscript.toggle(),     active: (e) => markOn(e, 'subscript') },
  { key: 'sup',    Icon: SuperscriptIcon, title: '위 첨자',   run: (e) => e.tf.superscript.toggle(),   active: (e) => markOn(e, 'superscript') },
];
// 마크 분할 — PRIMARY(B I U S Code)는 아이콘 버튼으로 상시 노출, MORE(Kbd·형광펜·아래첨자·위첨자)는 More ⋯ 드롭다운으로 접는다.
const PRIMARY_MARKS: BtnDef[] = MARKS.slice(0, 5);
const MORE_MARKS: BtnDef[] = MARKS.slice(5);

// 인라인 마크 버튼 묶음 — 상단 툴바와 플로팅 툴바가 공유. marks로 표시 집합을 주입(기본=전체). mousedown preventDefault
// 필수(클릭이 선택을 무너뜨리면 플로팅 툴바가 클릭 도중 사라져 클릭이 유실됨 = caret/선택 회귀 재현).
function MarkButtons({ editor, marks = MARKS }: { editor: any; marks?: BtnDef[] }) {
  return (
    <>
      {marks.map((b) => {
        const on = b.active(editor);
        return (
          <button key={b.key} type="button" title={b.title} aria-label={b.title} aria-pressed={on}
            className={'apfs-rt-btn' + (on ? ' is-active' : '')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { b.run(editor); editor.tf.focus(); }}>
            <b.Icon size={16} strokeWidth={2} aria-hidden={true} />
          </button>
        );
      })}
    </>
  );
}

// 선택 서식 플로팅 툴바 — 텍스트를 드래그 선택하면 위에 떠서 마크 버튼 제공. BlockSelectionPlugin 불필요.
// ⚠️ 모달(Radix Dialog) 안이라 body 포털 금지(DismissableLayer가 interact-outside로 모달을 닫음).
//    컨테이너 내부 렌더 + floating-ui strategy:'absolute'(기본)로 position:relative 조상(.apfs-richtext) 기준 배치.
function FloatingMarkToolbar({ savedSel, setPMode, setPUrl }: {
  savedSel: React.MutableRefObject<any>; setPMode: (m: PromptMode) => void; setPUrl: (u: string) => void;
}) {
  const editor = useEditorState();
  // 내부 드롭다운(Turn-into·More) open 동안엔 툴바를 유지한다. 드롭다운이 열리며 선택이 무너져 hidden이 되면
  // 트리거가 사라져 Radix 팝오버가 앵커를 잃고(포털 자식 언마운트) 깨지므로, ddOpen이면 마지막 위치로 강제 표시.
  const [ddOpen, setDdOpen] = useState(false);
  const state = useFloatingToolbarState({
    editorId: editor.id,
    focusedEditorId: editor.id,
    floatingOptions: { placement: 'top', middleware: [offset(8), flip(), shift({ padding: 8 })] },
  } as any);
  const { hidden, props, ref } = useFloatingToolbar(state);
  if (hidden && !ddOpen) return null;
  // hidden이면 floating.style에 display:'none'이 박히므로 ddOpen 중엔 강제로 보이게 덮는다(위치는 마지막 값 유지).
  const floatStyle = (props as any).style as React.CSSProperties;
  const style: React.CSSProperties = (hidden && ddOpen) ? { ...floatStyle, display: 'inline-flex', visibility: 'visible' } : floatStyle;
  const linkActive = inNode(editor, 'a');
  return (
    <div ref={ref as any} className="apfs-rt-floattoolbar" role="toolbar" aria-label="선택 서식" style={style}>
      <BlockTypeDropdown compact onOpenChange={setDdOpen} />
      <span className="apfs-richtext__sep" aria-hidden="true" />
      <MarkButtons editor={editor} marks={PRIMARY_MARKS} />
      <button type="button" title="링크" aria-label="링크" aria-pressed={linkActive}
        className={'apfs-rt-btn' + (linkActive ? ' is-active' : '')}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => openLinkPrompt(editor, savedSel, setPUrl, setPMode)}>
        <LinkIcon size={16} strokeWidth={2} aria-hidden={true} />
      </button>
      <span className="apfs-richtext__sep" aria-hidden="true" />
      <MoreMarksDropdown onOpenChange={setDdOpen} />
    </div>
  );
}

// 노드 트리에서 id 전부 제거(복제 시 중복 id 방지 — NodeIdPlugin이 삽입 시 새 id 재부여).
function stripIds(node: any) {
  if (!node || typeof node !== 'object') return;
  delete node.id;
  if (Array.isArray(node.children)) node.children.forEach(stripIds);
}

// id로 노드 경로를 재귀 탐색(NodeIdPlugin이 블록에 id 부여). 중첩(목록/셀)까지 견고하게 해석.
function findPathById(nodes: any[], id: string, base: number[] = []): number[] | null {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n && n.id === id) return [...base, i];
    if (n && Array.isArray(n.children)) { const r = findPathById(n.children, id, [...base, i]); if (r) return r; }
  }
  return null;
}

// 블록 우클릭 컨텍스트 메뉴 — BlockSelectionPlugin 없이 우클릭한 블록에 직접 작동(복사/복제/삭제).
// Radix ContextMenu(Portal=레이어 분기)라 모달 위에 뜨고 DismissableLayer로 모달을 닫지 않는다.
function EditorContextMenu({ children }: { children: React.ReactNode }) {
  const editor = useEditorState();
  const targetPath = useRef<number[] | null>(null);
  // 표 안 우클릭이면 표 조작 섹션 노출(공식 Plate 표 컨텍스트 메뉴 대응). setState라 메뉴 렌더에 반영.
  const [ctxTable, setCtxTable] = useState(false);
  const ctxSel = useRef<any>(null);     // 우클릭 시점 selection 저장(다중 셀 선택 보존) — TableDropdown의 runWithSel과 동일 이유
  const merge = useTableMergeState();   // 병합/분할 가능 상태(현재 selection 반응형) — 훅 규칙상 항상 호출
  function onContextMenu(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const el = target?.closest?.('[data-block-id]');
    const id = el?.getAttribute('data-block-id');
    targetPath.current = id ? findPathById(editor.children as any[], id) : null;
    ctxSel.current = editor.selection;
    setCtxTable(!!target?.closest?.('table'));
  }
  // 표 트랜스폼 실행 — Radix 메뉴 열림/닫힘이 slate selection을 무너뜨리므로(병합이 no-op 되는 실측 버그),
  // 우클릭 시점에 저장한 selection을 복원 후 실행(runWithSel 패턴). 단 저장분이 stale(표 밖)일 수 있어
  // "표 안"일 때만 복원하고, 아니면 현재 selection 유지 → 그마저 표 밖이면 우클릭 블록(targetPath)으로 앵커.
  function runTableOp(fn: (e: any) => void) {
    // some(범위 내 노드 검색)로 판정 — above는 range 공통 조상(=table 자체)을 제외해 다중 셀 range에서 오탐(false).
    const inTable = (r: any) => { try { return !!r && !!(editor as any).api.some({ at: r, match: { type: 'table' } }); } catch { return false; } };
    editor.tf.focus();
    if (ctxSel.current && inTable(ctxSel.current)) { try { editor.tf.select(ctxSel.current); } catch { /* 경로 무효 시 무시 */ } }
    else if (!inTable(editor.selection) && targetPath.current) { try { editor.tf.select((editor as any).api.start(targetPath.current)); } catch { /* 경로 무효 시 무시 */ } }
    fn(editor);
  }
  function doCopy() {
    const p = targetPath.current; if (!p) return;
    const text = (editor as any).api.string(p) || '';
    try { navigator.clipboard?.writeText(text); } catch { /* 클립보드 미허용 무시 */ }
  }
  function doDuplicate() {
    const p = targetPath.current; if (!p) return;
    const node = (editor as any).api.node(p)?.[0]; if (!node) return;
    const clone = JSON.parse(JSON.stringify(node));
    stripIds(clone);  // 자기+중첩 자식의 id 전부 제거 → NodeIdPlugin이 새 id 재부여(중복 id 방지)
    const next = [...p.slice(0, -1), p[p.length - 1] + 1];
    editor.tf.insertNodes(clone, { at: next, select: true });
    editor.tf.focus();
  }
  function doDelete() {
    const p = targetPath.current; if (!p) return;
    editor.tf.removeNodes({ at: p });
    editor.tf.focus();
  }
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div onContextMenu={onContextMenu} className="apfs-rt-ctxwrap">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent onCloseAutoFocus={(e) => { e.preventDefault(); editor.tf.focus(); }}>
        <ContextMenuItem onSelect={doCopy}><Copy size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>복사</span></ContextMenuItem>
        <ContextMenuItem onSelect={doDuplicate}><CopyPlus size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>복제</span></ContextMenuItem>
        {ctxTable && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => runTableOp((e) => e.tf.insert.tableRow({ before: true }))}><ArrowUpToLine size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>행 위에 삽입</span></ContextMenuItem>
            <ContextMenuItem onSelect={() => runTableOp((e) => e.tf.insert.tableRow())}><ArrowDownToLine size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>행 아래에 삽입</span></ContextMenuItem>
            <ContextMenuItem onSelect={() => runTableOp((e) => e.tf.remove.tableRow())}><X size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>행 삭제</span></ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => runTableOp((e) => e.tf.insert.tableColumn({ before: true }))}><ArrowLeftToLine size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>열 왼쪽에 삽입</span></ContextMenuItem>
            <ContextMenuItem onSelect={() => runTableOp((e) => e.tf.insert.tableColumn())}><ArrowRightToLine size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>열 오른쪽에 삽입</span></ContextMenuItem>
            <ContextMenuItem onSelect={() => runTableOp((e) => e.tf.remove.tableColumn())}><X size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>열 삭제</span></ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem disabled={!merge?.canMerge} onSelect={() => runTableOp((e) => e.tf.table.merge())}><Combine size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>셀 병합</span></ContextMenuItem>
            <ContextMenuItem disabled={!(merge?.canSplit || canSplitCell(editor, ctxSel.current) || canSplitCell(editor))} onSelect={() => runTableOp((e) => e.tf.table.split())}><Ungroup size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>셀 분할</span></ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem danger onSelect={() => runTableOp((e) => e.tf.remove.table())}><Trash2 size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>표 삭제</span></ContextMenuItem>
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem danger onSelect={doDelete}><Trash2 size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>{ctxTable ? '블록 삭제' : '삭제'}</span></ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// 글꼴색/배경색 팔레트는 RichTextElements의 DOC_PALETTE(표 셀 배경과 공유)로 이동.
const PALETTE = DOC_PALETTE;
// 글자 크기 스테퍼 단계(공식 Plate 범위). 값은 px 숫자.
const FONT_SIZE_STEPS = [8, 9, 10, 12, 14, 16, 18, 24, 30, 36, 48, 60, 72, 96];
const FONT_FAMILIES = [
  { label: '기본',        v: '' },
  { label: 'Pretendard', v: 'Pretendard, sans-serif' },
  { label: '고딕(Sans)', v: 'system-ui, sans-serif' },
  { label: '명조(Serif)', v: 'Georgia, "Times New Roman", serif' },
  { label: '고정폭(Mono)', v: 'ui-monospace, "SFMono-Regular", monospace' },
];
const LINE_HEIGHTS = [{ label: '1.0', v: 1 }, { label: '1.15', v: 1.15 }, { label: '1.5', v: 1.5 }, { label: '2.0', v: 2 }];

// 드롭다운 커맨드 실행 — 열릴 때 저장한 선택을 복원하고 커맨드 실행 후 재포커스.
function runWithSel(editor: any, sel: any, fn: (e: any) => void) {
  editor.tf.focus();
  if (sel) { try { editor.tf.select(sel); } catch { /* 경로 무효 시 무시 */ } }
  fn(editor);
}

// 번호 목록 스타일 조회/적용 — list-classic엔 네이티브 listStyleType이 없어 최근접 ol 노드 속성으로 다룬다.
// currentOlStyle: 현재 selection이 ol 안이면 그 스타일(미설정 ol은 기본 decimal), 아니면 null(비활성).
function currentOlStyle(e: any): string | null {
  const ol = e.api.above({ match: { type: 'ol' } });
  return ol ? (ol[0].listStyleType || 'decimal') : null;
}
// applyOlStyle: 번호 목록이 아니면 먼저 ol로 전환한 뒤(토글로 경로가 바뀌므로 재조회) 최근접 ol에만 스타일을
// 실는다. match를 노드 동일성으로 못박아 중첩 ol/하위 노드에 잘못 꽂히지 않게 한다(at 경로만으론 부족).
function applyOlStyle(e: any, value: string) {
  if (!inNode(e, 'ol')) e.tf.ol.toggle();
  const ol = e.api.above({ match: { type: 'ol' } });
  if (ol) e.tf.setNodes({ listStyleType: value }, { at: ol[1], match: (n: any) => n === ol[0] });
}

// 글머리 목록 불릿 조회/적용 — ol과 동형. 미설정 ul은 기본 disc로 취급(Default 체크·is-active 구동).
function currentUlStyle(e: any): string | null {
  const ul = e.api.above({ match: { type: 'ul' } });
  return ul ? (ul[0].listStyleType || 'disc') : null;
}
function applyUlStyle(e: any, value: string) {
  if (!inNode(e, 'ul')) e.tf.ul.toggle();
  const ul = e.api.above({ match: { type: 'ul' } });
  if (ul) e.tf.setNodes({ listStyleType: value }, { at: ul[1], match: (n: any) => n === ul[0] });
}

// 다중 셀 선택 + 블록 전환 — 다중 셀 range에 목록/제목 토글을 그대로 실행하면 앵커 셀에만 적용됨(실측).
// 열림 시점의 셀 선택(플러그인 그리드 우선, 없으면 저장 selection에 걸친 td/th 스캔)을 셀별로 순회하며
// 셀 내부 전체를 선택해 개별 적용한다. 이미 대상 타입인 셀은 건너뜀(토글 API의 역전환 방지 = set 의미론).
// 단일 셀/표 밖이면 runWithSel과 동일 경로.
function getSelectedCellsSafe(editor: any): any[] {
  try { return (editor as any).getApi(TablePlugin).table.getSelectedCells() || []; } catch { return []; }
}
const LIST_KEYS = new Set(['ul', 'ol', 'taskList']);
// 현재 selection의 블록 상태를 targetKey로 전환 — 토글 API는 목록 wrapper를 unwrap하지 않으므로
// 목록 → 비목록 전환은 먼저 해당 목록을 토글 해제(p로 복귀)한 뒤 대상 타입을 적용한다(목록 → 목록은 토글이 직접 변환).
function applyTurnInto(editor: any, targetKey: string, fn: (e: any) => void, reselect?: () => void) {
  const cur = currentBlockKey(editor);
  if (cur === targetKey) return;
  if (LIST_KEYS.has(cur) && !LIST_KEYS.has(targetKey)) {
    (editor.tf as any)[cur].toggle();          // 목록 해제 → p
    reselect?.();                              // unwrap으로 경로가 변했을 수 있어 대상 범위 재선택
    if (targetKey === 'p') return;             // 본문이 목표면 해제만으로 완료
  }
  fn(editor);
}
function runTurnInto(editor: any, sel: any, savedCells: any[], targetKey: string, fn: (e: any) => void) {
  editor.tf.focus();
  if (sel) { try { editor.tf.select(sel); } catch { /* 경로 무효 시 무시 */ } }
  let cells = savedCells;
  if (cells.length <= 1 && sel) {
    try {
      cells = Array.from(editor.api.nodes({ at: sel, match: (n: any) => n.type === 'td' || n.type === 'th' }) as any).map((en: any) => en[0]);
    } catch { cells = savedCells; }
  }
  const paths = cells.map((c: any) => { try { return editor.api.findPath(c); } catch { return null; } }).filter(Boolean);
  if (paths.length > 1) {
    for (const p of paths) {
      try {
        const selectCell = () => editor.tf.select({ anchor: editor.api.start(p), focus: editor.api.end(p) });
        selectCell();
        applyTurnInto(editor, targetKey, fn, selectCell);
      } catch { /* 셀 소실 시 해당 셀 무시 */ }
    }
    try { editor.tf.select(editor.api.end(paths[paths.length - 1])); } catch { /* caret 정리 실패 무시 */ }
    return;
  }
  applyTurnInto(editor, targetKey, fn);
}

// canSplitCell(분할 게이트 — v53 canSplit 패키지 버그 우회)은 RichTextElements로 이동(표 캡션 툴바와 공유).

// 링크 URL 바 열기 — 고정 툴바·플로팅 툴바 공유. 선택을 savedSel에 저장(applyPrompt가 복원해 적용)하고 pMode='link'.
function openLinkPrompt(editor: any, savedSel: React.MutableRefObject<any>, setPUrl: (u: string) => void, setPMode: (m: PromptMode) => void) {
  savedSel.current = editor.selection;
  setPUrl((editor.api.node({ match: { type: 'a' } as any }) as any)?.[0]?.url || '');
  setPMode('link');
}

// Turn into 드롭다운 — 현재 블록 라벨 + 화살표. compact=플로팅 툴바용 축소, onOpenChange=플로팅 툴바 hide 억제 연동.
function BlockTypeDropdown({ compact, onOpenChange }: { compact?: boolean; onOpenChange?: (o: boolean) => void }) {
  const editor = useEditorState();
  const sel = useRef<any>(null);
  const cells = useRef<any[]>([]);  // 열림 시점 다중 셀 선택 스냅샷 — 메뉴 조작이 셀 선택 상태를 지울 수 있어 저장
  const curKey = currentBlockKey(editor);
  const cur = TURN_INTO.find((t) => t.key === curKey) || TURN_INTO[0];
  return (
    <DropdownMenu onOpenChange={(o) => { if (o) { sel.current = editor.selection; cells.current = getSelectedCellsSafe(editor); } onOpenChange?.(o); }}>
      <DropdownMenuTrigger asChild>
        <button type="button" className={'apfs-rt-turninto' + (compact ? ' apfs-rt-turninto--compact' : '')} title="블록 유형" aria-label={`블록 유형: ${cur.label}`}>
          <cur.Icon size={15} strokeWidth={2} aria-hidden={true} />
          <span className="apfs-rt-turninto__label">{cur.label}</span>
          <ChevronDown size={14} strokeWidth={2} aria-hidden={true} className="apfs-rt-turninto__chev" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => { e.preventDefault(); editor.tf.focus(); }}>
        {TURN_INTO.map((t) => (
          <DropdownMenuItem key={t.key} onSelect={() => runTurnInto(editor, sel.current, cells.current, t.key, t.run)}>
            <t.Icon size={16} strokeWidth={2} aria-hidden={true} />
            <span style={{ flex: 1 }}>{t.label}</span>
            {curKey === t.key && <Check size={15} strokeWidth={2.4} aria-hidden={true} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// More ⋯ 드롭다운 — 확장 마크(Kbd·형광펜·아래첨자·위첨자)를 접어 담는다. 고정·플로팅 툴바 공유.
// onOpenChange=플로팅 툴바 hide 억제 연동(열려 있는 동안 툴바 유지).
function MoreMarksDropdown({ onOpenChange }: { onOpenChange?: (o: boolean) => void }) {
  const editor = useEditorState();
  const sel = useRef<any>(null);
  return (
    <DropdownMenu onOpenChange={(o) => { if (o) sel.current = editor.selection; onOpenChange?.(o); }}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="apfs-rt-btn apfs-rt-btn--dd" title="추가 서식" aria-label="추가 서식">
          <MoreHorizontal size={16} strokeWidth={2} aria-hidden={true} />
          <ChevronDown size={12} strokeWidth={2} aria-hidden={true} className="apfs-rt-btn__chev" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => { e.preventDefault(); editor.tf.focus(); }}>
        {MORE_MARKS.map((b) => {
          const on = b.active(editor);
          return (
            <DropdownMenuItem key={b.key} onSelect={() => runWithSel(editor, sel.current, b.run)}>
              <b.Icon size={16} strokeWidth={2} aria-hidden={true} />
              <span style={{ flex: 1 }}>{b.title}</span>
              {on && <Check size={15} strokeWidth={2.4} aria-hidden={true} />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 삽입 드롭다운 — 표/콜아웃/다단/토글/날짜/수식/비디오/임베드/태그/구분선. 트리거는 '+ 삽입'.
// prompt 항목(비디오·임베드)은 URL 입력 바를 열도록 openPrompt 콜백 호출.
function InsertDropdown({ openPrompt, openFile }: { openPrompt: (m: 'video' | 'embed') => void; openFile: () => void }) {
  const editor = useEditorState();
  const sel = useRef<any>(null);
  return (
    <DropdownMenu onOpenChange={(o) => { if (o) sel.current = editor.selection; }}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="apfs-rt-turninto apfs-rt-turninto--insert" title="삽입" aria-label="삽입">
          <Plus size={15} strokeWidth={2.2} aria-hidden={true} />
          <span className="apfs-rt-turninto__label">삽입</span>
          <ChevronDown size={14} strokeWidth={2} aria-hidden={true} className="apfs-rt-turninto__chev" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => { e.preventDefault(); editor.tf.focus(); }}>
        {INSERT_ITEMS.map((t) => (
          <DropdownMenuItem key={t.key} onSelect={() => (t.prompt ? openPrompt(t.prompt) : t.action === 'file' ? openFile() : runWithSel(editor, sel.current, t.run!))}>
            <t.Icon size={16} strokeWidth={2} aria-hidden={true} />
            <span style={{ flex: 1 }}>{t.label}</span>
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

// 번호 목록 스타일 드롭다운 — ListOrdered 아이콘+chevron 트리거, 5종 번호 스타일 선택.
// 선택 시 번호 목록으로 만들고(아니면 토글) 최근접 ol에 listStyleType 지정. 현재 스타일에 체크 표시.
function OrderedListDropdown() {
  const editor = useEditorState();
  const sel = useRef<any>(null);
  const cur = currentOlStyle(editor);
  return (
    <DropdownMenu onOpenChange={(o) => { if (o) sel.current = editor.selection; }}>
      <DropdownMenuTrigger asChild>
        <button type="button" className={'apfs-rt-btn apfs-rt-btn--dd' + (cur ? ' is-active' : '')}
          title="번호 목록" aria-label={cur ? `번호 목록: ${cur}` : '번호 목록'} aria-pressed={!!cur}>
          <ListOrdered size={16} strokeWidth={2} aria-hidden={true} />
          <ChevronDown size={12} strokeWidth={2} aria-hidden={true} className="apfs-rt-btn__chev" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => { e.preventDefault(); editor.tf.focus(); }}>
        {OL_STYLES.map((s) => (
          <DropdownMenuItem key={s.key} onSelect={() => runWithSel(editor, sel.current, (ed) => applyOlStyle(ed, s.key))}>
            <span style={{ flex: 1 }}>{s.label}</span>
            {cur === s.key && <Check size={15} strokeWidth={2.4} aria-hidden={true} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 글머리 목록 불릿 드롭다운 — List 아이콘+chevron 트리거, 3종 불릿(Default/Circle/Square) 선택.
// 선택 시 글머리 목록으로 만들고(아니면 토글) 최근접 ul에 listStyleType 지정. 현재 불릿에 체크 표시.
function BulletedListDropdown() {
  const editor = useEditorState();
  const sel = useRef<any>(null);
  const cur = currentUlStyle(editor);
  return (
    <DropdownMenu onOpenChange={(o) => { if (o) sel.current = editor.selection; }}>
      <DropdownMenuTrigger asChild>
        <button type="button" className={'apfs-rt-btn apfs-rt-btn--dd' + (cur ? ' is-active' : '')}
          title="글머리 목록" aria-label={cur ? `글머리 목록: ${cur}` : '글머리 목록'} aria-pressed={!!cur}>
          <List size={16} strokeWidth={2} aria-hidden={true} />
          <ChevronDown size={12} strokeWidth={2} aria-hidden={true} className="apfs-rt-btn__chev" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => { e.preventDefault(); editor.tf.focus(); }}>
        {UL_STYLES.map((s) => (
          <DropdownMenuItem key={s.key} onSelect={() => runWithSel(editor, sel.current, (ed) => applyUlStyle(ed, s.key))}>
            <span style={{ flex: 1 }}>{s.label}</span>
            {cur === s.key && <Check size={15} strokeWidth={2.4} aria-hidden={true} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 색(글꼴/배경) 드롭다운 — 팔레트 스와치 그리드 + 제거.
function ColorDropdown({ mark, Icon, title }: { mark: 'color' | 'backgroundColor'; Icon: LucideIcon; title: string }) {
  const editor = useEditorState();
  const sel = useRef<any>(null);
  const [open, setOpen] = useState(false);
  const cur = (markOn(editor, mark) ? editor.api.marks()?.[mark] : null) as string | null;
  const pick = (fn: (e: any) => void) => { runWithSel(editor, sel.current, fn); setOpen(false); };
  return (
    <DropdownMenu open={open} onOpenChange={(o) => { if (o) sel.current = editor.selection; setOpen(o); }}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="apfs-rt-btn apfs-rt-btn--dd" title={title} aria-label={title}>
          <span className="apfs-rt-colorico"><Icon size={16} strokeWidth={2} aria-hidden={true} /><span className="apfs-rt-colorbar" style={{ background: cur || 'transparent' }} /></span>
          <ChevronDown size={12} strokeWidth={2} aria-hidden={true} className="apfs-rt-btn__chev" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => { e.preventDefault(); editor.tf.focus(); }}>
        <div className="apfs-rt-swatches" role="group" aria-label={title}>
          {PALETTE.map((c) => (
            <button key={c} type="button" className={'apfs-rt-swatch' + (cur === c ? ' is-sel' : '')} style={{ background: c }}
              title={c} aria-label={c} onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => pick((e) => e.tf[mark].addMark(c))} />
          ))}
        </div>
        <DropdownMenuItem onSelect={() => pick((e) => e.tf.removeMark(mark))}>
          <Minus size={15} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>색 제거</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 글꼴 서체 드롭다운.
function FontFamilyDropdown() {
  const editor = useEditorState();
  const sel = useRef<any>(null);
  const cur = markOn(editor, 'fontFamily') ? String(editor.api.marks()?.fontFamily) : '';
  return (
    <DropdownMenu onOpenChange={(o) => { if (o) sel.current = editor.selection; }}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="apfs-rt-btn apfs-rt-btn--dd" title="글꼴" aria-label="글꼴">
          <CaseSensitive size={17} strokeWidth={2} aria-hidden={true} />
          <ChevronDown size={12} strokeWidth={2} aria-hidden={true} className="apfs-rt-btn__chev" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => { e.preventDefault(); editor.tf.focus(); }}>
        {FONT_FAMILIES.map((f) => (
          <DropdownMenuItem key={f.label} onSelect={() => runWithSel(editor, sel.current, (e) => (f.v ? e.tf.fontFamily.addMark(f.v) : e.tf.removeMark('fontFamily')))}>
            <span style={{ flex: 1, fontFamily: f.v || 'inherit' }}>{f.label}</span>
            {(cur === f.v || (!cur && !f.v)) && <Check size={15} strokeWidth={2.4} aria-hidden={true} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 글자 크기 스테퍼 — 공식 Plate 룩(− 값 +). 현재 마크 없으면 기본 16. ±로 단계 이동, 값 클릭 시 기본 복원.
function FontSizeStepper() {
  const editor = useEditorState();
  const curPx = markOn(editor, 'fontSize') ? String(editor.api.marks()?.fontSize) : '';
  const curNum = parseInt(curPx, 10) || 16;
  const step = (dir: number) => {
    editor.tf.focus();
    const nums = FONT_SIZE_STEPS;
    let idx = nums.indexOf(curNum);
    if (idx === -1) {                              // 목록 밖 값 → 삽입 위치 기준 이동
      const gt = nums.findIndex((n) => n > curNum);
      idx = dir < 0 ? (gt <= 0 ? 0 : gt - 1) : (gt === -1 ? nums.length - 1 : gt);
    } else {
      idx = Math.max(0, Math.min(nums.length - 1, idx + dir));
    }
    (editor as any).tf.fontSize.addMark(nums[idx] + 'px');
    editor.tf.focus();
  };
  const reset = () => { editor.tf.focus(); (editor as any).tf.removeMark('fontSize'); editor.tf.focus(); };
  return (
    <span className="apfs-rt-fontsize" role="group" aria-label="글자 크기">
      <button type="button" className="apfs-rt-fontsize__btn" title="글자 크기 줄이기" aria-label="글자 크기 줄이기"
        onMouseDown={(e) => e.preventDefault()} onClick={() => step(-1)}><Minus size={14} strokeWidth={2.2} aria-hidden={true} /></button>
      <button type="button" className="apfs-rt-fontsize__val" title="기본 크기로" aria-label={`현재 글자 크기 ${curNum}, 클릭 시 기본`}
        onMouseDown={(e) => e.preventDefault()} onClick={reset}>{curNum}</button>
      <button type="button" className="apfs-rt-fontsize__btn" title="글자 크기 키우기" aria-label="글자 크기 키우기"
        onMouseDown={(e) => e.preventDefault()} onClick={() => step(1)}><Plus size={14} strokeWidth={2.2} aria-hidden={true} /></button>
    </span>
  );
}

// 표 드롭다운 — 공식 Plate 룩: 그리드 피커(8×8, hover=크기·클릭=삽입) + 행/열/셀/표 조작(플랫 메뉴).
// 표 밖 선택이면 조작 항목 disabled. 공식처럼 제어형 open으로 삽입 직후 명시적 닫기(비항목 클릭은 Radix가 안 닫음).
// useTableMergeState는 read-only 스토어 구독이라 렌더 루프 안전(write-back 훅 아님).
function TableDropdown() {
  const editor = useEditorState();
  const sel = useRef<any>(null);
  const [open, setOpen] = useState(false);
  const [grid, setGrid] = useState({ rows: 0, cols: 0 });
  const inTable = editor.api.some({ match: { type: 'table' } });
  const merge = useTableMergeState();
  const run = (fn: (e: any) => void) => runWithSel(editor, sel.current, fn);
  const pickerLabel = grid.rows && grid.cols ? `${grid.rows} × ${grid.cols}` : '표 삽입';
  return (
    <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (o) { sel.current = editor.selection; setGrid({ rows: 0, cols: 0 }); } }}>
      <DropdownMenuTrigger asChild>
        <button type="button" className={'apfs-rt-btn apfs-rt-btn--dd' + (inTable ? ' is-active' : '')} title="표" aria-label="표">
          <TableIcon size={16} strokeWidth={2} aria-hidden={true} />
          <ChevronDown size={12} strokeWidth={2} aria-hidden={true} className="apfs-rt-btn__chev" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => { e.preventDefault(); editor.tf.focus(); }}>
        {/* 그리드 피커 — 공식 TablePicker 이식(마우스무브로 N×M, 클릭 삽입) */}
        <div className="apfs-rt-tablepicker" role="button" tabIndex={0} aria-label={`표 삽입 크기 선택: ${pickerLabel}`}
          onMouseLeave={() => setGrid({ rows: 0, cols: 0 })}
          onKeyDown={(e) => { if (e.key === 'Enter' && grid.rows) { setOpen(false); run((ed) => ed.tf.insert.table({ rowCount: grid.rows, colCount: grid.cols }, { select: true })); } }}
          onClick={() => { if (grid.rows && grid.cols) { setOpen(false); run((ed) => ed.tf.insert.table({ rowCount: grid.rows, colCount: grid.cols }, { select: true })); } }}>
          <div className="apfs-rt-tablegrid" aria-hidden="true">
            {Array.from({ length: 64 }, (_, i) => {
              const r = Math.floor(i / 8), c = i % 8;
              return (
                <div key={i} className={'apfs-rt-tablegrid__cell' + (r < grid.rows && c < grid.cols ? ' is-on' : '')}
                  onMouseMove={() => { if (grid.rows !== r + 1 || grid.cols !== c + 1) setGrid({ rows: r + 1, cols: c + 1 }); }}
                  onClick={(e) => { e.stopPropagation(); setOpen(false); run((ed) => ed.tf.insert.table({ rowCount: r + 1, colCount: c + 1 }, { select: true })); }} />
              );
            })}
          </div>
          <div className="apfs-rt-tablegrid__size">{pickerLabel}</div>
        </div>
        <div className="apfs-rt-ddsep" role="separator" aria-hidden="true" />
        <DropdownMenuItem disabled={!inTable} onSelect={() => run((e) => e.tf.insert.tableRow({ before: true }))}>
          <ArrowUpToLine size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>행 위에 삽입</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!inTable} onSelect={() => run((e) => e.tf.insert.tableRow())}>
          <ArrowDownToLine size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>행 아래에 삽입</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!inTable} onSelect={() => run((e) => e.tf.remove.tableRow())}>
          <X size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>행 삭제</span>
        </DropdownMenuItem>
        <div className="apfs-rt-ddsep" role="separator" aria-hidden="true" />
        <DropdownMenuItem disabled={!inTable} onSelect={() => run((e) => e.tf.insert.tableColumn({ before: true }))}>
          <ArrowLeftToLine size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>열 왼쪽에 삽입</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!inTable} onSelect={() => run((e) => e.tf.insert.tableColumn())}>
          <ArrowRightToLine size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>열 오른쪽에 삽입</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!inTable} onSelect={() => run((e) => e.tf.remove.tableColumn())}>
          <X size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>열 삭제</span>
        </DropdownMenuItem>
        <div className="apfs-rt-ddsep" role="separator" aria-hidden="true" />
        <DropdownMenuItem disabled={!merge?.canMerge} onSelect={() => run((e) => e.tf.table.merge())}>
          <Combine size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>셀 병합</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!(merge?.canSplit || canSplitCell(editor, sel.current) || canSplitCell(editor))} onSelect={() => run((e) => e.tf.table.split())}>
          <Ungroup size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>셀 분할</span>
        </DropdownMenuItem>
        <div className="apfs-rt-ddsep" role="separator" aria-hidden="true" />
        <DropdownMenuItem danger disabled={!inTable} onSelect={() => run((e) => e.tf.remove.table())}>
          <Trash2 size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>표 삭제</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 줄 간격 드롭다운(블록 단위).
function LineHeightDropdown() {
  const editor = useEditorState();
  const sel = useRef<any>(null);
  const cur = (editor.api.block() as any)?.[0]?.lineHeight;
  return (
    <DropdownMenu onOpenChange={(o) => { if (o) sel.current = editor.selection; }}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="apfs-rt-btn apfs-rt-btn--dd" title="줄 간격" aria-label="줄 간격">
          <MoveVertical size={16} strokeWidth={2} aria-hidden={true} />
          <ChevronDown size={12} strokeWidth={2} aria-hidden={true} className="apfs-rt-btn__chev" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => { e.preventDefault(); editor.tf.focus(); }}>
        {LINE_HEIGHTS.map((lh) => (
          <DropdownMenuItem key={lh.label} onSelect={() => runWithSel(editor, sel.current, (e) => e.tf.lineHeight.setNodes(lh.v))}>
            <span style={{ flex: 1 }}>{lh.label}</span>{cur === lh.v && <Check size={15} strokeWidth={2.4} aria-hidden={true} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 문서 입출력 드롭다운 — 마크다운/HTML/JSON 내보내기·가져오기. getRoot=HTML export용 루트 DOM 접근자.
function DocIODropdown({ openImport, getRoot }: { openImport: (m: 'md' | 'html' | 'json') => void; getRoot: () => HTMLElement | null }) {
  const editor = useEditorState();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="apfs-rt-btn apfs-rt-btn--dd" title="문서 입출력" aria-label="문서 입출력">
          <FileDown size={16} strokeWidth={2} aria-hidden={true} />
          <ChevronDown size={12} strokeWidth={2} aria-hidden={true} className="apfs-rt-btn__chev" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => { e.preventDefault(); editor.tf.focus(); }}>
        <DropdownMenuItem onSelect={() => exportMarkdown(editor)}><FileText size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>마크다운 내보내기</span></DropdownMenuItem>
        <DropdownMenuItem onSelect={() => exportHtml(getRoot())}><FileCode2 size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>HTML 내보내기</span></DropdownMenuItem>
        <DropdownMenuItem onSelect={() => exportJson(editor)}><Braces size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>JSON 내보내기</span></DropdownMenuItem>
        <div className="apfs-rt-ddsep" role="separator" />
        <DropdownMenuItem onSelect={() => openImport('md')}><FileUp size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>마크다운 가져오기</span></DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openImport('html')}><FileUp size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>HTML 가져오기</span></DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openImport('json')}><FileUp size={16} strokeWidth={2} aria-hidden={true} /><span style={{ flex: 1 }}>JSON 가져오기</span></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 텍스트를 파일로 다운로드(백엔드 없음, blob URL).
function downloadText(name: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
// 마크다운 내보내기 — editor.api.markdown.serialize()로 직렬화.
function exportMarkdown(editor: any) {
  let md = '';
  try { md = editor.api.markdown.serialize(); } catch { md = ''; }
  downloadText('내용.md', md, 'text/markdown');
}
// JSON 내보내기 — 저장값 계약이 Slate JSON이므로 editor.children를 그대로 직렬화.
function exportJson(editor: any) {
  downloadText('내용.json', JSON.stringify(editor.children, null, 2), 'application/json');
}
// HTML 내보내기 — 렌더된 contenteditable(data-slate-editor)을 클론해 편집 chrome을 제거한 뒤 직렬화.
// serializeHtml(async+PlateStatic)은 헤드리스 커스텀 노드에서 불안정 → DOM 직렬화가 결정적.
// DnD 래퍼/드래그핸들/편집 오버레이/슬레이트 속성을 벗겨 깨끗한 시맨틱 HTML만 남긴다.
function exportHtml(root: HTMLElement | null) {
  const editable = root?.querySelector('[data-slate-editor]') as HTMLElement | null;
  if (!editable) { downloadText('내용.html', '', 'text/html'); return; }
  const clone = editable.cloneNode(true) as HTMLElement;
  // 편집 UI chrome 제거(드래그핸들·드롭라인·이미지/표 편집 툴바·수식 입력·캡션 placeholder textarea).
  clone.querySelectorAll('.apfs-rt-draghandle, .apfs-rt-dropline, .apfs-rt-imgbar, .apfs-rt-tablebar, .apfs-rt-eqinput, .apfs-rt-ieq__pop').forEach((n) => n.remove());
  // DnD 래퍼 div 언랩(.apfs-rt-blockdrag > .apfs-rt-blockdrag__content > 실제 블록).
  clone.querySelectorAll('.apfs-rt-blockdrag__content, .apfs-rt-blockdrag').forEach((w) => { const p = w.parentNode; if (p) { while (w.firstChild) p.insertBefore(w.firstChild, w); p.removeChild(w); } });
  // 편집 전용 속성 제거.
  clone.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((a) => { if (a.name === 'contenteditable' || a.name === 'draggable' || a.name.startsWith('data-slate') || a.name.startsWith('data-block')) el.removeAttribute(a.name); });
  });
  // 인라인 --rt-marker-*는 클론에 보존되므로, 리셋+::marker 규칙만 넣으면 내보낸 HTML 단독으로도 마커 서식(크기·bold·italic·색)이 재현된다(중첩 누수 방지 포함).
  const doc = `<!doctype html>\n<html lang="ko">\n<head><meta charset="utf-8"><title>내용</title><style>li{--rt-marker-fs:1em;--rt-marker-fw:normal;--rt-marker-fst:normal;--rt-marker-color:currentColor}li::marker{font-size:var(--rt-marker-fs,1em);font-weight:var(--rt-marker-fw,normal);font-style:var(--rt-marker-fst,normal);color:var(--rt-marker-color,currentColor)}</style></head>\n<body>\n${clone.innerHTML}\n</body>\n</html>\n`;
  downloadText('내용.html', doc, 'text/html');
}
// 문서 전체 교체(가져오기) — 파싱 결과 노드를 setValue로 치환. 파서 실패 시 무시.
// 가져온 문서(HTML/MD/JSON)의 표 셀도 정규화(비정규 셀이면 병합 트랜스폼이 크래시).
function replaceValue(editor: any, nodes: any) {
  if (Array.isArray(nodes) && nodes.length) { editor.tf.setValue(normalizeTableCells(nodes)); editor.tf.focus(); }
}
function importMarkdown(editor: any, text: string) {
  try { replaceValue(editor, editor.api.markdown.deserialize(text)); } catch { /* 파싱 실패 무시 */ }
}
function importHtml(editor: any, text: string) {
  try {
    const body = new DOMParser().parseFromString(text, 'text/html').body;
    replaceValue(editor, editor.api.html.deserialize({ element: body }));
  } catch { /* 파싱 실패 무시 */ }
}
function importJson(editor: any, text: string) {
  try { replaceValue(editor, JSON.parse(text)); } catch { /* 파싱 실패 무시 */ }
}

// 클라이언트 전용 업로드 — base64가 저장값에 인라인되므로 크기 상한을 둔다(백엔드 없음).
const UPLOAD_MAX_BYTES = 1024 * 1024; // 1MB
function humanSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB';
  return (bytes / 1024 / 1024).toFixed(1) + 'MB';
}

type PromptMode = null | 'link' | 'image' | 'video' | 'embed';

// 툴바 — <Plate> 자식이라 useEditorState()로 매 변경 재렌더 → active 상태 동기 반영.
function Toolbar({ pMode, setPMode, pUrl, setPUrl, rootRef, savedSel }: {
  pMode: PromptMode; setPMode: (m: PromptMode) => void; pUrl: string; setPUrl: (u: string) => void;
  rootRef: React.RefObject<HTMLDivElement | null>; savedSel: React.MutableRefObject<any>;
}) {
  const editor = useEditorState();
  const imgUploadRef = useRef<HTMLInputElement>(null);
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const importModeRef = useRef<'md' | 'html' | 'json'>('md');
  const [uploadErr, setUploadErr] = useState('');
  const canUndo = !!editor.history?.undos?.length;
  const canRedo = !!editor.history?.redos?.length;
  const linkActive = inNode(editor, 'a');
  const imageActive = inNode(editor, 'img');

  function openLink() { openLinkPrompt(editor, savedSel, setPUrl, setPMode); }
  function openImage() { savedSel.current = editor.selection; setPUrl(''); setPMode('image'); }
  function openMedia(m: 'video' | 'embed') { savedSel.current = editor.selection; setPUrl(''); setPMode(m); }
  function closeBar() { setPMode(null); editor.tf.focus(); }
  function applyPrompt() {
    const url = pUrl.trim();
    if (savedSel.current) editor.tf.select(savedSel.current);
    if (pMode === 'link') { if (url) upsertLink(editor, { url }); else unwrapLink(editor); }
    else if (pMode === 'image' && url) { insertImage(editor, url); }
    else if (pMode === 'video' && url) { editor.tf.insertNodes([{ type: 'video', url, children: [{ text: '' }] }, { type: 'p', children: [{ text: '' }] }] as any, { select: true }); }
    else if (pMode === 'embed' && url) { insertMediaEmbed(editor, { url }); }
    setPMode(null);
    editor.tf.focus();
  }
  // 클라이언트 업로드 — base64 인라인 전 크기 상한 강제(백엔드 없음).
  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length) {
      const over = Array.from(files).find((f) => f.size > UPLOAD_MAX_BYTES);
      if (over) setUploadErr(`이미지가 너무 큽니다(${humanSize(over.size)}). 최대 ${humanSize(UPLOAD_MAX_BYTES)}까지 업로드할 수 있습니다.`);
      else { setUploadErr(''); insertImageFromFiles(editor, files); editor.tf.focus(); }
    }
    e.target.value = '';
  }
  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > UPLOAD_MAX_BYTES) setUploadErr(`파일이 너무 큽니다(${humanSize(f.size)}). 최대 ${humanSize(UPLOAD_MAX_BYTES)}까지 첨부할 수 있습니다.`);
      else {
        setUploadErr('');
        const r = new FileReader();
        r.onload = () => {
          editor.tf.insertNodes([{ type: 'file', url: String(r.result), name: f.name, size: humanSize(f.size), children: [{ text: '' }] }, { type: 'p', children: [{ text: '' }] }] as any, { select: true });
          editor.tf.focus();
        };
        r.readAsDataURL(f);
      }
    }
    e.target.value = '';
  }
  // 문서 가져오기 — 포맷별 파서로 파싱 후 전체 교체(setValue). 파일 선택 트리거는 DocIODropdown.
  function openImport(mode: 'md' | 'html' | 'json') { importModeRef.current = mode; importRef.current?.click(); }
  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      const r = new FileReader();
      const mode = importModeRef.current;
      r.onload = () => {
        const text = String(r.result || '');
        if (mode === 'md') importMarkdown(editor, text);
        else if (mode === 'html') importHtml(editor, text);
        else importJson(editor, text);
      };
      r.readAsText(f);
    }
    e.target.value = '';
  }
  const importAccept = '.md,.markdown,.html,.htm,.json,.txt';
  const promptLabel = pMode === 'image' ? '이미지 URL' : pMode === 'video' ? '비디오 URL' : pMode === 'embed' ? '임베드 URL(YouTube 등)' : '링크 URL';
  const promptPlaceholder = pMode === 'image' ? 'https://…/image.png' : pMode === 'video' ? 'https://…/video.mp4' : pMode === 'embed' ? 'https://youtube.com/watch?v=…' : 'https://example.com';

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

        {/* Turn into · 삽입 — 블록 타입/노드 삽입 드롭다운 */}
        <span className="apfs-richtext__sep" aria-hidden="true" />
        <BlockTypeDropdown />
        <InsertDropdown openPrompt={openMedia} openFile={() => fileUploadRef.current?.click()} />

        {/* 인라인 마크(굵게~인라인코드) + 확장 마크는 More ⋯ 드롭다운으로 접기 */}
        <span className="apfs-richtext__sep" aria-hidden="true" />
        <MarkButtons editor={editor} marks={PRIMARY_MARKS} />
        <MoreMarksDropdown />

        {/* 글꼴 — 서체·색·배경색·크기 */}
        <span className="apfs-richtext__sep" aria-hidden="true" />
        <FontSizeStepper />
        <FontFamilyDropdown />
        <ColorDropdown mark="color" Icon={Baseline} title="글자 색" />
        <ColorDropdown mark="backgroundColor" Icon={PaintBucket} title="배경 색" />

        {/* 문단 — 글머리/번호목록 스타일·정렬·줄간격·들여쓰기 */}
        <span className="apfs-richtext__sep" aria-hidden="true" />
        <BulletedListDropdown />
        <OrderedListDropdown />
        <AlignDropdown />
        <LineHeightDropdown />
        <button type="button" title="내어쓰기" aria-label="내어쓰기" className="apfs-rt-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { outdent(editor); editor.tf.focus(); }}><IndentDecrease size={16} strokeWidth={2} aria-hidden={true} /></button>
        <button type="button" title="들여쓰기" aria-label="들여쓰기" className="apfs-rt-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { indent(editor); editor.tf.focus(); }}><IndentIncrease size={16} strokeWidth={2} aria-hidden={true} /></button>

        {/* 삽입 — 링크/이미지(인라인 URL 바 토글). 링크는 제거 버튼도 제공. */}
        <span className="apfs-richtext__sep" aria-hidden="true" />
        <button type="button" title="링크" aria-label="링크" aria-pressed={linkActive || pMode === 'link'}
          className={'apfs-rt-btn' + (linkActive || pMode === 'link' ? ' is-active' : '')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (pMode === 'link' ? closeBar() : openLink())}><LinkIcon size={16} strokeWidth={2} aria-hidden={true} /></button>
        <button type="button" title="링크 제거" aria-label="링크 제거" className="apfs-rt-btn"
          disabled={!linkActive} onMouseDown={(e) => e.preventDefault()}
          onClick={() => { unwrapLink(editor); editor.tf.focus(); }}><Unlink size={16} strokeWidth={2} aria-hidden={true} /></button>
        <button type="button" title="이미지 URL" aria-label="이미지 URL" aria-pressed={imageActive || pMode === 'image'}
          className={'apfs-rt-btn' + (imageActive || pMode === 'image' ? ' is-active' : '')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (pMode === 'image' ? closeBar() : openImage())}><ImageIcon size={16} strokeWidth={2} aria-hidden={true} /></button>
        <button type="button" title="이미지 업로드" aria-label="이미지 업로드" className="apfs-rt-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => imgUploadRef.current?.click()}><ImagePlus size={16} strokeWidth={2} aria-hidden={true} /></button>
        <TableDropdown />

        {/* 문서 입출력 — 마크다운/HTML/JSON 내보내기·가져오기(백엔드 없음, 클라이언트 blob). */}
        <span className="apfs-richtext__sep" aria-hidden="true" />
        <DocIODropdown openImport={openImport} getRoot={() => rootRef.current} />
      </div>

      {/* 숨은 파일 선택 input — 이미지 업로드 / 파일 첨부. base64 인라인 전 크기 상한 검증. */}
      <input ref={imgUploadRef} type="file" accept="image/*" multiple hidden onChange={onPickImage} />
      <input ref={fileUploadRef} type="file" hidden onChange={onPickFile} />
      <input ref={importRef} type="file" accept={importAccept} hidden onChange={onImportFile} />
      {uploadErr && (
        <div className="apfs-richtext__uploaderr" role="alert">
          {uploadErr}
          <button type="button" className="apfs-rt-linkbtn is-ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => setUploadErr('')}>닫기</button>
        </div>
      )}

      {/* URL 입력 바(링크·이미지 공용) — 텍스트 입력이라 mousedown preventDefault를 걸지 않는다. */}
      {pMode && (
        <div className="apfs-richtext__linkbar">
          <input
            type="url" className="apfs-rt-linkinput" autoFocus
            aria-label={promptLabel}
            placeholder={promptPlaceholder}
            value={pUrl}
            onChange={(e) => setPUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); applyPrompt(); }
              if (e.key === 'Escape') { e.preventDefault(); closeBar(); }
            }}
          />
          <button type="button" className="apfs-rt-linkbtn" onMouseDown={(e) => e.preventDefault()} onClick={applyPrompt}>
            {pMode === 'link' ? '적용' : '삽입'}
          </button>
          <button type="button" className="apfs-rt-linkbtn is-ghost" onMouseDown={(e) => e.preventDefault()} onClick={closeBar}>취소</button>
        </div>
      )}
    </>
  );
}

// required: 필수 필드 상시 표식 — 컨테이너 테두리만 danger(is-required). aria-required로 접근성 표기.
export function RichTextField({ value, onChange, label, required }: { value: string; onChange: (v: string) => void; label?: string; required?: boolean }) {
  const [pMode, setPMode] = useState<PromptMode>(null);
  const [pUrl, setPUrl] = useState('');
  const lastEmitted = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);  // HTML 내보내기 시 렌더된 편집영역 DOM 접근용
  const savedSel = useRef<any>(null);            // 링크 URL 바 열 때 선택 저장(고정·플로팅 툴바 공유)

  const editor = usePlateEditor({
    plugins: PLUGINS,
    components: ALL_COMPONENTS,
    value: (ed) => toInitialValue(ed as PlateEditor, value),
  });

  // 변경 → 직렬화. 진짜 빈 문서(텍스트 공백뿐 + 원자 노드 없음)면 '' 방출(required 검증 정상화).
  function handleChange({ value: v }: { value: any }) {
    const text = ((editor as any).api.string([]) || '').trim();
    const empty = text === '' && !hasAtomicNode(v);
    const next = empty ? '' : JSON.stringify(v);
    if (next === lastEmitted.current) return;
    lastEmitted.current = next;
    onChange(next);
  }

  return (
    <div ref={rootRef} className={'apfs-richtext' + (required ? ' is-required' : '')}>
      <Plate editor={editor} onChange={handleChange}>
        <Toolbar pMode={pMode} setPMode={setPMode} pUrl={pUrl} setPUrl={setPUrl} rootRef={rootRef} savedSel={savedSel} />
        <EditorContextMenu>
          <PlateContent
            className="apfs-prose"
            role="textbox"
            aria-multiline="true"
            aria-label={label || '내용'}
            aria-required={required ? true : undefined}
          />
        </EditorContextMenu>
        <FloatingMarkToolbar savedSel={savedSel} setPMode={setPMode} setPUrl={setPUrl} />
      </Plate>
    </div>
  );
}
