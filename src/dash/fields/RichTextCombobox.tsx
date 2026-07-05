/* RichTextCombobox — 멘션(@)·슬래시(/) 인라인 콤보박스의 input-element 컴포넌트.
   트리거가 삽입한 mention_input/slash_input 노드를 앵커로 InlineCombobox(리스트)를 띄운다.
   COMPONENTS에 mention_input/slash_input로 등록(RichTextField에서 병합). 순환 import 방지 위해 슬래시 액션·
   멘션 목록을 여기서 직접 정의(insert 헬퍼를 직접 import). */
import * as React from 'react';
import { PlateElement } from 'platejs/react';
import { getMentionOnSelectItem } from '@platejs/mention';
import { EmojiInlineIndexSearch, insertEmoji } from '@platejs/emoji';
import emojiMartData from '@emoji-mart/data';
import { insertTable } from '@platejs/table';
import { insertCallout } from '@platejs/callout';
import { insertColumnGroup } from '@platejs/layout';
import { insertDate } from '@platejs/date';
import { insertEquation } from '@platejs/math';
import { toggleCodeBlock } from '@platejs/code-block';
import {
  Heading1, Heading2, Heading3, List, ListOrdered, TextQuote, SquareCode,
  Table as TableIcon, Info, Columns3, CalendarDays, Sigma, Minus, type LucideIcon,
} from 'lucide-react';
import {
  InlineCombobox, InlineComboboxContent, InlineComboboxEmpty, InlineComboboxInput, InlineComboboxItem,
} from '../ui/inline-combobox';

// 멘션 대상(도메인 표본) — 실데이터 연동 전 정적 목록. GP 운용사·자펀드·직무 등.
// (백엔드/데이터소스 없음 → APFS 도메인 대표 엔티티를 표본으로. 실연동 시 APFS_DATA에서 주입.)
type MentionItem = { key: string; text: string };
const MENTION_ITEMS: MentionItem[] = [
  { key: 'gp-1', text: '한국벤처투자' },
  { key: 'gp-2', text: '농업정책보험금융원' },
  { key: 'gp-3', text: '유니온투자파트너스' },
  { key: 'gp-4', text: 'IBK캐피탈' },
  { key: 'gp-5', text: '나우아이비캐피탈' },
  { key: 'fund-1', text: '농식품모태펀드' },
  { key: 'fund-2', text: '스마트팜 전문펀드' },
  { key: 'fund-3', text: '청년농업인 펀드' },
  { key: 'role-1', text: '투자운용본부' },
  { key: 'role-2', text: '리스크관리팀' },
  { key: 'role-3', text: '회계결산팀' },
];

const onSelectMention = getMentionOnSelectItem();

// 한글(CJK) 대응 필터 — 기본 filterWords는 공백 단어경계 기반이라 띄어쓰기 없는 한글 부분매칭이 약하다.
// value/label/keywords를 합쳐 부분일치(includes)로 판정.
const cjkFilter = (item: { value: string; group?: string; keywords?: string[]; label?: string }, search: string) => {
  if (!search) return true;
  const s = search.toLowerCase();
  const hay = [item.value, item.label, ...(item.keywords || [])].filter(Boolean).join(' ').toLowerCase();
  return hay.includes(s);
};

// 멘션 input — '@' 트리거가 삽입한 mention_input 노드. 선택 시 mention 노드로 치환.
// 공식 패턴: showTrigger=false(트리거 '@'는 이미 소비), 제어형 value/setValue(search)로 선택 시 쿼리 제거·정위치 삽입.
export function MentionInputElement(props: any) {
  const { editor, element } = props;
  const [search, setSearch] = React.useState('');
  return (
    <PlateElement as="span" {...props}>
      <InlineCombobox value={search} element={element} setValue={setSearch} filter={cjkFilter} showTrigger={false} trigger="@">
        <span className="apfs-rt-mentioninput">
          <InlineComboboxInput />
        </span>
        <InlineComboboxContent>
          <InlineComboboxEmpty>일치하는 대상 없음</InlineComboboxEmpty>
          {MENTION_ITEMS.map((item) => (
            <InlineComboboxItem key={item.key} value={item.text} onClick={() => onSelectMention(editor, item, search)}>
              {item.text}
            </InlineComboboxItem>
          ))}
        </InlineComboboxContent>
      </InlineCombobox>
      {props.children}
    </PlateElement>
  );
}

// 이모지 input — ':' 트리거가 삽입한 emoji_input 노드. EmojiInlineIndexSearch로 검색(디바운스), 선택 시 insertEmoji.
function useDebounce<T>(value: T, delay: number): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}
const TRAILING_COLON = /:$/;
export function EmojiInputElement(props: any) {
  const { editor, element } = props;
  const [value, setValue] = React.useState('');
  const debounced = useDebounce(value, 100);
  const isPending = value !== debounced;
  const emojis = React.useMemo(() => {
    if (debounced.trim().length === 0) return [];
    try { return EmojiInlineIndexSearch.getInstance(emojiMartData as any).search(debounced.replace(TRAILING_COLON, '')).get(); }
    catch { return []; }
  }, [debounced]);
  return (
    <PlateElement as="span" {...props}>
      <InlineCombobox value={value} element={element} filter={false} setValue={setValue} trigger=":" hideWhenNoValue>
        <InlineComboboxInput />
        <InlineComboboxContent>
          {!isPending && <InlineComboboxEmpty>이모지 없음</InlineComboboxEmpty>}
          {emojis.map((emoji: any) => (
            <InlineComboboxItem key={emoji.id} value={emoji.name} onClick={() => insertEmoji(editor, emoji)}>
              {emoji.skins[0].native} {emoji.name}
            </InlineComboboxItem>
          ))}
        </InlineComboboxContent>
      </InlineCombobox>
      {props.children}
    </PlateElement>
  );
}

// 슬래시 커맨드 항목 — 블록 변환 + 노드 삽입(툴바 '삽입'과 동일 액션). 선택 시 input 제거 후 액션 실행.
type SlashItem = { key: string; label: string; Icon: LucideIcon; keywords?: string[]; run: (e: any) => void };
function insertHr(e: any) { e.tf.insertNodes([{ type: 'hr', children: [{ text: '' }] }, { type: 'p', children: [{ text: '' }] }], { select: true }); }
const SLASH_ITEMS: SlashItem[] = [
  { key: 'h1', label: '제목 1', Icon: Heading1, keywords: ['heading', 'title', '제목'], run: (e) => e.tf.h1.toggle() },
  { key: 'h2', label: '제목 2', Icon: Heading2, keywords: ['heading', '제목'], run: (e) => e.tf.h2.toggle() },
  { key: 'h3', label: '제목 3', Icon: Heading3, keywords: ['heading', '제목'], run: (e) => e.tf.h3.toggle() },
  { key: 'ul', label: '글머리 목록', Icon: List, keywords: ['bullet', 'list', '목록'], run: (e) => e.tf.ul.toggle() },
  { key: 'ol', label: '번호 목록', Icon: ListOrdered, keywords: ['number', 'list', '목록'], run: (e) => e.tf.ol.toggle() },
  { key: 'blockquote', label: '인용', Icon: TextQuote, keywords: ['quote', '인용'], run: (e) => e.tf.blockquote.toggle() },
  { key: 'code_block', label: '코드 블록', Icon: SquareCode, keywords: ['code', '코드'], run: (e) => toggleCodeBlock(e) },
  { key: 'table', label: '표', Icon: TableIcon, keywords: ['table', '표'], run: (e) => insertTable(e, { rowCount: 3, colCount: 3, header: true }) },
  { key: 'callout', label: '콜아웃', Icon: Info, keywords: ['callout', 'note', '알림'], run: (e) => insertCallout(e, { variant: 'info' }) },
  { key: 'columns', label: '2단 레이아웃', Icon: Columns3, keywords: ['column', '단'], run: (e) => insertColumnGroup(e, { columns: 2 }) },
  { key: 'date', label: '날짜', Icon: CalendarDays, keywords: ['date', '날짜'], run: (e) => insertDate(e) },
  { key: 'equation', label: '수식 블록', Icon: Sigma, keywords: ['math', 'equation', '수식'], run: (e) => insertEquation(e) },
  { key: 'hr', label: '구분선', Icon: Minus, keywords: ['divider', 'rule', '구분'], run: (e) => insertHr(e) },
];

// 슬래시 input — '/' 트리거가 삽입한 slash_input 노드. 선택 시 input 제거(InlineComboboxItem) 후 액션 실행.
export function SlashInputElement(props: any) {
  const { editor, element } = props;
  const [search, setSearch] = React.useState('');
  return (
    <PlateElement as="span" {...props}>
      <InlineCombobox value={search} element={element} setValue={setSearch} filter={cjkFilter} trigger="/">
        <InlineComboboxInput />
        <InlineComboboxContent>
          <InlineComboboxEmpty>명령 없음</InlineComboboxEmpty>
          {SLASH_ITEMS.map((item) => (
            <InlineComboboxItem key={item.key} value={item.label} keywords={item.keywords} onClick={() => item.run(editor)}>
              <item.Icon />
              <span style={{ marginLeft: 8 }}>{item.label}</span>
            </InlineComboboxItem>
          ))}
        </InlineComboboxContent>
      </InlineCombobox>
      {props.children}
    </PlateElement>
  );
}
