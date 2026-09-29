/* APFS SearchableSelect — 옵션이 많은 select 를 검색 가능한 콤보박스로(Popover + cmdk Command).
   네이티브 <select> 는 OS 가 드롭다운을 그려 검색창을 끼울 수 없으므로 목록이 길 때만 이 컴포넌트로 갈아탄다.
   분기 SSOT = shouldSearch(): 옵션 SEARCHABLE_SELECT_MIN 개 이상이면 검색형, 미만은 소비처가 기존 네이티브 select 를 그대로 그린다
   (짧은 목록은 네이티브 동작·모바일 휠 피커를 유지 — 회귀 0). 소비처: SchemaField(폼 모달) · DrawerSelect(상세필터 드로어).

   계약:
   - 값은 네이티브 select 와 같은 문자열. allLabel 이 있으면 맨 앞에 '' (= 전체/미적용) 항목을 붙인다.
   - 박스 규격(34px·테두리·폰트)은 소비처가 triggerStyle 로 넘긴다 — CONTROL_BOX 를 여기서 재선언하지 않는다.
   - 트리거 폭 = 가장 긴 옵션 라벨(네이티브 select 와 동일한 fit-content 감각). 숨은 사이저 스팬을 grid 한 칸에 겹쳐 잡는다
     → 선택이 바뀌어도 폭이 출렁이지 않는다. 래퍼가 max 를 주면 말줄임.

   🔴 Popover 는 non-modal(`modal` 금지) — date-picker.tsx 상단 주석과 같은 이유(2-click 회귀·드로어 스크롤 잠금).
   🔴 트리거는 raw <button> — UI.Button 은 forwardRef 가 없어 Radix asChild 트리거가 무음 미개폐.
   cmdk 함정: ① value="" 항목은 textContent 로 폴백 → 전체 항목은 센티넬 value ② onSelect 인자(가공된 value)를 되쓰지 않고
   클로저로 원래 값을 emit ③ 필터는 cmdk value 기준 → value 에 라벨을 넣는다(라벨이 곧 사용자가 치는 글자). */
import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from './command';
import { cn } from '@/lib/utils';

export type SelectOption = string | { value: string; label: string };

/** 이 개수 이상이면 검색형. 10 = 스크롤 없이 한눈에 훑기 어려워지는 지점(드롭다운 기본 가시 행 수 근처). */
export const SEARCHABLE_SELECT_MIN = 10;

/** 검색형으로 그릴지 — 명시 플래그가 우선, 없으면 옵션 개수('전체' 항목 제외)로 판정. */
export function shouldSearch(optionCount: number, searchable?: boolean): boolean {
  return searchable ?? optionCount >= SEARCHABLE_SELECT_MIN;
}

const norm = (o: SelectOption) => (typeof o === 'string' ? { value: o, label: o } : o);
const ALL_SENTINEL = '\u0000__all__';

export function SearchableSelect({
  value, onChange, options, allLabel, placeholder = '선택', ariaLabel, invalid, required,
  triggerStyle, activeStyle, fill, onFocus, onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<SelectOption>;
  /** 있으면 맨 앞에 '' 값 항목(전체/미적용)을 붙인다. null/undefined 면 붙이지 않는다. */
  allLabel?: string | null;
  placeholder?: string;
  /** 트리거는 <button> 이라 필드 라벨을 넘겨 접근名을 보존한다(DatePicker 와 같은 이유). */
  ariaLabel?: string;
  invalid?: boolean;
  required?: boolean;
  /** 박스 규격 — 폼은 SchemaField base, 드로어는 drawerInputStyle('select'). */
  triggerStyle?: React.CSSProperties;
  /** 열려 있는 동안 덧입힐 스타일 — 포커스가 포털 검색창으로 넘어가 트리거 onBlur 가 나도 글로우를 유지한다. */
  activeStyle?: React.CSSProperties;
  /** true 면 래퍼 폭을 꽉 채운다(폼 모달 FORM_SELECT_W 래퍼 안). */
  fill?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const items = React.useMemo(() => options.map(norm), [options]);
  const withAll = allLabel != null;
  const current = items.find((o) => o.value === value);
  const shown = current ? current.label : value === '' && withAll ? allLabel : value || placeholder;
  const isPlaceholder = !current && !(value === '' && withAll) && !value;
  // 사이저 = 트리거가 가질 수 있는 모든 라벨. 가장 긴 것이 폭을 정한다.
  const sizers = React.useMemo(() => [...(withAll ? [allLabel as string] : []), ...items.map((o) => o.label), placeholder], [items, withAll, allLabel, placeholder]);
  // 열릴 때 현재 값에 하이라이트 — cmdk 가 그 항목으로 스크롤한다.
  const highlighted = current ? current.label : value === '' && withAll ? ALL_SENTINEL : undefined;

  const pick = (v: string) => { onChange(v); setOpen(false); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          onFocus={onFocus}
          onBlur={onBlur}
          // 닫힌 트리거에서 ↓/↑ 로도 연다(네이티브 select 와 같은 키 기대).
          onKeyDown={(e) => { if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); setOpen(true); } }}
          className="text-left"
          style={{
            ...triggerStyle,
            ...(fill ? { width: '100%', minWidth: 0 } : null),
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingRight: 10,
            ...(open ? activeStyle : null),
          }}
        >
          <span style={{ display: 'grid', flex: '1 1 auto', minWidth: 0 }}>
            {sizers.map((l, i) => (
              <span key={i} aria-hidden style={{ gridArea: '1 / 1', visibility: 'hidden', whiteSpace: 'nowrap', height: 0, overflow: 'hidden' }}>{l}</span>
            ))}
            <span style={{ gridArea: '1 / 1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isPlaceholder ? 'var(--muted-foreground)' : undefined }}>{shown}</span>
          </span>
          <ChevronDown aria-hidden size={16} strokeWidth={2} style={{ flexShrink: 0, color: 'var(--muted-foreground)' }} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0"
        style={{ width: 'max(var(--radix-popover-trigger-width), 220px)', maxWidth: 'min(420px, calc(100vw - 32px))' }}
      >
        <Command defaultValue={highlighted} loop>
          <CommandInput placeholder="검색" aria-label={ariaLabel ? `${ariaLabel} 검색` : '옵션 검색'} className="h-9 py-2 text-[13.5px]" />
          <CommandList className="max-h-[280px] p-1">
            <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
            {withAll && (
              <CommandItem value={ALL_SENTINEL} keywords={[allLabel as string]} onSelect={() => pick('')} className="py-1.5">
                <span className="flex-1 truncate">{allLabel}</span>
                <Check aria-hidden size={14} className={cn('shrink-0 text-primary', value === '' ? 'opacity-100' : 'opacity-0')} />
              </CommandItem>
            )}
            {items.map((o) => (
              <CommandItem key={o.value} value={o.label} keywords={o.value !== o.label ? [o.value] : undefined} onSelect={() => pick(o.value)} className="py-1.5">
                <span className="flex-1 truncate">{o.label}</span>
                <Check aria-hidden size={14} className={cn('shrink-0 text-primary', o.value === value ? 'opacity-100' : 'opacity-0')} />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
