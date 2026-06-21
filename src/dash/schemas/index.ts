import type { PageSchema } from './types';
import { DEFAULT_SCHEMA } from './_default';
import { schema as s연도별투자현황 } from './연도별투자현황';
import { schema as s조합별월간보고현황 } from './조합별_월간보고_현황';

const ALL: PageSchema[] = [s연도별투자현황, s조합별월간보고현황];

export function buildRegistry(list: PageSchema[]): Record<string, PageSchema> {
  const m: Record<string, PageSchema> = {};
  for (const s of list) {
    if (m[s.route]) throw new Error(`Duplicate schema route: ${s.route}`);
    m[s.route] = s;
  }
  return m;
}

const REGISTRY = buildRegistry(ALL);

export function resolveSchema(route: string): PageSchema {
  return REGISTRY[route] ?? DEFAULT_SCHEMA(route);
}
