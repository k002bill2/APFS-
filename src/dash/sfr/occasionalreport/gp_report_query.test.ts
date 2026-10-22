import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { REPORT_ITEMS, optionLabel, UNDEFINED_MSG, GP_REPORT_QUERY_LABEL, GP_REPORT_QUERY_ROUTE } from './gp_report_query';
import { APFS_DATA } from '../../data';

/* S5_121 원문 ITEMS 리터럴과 대조 */
const MOCK = readFileSync(new URL('../../../../docs/mockups/05_MOAF/S5_121_자펀드_보고_조회.html', import.meta.url), 'utf8').normalize('NFC');
const app = readFileSync(new URL('../../app.tsx', import.meta.url), 'utf8');
const alias = readFileSync(new URL('../../route_alias.ts', import.meta.url), 'utf8');

describe('수시보고 제출현황 — S5_121', () => {
  it('보고항목 8건의 key·label·순서가 원문과 같다', () => {
    const src = [...MOCK.matchAll(/key:'(\w+)', label:'([^']+)', grounded:(true|false)/g)].map((m) => [m[1], m[2], m[3] === 'true']);
    expect(REPORT_ITEMS.map((it) => [it.key, it.label, it.grounded])).toEqual(src);
  });

  it('컬럼 정의된 항목의 헤더가 원문 cols 라벨·순서와 같다', () => {
    for (const it of REPORT_ITEMS.filter((x) => x.grounded)) {
      const block = MOCK.slice(MOCK.indexOf(`key:'${it.key}'`));
      const cols = block.slice(block.indexOf('cols:['), block.indexOf('rows:['));
      const labels = [...cols.matchAll(/l:'([^']+)'/g)].map((m) => m[1]);
      expect(it.table.cols.map((c) => c.label)).toEqual(labels);
      expect(it.table.rows).toHaveLength(2);
    }
  });

  it('미정의 항목은 컬럼을 지어내지 않고 원문 안내 문구를 빈 상태로 보인다', () => {
    expect(MOCK).toContain(UNDEFINED_MSG);
    for (const it of REPORT_ITEMS.filter((x) => !x.grounded)) {
      expect(it.table.rows).toEqual([]);
      expect(it.table.cols.map((c) => c.label)).toEqual(['안내']);
      expect(optionLabel(it)).toBe(`${it.label} (컬럼 미정의)`);
    }
  });

  it('라벨은 수시보고 제출현황, route 키는 옛 라벨(path)로 보존해 app.tsx 가 분기한다', () => {
    const gp = (APFS_DATA.MENU as any[]).find((m) => m.id === 'gp');
    const mid = gp.children.find((c: any) => c.label === '수시보고');
    expect(mid.children).toEqual([{ label: GP_REPORT_QUERY_LABEL, path: GP_REPORT_QUERY_ROUTE }]);
    expect(app).toMatch(/route === "gp-report-query"\) page = <GpReportQuery/);
  });

  it('자펀드 보고 메뉴 구성(2026-10-14 사용자 지정) — 중분류·리프 라벨과 보존 route', () => {
    const gp = (APFS_DATA.MENU as any[]).find((m) => m.id === 'gp');
    const tree = gp.children.map((c: any) => [c.label, c.children.map((l: any) => [l.label, l.path || l.label])]);
    expect(tree).toEqual([
      ['수시보고', [['수시보고 제출현황', 'gp-report-query']]],
      ['정기보고', [['월간보고 제출현황', 'gp-monthly-report-status'], ['반기보고 제출현황', 'gp-halfyear-report-status']]],
      ['실물검증', [['조합별 실물검증 결과 보고', 'gp-verify-report']]],
      ['파일', [['보고 파일 조회', 'gp-report-file'], ['보고양식·가이드 조회', 'report-guide']]],
    ]);
    expect(app).not.toMatch(/route === "조합 수시보고 내역"/);
    expect(alias).toContain('"조합 수시보고 내역": "gp-report-query"');   // 삭제 화면의 옛 route 승격
  });
});
