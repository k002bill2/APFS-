import { z } from 'zod';
import type { Tone } from '../components';

export const CELL_TYPES = ['text','code','pii','amount','rate','date','status','gp','number'] as const;
export type CellType = typeof CELL_TYPES[number];

export const FIELD_CONTROLS = ['text','number','select','date','textarea','file','checkbox','switch','readonly','radio','richtext','filepond','tags'] as const;
export type FieldControl = typeof FIELD_CONTROLS[number];

export const TONE_VALUES = ['primary','success','warning','danger','info','cyan'] as const;

// 읽기전용 상세 보고서 팝업 종류. 컬럼이 detail을 선언하면 그 셀 값이 링크가 되어 해당 팝업을 연다.
// 팝업 컴포넌트 매핑은 소비처(generic_list.tsx)가 갖는다 — 스키마는 어떤 팝업인지만 선언한다.
export const DETAIL_POPUPS = ['monthlyReport'] as const;
export type DetailPopup = typeof DETAIL_POPUPS[number];

// attachFrom: 이 컬럼의 값 뒤에 첨부파일 확장자 칩(PDF 등)을 붙인다. 값은 같은 행의 **필드 키**
// (예: title 컬럼 + attachFrom:'attachment') — 첨부는 별도 컬럼을 만들지 않고 제목에 붙여 표현한다.
// detail/detailWhen: 이 컬럼 값을 클릭(또는 셀 Enter)하면 읽기전용 상세 팝업을 연다. detailWhen이 있으면
// **값이 그것과 같은 행만** 링크가 되고 나머지는 평상 셀이다(예: 보고구분 '월간보고'만 상세가 있는 정기보고).
// 선언이 없는 스키마는 종전과 동일하게 동작한다(opt-in).
export interface ColumnSpec { key: string; label: string; type: CellType; unit?: string; align?: 'left'|'right'|'center'; group?: string; attachFrom?: string; detail?: DetailPopup; detailWhen?: string; }
// note: 라벨 옆 ⚠검토필요 마커(목업 `.review` data-rec/data-dat 원문). RowFormModal이 Field 라벨에 ReviewMarker로 렌더한다.
// 설계 메모라 마스킹·엑셀 대상이 아니며, 문구는 목업 원문 그대로(창작 금지 — apfs-grid "검토필요 마커").
export interface ReviewNoteSpec { rec: string; dat: string; }
// long: 긴 텍스트 필드(설명·비고·운용사명·펀드명·주소 등) 표식 — 모달에서 2단 전체 폭(sm:col-span-2) +
//   컨트롤 width:100%(fit-content 240px 하한 해제)로 렌더한다. 짧은 코드/일자 필드와 구분하는 유일한 SSOT.
export interface FieldSpec { key: string; label: string; control: FieldControl; required?: boolean; options?: string[]; pii?: boolean; long?: boolean; note?: ReviewNoteSpec; }
export interface KpiSpec { key: string; label: string; icon: string; color: string; from: 'sum'|'avg'|'rate'; column: string; }
// 건수형 KPI — 금액 집계가 아닌 행 카운트. column+value 있으면 그 값과 일치하는 행 수, 없으면 전체 건수.
export interface CountKpiSpec { label: string; icon: string; color: string; column?: string; value?: string; }
export interface StatusDomainEntry { label: string; tone: Tone; }
export interface Provenance { capturedAt: string; sourceSystem: string; captureFile: string; sourceUrl?: string; }
// 리터럴 샘플 행 — 목업/캡처의 실제 데이터를 그대로 보여줄 때(합성 더미 대신).
// 키는 column/field key와 일치. 부재 시 generic_list의 makeRows가 결정적 더미를 합성한다.
export type SampleRow = Record<string, string | number>;
export interface PageSchema {
  route: string; title: string; kind: 'list'|'form'; entity: string;
  columns: ColumnSpec[]; fields: FieldSpec[];
  filters?: string[]; kpis?: KpiSpec[]; statusDomain?: StatusDomainEntry[];
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
  provenance: Provenance;
}

const ColumnZ = z.object({
  key: z.string(), label: z.string(), type: z.enum(CELL_TYPES),
  unit: z.string().optional(), align: z.enum(['left','right','center']).optional(), group: z.string().optional(),
  attachFrom: z.string().optional(),
  detail: z.enum(DETAIL_POPUPS).optional(), detailWhen: z.string().optional(),
});
const FieldZ = z.object({
  key: z.string(), label: z.string(), control: z.enum(FIELD_CONTROLS),
  required: z.boolean().optional(), options: z.array(z.string()).optional(), pii: z.boolean().optional(), long: z.boolean().optional(),
  note: z.object({ rec: z.string(), dat: z.string() }).optional(),
});
const KpiZ = z.object({ key: z.string(), label: z.string(), icon: z.string(), color: z.string(), from: z.enum(['sum','avg','rate']), column: z.string() });
const ProvenanceZ = z.object({ capturedAt: z.string(), sourceSystem: z.string(), captureFile: z.string(), sourceUrl: z.string().optional() });

export const PageSchemaZ = z.object({
  route: z.string(), title: z.string(), kind: z.enum(['list','form']), entity: z.string(),
  columns: z.array(ColumnZ), fields: z.array(FieldZ),
  filters: z.array(z.string()).optional(), kpis: z.array(KpiZ).optional(),
  statusDomain: z.array(z.object({ label: z.string(), tone: z.enum(TONE_VALUES) })).optional(),
  sample: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).optional(),
  hideMetrics: z.boolean().optional(),
  searchable: z.boolean().optional(),
  countKpis: z.array(z.object({ label: z.string(), icon: z.string(), color: z.string(), column: z.string().optional(), value: z.string().optional() })).optional(),
  hideKpis: z.boolean().optional(),
  hideRowSelection: z.boolean().optional(),
  hideCardView: z.boolean().optional(),
  provenance: ProvenanceZ,
});

export function parsePageSchema(obj: unknown): PageSchema {
  return PageSchemaZ.parse(obj);
}
