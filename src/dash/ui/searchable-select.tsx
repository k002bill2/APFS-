/* APFS SearchableSelect — 옵션이 많은 select 를 검색 가능한 콤보박스로(Popover + cmdk Command).
   네이티브 <select> 는 OS 가 드롭다운을 그려 검색창을 끼울 수 없으므로 목록이 길 때만 이 컴포넌트로 갈아탄다.
   분기 SSOT = shouldSearch(): 옵션 SEARCHABLE_SELECT_MIN 개 이상이면 검색형, 미만은 소비처가 기존 네이티브 select 를 그대로 그린다
   (짧은 목록은 네이티브 동작·모바일 휠 피커를 유지 — 회귀 0). 소비처: SchemaField(폼 모달) · DrawerSelect(상세필터 드로어).

   계약:
   - 값은 네이티브 select 와 같은 문자열. allLabel 이 있으면 맨 앞에 '' (= 전체/미적용) 항목을 붙인다.
   - 박스 규격(34px·테두리·폰트)은 소비처가 triggerStyle 로 넘긴다 — CONTROL_BOX 를 여기서 재선언하지 않는다.
   - 트리거 폭 = 가장 긴 옵션 라벨(네이티브 select 와 동일한 fit-content 감각). 숨은 사이저 스팬을 grid 한 칸에 겹쳐 잡는다
     → 선택이 바뀌어도 폭이 출렁이지 않는다. 래퍼가 max 를 주면 말줄임(트리거 표시값만).
   - 옵션 목록은 잘리지 않는다(2026-11-17): 팝오버 폭 = 가장 긴 옵션 한 줄, 상한을 넘으면 줄바꿈 — OPTION_POPOVER_STYLE · OptionWidthSizer.

   🔴 Popover 는 non-modal(`modal` 금지) — date-picker.tsx 상단 주석과 같은 이유(2-click 회귀·드로어 스크롤 잠금).
   🔴 트리거는 raw <button> — UI.Button 은 forwardRef 가 없어 Radix asChild 트리거가 무음 미개폐.
   cmdk 함정: ① value="" 항목은 textContent 로 폴백 → 전체 항목은 센티넬 value ② onSelect 인자(가공된 value)를 되쓰지 않고
   클로저로 원래 값을 emit ③ cmdk value = **옵션 값**(유일 식별자), 라벨은 keywords — 필터는 value+keywords 를 함께 본다.
   (2026-11-03 전엔 라벨을 value 로 썼다 → 라벨이 같고 값이 다른 옵션이 한 항목으로 묶여 둘 다 하이라이트되고 Enter 가 늘 첫 번째를 골랐다.)
   ④ listbox 접근名은 CommandList 의 label prop — aria-label 을 주면 cmdk 가 label(기본 'Suggestions')로 덮어쓴다.
   ⑤ 검색창 접근名은 Command 루트의 label prop — Input 이 aria-labelledby 로 루트의 sr-only 라벨을 가리켜 aria-label 을 가린다. */
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

/** 옵션 팝오버 폭 계약(2026-11-17 "옵션리스트가 안잘리게" — SearchableSelect·MultiSelect 공유).
   폭 = 가장 긴 옵션 한 줄(OptionWidthSizer) · 하한 = max(트리거, 220px) · 상한 = min(420px, 뷰포트−32px).
   상한에 걸리는 라벨은 말줄임 대신 줄바꿈한다(OPTION_LABEL_CLASS). 그 전엔 폭이 max(트리거, 220px)에 묶이고 라벨이 truncate 라
   긴 자펀드명이 '웰투시-NBH 전북애그리푸…' 로 잘렸다.
   하한도 상한으로 묶는다 — CSS 는 min-width 가 max-width 를 이기므로, 420px 보다 넓은 트리거면 상한(뷰포트 포함)이 깨진다(Codex P2). */
const OPTION_POPOVER_MAX = 'min(420px, calc(100vw - 32px))';
export const OPTION_POPOVER_STYLE: React.CSSProperties = {
  width: 'max-content',
  minWidth: `min(max(var(--radix-popover-trigger-width), 220px), ${OPTION_POPOVER_MAX})`,
  maxWidth: OPTION_POPOVER_MAX,
};

/** 검색으로 걸러지는 긴 목록 — 스크롤바 자리를 늘 비워 둔다. 걸러져 스크롤이 사라지면 클래식 스크롤바 환경(Windows)에서
   그 폭(11~17px)만큼 팝오버가 줄었다 늘었다 한다(2026-11-17 실측 334→323px). 오버레이 스크롤바(macOS)에선 0px.
   짧은 목록(rows < SEARCHABLE_SELECT_MIN — max-h 280px 안에 다 들어가 처음부터 스크롤이 없다)엔 주지 않는다:
   출렁일 일이 없고 빈 띠만 남는다(전표 손익부서 4개처럼 검색형을 직접 쓰는 곳). */
export const optionListGutter = (rows: number) => (rows >= SEARCHABLE_SELECT_MIN ? '[scrollbar-gutter:stable]' : undefined);

/** 옵션 라벨 — 말줄임 금지. keep-all 로 한글 어절을 지키고, 공백 없이 긴 토큰만 anywhere 로 끊는다. */
export const OPTION_LABEL_CLASS = 'flex-1 whitespace-normal break-keep [overflow-wrap:anywhere]';

/** 옵션 팝오버 폭 사이저 — CommandList 첫 자식에 둔다. 전 라벨의 한 줄 폭을 높이 0 으로 깔아 팝오버 폭을 고정한다.
   ① cmdk(1.1.1)는 검색에 안 걸린 항목을 언마운트한다 → 보이는 항목만으로 폭을 잡으면 타이핑마다·'검색 결과 없음'에서 폭이 줄어든다.
   ② 리스트 안에 둬야 세로 스크롤바 폭이 실제 항목과 똑같이 빠진다(밖에 두면 스크롤바만큼 모자라 가장 긴 라벨이 줄바꿈된다).
   ③ 행 규격은 CommandItem 과 같아야 한다 — 좌우 px-2.5 + 라벨 + trail(gap + 표식).
      SearchableSelect = gap 10 + 체크 14, MultiSelect = gap 8 + 박스 16 — 둘 다 24px. */
export function OptionWidthSizer({ labels, trail }: { labels: ReadonlyArray<string>; trail: number }) {
  return (
    <div aria-hidden data-option-sizer="" style={{ height: 0, overflow: 'hidden', visibility: 'hidden' }}>
      {labels.map((l, i) => (
        <div key={i} className="px-2.5 text-[13.5px]" style={{ whiteSpace: 'nowrap' }}>
          {l}<span style={{ display: 'inline-block', width: trail }} />
        </div>
      ))}
    </div>
  );
}

export function SearchableSelect({
  value, onChange, options, allLabel, placeholder = '선택', ariaLabel, invalid, required,
  triggerStyle, activeStyle, fill, onFocus, onBlur, dimEmpty,
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
  /** 빈 값('' — 전체 항목 포함)을 흐린 글자로 — 인라인 필터 패널에서 allLabel 이 곧 항목명 placeholder 일 때(filter_panel) */
  dimEmpty?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  // 접근名 폴백 — ariaLabel 을 안 넘긴 소비처(<DrawerField label="X"> 래핑)는 role=combobox 버튼이 표시값('전체')으로 읽혔다(2026-09-29 실측).
  // 감싼 <label> 의 캡션(첫 요소)의 첫 텍스트 노드 = 필드명을 이름으로 쓴다('· 데이터 연동 후 적용' 같은 부가 문구 제외).
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const [derivedLabel, setDerivedLabel] = React.useState<string>();
  React.useLayoutEffect(() => {
    if (ariaLabel) return;
    const btn = btnRef.current;
    const cap = btn?.closest('label')?.firstElementChild;
    if (!btn || !cap || cap.contains(btn)) return;
    const first = [...cap.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
    setDerivedLabel((first ?? cap).textContent?.trim() || undefined);
  }, [ariaLabel]);
  const name = ariaLabel ?? derivedLabel;
  const items = React.useMemo(() => options.map(norm), [options]);
  const withAll = allLabel != null;
  const current = items.find((o) => o.value === value);
  const shown = current ? current.label : value === '' && withAll ? allLabel : value || placeholder;
  const isPlaceholder = !current && (dimEmpty || !(value === '' && withAll)) && !value;
  // 사이저 = 트리거가 가질 수 있는 모든 라벨. 가장 긴 것이 폭을 정한다.
  const optionLabels = React.useMemo(() => [...(withAll ? [allLabel as string] : []), ...items.map((o) => o.label)], [items, withAll, allLabel]);
  const sizers = React.useMemo(() => [...optionLabels, placeholder], [optionLabels, placeholder]);
  // 열릴 때 현재 값에 하이라이트 — cmdk 가 그 항목으로 스크롤한다(cmdk value = 옵션 값, 함정 ③).
  const highlighted = current ? current.value : value === '' && withAll ? ALL_SENTINEL : undefined;

  const pick = (v: string) => { onChange(v); setOpen(false); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={btnRef}
          type="button"
          // aria-controls 는 Radix PopoverTrigger(asChild)가 열릴 때 콘텐츠 id 로 주입한다(닫힘=없음, 실측) — 정적 분석엔 안 보인다.
          // eslint-disable-next-line jsx-a11y/role-has-required-aria-props -- 위 사유
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={name}
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
      <PopoverContent align="start" className="p-0" style={OPTION_POPOVER_STYLE}>
        {/* 루트 label = 검색창 접근名(cmdk Input 의 aria-labelledby 가 이 라벨을 가리킨다 — 없으면 이름이 '', 함정 ⑤). */}
        <Command defaultValue={highlighted} loop label={name ? `${name} 검색` : '옵션 검색'}>
          <CommandInput placeholder="검색" aria-label={name ? `${name} 검색` : '옵션 검색'} className="h-9 py-2 text-[13.5px]" />
          <CommandList className={cn('max-h-[280px] p-1', optionListGutter(optionLabels.length))} label={name ?? '옵션 목록'}>
            <OptionWidthSizer labels={optionLabels} trail={24} />
            <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
            {withAll && (
              <CommandItem value={ALL_SENTINEL} keywords={[allLabel as string]} onSelect={() => pick('')} className="py-1.5">
                <span className={OPTION_LABEL_CLASS}>{allLabel}</span>
                <Check aria-hidden size={14} className={cn('shrink-0 text-primary', value === '' ? 'opacity-100' : 'opacity-0')} />
              </CommandItem>
            )}
            {items.map((o) => (
              <CommandItem key={o.value} value={o.value} keywords={o.value !== o.label ? [o.label] : undefined} onSelect={() => pick(o.value)} className="py-1.5">
                <span className={OPTION_LABEL_CLASS}>{o.label}</span>
                <Check aria-hidden size={14} className={cn('shrink-0 text-primary', o.value === value ? 'opacity-100' : 'opacity-0')} />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
