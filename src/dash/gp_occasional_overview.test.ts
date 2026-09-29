import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { OCCASIONAL_OVERVIEW, OCCASIONAL_ITEM_COUNT } from './gp_occasional_overview_data';

/* S5_117 원문은 5개 섹션 프로퍼티 시트(table.prop, caption '투자기업개요 — <섹션>') */
const MOCK = readFileSync(new URL('../../docs/mockups/05_MOAF/S5_117_일일보고_조회.html', import.meta.url), 'utf8').normalize('NFC');
const page = readFileSync(new URL('./gp_occasional_overview.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('./app.tsx', import.meta.url), 'utf8');

describe('조합 수시보고 내역 — S5_117 kv 시트', () => {
  it('섹션 제목·순서가 원문 caption 과 같다', () => {
    const caps = [...MOCK.matchAll(/<caption[^>]*>투자기업개요 — ([^<]+)</g)].map((m) => m[1].trim());
    expect(OCCASIONAL_OVERVIEW.map((s) => s.title)).toEqual(caps);
  });

  it('모든 라벨이 원문 th 에 있고 중복이 없다', () => {
    const labels = OCCASIONAL_OVERVIEW.flatMap((s) => s.items.map((i) => i.l));
    expect(new Set(labels).size).toBe(labels.length);
    for (const l of labels) expect(MOCK, l).toContain(`>${l}<`);
    expect(OCCASIONAL_ITEM_COUNT).toBe(labels.length);
  });

  it('목록 그리드가 아니라 kv 섹션으로 렌더한다(스키마 레지스트리 미사용)', () => {
    expect(page).toContain('KvGridPage');
    expect(page).not.toMatch(/import[^;]*(AgGridReact|GenericListPage)/);
    expect(app).toMatch(/route === "조합 수시보고 내역"\) page = <GpOccasionalOverview/);
  });
});
