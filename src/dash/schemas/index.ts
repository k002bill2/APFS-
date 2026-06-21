import type { PageSchema } from './types';
import { DEFAULT_SCHEMA } from './_default';
// 파일럿 스키마는 Task 8에서 여기 import & ALL 배열에 추가한다.

const ALL: PageSchema[] = [];

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
