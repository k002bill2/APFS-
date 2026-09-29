/* 상세필터 드로어 select — 페이지마다 복제돼 있던 로컬 DrawerSelect 32벌(시그니처 7종)을 하나로 합친 공용본(2026-09-29).
   네이티브 경로 마크업은 복제본들과 동일하다(drawerInputStyle('select') + chevron right 10, fit-content 래퍼).
   옵션이 많으면(shouldSearch — 10개 이상 또는 searchable) 검색형 SearchableSelect 로 그린다(→ ui/searchable-select.tsx).

   props 는 복제본들의 상위 집합:
   - options: string[] 또는 { value, label }[]
   - all: '전체' 항목 라벨(기본 '전체'). null 이면 '전체' 항목 없음(allLabel:null 계약). noAll 도 같은 뜻의 옛 표기.
   - ariaLabel: 트리거 접근名. 검색형은 <button> 이라 <label> 암묵 연결이 이름을 주지 못할 수 있어 넘기는 편이 안전. */
import { Icon } from './icons';
import { drawerInputStyle } from './schemas/renderers';
import { SearchableSelect, shouldSearch, type SelectOption } from './ui/searchable-select';

export function DrawerSelect({ value, onChange, options, all = '전체', noAll, ariaLabel, searchable }: {
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<SelectOption>;
  all?: string | null;
  noAll?: boolean;
  ariaLabel?: string;
  searchable?: boolean;
}) {
  const allLabel = noAll ? null : all;
  if (shouldSearch(options.length, searchable)) {
    return (
      <div style={{ width: 'fit-content', maxWidth: '100%' }}>
        <SearchableSelect value={value} onChange={onChange} options={options} allLabel={allLabel} ariaLabel={ariaLabel}
          triggerStyle={{ ...drawerInputStyle('select'), maxWidth: '100%' }} />
      </div>
    );
  }
  return (
    <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
      <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} style={{ ...drawerInputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
        {allLabel != null && <option value="">{allLabel}</option>}
        {options.map((o) => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}
