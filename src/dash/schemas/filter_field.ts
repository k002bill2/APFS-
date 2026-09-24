/* filter_field.ts — 필터 라벨 → 컨트롤 타입/값도메인 도출 (순수 모듈, React import 금지).
   스키마 타입을 바꾸지 않고(DRY) 기존 fields/columns/statusDomain + 라벨 휴리스틱으로
   상세 필터 드로어의 컨트롤(year/enum/date/number/text/tag)과 행 필터 키를 결정한다. */
import type { PageSchema } from './types';

/* dayRange·monthRange·codeName 은 schema.filterSpecs(opt-in)로만 생긴다 — 라벨 휴리스틱은 만들지 않는다.
   값은 모두 'a~b' 한 문자열(filterValues 가 Record<라벨, string> 이라서) — splitPair/joinPair 가 정본. */
export type FilterKind = 'year' | 'month' | 'enum' | 'date' | 'number' | 'text' | 'tag' | 'dayRange' | 'monthRange' | 'codeName';

export interface FilterField {
  label: string;        // 필터 라벨 (== schema.filters 항목)
  kind: FilterKind;     // 렌더할 컨트롤 종류
  options: string[];    // year/enum 선택지 (그 외 [])
  columnKey?: string;   // 행 데이터에서 매칭할 키 (해결 가능할 때만 — 없으면 행필터 불가)
  allLabel?: null;      // null = 원문 select 에 '전체'가 없다(빈 선택지·칩 × 없음) — filterSpecs 전용
}

/** 'a~b' ↔ [a, b] — 범위(from~to)·코드/명칭(code~name) 공용. 둘 다 비면 '' (= 비활성) */
export const splitPair = (v: string): [string, string] => { const [a = '', b = ''] = v.split('~'); return [a, b]; };
export const joinPair = (a: string, b: string): string => (a || b ? `${a}~${b}` : '');

// 사업/회계 년도 선택지 — 현재 연도(2026) 기준 내림차순 7년. (시드/픽커 공용 고정 도메인)
export const YEAR_OPTIONS: readonly string[] = ['2026', '2025', '2024', '2023', '2022', '2021', '2020'];

const isYearLabel = (s: string) => /(년도|연도)/.test(s);
const isDateLabel = (s: string) => /(일자|날짜)/.test(s) || /일$/.test(s);
const isEnumLabel = (s: string) => /(구분|유형|종류|상태|기준)/.test(s);

/** 선택지가 정해진 폼 컨트롤 — 필터에선 enum(<select>)이 된다. radio·switch 도 모달 표현만 다를 뿐 열거형이다
    (2026-09-24: 종전엔 select 만 enum 이라 위원구분·사용여부 등이 자유 텍스트로 떨어졌다). makeRows 시드와 공유. */
export const isEnumControl = (control: string): boolean => control === 'select' || control === 'radio' || control === 'switch';

const year = (label: string, columnKey?: string): FilterField => ({ label, kind: 'year', options: [...YEAR_OPTIONS], columnKey });

export function resolveFilterField(label: string, schema: PageSchema): FilterField {
  // columnKey 불변식: **행에 그 키가 실제로 시드될 때만** columnKey를 부여한다
  // (시드 안 되는 키를 주면 매칭이 전무해 침묵 0건 → 차라리 미부여=no-op+캡션으로 격하).
  // 시드 경로는 둘: ① schema.columns(makeRows 합성 시드) ② schema.sample(목업 리터럴 행 — 컬럼이 아닌
  // 필드 키도 값이 실린다). ②를 인정해야 '모펀드'(field-only 키, 2026-09-12) 같은 필터가 진짜로 행을 거른다.
  // sample 없는 스키마는 종전과 동일하게 격하된다.
  const seeded = (k: string) => schema.columns.some((c) => c.key === k)
    || !!schema.sample?.some((r) => r[k] !== undefined);
  const colKey = (k: string) => (seeded(k) ? k : undefined);
  // 0) 명시 명세(schema.filterSpecs, opt-in) — 원문 옵션·범위·코드/명칭을 싣는다. key 생략 = no-op.
  const spec = schema.filterSpecs?.[label];
  if (spec) {
    const base = { label, columnKey: spec.key ? colKey(spec.key) : undefined, ...(spec.allLabel === null ? { allLabel: null } : {}) };
    if (spec.kind === 'select') {
      const opts = spec.options ?? [];
      // 원문이 '전체'만 가진 select(선택지 미확인) → 빈 select 금지 규약대로 text 격하
      return opts.length ? { ...base, kind: 'enum', options: [...opts] } : { label, kind: 'text', options: [], columnKey: base.columnKey };
    }
    const kind: FilterKind = spec.kind === 'day' ? 'date' : spec.kind;
    return { ...base, kind, options: [] };
  }
  // 1) 폼 필드 매칭 — control + options 로 가장 정확한 타입
  const field = schema.fields.find((f) => f.label === label);
  if (field) {
    const key = colKey(field.key);
    if (isEnumControl(field.control)) {
      const opts = field.options ?? [];
      // 빈 옵션 select 금지 → text로 격하 (step3와 동일 정책)
      return opts.length ? { label, kind: 'enum', options: opts, columnKey: key } : { label, kind: 'text', options: [], columnKey: key };
    }
    if (field.control === 'date') return { label, kind: 'date', options: [], columnKey: key };
    /* 월 선택(값 'YYYY-MM') — date 와 같이 **선언된 control 이 라벨 휴리스틱을 이긴다**.
       이 분기가 없으면 라벨에 '년도/연도'가 없는 월 필드(예: '기준년월')가 isYearLabel 도 못 넘어
       자유 텍스트로 조용히 격하된다(FIELD_CONTROLS 에 'month' 를 추가하며 남은 구멍, 2026-09-22). */
    if (field.control === 'month') return { label, kind: 'month', options: [], columnKey: key };
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
  // '…년월'(평가년월 등) — 행 컬럼 없는 조회 기준 월. tag 로 두면 켜는 순간 표가 비워지므로 월 선택 no-op(칩+캡션).
  // enum 휴리스틱 **뒤**에 둔다: '기준년월'(기준 포함)은 종전대로 text — tag 로 떨어지던 라벨만 바뀐다(2026-09-23).
  if (/년월$/.test(label)) return { label, kind: 'month', options: [] };
  return { label, kind: 'tag', options: [] }; // 순수 카테고리 태그 → on/off
}

/** 값-필터 1개가 셀 값 하나를 통과시키는가(tag·columnKey 없음은 호출부가 거른다).
    text/number = 부분일치 · year/month/enum/date = 정확일치 ·
    dayRange/monthRange = 경계 포함 범위(한쪽이 비면 열린 경계 — 'YYYY-MM(-DD)' 은 문자열 비교가 곧 시간 비교) ·
    codeName = 명칭 부분일치(원문 행에 코드 컬럼이 없어 코드는 조회 파라미터로만 남는다). */
export function filterValueMatches(ff: FilterField, value: string, cell: unknown): boolean {
  const rv = String(cell ?? '');
  if (ff.kind === 'text' || ff.kind === 'number') return rv.toLowerCase().includes(value.toLowerCase());
  if (ff.kind === 'dayRange' || ff.kind === 'monthRange') {
    const [a, b] = splitPair(value);
    // 날짜가 아닌 셀('-'·'')은 범위 밖이다 — 안 거르면 '-' < '2…' 라 상한만 준 범위를 통과한다
    if (!/^\d{4}-\d{2}/.test(rv)) return false;
    return (!a || rv >= a) && (!b || rv <= b);
  }
  if (ff.kind === 'codeName') {
    const name = splitPair(value)[1].trim();
    return !name || rv.toLowerCase().includes(name.toLowerCase());
  }
  return rv === value;
}

/** 원문 초기값 — filterSpecs 의 def 만 모은다(미선언 스키마 = {} → 종전 동작) */
export function defaultFilterValues(schema: PageSchema): Record<string, string> {
  return Object.fromEntries(Object.entries(schema.filterSpecs ?? {}).filter(([, f]) => !!f.def).map(([label, f]) => [label, f.def!]));
}

/** 적용 칩 표시 문자열 — 범위는 'a ~ b', 코드/명칭은 '코드 명칭', 그 외는 값 그대로 */
export function filterChipText(ff: FilterField, value: string): string {
  if (ff.kind === 'dayRange' || ff.kind === 'monthRange') return splitPair(value).join(' ~ ');
  if (ff.kind === 'codeName') return splitPair(value).filter(Boolean).join(' ');
  return value;
}
