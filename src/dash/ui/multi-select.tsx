/* APFS MultiSelect — 셀렉트 모양의 다중선택(Popover + cmdk Command + 체크 표시). 2026-11-03 신설(일계표 계정구분 — 설계서 '셀렉트 다중선택'),
   같은 날 디자인시스템 3-5 샘플의 동작(전체 선택 3상태 · 하단 개수/선택 해제 · 열자마자 키보드)을 이식했다.
   SearchableSelect 와 같은 골격·함정 규약을 따른다(→ searchable-select.tsx 상단 주석 ①~⑤):
   🔴 Popover non-modal(`modal` 금지) · 🔴 트리거는 raw <button>(Radix asChild) · cmdk onSelect 인자 대신 클로저 값 emit.

   계약:
   - value = 선택된 값 배열. [] = 아무것도 고르지 않음 → 트리거에 emptyLabel(기본 '전체').
   - 항목을 눌러도 닫히지 않는다(여러 개를 연달아 고르는 동작). 바깥 클릭·Esc 로 닫는다.
   - 반환 순서는 options 순서(누른 순서가 아님) — 칩·집계 결과가 클릭 순서에 따라 출렁이지 않게.
   - 트리거 표시: 0개 = emptyLabel · 1개 = 그 라벨 · 2개 이상 = '첫 라벨 외 N'. 폭은 나올 수 있는 가장 넓은 요약 기준(사이저)이라
     골라도 칸 폭이 그대로다. 드로어보다 넓으면(모바일) 라벨만 말줄임하고 ' 외 N' 은 남긴다(2026-11-03).
   - 맨 위 '전체 선택'(selectAll, 옵션 2개 이상일 때) = 3상태 — 없음/일부에서 누르면 전부, 전부에서 누르면 해제.
   - 하단: 'N개 선택'(aria-live) + [선택 해제](0개면 비활성).
   - 검색창: 단일 SearchableSelect 와 같은 분기 SSOT shouldSearch()(옵션 SEARCHABLE_SELECT_MIN 개 이상 또는 searchable) — 기준을 따로 두지 않는다.
     검색창이 없으면 열 때 초점을 listbox(CommandList)로 보내 ↑↓·Enter·Space 로 바로 조작한다(첫 tabbable = [선택 해제] 로 가지 않게).
   - 체크 표시는 보이기만 하는 span(BoxMark, ui/checkbox.tsx 와 같은 토큰). DS Checkbox 는 <button> 이라 option 안에 두면
     중첩 인터랙티브가 된다. 체크 상태는 option 의 aria-checked, cmdk 의 aria-selected 는 키보드 하이라이트다(겹치지 않는다).
   - cmdk 하이라이트는 비제어로 둔다 — value/onValueChange 로 제어하면 열 때 aria-activedescendant 가 비었다(2026-11-03 실측).
     Space 는 DOM 의 aria-selected 항목을 읽어 토글한다. */
import * as React from 'react';
import { Check, ChevronDown, Minus } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem, CommandSeparator } from './command';
import { shouldSearch, type SelectOption } from './searchable-select';
import { UI } from '../components';
import { cn } from '@/lib/utils';

import { multiSelectSummaryParts } from './multi-select-value';

// 요약 함수는 순수 모듈(multi-select-value.ts)이 정본 — 스키마 필터 칩(filter_field.ts, React 금지)도 같은 모양을 써야 해서 옮겼다.
export { multiSelectSummary, multiSelectSummaryParts } from './multi-select-value';

const norm = (o: SelectOption) => (typeof o === 'string' ? { value: o, label: o } : o);
const ALL_SENTINEL = '\u0000__all__';

/** 요약 한 줄 — 보이는 문구와 폭 사이저가 같은 마크업을 써야 폭이 정확히 맞는다(한 덩어리 텍스트로 재면 서브픽셀 차로 말줄임이 생길 수 있다).
   rest 는 tabular-nums — 자릿수가 같으면 폭이 같아 '외 N' 최댓값이 가장 넓은 후보가 된다. */
function SummaryLine({ head, rest }: { head: string; rest: string }) {
  return (
    <>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{head}</span>
      {rest && <span style={{ flexShrink: 0, whiteSpace: 'pre', fontVariantNumeric: 'tabular-nums' }}>{rest}</span>}
    </>
  );
}

/** '전체 선택' 3상태 — Radix Checkbox checked 계약과 같은 모양(true | false | 'indeterminate') */
export function selectAllState(picked: number, total: number): boolean | 'indeterminate' {
  if (picked === 0) return false;
  return picked === total ? true : 'indeterminate';
}

function BoxMark({ state }: { state: boolean | 'indeterminate' }) {
  const on = state !== false;
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors duration-tok-fast ease-ds',
        on ? 'border-brand-blue bg-brand-blue text-[color:var(--on-brand-solid)]' : 'border-border-strong bg-card',
      )}
    >
      {state === 'indeterminate' ? <Minus className="h-3 w-3" strokeWidth={3} /> : on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
    </span>
  );
}

export function MultiSelect({ value, onChange, options, emptyLabel = '전체', ariaLabel, triggerStyle, searchable, selectAll = true, invalid, required }: {
  value: readonly string[];
  onChange: (v: string[]) => void;
  options: ReadonlyArray<SelectOption>;
  emptyLabel?: string;
  /** 트리거는 <button> 이라 필드 라벨을 넘겨 접근名을 보존한다 */
  ariaLabel?: string;
  /** 박스 규격 — 드로어는 drawerInputStyle('select') */
  triggerStyle?: React.CSSProperties;
  /** 검색창 강제 on/off — 없으면 옵션 개수로 판정(shouldSearch) */
  searchable?: boolean;
  /** 맨 위 '전체 선택' 항목(옵션 2개 이상일 때). 기본 표시 */
  selectAll?: boolean;
  /** 폼 검증 상태 → 트리거 aria-invalid / aria-required(스키마 폼 'multiselect'). 테두리 색은 triggerStyle 이 맡는다 */
  invalid?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const items = React.useMemo(() => options.map(norm), [options]);
  const selected = items.filter((o) => value.includes(o.value));
  const parts = multiSelectSummaryParts(selected.map((o) => o.label), emptyLabel);
  const shown = parts.head + parts.rest;
  const withSearch = shouldSearch(items.length, searchable);
  const showAll = selectAll && items.length > 1;
  const all = selectAllState(selected.length, items.length);
  // 폭 사이저 = 나올 수 있는 가장 넓은 요약 후보 — 처음부터 그 폭이라 골라도 칸 폭이 출렁이지 않는다(196→223px 실측).
  // 반환이 options 순서라 첫 라벨이 i번째면 '외 N' 의 최댓값은 뒤에 남은 옵션 수 → items.slice(i)
  const sizers = React.useMemo(
    () => [multiSelectSummaryParts([], emptyLabel), ...items.map((_, i) => multiSelectSummaryParts(items.slice(i).map((o) => o.label), emptyLabel))],
    [items, emptyLabel],
  );

  const toggle = (v: string) => {
    const on = !value.includes(v);
    onChange(items.filter((o) => (o.value === v ? on : value.includes(o.value))).map((o) => o.value));
  };
  const toggleAll = () => onChange(all === true ? [] : items.map((o) => o.value));

  const onListKeyDown = (e: React.KeyboardEvent) => {
    // 검색창이 있으면 Space 는 글자 입력. 없을 때만 하이라이트 항목 토글(listbox 다중선택 관례). Enter 는 cmdk 가 onSelect 로 처리.
    if (withSearch || e.key !== ' ') return;
    e.preventDefault();
    const cur = listRef.current?.querySelector('[cmdk-item][aria-selected="true"]')?.getAttribute('data-value');
    if (cur === ALL_SENTINEL) return toggleAll();
    if (cur != null && items.some((o) => o.value === cur)) toggle(cur);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          // aria-controls 는 Radix PopoverTrigger(asChild)가 열릴 때 주입한다(SearchableSelect 와 같은 사유).
          // eslint-disable-next-line jsx-a11y/role-has-required-aria-props -- 위 사유
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={ariaLabel ? `${ariaLabel}: ${shown}` : undefined}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          onKeyDown={(e) => { if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); setOpen(true); } }}
          className="text-left"
          style={{ ...triggerStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingRight: 10 }}
        >
          {/* 좁으면(모바일 드로어) 라벨만 말줄임 — ' 외 N' 은 flexShrink 0 이라 개수는 끝까지 보인다 */}
          <span style={{ display: 'grid', flex: '1 1 auto', minWidth: 0 }}>
            {sizers.map((p, i) => (
              <span key={i} aria-hidden style={{ gridArea: '1 / 1', display: 'flex', visibility: 'hidden', height: 0, overflow: 'hidden' }}><SummaryLine {...p} /></span>
            ))}
            <span style={{ gridArea: '1 / 1', display: 'flex', minWidth: 0, overflow: 'hidden' }}><SummaryLine {...parts} /></span>
          </span>
          <ChevronDown aria-hidden size={16} strokeWidth={2} style={{ flexShrink: 0, color: 'var(--muted-foreground)' }} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0"
        style={{ width: 'max(var(--radix-popover-trigger-width), 220px)', maxWidth: 'min(420px, calc(100vw - 32px))' }}
        onOpenAutoFocus={withSearch ? undefined : (e) => { e.preventDefault(); listRef.current?.focus(); }}>
        {/* 접근名은 cmdk label prop 으로 — aria-label 은 cmdk 가 덮거나(List → 'Suggestions') 가린다(Input → 루트 라벨 labelledby).
            searchable-select.tsx 함정 ④⑤ · multi-select.test.ts */}
        <Command loop label={ariaLabel ? `${ariaLabel} 검색` : '옵션 검색'} onKeyDown={onListKeyDown}>
          {withSearch && <CommandInput placeholder="검색" aria-label={ariaLabel ? `${ariaLabel} 검색` : '옵션 검색'} className="h-9 py-2 text-[13.5px]" />}
          <CommandList ref={listRef} className="max-h-[280px] p-1" label={ariaLabel ?? '옵션 목록'} aria-multiselectable="true">
            {withSearch && <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>}
            {showAll && (
              <>
                <CommandItem value={ALL_SENTINEL} keywords={['전체 선택']} onSelect={toggleAll} aria-checked={all === 'indeterminate' ? 'mixed' : all} className="py-1.5 gap-2 font-medium">
                  <BoxMark state={all} />
                  <span className="flex-1 truncate">전체 선택</span>
                </CommandItem>
                <CommandSeparator />
              </>
            )}
            {items.map((o) => {
              const on = value.includes(o.value);
              return (
                // cmdk 식별자 = 값(유일), 라벨은 검색 키워드 — 라벨을 식별자로 쓰면 같은 라벨·다른 값 옵션이 한 항목으로 묶인다(함정 ③)
                <CommandItem key={o.value} value={o.value} keywords={o.value !== o.label ? [o.label] : undefined} onSelect={() => toggle(o.value)} aria-checked={on} className="py-1.5 gap-2">
                  <BoxMark state={on} />
                  <span className="flex-1 truncate">{o.label}</span>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-1.5">
          <span className="t-caption tabular" aria-live="polite">{selected.length}개 선택</span>
          <UI.Button variant="ghost" size="sm" disabled={selected.length === 0} onClick={() => onChange([])}>선택 해제</UI.Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
