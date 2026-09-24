import { z } from 'zod';
import type { Tone } from '../components';

export const CELL_TYPES = ['text','code','pii','amount','rate','date','status','gp','number'] as const;
export type CellType = typeof CELL_TYPES[number];

// 'year' = 연도 선택(PeriodPicker mode='year'). 값 계약은 'YYYY' 문자열 — 'date'(=YYYY-MM-DD)와 다른 축이다.
// 'month' = 월 선택(PeriodPicker mode='month'). 값 계약은 'YYYY-MM' 문자열 — 기준년월·등록년월처럼
//   원문이 월 단위인 필드용(2026-09-22 추가). 'date'로 두면 일자까지 강요해 행의 'YYYY-MM' 컬럼과 어긋나고,
//   'text'로 두면 달력 없이 손입력이 된다. 드로어 쪽 월 선택(early_warning_manage)과 같은 PeriodPicker를 쓴다.
// 'address' = 우편번호 검색 + 주소 입력(fields/AddressField). 값 계약은 단일 문자열 '(12345) 서울특별시 …'
//   — 파싱/직렬화 SSOT는 fields/address_value.ts. 별도 상세주소 필드를 두지 않고 본문 뒤에 이어 쓴다.
export const FIELD_CONTROLS = ['text','number','select','date','year','month','textarea','file','checkbox','switch','readonly','radio','richtext','filepond','tags','address'] as const;
export type FieldControl = typeof FIELD_CONTROLS[number];

export const TONE_VALUES = ['primary','success','warning','danger','info','cyan'] as const;

// 읽기전용 상세 보고서 팝업 종류. 컬럼이 detail을 선언하면 그 셀 값이 링크가 되어 해당 팝업을 연다.
// 팝업 컴포넌트 매핑은 소비처(generic_list.tsx)가 갖는다 — 스키마는 어떤 팝업인지만 선언한다.
export const DETAIL_POPUPS = ['monthlyReport', 'gpSpec', 'companyProfile', 'mgmtFeeDetail', 'dueDiligChecklist', 'gpRatioDetail'] as const;
export type DetailPopup = typeof DETAIL_POPUPS[number];

// attachFrom: 이 컬럼의 값 뒤에 첨부파일 확장자 칩(PDF 등)을 붙인다. 값은 같은 행의 **필드 키**
// (예: title 컬럼 + attachFrom:'attachment') — 첨부는 별도 컬럼을 만들지 않고 제목에 붙여 표현한다.
// detail/detailWhen/detailPattern: 이 컬럼 값을 클릭(또는 셀 Enter)하면 읽기전용 상세 팝업을 연다.
// detailWhen이 있으면 **값이 그것과 같은 행만** 링크가 되고 나머지는 평상 셀이다(예: 보고구분 '월간보고'만
//   상세가 있는 정기보고). detailPattern은 같은 판정을 **값의 형식**으로 한다(정규식 source 문자열) —
//   S1_40 실사일자는 원문이 `/^\d{4}-\d{2}-\d{2}$/` 를 통과한 행만 버튼으로 만들고 ''·'X'는 평상 셀이라
//   동등비교로 표현할 수 없다. 판정 정본은 schemas/detail_link.ts 의 linksDetail 하나다(소비처 3곳 공유).
// 선언이 없는 스키마는 종전과 동일하게 동작한다(opt-in).
// group: 2단 헤더의 상위 묶음 이름. **연속한** 컬럼이 같은 group이면 하나의 ColGroupDef로 접힌다
//   (컬럼 수십 개를 단일 헤더로 늘어놓으면 판독 불가 — S1_31 58컬럼·S1_33 회수실적 4컬럼이 원문에서 2단이다).
// pinned: 좌측 고정 열. 와이드 표에서 가로 스크롤 중에도 식별 컬럼(운용사·자펀드·투자기업)을 붙잡아 둔다.
//   폭은 **고정이 아니라 하한**으로 둔다 — 400% 확대 시 고정 폭 pinned가 화면을 다 먹는다(A11Y 10).
// inlineSelect: **셀 안에서 값을 바꾸는 select**. 원문이 "조회 화면인데 이 컬럼 하나만 편집"인 경우다
//   (S1_43 관리보수관리의 확정여부 미확정↔확정 — `<select class="cellsel" data-cfm>`).
//   `fields` 로는 대신할 수 없다 — fields 는 `editable = fields.length > 0` 을 켜서 원문에 없는
//   `등록` 버튼과 등록/수정 모달을 함께 만든다(generic_list.tsx). 그래서 컬럼 수준 계약을 둔다.
//   선언하면 그 셀은 StatusBadge/Cell 대신 select 만 그린다(원문도 `cfmTag()` 를 정의해 놓고 쓰지 않는다).
// multiline: 줄바꿈이 든 본문 셀(사후관리 내용 등)을 `white-space: pre-line` 으로 편다.
//   기본 셀은 nowrap+ellipsis 라 여러 줄 원문이 한 줄로 잘려 내용을 잃는다(원문 `.content-cell`).
export interface ColumnSpec { key: string; label: string; type: CellType; unit?: string; align?: 'left'|'right'|'center'; group?: string; pinned?: 'left'; attachFrom?: string; detail?: DetailPopup; detailWhen?: string; detailPattern?: string; inlineSelect?: string[]; multiline?: boolean; }
// long: 긴 텍스트 필드(설명·비고·운용사명·펀드명·주소 등) 표식 — 모달에서 2단 전체 폭(sm:col-span-2) +
//   컨트롤 width:100%(fit-content 240px 하한 해제)로 렌더한다. 짧은 코드/일자 필드와 구분하는 유일한 SSOT.
// placeholder: 비어 있을 때 입력칸에 보이는 힌트(text/number/textarea 에만 적용 — 나머지 컨트롤은 무시).
//   목업 원문이 placeholder 를 지정한 필드를 그대로 옮길 때 쓴다(2026-09-22 추가). 미지정이면 종전과 동일.
export interface FieldSpec { key: string; label: string; control: FieldControl; required?: boolean; options?: string[]; pii?: boolean; long?: boolean; placeholder?: string; }
export interface KpiSpec { key: string; label: string; icon: string; color: string; from: 'sum'|'avg'|'rate'; column: string; }
// 건수형 KPI — 금액 집계가 아닌 행 카운트. column+value 있으면 그 값과 일치하는 행 수, 없으면 전체 건수.
export interface CountKpiSpec { label: string; icon: string; color: string; column?: string; value?: string; }
export interface StatusDomainEntry { label: string; tone: Tone; }
export interface Provenance { capturedAt: string; sourceSystem: string; captureFile: string; sourceUrl?: string; }
// 리터럴 샘플 행 — 목업/캡처의 실제 데이터를 그대로 보여줄 때(합성 더미 대신).
// 키는 column/field key와 일치. 부재 시 generic_list의 makeRows가 결정적 더미를 합성한다.
export type SampleRow = Record<string, string | number>;

/* 합계(pinned bottom) 행 — **opt-in**. 원문 `<tfoot>` 합계가 있는 스키마만 선언한다(미선언 스키마는 합계 행 없음 — 종전 동작).
   칸 규칙은 typed 트랙 risk_table_meta.ts TotalRule 과 같은 뜻을 쓴다(어휘를 새로 만들지 않는다):
   'sum' = 합산(null·비숫자는 0) · 'dash' = '-' 표시 · 미지정 = 빈 칸(원문 colspan 라벨 영역).
   함수 규칙은 스키마가 데이터(zod)라 못 싣는다 — 대신 이름 붙은 파생 규칙 하나만 둔다:
   'nextSeq' = 합계 대상 행 수 + 1(원문 S1_33 `연번` 은 합계 행까지 매긴 일련번호 — 1건이면 2).
   라벨의 `{n}` 은 합계 대상(필터 결과) 행 수로 치환한다(원문 '합계 1건'). 계산 정본은 schemas/totals.ts. */
export const TOTAL_RULES = ['sum', 'dash', 'nextSeq'] as const;
export type TotalRuleName = typeof TOTAL_RULES[number];
export interface TotalsSpec {
  label: string;
  /** 라벨을 싣는 컬럼 key(원문 colspan 라벨 영역의 시작). 미지정 = 첫 컬럼 */
  labelKey?: string;
  rules: Record<string, TotalRuleName>;
}
/* 상세필터 항목 명세 — **opt-in**. 원문 검색박스 항목이 columns/fields 라벨로 도출되지 않을 때
   (원문 옵션·기본값·범위·코드/명칭 검색, 또는 원문 행에 대응 값이 없음) 라벨 단위로 선언한다.
   미선언 라벨·미선언 스키마는 종전 resolveFilterField 도출 그대로다.
   어휘는 typed 트랙 risk_tables_page.FilterDef 와 같다(새로 만들지 않는다):
   · kind: select · text · day · month · dayRange('YYYY-MM-DD~YYYY-MM-DD') · monthRange('YYYY-MM~YYYY-MM')
           · codeName('코드~명칭' — 원문 코드 입력 + 명칭 입력 + 검색 버튼 묶음. 행 매칭은 명칭 부분일치)
   · options: select 선택지(원문 <select>/LISTS 그대로, '전체' 제외 — 드로어가 붙인다).
              원문이 '전체'만 가진 select 는 options 를 비운다 → 빈 select 금지 규약에 따라 text 로 격하.
   · def: 원문 초기값 — 마운트 시 적용되고 '초기화'가 이 값으로 되돌린다.
   · allLabel: null = 원문 select 에 '전체'가 없다(빈 선택지·칩 × 없음, def 필수).
   · key: 행 매칭 키. **생략 = no-op**(원문 행에 그 값이 없음 → `· 데이터 연동 후 적용` 캡션).
   판정 정본은 filter_field.ts(resolveFilterField · filterValueMatches · defaultFilterValues). */
export const FILTER_KINDS = ['select', 'text', 'day', 'month', 'dayRange', 'monthRange', 'codeName'] as const;
export type SchemaFilterKind = typeof FILTER_KINDS[number];
export interface SchemaFilterSpec {
  kind: SchemaFilterKind;
  options?: string[];
  def?: string;
  allLabel?: null;
  key?: string;
}
export interface PageSchema {
  route: string; title: string; kind: 'list'|'form'; entity: string;
  columns: ColumnSpec[]; fields: FieldSpec[];
  filters?: string[]; kpis?: KpiSpec[]; statusDomain?: StatusDomainEntry[];
  // 상세필터 항목 명세(opt-in) — 위 SchemaFilterSpec 주석 참조
  filterSpecs?: Record<string, SchemaFilterSpec>;
  // 상세필터 최상단 검색어 입력(전 컬럼 부분일치) 노출 여부. 기본 OFF(opt-in) — 필요한 페이지만 true.
  searchable?: boolean;
  sample?: SampleRow[];
  // 금액·변동률 개념이 없는 엔티티(공고 등): 제네릭 KPI 배지·카드뷰 금액/상태를 숨긴다.
  hideMetrics?: boolean;
  // 건수형 KPI(계정구분별 등). 있으면 제네릭 금액 KPI 대신 이것을 렌더한다.
  countKpis?: CountKpiSpec[];
  // 카드헤더 KPI 배지 행 전체를 숨긴다(헤더 슬롯만 — 카드뷰 금액/상태는 유지, hideMetrics와 분리).
  // KPI 행은 생성 스킬 HITL에서 "미포함" 선택 시 true. countKpis/제네릭 금액 KPI 모두 무력화.
  hideKpis?: boolean;
  // 행 선택 체크박스 컬럼(+헤더 전체선택)을 없앤다 → 다건 선택/선택삭제 툴바도 함께 사라진다.
  // 단건 CRUD만 있는 화면(공고 등)에서 선택 UI가 군더더기일 때. 행 수정은 더블클릭·Enter·우클릭 메뉴로 유지.
  hideRowSelection?: boolean;
  // 푸터의 리스트 뷰|카드뷰 SegTabs를 숨기고 리스트 뷰로 고정한다(카드뷰가 의미 없는 엔티티).
  // 표현 전용 — hideKpis(헤더 KPI만)·hideMetrics(금액 개념 전체)와 독립.
  hideCardView?: boolean;
  // 툴바 우측에 금액 단위 SegTabs(원/백만원/억원)를 노출한다. **opt-in** — 선언하지 않은 스키마는
  // 종전 동작 그대로다(원 단위 원시값). 목업 8종이 갖고 있는 공통 기능의 공유 구현(§4.2).
  // 환산 대상은 type:'amount' 컬럼뿐이며, 환산은 **셀 렌더·엑셀 경계에서만** 한다 —
  // rows에 환산값을 써넣으면 KPI 합계·필터 비교값까지 같이 흔들린다.
  unitToggle?: boolean;
  // 토글의 **초기 선택값**. 목업마다 다르다(S1_33 은 `var unit='억원'`으로 시작한다) —
  // 미지정이면 unit.ts 의 DEFAULT_UNIT('원'). 저장 단위(원)와는 다른 축이다: 표시 기본값일 뿐.
  defaultUnit?: string;
  // 합계 행(opt-in) — 위 TotalsSpec 주석 참조
  totals?: TotalsSpec;
  provenance: Provenance;
}

const ColumnZ = z.object({
  key: z.string(), label: z.string(), type: z.enum(CELL_TYPES),
  unit: z.string().optional(), align: z.enum(['left','right','center']).optional(), group: z.string().optional(),
  pinned: z.literal('left').optional(),
  attachFrom: z.string().optional(),
  detail: z.enum(DETAIL_POPUPS).optional(), detailWhen: z.string().optional(),
  /* 잘못된 정규식은 **파싱 시점에** 잡는다 — 렌더 중 new RegExp 가 throw 하면 화면이 통째로 백지가 된다. */
  detailPattern: z.string().optional().refine(
    (src) => { if (src == null) return true; try { new RegExp(src); return true; } catch { return false; } },
    { message: 'detailPattern must be a valid RegExp source' },
  ),
  multiline: z.boolean().optional(),
  // 선택지가 2개 미만이면 고를 것이 없다 — 선언 실수를 파싱 시점에 잡는다
  inlineSelect: z.array(z.string()).min(2).optional(),
});
const FieldZ = z.object({
  key: z.string(), label: z.string(), control: z.enum(FIELD_CONTROLS),
  required: z.boolean().optional(), options: z.array(z.string()).optional(), pii: z.boolean().optional(), long: z.boolean().optional(),
  placeholder: z.string().optional(),
});
const KpiZ = z.object({ key: z.string(), label: z.string(), icon: z.string(), color: z.string(), from: z.enum(['sum','avg','rate']), column: z.string() });
const ProvenanceZ = z.object({ capturedAt: z.string(), sourceSystem: z.string(), captureFile: z.string(), sourceUrl: z.string().optional() });

export const PageSchemaZ = z.object({
  route: z.string(), title: z.string(), kind: z.enum(['list','form']), entity: z.string(),
  columns: z.array(ColumnZ), fields: z.array(FieldZ),
  filters: z.array(z.string()).optional(), kpis: z.array(KpiZ).optional(),
  filterSpecs: z.record(z.string(), z.object({
    kind: z.enum(FILTER_KINDS),
    options: z.array(z.string()).optional(),
    def: z.string().optional(),
    allLabel: z.null().optional(),
    key: z.string().optional(),
  })).optional(),
  statusDomain: z.array(z.object({ label: z.string(), tone: z.enum(TONE_VALUES) })).optional(),
  sample: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).optional(),
  hideMetrics: z.boolean().optional(),
  searchable: z.boolean().optional(),
  countKpis: z.array(z.object({ label: z.string(), icon: z.string(), color: z.string(), column: z.string().optional(), value: z.string().optional() })).optional(),
  hideKpis: z.boolean().optional(),
  hideRowSelection: z.boolean().optional(),
  hideCardView: z.boolean().optional(),
  unitToggle: z.boolean().optional(),
  defaultUnit: z.string().optional(),
  totals: z.object({
    label: z.string().min(1),
    labelKey: z.string().optional(),
    rules: z.record(z.string(), z.enum(TOTAL_RULES)),
  }).optional(),
  provenance: ProvenanceZ,
}).superRefine((s, ctx) => {
  /* 필터 명세가 죽은 선언이면 **조용히 무효 필터**가 된다 — 파싱 시점에 잡는다:
     filters 에 없는 라벨 · 행에 시드되지 않는 key(columnKey 불변식) · 선택지 밖 def · def 없는 allLabel:null */
  const issue = (message: string) => ctx.addIssue({ code: 'custom', path: ['filterSpecs'], message });
  const seeded = (k: string) => s.columns.some((c) => c.key === k) || !!s.sample?.some((r) => r[k] !== undefined);
  for (const [label, f] of Object.entries(s.filterSpecs ?? {})) {
    if (!(s.filters ?? []).includes(label)) issue(`filterSpecs label not in filters: ${label}`);
    if (f.key && !seeded(f.key)) issue(`filterSpecs key not seeded: ${label} → ${f.key}`);
    if (f.kind === 'select' && f.def && !(f.options ?? []).includes(f.def)) issue(`filterSpecs def not in options: ${label}`);
    if (f.allLabel === null && !f.def) issue(`filterSpecs allLabel:null needs def: ${label}`);
  }
  /* 합계 규칙·라벨 칸이 columns 에 없는 key 면 **조용히 빈 합계**가 된다 — 파싱 시점에 잡는다 */
  if (!s.totals) return;
  const keys = new Set(s.columns.map((c) => c.key));
  for (const k of [...Object.keys(s.totals.rules), ...(s.totals.labelKey ? [s.totals.labelKey] : [])]) {
    if (!keys.has(k)) ctx.addIssue({ code: 'custom', path: ['totals'], message: `totals key not in columns: ${k}` });
  }
});

export function parsePageSchema(obj: unknown): PageSchema {
  return PageSchemaZ.parse(obj);
}
