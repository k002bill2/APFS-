import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { APFS_DATA } from './data';
import { resolveSchema } from './schemas';

/* 투자자산관리 > 투자기업정보(7) · 운용사 모니터링(6) · 자펀드 관리(6) 라우트 결선 불변식.
   (사용자 이미지 정본 2026-09-15 — 대분류 3 / 리프 19)

   ⚠ 이 파일의 핵심은 **라우트 키를 MENU에서 파생**한다는 것이다. 테스트에도 스키마에도 리터럴을
   손으로 적으면 양쪽이 똑같이 NFD여도 통과하면서, NFC로 정규화하는 실제 내비게이션
   (app.tsx hashRoute → normalize('NFC'))만 조용히 DEFAULT_SCHEMA로 떨어진다.
   MENU label(NFC)에서 파생한 뒤 기대 리터럴과 대조해 양방향을 모두 막는다.

   나머지 한 축: route 키 규약은 `leaf.path || leaf.label` 이다
   (data.ts ALLMENU · shell flattenMenu · generic_list findMenuContext 공통). */

type MenuNode = { label: string; path?: string; children?: MenuNode[] };

const asset = (APFS_DATA.MENU as MenuNode[]).find((m) => m.label === '투자자산관리')!;
const groupOf = (label: string) => asset.children!.find((g) => g.label === label)!;
const routesOf = (label: string) => groupOf(label).children!.map((l) => l.path || l.label);
const labelsOf = (label: string) => groupOf(label).children!.map((l) => l.label);

/* 기대값: [메뉴 라벨, 라우트 키]. 라우트 키는 DESIGN_RECOMMENDATION §1 표의 코드 리터럴이다. */
const 투자기업정보: [string, string][] = [
  ['투자기업정보(통합)', '투자기업정보(통합)'],
  ['투자기업명세서(통합)', '투자기업명세서(통합)'],
  ['투자기업고용현황(통합)', '투자기업 고용현황보고'],
  ['전체 투자실적', '전체 투자실적'],
  ['투자실적현황(투자기업)', '투자실적 현황(투자기업)'],
  ['투자금 회수현황', '투자금 회수현황'],
  ['우수투자기업 관리', '우수투자기업 관리'],
];
const 운용사모니터링: [string, string][] = [
  ['운용사 명세서', '운용사 명세서'],
  ['운용사 재무정보 조회', '운용사 재무정보 조회'],
  ['투자금 실사보고 조회', '투자금 실사보고'],
  ['사후관리기록 관리', '사후관리기록 관리'],
  ['관리보수/성과보수 조회', '관리보수관리'],
  ['자펀드 전체 보고현황', '전체 보고현황'],
];
/* 자펀드 관리 6리프 — 이미 전용 React 페이지다. 이번 작업의 회귀 가드(재구현 금지). */
const 자펀드관리: [string, string][] = [
  ['자펀드 관리', 'subfund'],
  ['출자/분배조회(자펀드)', 'gp-contribution'],
  ['출자/분배조회(농금원)', 'apfs-contribution'],
  ['자펀드 투자실적현황', 'fund-invest-status'],
  ['자펀드 수탁관리', 'custody-verify'],
  ['종합통계(확정)', 'fund-stats'],
];

const SCHEMA_ROUTES = [...투자기업정보, ...운용사모니터링].map(([, r]) => r);

describe('메뉴 IA — 라벨·순서 보존', () => {
  it('투자기업정보 7리프의 라벨·순서가 이미지 정본과 같다', () => {
    expect(labelsOf('투자기업정보')).toEqual(투자기업정보.map(([l]) => l));
  });
  it('운용사 모니터링 6리프의 라벨·순서가 이미지 정본과 같다', () => {
    expect(labelsOf('운용사 모니터링')).toEqual(운용사모니터링.map(([l]) => l));
  });
  it('자펀드 관리 6리프의 라벨·순서·전용 route가 보존된다', () => {
    expect(labelsOf('자펀드 관리')).toEqual(자펀드관리.map(([l]) => l));
    expect(routesOf('자펀드 관리')).toEqual(자펀드관리.map(([, r]) => r));
  });
  it('MENU에서 파생한 라우트 키가 기대 리터럴과 일치한다(NFC 정규화 포함)', () => {
    expect(routesOf('투자기업정보')).toEqual(투자기업정보.map(([, r]) => r));
    expect(routesOf('운용사 모니터링')).toEqual(운용사모니터링.map(([, r]) => r));
    // 파생값과 기대 리터럴이 **둘 다** NFC 인지 확인 — 한쪽만 NFD면 위 toEqual 이 이미 깨지지만,
    // 양쪽이 같이 NFD 인 경우는 이 단언만이 잡는다.
    for (const r of [...routesOf('투자기업정보'), ...routesOf('운용사 모니터링')])
      expect(r, r).toBe(r.normalize('NFC'));
  });
});

describe('라우트 → 스키마 결선 (DEFAULT_SCHEMA 폴백 금지)', () => {
  /* DEFAULT_SCHEMA 는 영문 제네릭 5컬럼(항목명·금액·변동률·상태·추이)이다. 한글 업무 화면이
     여기로 떨어지면 에러 없이 "깨진 화면"만 보인다 — provenance.sourceSystem 이 유일한 신호다.
     ⚠ captureFile 로 판정하지 않는다: 우수투자기업 관리는 원천이 없어 captureFile:'' 이 정상이고
     sourceSystem:'NEW' 로 신규임을 기록한다. */
  it.each(SCHEMA_ROUTES)('%s 는 전용 스키마로 해석된다', (route) => {
    const s = resolveSchema(route);
    expect(s.provenance.sourceSystem, `${route} → ${s.provenance.sourceSystem}`).not.toBe('DEFAULT');
    expect(s.route).toBe(route);
    expect(s.columns.length).toBeGreaterThan(0);
  });

  /* provenance 추적성 — 어느 목업에서 왔는지 스키마가 스스로 기록한다.
     예외는 원천이 없는 신규 화면 하나뿐이며, 그때는 가짜 파일명 대신 sourceSystem:'NEW'를 쓴다
     (없는 출처를 지어내지 않는다 — DESIGN_RECOMMENDATION §5.7). */
  it('13개 스키마는 출처(captureFile)를 갖거나, 원천 없음을 NEW로 명시한다', () => {
    for (const route of SCHEMA_ROUTES) {
      const p = resolveSchema(route).provenance;
      if (p.sourceSystem === 'NEW') expect(p.captureFile, route).toBe('');
      else expect(p.captureFile.length, route).toBeGreaterThan(0);
      expect(resolveSchema(route).title.length, route).toBeGreaterThan(0);
    }
  });
});

describe('전용 페이지 분기 (app.tsx)', () => {
  const app = readFileSync(new URL('./app.tsx', import.meta.url), 'utf8');

  it('자펀드 관리 6리프의 기존 전용 route 분기가 유지된다', () => {
    for (const [, route] of 자펀드관리) expect(app, route).toContain(`route === "${route}"`);
  });

  /* 자펀드 전체 보고현황만 전용 컴포넌트가 정당하다 — S1_44 원문이 한 화면에 3개 표
     (투심 / 수시보고 / 조합원총회)를 갖고, PageSchema 는 단일 columns 배열이라 담지 못한다.
     나머지 12개는 페이지 코드 0줄(스키마만)이 목표다. */
  it('전체 보고현황은 전용 페이지(SegTabs 3표)로 분기된다', () => {
    expect(app).toContain('route === "전체 보고현황"');
    expect(app).toContain('AllReportStatus');
  });

  it('투자기업정보·운용사 모니터링의 나머지 12개는 전용 분기를 만들지 않는다(GenericListPage 스키마 경로)', () => {
    for (const route of SCHEMA_ROUTES.filter((r) => r !== '전체 보고현황'))
      expect(app, route).not.toContain(`route === "${route}"`);
  });
});
