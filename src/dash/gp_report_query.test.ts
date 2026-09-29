import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { REPORT_ITEMS, optionLabel, UNDEFINED_MSG } from './gp_report_query';

/* S5_121 원문 ITEMS 리터럴과 대조 */
const MOCK = readFileSync(new URL('../../docs/mockups/05_MOAF/S5_121_자펀드_보고_조회.html', import.meta.url), 'utf8').normalize('NFC');
const app = readFileSync(new URL('./app.tsx', import.meta.url), 'utf8');

describe('자펀드 보고 조회 — S5_121', () => {
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

  it('app.tsx 가 리프 라벨 route 로 분기한다', () => {
    expect(app).toMatch(/route === "자펀드 보고 조회"\) page = <GpReportQuery/);
  });
});
