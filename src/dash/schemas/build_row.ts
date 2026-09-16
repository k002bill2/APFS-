/* build_row.ts — Row 조립 순수 모듈. React import 금지.
   vals(Record<string,string>) → 타입 안전한 Row.
   ★ 핵심 ①: vals를 먼저 전개한 뒤 숫자/정제 필드를 덮어써야
           문자열이 number를 오염시키지 않는다.
   ★ 핵심 ②: **initial 을 vals 보다 먼저 전개한다**(2026-09-16 Codex 5R P1).
           `fields`(등록/수정 폼)는 컬럼의 부분집합이라, 원문 리터럴 행이 실린 뒤로는
           폼에 없는 컬럼(no·운용사·자펀드·사업자번호·수정일시·업로드여부 …)이 수정 저장 한 번에
           통째로 사라졌다. 편집은 **폼 항목만 덮어쓰는 병합**이어야 한다. */
import type { Row } from '../generic_list_modal';
import type { PageSchema } from './types';

export function buildRow(vals: Record<string, string>, initial: Row | undefined, schema: PageSchema): Row {
  return {
    ...(initial as Record<string, unknown> | undefined),   // ← FIRST: 기존 행 전체(폼에 없는 컬럼 보존)
    ...(vals as Record<string, unknown>),   // ← 그 위에 폼 값(raw strings)
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
