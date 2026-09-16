import type { PageSchema } from './types';
import { DEFAULT_SCHEMA } from './_default';
import { schema as s연도별투자현황 } from './연도별투자현황';
import { schema as s조합별월간보고현황 } from './조합별_월간보고_현황';
import { schema as s자펀드공고정보관리 } from './자펀드_공고_정보관리';
import { schema as s투자기업정보통합 } from './투자기업정보_통합';
import { schema as s사후관리기록관리 } from './사후관리기록_관리';
import { schema as s투자성과포트폴리오 } from './투자성과_포트폴리오';
import { schema as s정기보고 } from './정기보고';
import { schema as s조합원총회 } from './조합원총회';
import { schema as s조합예상자금정보보고 } from './조합예상자금_정보보고';
import { schema as s보고양식관리 } from './보고양식관리';
import { schema as s보고업데이트정보 } from './보고_업데이트정보';
import { schema as s운용사출자배분관리 } from './운용사_출자배분관리';
import { schema as s조합원정보등록 } from './조합원정보등록';
import { schema as s자펀드별조합원관리 } from './자펀드별조합원관리';
import { schema as s농금원출자배분관리 } from './농금원_출자배분관리';
import { schema as s투자실적현황자펀드 } from './투자실적_현황_자펀드';
import { schema as s종합통계 } from './종합통계';
import { schema as s자펀드수탁관리실물검증 } from './자펀드수탁관리_실물검증';
import { schema as s자펀드수탁관리확정 } from './자펀드수탁관리_확정';
import { schema as s투심승인정보조회 } from './투심승인정보조회';
import { schema as s정기보고회수내역 } from './정기보고회수내역';
import { schema as s투자기업정보 } from './투자기업정보';
import { schema as s투자기업고용현황보고 } from './투자기업_고용현황보고';
import { schema as s전체투자실적 } from './전체_투자실적';
import { schema as s투자실적현황투자기업 } from './투자실적_현황_투자기업';
import { schema as s투자금회수현황 } from './투자금_회수현황';
import { schema as s운용사별재무제표 } from './운용사별_재무제표';
import { schema as s운용사재무정보조회 } from './운용사_재무정보_조회';
import { schema as s투자금실사보고 } from './투자금_실사보고';
import { schema as s관리보수관리 } from './관리보수관리';
import { schema as s전체보고현황 } from './전체_보고현황';
// 2026-09-15 결선: DEFAULT_SCHEMA(영문 제네릭 5컬럼)로 떨어지던 3개 공백
import { schema as s투자기업명세서통합 } from './투자기업명세서_통합';
import { schema as s우수투자기업관리 } from './우수투자기업_관리';
import { schema as s운용사명세서 } from './운용사_명세서';

const ALL: PageSchema[] = [
  s연도별투자현황, s조합별월간보고현황, s자펀드공고정보관리, s투자기업정보통합, s사후관리기록관리, s투자성과포트폴리오,
  s정기보고, s조합원총회, s조합예상자금정보보고, s보고양식관리, s보고업데이트정보,
  s운용사출자배분관리, s조합원정보등록, s자펀드별조합원관리, s농금원출자배분관리,
  s투자실적현황자펀드, s종합통계, s자펀드수탁관리실물검증, s자펀드수탁관리확정,
  s투심승인정보조회, s정기보고회수내역, s투자기업정보, s투자기업고용현황보고,
  s전체투자실적, s투자실적현황투자기업, s투자금회수현황,
  s운용사별재무제표, s운용사재무정보조회, s투자금실사보고, s관리보수관리, s전체보고현황,
  s투자기업명세서통합, s우수투자기업관리, s운용사명세서,
];

export function buildRegistry(list: PageSchema[]): Record<string, PageSchema> {
  const m: Record<string, PageSchema> = {};
  for (const s of list) {
    if (m[s.route]) throw new Error(`Duplicate schema route: ${s.route}`);
    m[s.route] = s;
  }
  return m;
}

// 레지스트리 전수 불변식 테스트용 노출(런타임 소비처 없음 — resolveSchema가 정상 경로다)
export const ALL_SCHEMAS: readonly PageSchema[] = ALL;

const REGISTRY = buildRegistry(ALL);

export function resolveSchema(route: string): PageSchema {
  return REGISTRY[route] ?? DEFAULT_SCHEMA(route);
}
