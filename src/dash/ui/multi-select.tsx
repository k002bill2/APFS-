/* APFS MultiSelect — 셀렉트 모양의 다중선택(Popover + cmdk Command + DS Checkbox). 2026-11-03 신설(일계표 계정구분 — 설계서 '셀렉트 다중선택').
   SearchableSelect 와 같은 골격·함정 규약을 따른다(→ searchable-select.tsx 상단 주석):
   🔴 Popover non-modal(`modal` 금지) · 🔴 트리거는 raw <button>(Radix asChild) · cmdk onSelect 인자 대신 클로저 값 emit.

   계약:
   - value = 선택된 값 배열. [] = 아무것도 고르지 않음 → 트리거에 emptyLabel(기본 '전체').
   - 항목을 눌러도 닫히지 않는다(여러 개를 연달아 고르는 동작). 바깥 클릭·Esc 로 닫는다.
   - 반환 순서는 options 순서(누른 순서가 아님) — 칩·집계 결과가 클릭 순서에 따라 출렁이지 않게.
   - 트리거 표시: 0개 = emptyLabel · 1개 = 그 라벨 · 2개 이상 = '첫 라벨 외 N'. 폭은 가장 긴 옵션 라벨 기준(사이저).
   - 검색창: 단일 SearchableSelect 와 같은 분기 SSOT shouldSearch()(옵션 SEARCHABLE_SELECT_MIN 개 이상 또는 searchable) — 기준을 따로 두지 않는다. */
import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from './command';
import { Checkbox } from './checkbox';
import { shouldSearch, type SelectOption } from './searchable-select';

const norm = (o: SelectOption) => (typeof o === 'string' ? { value: o, label: o } : o);

/** 트리거 문구 — 0개 emptyLabel · 1개 라벨 · 2개 이상 '첫 라벨 외 N' */
export function multiSelectSummary(labels: readonly string[], emptyLabel: string): string {
  if (!labels.length) return emptyLabel;
  return labels.length === 1 ? labels[0] : `${labels[0]} 외 ${String(labels.length - 1)}`;
}

export function MultiSelect({ value, onChange, options, emptyLabel = '전체', ariaLabel, triggerStyle, searchable }: {
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
}) {
  const [open, setOpen] = React.useState(false);
  const items = React.useMemo(() => options.map(norm), [options]);
  const selected = items.filter((o) => value.includes(o.value));
  const shown = multiSelectSummary(selected.map((o) => o.label), emptyLabel);
  const withSearch = shouldSearch(items.length, searchable);
  const sizers = React.useMemo(() => [emptyLabel, ...items.map((o) => o.label)], [items, emptyLabel]);

  const toggle = (v: string) => {
    const on = !value.includes(v);
    onChange(items.filter((o) => (o.value === v ? on : value.includes(o.value))).map((o) => o.value));
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
          onKeyDown={(e) => { if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); setOpen(true); } }}
          className="text-left"
          style={{ ...triggerStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingRight: 10 }}
        >
          <span style={{ display: 'grid', flex: '1 1 auto', minWidth: 0 }}>
            {sizers.map((l, i) => (
              <span key={i} aria-hidden style={{ gridArea: '1 / 1', visibility: 'hidden', whiteSpace: 'nowrap', height: 0, overflow: 'hidden' }}>{l}</span>
            ))}
            <span style={{ gridArea: '1 / 1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shown}</span>
          </span>
          <ChevronDown aria-hidden size={16} strokeWidth={2} style={{ flexShrink: 0, color: 'var(--muted-foreground)' }} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0"
        style={{ width: 'max(var(--radix-popover-trigger-width), 220px)', maxWidth: 'min(420px, calc(100vw - 32px))' }}>
        {/* 접근名은 cmdk label prop 으로 — aria-label 은 cmdk 가 덮거나(List → 'Suggestions') 가린다(Input → 루트 라벨 labelledby).
            searchable-select.tsx 함정 ④⑤ · multi-select.test.ts */}
        <Command loop label={ariaLabel ? `${ariaLabel} 검색` : '옵션 검색'}>
          {withSearch && <CommandInput placeholder="검색" aria-label={ariaLabel ? `${ariaLabel} 검색` : '옵션 검색'} className="h-9 py-2 text-[13.5px]" />}
          <CommandList className="max-h-[280px] p-1" label={ariaLabel ?? '옵션 목록'} aria-multiselectable="true">
            {withSearch && <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>}
            {items.map((o) => {
              const on = value.includes(o.value);
              return (
                // cmdk 식별자 = 값(유일), 라벨은 검색 키워드 — 라벨을 식별자로 쓰면 같은 라벨·다른 값 옵션이 한 항목으로 묶인다(함정 ③)
                <CommandItem key={o.value} value={o.value} keywords={o.value !== o.label ? [o.label] : undefined} onSelect={() => toggle(o.value)} aria-checked={on} className="py-1.5 gap-2">
                  {/* 표시용 — 상태는 항목(option)의 aria-checked 가 전달한다. 클릭은 항목이 받는다 */}
                  <Checkbox checked={on} tabIndex={-1} aria-hidden className="pointer-events-none" />
                  <span className="flex-1 truncate">{o.label}</span>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
