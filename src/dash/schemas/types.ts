import { z } from 'zod';
import type { Tone } from '../components';

export const CELL_TYPES = ['text','code','pii','amount','rate','date','status','gp','number'] as const;
export type CellType = typeof CELL_TYPES[number];

export const FIELD_CONTROLS = ['text','number','select','date','textarea','file','checkbox','readonly','radio','richtext','filepond'] as const;
export type FieldControl = typeof FIELD_CONTROLS[number];

export const TONE_VALUES = ['primary','success','warning','danger','info','cyan'] as const;

export interface ColumnSpec { key: string; label: string; type: CellType; unit?: string; align?: 'left'|'right'|'center'; group?: string; }
export interface FieldSpec { key: string; label: string; control: FieldControl; required?: boolean; options?: string[]; pii?: boolean; }
export interface KpiSpec { key: string; label: string; icon: string; color: string; from: 'sum'|'avg'|'rate'; column: string; }
export interface StatusDomainEntry { label: string; tone: Tone; }
export interface Provenance { capturedAt: string; sourceSystem: string; captureFile: string; sourceUrl?: string; }
export interface PageSchema {
  route: string; title: string; kind: 'list'|'form'; entity: string;
  columns: ColumnSpec[]; fields: FieldSpec[];
  filters?: string[]; kpis?: KpiSpec[]; statusDomain?: StatusDomainEntry[];
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
  provenance: ProvenanceZ,
});

export function parsePageSchema(obj: unknown): PageSchema {
  return PageSchemaZ.parse(obj);
}
