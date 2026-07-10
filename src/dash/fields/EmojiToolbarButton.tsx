/* EmojiToolbarButton — Plate(platejs v53) 리치텍스트 툴바의 이모지 피커 버튼.
   스마일 아이콘 클릭 → [검색바 + 카테고리 탭 + 이모지 그리드] Popover 패널 → 이모지 클릭 시 caret에 삽입.
   (이 파일과 별개로 RichTextCombobox의 ':' 트리거 인라인 콤보박스(EmojiInputElement)가 이미 존재 — 그건 별개다.)
   ── 엔진 ──
   @platejs/emoji/react의 useEmojiDropdownMenuState({closeOnSelect})가 검색/카테고리/그리드 상태 전부를
   emojiPickerState로 반환한다. 이 훅이 내부에서 useEmojiPicker를 이미 호출하므로(=emojiPickerState가 그 출력),
   패널은 useEmojiPicker를 다시 부르지 않고 props를 그대로 소비한다(재호출 시 indexSearch=undefined 크래시 +
   래핑한 onSelectEmoji가 그림자에 가려짐).
   ── saved-selection 트랩 ──
   피커를 열면 포커스가 검색 input으로 가서 editor.selection이 빠진다. 열림 시점(onOpenChange o===true)에
   savedSel에 selection을 저장하고, 삽입 직전 editor.tf.focus()+select(savedSel)로 복원한 뒤 삽입한다(runWithSel 사상).
   ── 렌더 루프 안전 ──
   useEmojiPicker는 useEditorRef 기반(매 변경 리렌더 아님)+패널은 open일 때만 마운트+자체 로컬 reducer라
   읽기전용 구독 계열로 안전(플로팅 툴바/컨텍스트 메뉴 동급). editor value에 매 렌더 write-back 금지.
   ── visibleCategories ──
   초기값은 빈 Map이고 SET_OPEN이 채우지 않는다(채우는 건 IntersectionObserver=미배선). 따라서 그리드는
   visibleCategories로 거르지 않고 전체 섹션을 무조건 렌더하며, focusedCategory는 활성 탭 하이라이트에만 쓴다.
   스크롤 하이라이트(observeCategories)는 이번 범위 밖 — 카테고리 클릭 스크롤만 배선(refs.contentRoot + section.root). */
import React from 'react';
import { useEditorState } from 'platejs/react';
import { useEmojiDropdownMenuState } from '@platejs/emoji/react';
import { Smile, Search, X, Clock, Leaf, Coffee, Bike, Plane, Lightbulb, Hash, Flag, Star } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';

// 카테고리 id → lucide 아이콘(대표 매핑). 없는 카테고리는 Smile 폴백.
const CAT_ICON: Record<string, React.ComponentType<any>> = {
  frequent: Clock, people: Smile, nature: Leaf, foods: Coffee,
  activity: Bike, places: Plane, objects: Lightbulb, symbols: Hash, flags: Flag, custom: Star,
};
const CAT_LABEL: Record<string, string> = {
  frequent: '자주 사용', people: '스마일리 & 사람', nature: '동물 & 자연', foods: '음식 & 음료',
  activity: '활동', places: '여행 & 장소', objects: '사물', symbols: '기호', flags: '깃발', custom: '커스텀',
};

// 개별 이모지 셀 — 클릭 시 래핑된 select(선택 복원 포함) 실행.
function EmojiCell({ emoji, onSelect, onMouseOver }: {
  emoji: any; onSelect: (e: any) => void; onMouseOver?: (e?: any) => void;
}) {
  const native = emoji?.skins?.[0]?.native;
  return (
    <button type="button" className="apfs-rt-emoji__cell" role="gridcell"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(emoji)}
      onMouseEnter={() => onMouseOver && onMouseOver(emoji)}
      title={emoji?.name} aria-label={emoji?.name}>
      <span aria-hidden={true}>{native}</span>
    </button>
  );
}

// 프레젠테이셔널 패널 — emojiPickerState props를 그대로 소비(훅 재호출 금지). onSelectEmoji만 래핑분으로 대체.
function EmojiPickerPanel(props: any) {
  const {
    emojiLibrary, searchValue, setSearch, clearSearch, isSearching, searchResult,
    focusedCategory, handleCategoryClick, onSelectEmoji, onMouseOver, i18n, refs,
  } = props;
  const sections = emojiLibrary.getGrid().sections();

  return (
    <div className="apfs-rt-emoji__panel" role="dialog" aria-label="이모지 선택">
      {/* 검색 */}
      <div className="apfs-rt-emoji__search">
        <Search size={14} strokeWidth={2} aria-hidden={true} className="apfs-rt-emoji__search-ico" />
        <input type="text" className="apfs-rt-emoji__input" value={searchValue}
          onChange={(e) => setSearch(e.target.value)} placeholder="이모지 검색" aria-label="이모지 검색" />
        {searchValue ? (
          <button type="button" className="apfs-rt-emoji__clear" onClick={() => clearSearch()}
            onMouseDown={(e) => e.preventDefault()} title="지우기" aria-label="검색어 지우기">
            <X size={14} strokeWidth={2} aria-hidden={true} />
          </button>
        ) : null}
      </div>

      {/* 카테고리 탭 */}
      <div className="apfs-rt-emoji__tabs" role="tablist" aria-label="이모지 카테고리">
        {sections.map((section: any) => {
          const Ico = CAT_ICON[section.id] || Smile;
          const active = focusedCategory === section.id;
          const label = CAT_LABEL[section.id] || i18n?.categories?.[section.id] || section.id;
          return (
            <button key={section.id} type="button" role="tab" aria-selected={active}
              className={'apfs-rt-emoji__tab' + (active ? ' is-active' : '')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCategoryClick(section.id)}
              title={label} aria-label={label}>
              <Ico size={16} strokeWidth={2} aria-hidden={true} />
            </button>
          );
        })}
      </div>

      {/* 그리드(세로 스크롤 컨테이너 = refs.contentRoot; 각 섹션 = section.root — handleCategoryClick 스크롤용) */}
      <div className="apfs-rt-emoji__scroll" ref={refs.current.contentRoot}>
        {isSearching ? (
          searchResult && searchResult.length ? (
            <div className="apfs-rt-emoji__section">
              <div className="apfs-rt-emoji__grid" role="grid">
                {searchResult.map((emoji: any) => (
                  <EmojiCell key={emoji.id} emoji={emoji} onSelect={onSelectEmoji} onMouseOver={onMouseOver} />
                ))}
              </div>
            </div>
          ) : (
            <div className="apfs-rt-emoji__empty">이모지 없음</div>
          )
        ) : (
          sections.map((section: any) => {
            const emojis = section.getRows()
              .flatMap((row: any) => row.elements.map((id: string) => emojiLibrary.getEmoji(id)))
              .filter(Boolean);
            if (!emojis.length) return null;
            const label = CAT_LABEL[section.id] || i18n?.categories?.[section.id] || section.id;
            return (
              <div key={section.id} className="apfs-rt-emoji__section" ref={section.root}>
                <div className="apfs-rt-emoji__cat">{label}</div>
                <div className="apfs-rt-emoji__grid" role="grid">
                  {emojis.map((emoji: any) => (
                    <EmojiCell key={emoji.id} emoji={emoji} onSelect={onSelectEmoji} onMouseOver={onMouseOver} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function EmojiToolbarButton() {
  const editor = useEditorState();
  const { emojiPickerState, isOpen, setIsOpen } = useEmojiDropdownMenuState({ closeOnSelect: true });
  const savedSel = React.useRef<any>(null);

  // 삽입 직전 저장 selection 복원 후 원본 onSelectEmoji 실행(runWithSel 사상) → 닫기.
  const onSelect = (emoji: any) => {
    editor.tf.focus();
    if (savedSel.current) { try { editor.tf.select(savedSel.current); } catch { /* 경로 무효 시 무시 */ } }
    emojiPickerState.onSelectEmoji(emoji);
    setIsOpen(false);
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={(o) => {
        if (o) savedSel.current = editor.selection;   // 열림 시점 selection 스냅샷(트리거 mousedown preventDefault로 보존됨)
        setIsOpen(o);
      }}>
      <PopoverTrigger asChild>
        <button type="button" className="apfs-rt-btn" title="이모지" aria-label="이모지"
          onMouseDown={(e) => e.preventDefault()}>
          <Smile size={16} strokeWidth={2} aria-hidden={true} />
        </button>
      </PopoverTrigger>
      {/* 닫힘 시 Radix 기본 autofocus가 트리거(스마일 버튼)로 포커스를 되돌려 삽입 지점 타이핑이 끊긴다.
          이 파일의 모든 드롭다운과 동일하게 preventDefault + editor 재포커스(재선택 금지 — insertEmoji가 caret을
          이모지 뒤로 이미 옮겼으므로 savedSel 복원은 stale, 현재 위치 유지가 맞다). */}
      <PopoverContent className="apfs-rt-emoji" align="start"
        onCloseAutoFocus={(e) => { e.preventDefault(); editor.tf.focus(); }}>
        {isOpen && <EmojiPickerPanel {...emojiPickerState} onSelectEmoji={onSelect} />}
      </PopoverContent>
    </Popover>
  );
}
