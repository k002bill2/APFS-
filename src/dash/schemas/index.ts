import type { PageSchema } from './types';
import { DEFAULT_SCHEMA } from './_default';
import { schema as s연도별투자현황 } from './연도별투자현황';
import { schema as s조합별월간보고현황 } from './조합별_월간보고_현황';
import { schema as s자펀드공고정보관리 } from './자펀드_공고_정보관리';
import { schema as s투자기업정보통합 } from './투자기업정보_통합';
import { schema as s사후관리기록관리 } from './사후관리기록_관리';
import { schema as s투자성과포트폴리오 } from './투자성과_포트폴리오';

const ALL: PageSchema[] = [s연도별투자현황, s조합별월간보고현황, s자펀드공고정보관리, s투자기업정보통합, s사후관리기록관리, s투자성과포트폴리오];

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
