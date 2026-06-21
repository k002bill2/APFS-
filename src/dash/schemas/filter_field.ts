/* filter_field.ts — 필터 라벨 → 컨트롤 타입/값도메인 도출 (순수 모듈, React import 금지).
   스키마 타입을 바꾸지 않고(DRY) 기존 fields/columns/statusDomain + 라벨 휴리스틱으로
   상세 필터 드로어의 컨트롤(year/enum/date/number/text/tag)과 행 필터 키를 결정한다. */
import type { PageSchema } from './types';

export type FilterKind = 'year' | 'enum' | 'date' | 'number' | 'text' | 'tag';

export interface FilterField {
  label: string;        // 필터 라벨 (== schema.filters 항목)
  kind: FilterKind;     // 렌더할 컨트롤 종류
  options: string[];    // year/enum 선택지 (그 외 [])
  columnKey?: string;   // 행 데이터에서 매칭할 키 (해결 가능할 때만 — 없으면 행필터 불가)
}

// 사업/회계 년도 선택지 — 현재 연도(2026) 기준 내림차순 7년. (시드/픽커 공용 고정 도메인)
export const YEAR_OPTIONS: readonly string[] = ['2026', '2025', '2024', '2023', '2022', '2021', '2020'];

const isYearLabel = (s: string) => /(년도|연도)/.test(s);
const isDateLabel = (s: string) => /(일자|날짜)/.test(s) || /일$/.test(s);
const isEnumLabel = (s: string) => /(구분|유형|종류|상태|기준)/.test(s);

const year = (label: string, columnKey?: string): FilterField => ({ label, kind: 'year', options: [...YEAR_OPTIONS], columnKey });

export function resolveFilterField(label: string, schema: PageSchema): FilterField {
  // columnKey 불변식: 행은 schema.columns로 시드되므로, columns에 실재하는 키일 때만 columnKey를 부여한다.
  // (field-only 키를 columnKey로 주면 makeRows가 시드하지 않아 침묵 0건이 됨 → 차라리 미부여=no-op+캡션으로 격하)
  const colKey = (k: string) => (schema.columns.some((c) => c.key === k) ? k : undefined);
  // 1) 폼 필드 매칭 — control + options 로 가장 정확한 타입
  const field = schema.fields.find((f) => f.label === label);
  if (field) {
    const key = colKey(field.key);
    if (field.control === 'select') {
      const opts = field.options ?? [];
      // 빈 옵션 select 금지 → text로 격하 (step3와 동일 정책)
      return opts.length ? { label, kind: 'enum', options: opts, columnKey: key } : { label, kind: 'text', options: [], columnKey: key };
    }
    if (field.control === 'date') return { label, kind: 'date', options: [], columnKey: key };
    if (isYearLabel(label)) return year(label, key);
    if (field.control === 'number') return { label, kind: 'number', options: [], columnKey: key };
    return { label, kind: 'text', options: [], columnKey: key };
  }
  // 2) 컬럼 매칭 — type + statusDomain 로 도출 (col.key는 정의상 columns에 존재)
  const col = schema.columns.find((c) => c.label === label);
  if (col) {
    if (isYearLabel(label)) return year(label, col.key);
    if (col.type === 'date') return { label, kind: 'date', options: [], columnKey: col.key };
    if (col.type === 'status') {
      const opts = (schema.statusDomain ?? []).map((s) => s.label);
      // statusDomain 부재 시 빈 select 금지 → text 격하
      return opts.length ? { label, kind: 'enum', options: opts, columnKey: col.key } : { label, kind: 'text', options: [], columnKey: col.key };
    }
    if (col.type === 'amount' || col.type === 'number' || col.type === 'rate') return { label, kind: 'number', options: [], columnKey: col.key };
    return { label, kind: 'text', options: [], columnKey: col.key };
  }
  // 3) 스키마 무매칭 — 라벨 휴리스틱 (columnKey 없음 → 칩만 설정, 행필터 불가)
  if (isYearLabel(label)) return year(label);
  if (isDateLabel(label)) return { label, kind: 'date', options: [] };
  if (isEnumLabel(label)) return { label, kind: 'text', options: [] }; // 도메인 미상 → 빈 select 대신 text
  return { label, kind: 'tag', options: [] }; // 순수 카테고리 태그 → on/off
}
