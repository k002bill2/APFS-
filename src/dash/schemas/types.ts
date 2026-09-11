import { z } from 'zod';
import type { Tone } from '../components';

export const CELL_TYPES = ['text','code','pii','amount','rate','date','status','gp','number'] as const;
export type CellType = typeof CELL_TYPES[number];

export const FIELD_CONTROLS = ['text','number','select','date','textarea','file','checkbox','readonly','radio','richtext','filepond','tags'] as const;
export type FieldControl = typeof FIELD_CONTROLS[number];

export const TONE_VALUES = ['primary','success','warning','danger','info','cyan'] as const;

export interface ColumnSpec { key: string; label: string; type: CellType; unit?: string; align?: 'left'|'right'|'center'; group?: string; }
export interface FieldSpec { key: string; label: string; control: FieldControl; required?: boolean; options?: string[]; pii?: boolean; }
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
  provenance: Provenance;
}

const ColumnZ = z.object({
  key: z.string(), label: z.string(), type: z.enum(CELL_TYPES),
  unit: z.string().optional(), align: z.enum(['left','right','center']).optional(), group: z.string().optional(),
});
const FieldZ = z.object({
  key: z.string(), label: z.string(), control: z.enum(FIELD_CONTROLS),
  required: z.boolean().optional(), options: z.array(z.string()).optional(), pii: z.boolean().optional(),
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
  provenance: ProvenanceZ,
});

export function parsePageSchema(obj: unknown): PageSchema {
  return PageSchemaZ.parse(obj);
}
