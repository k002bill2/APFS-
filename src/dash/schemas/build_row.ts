/* build_row.ts — Row 조립 순수 모듈. React import 금지.
   vals(Record<string,string>) → 타입 안전한 Row.
   ★ 핵심: vals를 먼저 전개한 뒤 숫자/정제 필드를 덮어써야
           문자열이 number를 오염시키지 않는다. */
import type { Row } from '../generic_list_modal';
import type { PageSchema } from './types';

export function buildRow(vals: Record<string, string>, initial: Row | undefined, schema: PageSchema): Row {
  return {
    ...(vals as Record<string, unknown>),   // ← FIRST: raw strings (낮은 우선순위)
    id: initial?.id ?? '',
    icon: initial?.icon ?? 'layers',
    color: initial?.color ?? 'var(--chart-1)',
    name: (vals.name ?? '').trim(),
    category: (vals.category ?? schema.entity).trim(),
    amount: Number(vals.amount) || 0,       // 숫자 변환이 string을 이긴다
    change: Number(vals.change) || 0,
    status: vals.status ?? (schema.statusDomain?.[0]?.label ?? '정상'),
    trend: initial?.trend ?? [4, 6, 5, 8, 7],
  } as Row;
}
