import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { APFS_DATA } from './data';
import { headerSequence, computeTotal, amountText } from './risk_table_meta';
import { GP_VERIFY_TABLES, GP_VERIFY_SRC, GP_VERIFY_PROVENANCE, GP_VERIFY_FUND, GP_VERIFY_BASE_YM } from './gp_verify_report_data';
import { GP_VERIFY_CONFIG, GP_VERIFY_ROUTE } from './gp_verify_report';

/* 조합별 실물검증 결과 보고(S5_120) — 원본 목업 HTML 과 직접 대조(trust_pages_13.test.ts 방식). */

type MenuNode = { id?: string; label: string; path?: string; children?: MenuNode[] };
const MENU = APFS_DATA.MENU as MenuNode[];

const html = readFileSync(GP_VERIFY_SRC, 'utf8');
const main = html.match(/<main class="content">([\s\S]*?)<\/main>/)?.[1] ?? '';
const tables = main.match(/<table[\s\S]*?<\/table>/g) ?? [];
const thTexts = (frag: string) => [...frag.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ''));
const tdRows = (frag: string, part: 'tbody' | 'tfoot'): string[][] => {
  const body = frag.match(new RegExp(`<${part}>([\\s\\S]*?)</${part}>`))?.[1] ?? '';
  return [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((tr) =>
    [...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((td) => td[1].replace(/<[^>]+>/g, '').trim()));
};
const shown = (v: unknown) => (v == null || v === '' ? '-' : typeof v === 'number' ? v.toLocaleString('en-US') : String(v));

describe('조합별 실물검증 결과 보고 — 라우트·출처', () => {
  it('route = 자펀드 보고 > 실물검증 리프 라벨(path 없음)', () => {
    const leaf = MENU.find((m) => m.id === 'gp')!.children!.find((g) => g.label === '실물검증')!.children![0];
    expect(leaf.path).toBeUndefined();
    expect(leaf.label.normalize('NFC')).toBe(GP_VERIFY_ROUTE);
    expect(GP_VERIFY_CONFIG.route).toBe(GP_VERIFY_ROUTE);
    expect(GP_VERIFY_CONFIG.label).toBe(GP_VERIFY_ROUTE);
  });
  it('출처 목업 파일이 존재한다', () => {
    expect(existsSync(GP_VERIFY_SRC)).toBe(true);
    expect(GP_VERIFY_PROVENANCE.captureFiles).toEqual([GP_VERIFY_SRC]);
  });
});

describe('원본 대비', () => {
  it('표 3장 · 섹션 제목 순서', () => {
    expect(tables).toHaveLength(GP_VERIFY_TABLES.length);
    const titles = [...main.matchAll(/<div class="sec-title"><span class="bar"><\/span>([^<]+?)\s*<span/g)].map((m) => m[1].trim());
    expect(titles).toEqual(GP_VERIFY_TABLES.map((t) => t.title));
  });
  it.each(GP_VERIFY_TABLES.map((t, i) => [t.id, i] as const))('%s 헤더 = 원문 <th> 순서', (_id, i) => {
    expect(headerSequence(GP_VERIFY_TABLES[i].cols).map((x) => x.replace(/\s+/g, ''))).toEqual(thTexts(tables[i]));
  });
  it.each(GP_VERIFY_TABLES.map((t, i) => [t.id, i] as const))('%s 행 = 원문 tbody 셀 텍스트', (_id, i) => {
    const t = GP_VERIFY_TABLES[i];
    const src = tdRows(tables[i], 'tbody').filter((r) => r.length > 1);
    expect(t.rows.map((r) => t.cols.map((c) => shown(r[c.key])))).toEqual(src);
  });
  it.each(GP_VERIFY_TABLES.map((t, i) => [t.id, i] as const))('%s 합계 = 원문 tfoot', (_id, i) => {
    const t = GP_VERIFY_TABLES[i];
    const total = computeTotal(t)!;
    expect(t.cols.map((c) => shown(total[c.key]))).toEqual(tdRows(tables[i], 'tfoot')[0]);
  });
  it('미투자자산 거래 빈 상태 문구 = 원문', () => {
    expect(GP_VERIFY_TABLES[1].empty).toBe(tdRows(tables[1], 'tbody')[0][0]);
  });
  it('검색조건 기본값 = 원문(자펀드 옵션 1개 · 기준년월)', () => {
    expect(html).toContain(`<option>${GP_VERIFY_FUND}</option>`);
    expect(html).toContain(`value="${GP_VERIFY_BASE_YM}"`);
    expect(GP_VERIFY_CONFIG.filters.map((f) => f.label)).toEqual(['자펀드', '기준년월']);
    expect(GP_VERIFY_CONFIG.unit).toBe(true);
  });
  it('단위 환산 = 원문 fmt(백만원 최대 1자리 · 억원 최대 2자리)', () => {
    const d = GP_VERIFY_TABLES[0].unitDigits;
    expect(amountText(199746252, '백만원', d)).toBe('199.7');
    expect(amountText(199746252, '억원', d)).toBe('2');
    expect(amountText(96606212, '억원', d)).toBe('0.97');
  });
});
