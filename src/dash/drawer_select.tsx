/* 상세필터 드로어 select — 페이지마다 복제돼 있던 로컬 DrawerSelect 32벌(시그니처 7종)을 하나로 합친 공용본(2026-09-29).
   네이티브 경로 마크업은 복제본들과 동일하다(drawerInputStyle('select') + chevron right 10, fit-content 래퍼).
   옵션이 많으면(shouldSearch — 10개 이상 또는 searchable) 검색형 SearchableSelect 로 그린다(→ ui/searchable-select.tsx).

   props 는 복제본들의 상위 집합:
   - options: string[] 또는 { value, label }[]
   - all: '전체' 항목 라벨(기본 '전체'). null 이면 '전체' 항목 없음(allLabel:null 계약). noAll 도 같은 뜻의 옛 표기.
   - ariaLabel: 트리거 접근名. 검색형은 <button> 이라 <label> 암묵 연결이 이름을 주지 못할 수 있어 넘기는 편이 안전.
   - placeholder·fill: 캡션 없이 칸만 늘어놓는 인라인 필터(자펀드정보관리 subfund_filter_panel)용. 드로어는 쓰지 않는다. */
import { Icon } from './icons';
import { drawerInputStyle } from './schemas/renderers';
import { SearchableSelect, shouldSearch, type SelectOption } from './ui/searchable-select';
import { MultiSelect } from './ui/multi-select';

export function DrawerSelect({ value, onChange, options, all = '전체', noAll, ariaLabel, searchable, placeholder, fill }: {
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<SelectOption>;
  all?: string | null;
  noAll?: boolean;
  ariaLabel?: string;
  searchable?: boolean;
  /** 항목명 placeholder — '전체'(빈 값) 항목 라벨을 이 값으로 바꾸고, 미선택이면 흐린 글자로 보인다 */
  placeholder?: string;
  /** 부모 폭을 채운다(고정폭 칸). 기본은 옵션 길이에 맞춘 fit-content */
  fill?: boolean;
}) {
  const allLabel = noAll ? null : (placeholder ?? all);
  const wrapW = fill ? '100%' : 'fit-content';
  const fillW = fill ? { width: '100%', minWidth: 0 } : null;
  if (shouldSearch(options.length, searchable)) {
    return (
      <div style={{ width: wrapW, maxWidth: '100%' }}>
        <SearchableSelect value={value} onChange={onChange} options={options} allLabel={allLabel} ariaLabel={ariaLabel} fill={fill}
          triggerStyle={{ ...drawerInputStyle('select'), maxWidth: '100%', ...fillW }} />
      </div>
    );
  }
  /* 흐린 글자는 닫힌 상자에만 — 펼친 목록(Windows 는 select 색을 option 이 상속)은 본문색으로 되돌린다 */
  const dim = placeholder != null && value === '';
  const optStyle = placeholder != null ? { color: 'var(--foreground)' } : undefined;
  /* 고정폭 칸은 긴 값이 잘리고(네이티브 select 는 말줄임 없음) 적용 칩도 없다 → 고른 값 전문을 호버로 회수 */
  const picked = placeholder != null && value !== '' ? options.find((o) => (typeof o === 'string' ? o : o.value) === value) : undefined;
  const pickedLabel = picked == null ? undefined : typeof picked === 'string' ? picked : picked.label;
  return (
    <div className="relative" style={{ width: wrapW, maxWidth: '100%' }}>
      <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} title={pickedLabel}
        style={{ ...drawerInputStyle('select'), ...fillW, ...(dim ? { color: 'var(--muted-foreground)' } : null), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
        {allLabel != null && <option value="" style={optStyle}>{allLabel}</option>}
        {options.map((o) => typeof o === 'string'
          ? <option key={o} value={o} style={optStyle}>{o}</option>
          : <option key={o.value} value={o.value} style={optStyle}>{o.label}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}

/** 상세필터 드로어 다중선택 select — 박스 규격은 DrawerSelect 와 같은 drawerInputStyle('select').
   [] = emptyLabel('전체'). 트리거가 <button> 이라 <label> 래퍼(DrawerField 기본) 대신 plain 래퍼에 둔다(2회 토글 방지). */
export function DrawerMultiSelect({ value, onChange, options, emptyLabel = '전체', ariaLabel, searchable }: {
  value: readonly string[];
  onChange: (v: string[]) => void;
  options: ReadonlyArray<SelectOption>;
  emptyLabel?: string;
  ariaLabel?: string;
  searchable?: boolean;
}) {
  return (
    <div style={{ width: 'fit-content', maxWidth: '100%' }}>
      <MultiSelect searchable={searchable} value={value} onChange={onChange} options={options} emptyLabel={emptyLabel} ariaLabel={ariaLabel}
        triggerStyle={{ ...drawerInputStyle('select'), maxWidth: '100%' }} />
    </div>
  );
}
