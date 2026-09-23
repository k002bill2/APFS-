/* 투자자산관리 기구현 화면 원본 충실도 수정(2026-09-24, CHECK_REPORT ISSUE 1~3) 회귀 가드.
   원본 HTML(docs/mockups)을 **직접 파싱**해 구현과 대조한다 — 기대값을 손으로 옮겨 적으면 원문이 바뀌어도 통과한다.
   ① investment-review 행 = S1_01 `var DATA` 3건 전 값(합성 행 금지)
   ② S1_32·S1_33 합계 행 = 원문 tfoot(라벨·합산 칸·'-' 칸·연번)
   ③ S1_38 기준년월 → 운용사정량지표상세(재무건정성비율) 팝업 = 원문 openRatioDetail
   ④ S5_117(수시보고 확인 탭 2)·S1_29(정기보고 탭 2) 헤더·행 = 원문
   ⑤ custody-verify 리프에서 확정(S1_27) 탭 도달 · 딥링크 별칭 유지 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveSchema, ALL_SCHEMAS } from './schemas';
import { parsePageSchema } from './schemas/types';
import { computeSchemaTotal } from './schemas/totals';
import { linksDetail } from './schemas/detail_link';
import { INV_REVIEW_ROWS } from './investment_review_data';
import { GP_RATIO_TITLE, GP_RATIO_EMPTY, gpRatioItems } from './gp_ratio_detail_model';
import { DAILY_SECTIONS, DAILY_TITLE, DAILY_SOURCE } from './daily_report_model';
import { RECOVERY_TABLE, RECOVERY_COLS, RECOVERY_SOURCE, RECOVERY_GP, RECOVERY_FUND, isRecoverySubtotal, recoveryTxCount } from './regular_recovery_model';
import { computeTotal, headerSequence } from './risk_table_meta';

const read = (p: string) => readFileSync(p, 'utf8');
const src = (f: string) => readFileSync(new URL('./' + f, import.meta.url), 'utf8');
const M1 = (f: string) => read(`docs/mockups/01_투자자산관리/${f}`);
const strip = (s: string) => s.replace(/<button[\s\S]*?<\/button>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();

/** `<script>` 안의 `var NAME=<리터럴>;` 을 떼어 평가한다(목업 리터럴은 순수 JS 객체·배열이다) */
function scriptLiteral<T>(html: string, name: string): T {
  const m = html.match(new RegExp(`var ${name}=([\\[{][\\s\\S]*?[\\]}]);\\n`));
  expect(m, `${name} 리터럴을 찾지 못했다`).not.toBeNull();
  // eslint-disable-next-line no-new-func
  return new Function(`return ${m![1]};`)() as T;
}
const num = (s: string) => Number(s.replace(/,/g, ''));

/* ─────────────── ① 투심보고 확정 및 승인 ─────────────── */
describe('① investment-review 행 = 원문 S1_01 DATA 3건', () => {
  type D = { gp: string; fn: string; co: string; st: string; dt: string; inv: string; ty: string; ob: string; sm: string; ag: string; appr: string; pay: string; confirm: string; res: string };
  const DATA = scriptLiteral<D[]>(M1('S1_01_투자심의관리.html'), 'DATA');

  it('행 수 = 원문 3건, 합성 행(그린바이오텍·블루오션푸드·팜스토리) 없음', () => {
    expect(DATA).toHaveLength(3);
    expect(INV_REVIEW_ROWS).toHaveLength(3);
    const cos = INV_REVIEW_ROWS.map((r) => r.co);
    for (const synthetic of ['(주)그린바이오텍', '(주)블루오션푸드', '(주)팜스토리']) expect(cos).not.toContain(synthetic);
  });

  it.each([0, 1, 2])('%i번 행의 그리드 값이 원문과 같다', (i) => {
    const o = DATA[i];
    const r = INV_REVIEW_ROWS[i];
    expect(r.no).toBe(i + 1);
    expect([r.gp, r.fn, r.co, r.dt, r.ty, r.ob, r.sm, r.ag, r.pay, r.confirm, r.res])
      .toEqual([o.gp, o.fn, o.co, o.dt, o.ty, o.ob, o.sm, o.ag, o.pay, o.confirm, o.res]);
    expect(r.inv).toBe(num(o.inv));
    expect(r.appr).toBe(num(o.appr));
    // 투심상태(st)는 res 파생 — 원문 3건 모두 res '' → '일정'
    expect(o.st).toBe('일정');
    expect(r.res === '' || r.res === '미결' ? '일정' : '결과').toBe(o.st);
  });

  it('합계 파생값(투자금액·승인금액)이 원문 3건 합이다', () => {
    const sum = (k: 'inv' | 'appr') => DATA.reduce((a, o) => a + num(o[k]), 0);
    expect(INV_REVIEW_ROWS.reduce((a, r) => a + (r.inv ?? 0), 0)).toBe(sum('inv'));
    expect(INV_REVIEW_ROWS.reduce((a, r) => a + (r.appr ?? 0), 0)).toBe(sum('appr'));
  });

  it('페이지는 원문 행 모듈만 쓴다(행 리터럴을 페이지에 다시 적지 않는다)', () => {
    const page = src('investment_review_manage.tsx');
    expect(page).toContain("from './investment_review_data'");
    expect(page).not.toMatch(/id: 'ir-\d'/);
  });
});

/* ─────────────── ② 합계 행(schema.totals opt-in) ─────────────── */
type Cell = string | number;
/** 원문 tfoot `<td>` 를 colspan 만큼 펼쳐 칸별 기대값으로 — 첫 칸 = 라벨(나머지 span 은 ''), '-' span 은 칸마다 '-',
    data-base 금액 = 숫자, 그 밖의 숫자 텍스트 = 숫자. `id` 가 있는 칸(원문이 스크립트로 채우는 칸)은 fill 로 채운다 */
function tfootCells(html: string, fill: Record<string, number> = {}): Cell[] {
  const body = html.match(/<tfoot>([\s\S]*?)<\/tfoot>/)![1];
  const out: Cell[] = [];
  [...body.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/g)].forEach((m, i) => {
    const attrs = m[1];
    const text = strip(m[2]);
    const span = Number(attrs.match(/colspan="(\d+)"/)?.[1] ?? 1);
    const id = attrs.match(/id="([^"]+)"/)?.[1];
    const base = attrs.match(/data-base="(\d+)"/)?.[1];
    if (i === 0) { out.push(text, ...Array(span - 1).fill('')); return; }
    const v: Cell = id && id in fill ? fill[id] : base != null ? Number(base) : text === '-' ? '-' : num(text);
    for (let k = 0; k < span; k++) out.push(v);
  });
  return out;
}

describe('② S1_32 투자기업 고용현황보고 합계 행 = 원문 tfoot', () => {
  const html = M1('S1_32_투자기업_고용현황보고.html');
  const schema = resolveSchema('투자기업 고용현황보고');
  const DATA = scriptLiteral<{ sales: number }[]>(html, 'DATA');

  it('스키마가 zod 를 통과한다(totals key ⊂ columns)', () => {
    expect(() => parsePageSchema(schema)).not.toThrow();
  });

  it('라벨 `합계` · 매출액 = 원문 TOTAL_SALES · 총고용 155 · 청년 62 · 끝 3칸 `-`', () => {
    const expected = tfootCells(html, { 't-sales': DATA.reduce((a, r) => a + r.sales, 0) });
    expect(expected).toHaveLength(schema.columns.length);
    const total = computeSchemaTotal(schema, schema.sample!)!;
    expect(schema.columns.map((c) => total[c.key])).toEqual(expected);
    expect(total.no).toBe('합계');
    expect([total.totalEmployees, total.youthEmployees]).toEqual([155, 62]);
  });
});

describe('② S1_33 전체 투자실적 합계 행 = 원문 tfoot', () => {
  const html = M1('S1_33_전체_투자실적.html');
  const schema = resolveSchema('전체 투자실적');

  it('스키마가 zod 를 통과한다(totals key ⊂ columns)', () => {
    expect(() => parsePageSchema(schema)).not.toThrow();
  });

  it('`합계 1건` · 금액 합산 8칸 · `-` 칸 · 연번 2 — 33칸 전부 원문과 같다', () => {
    const expected = tfootCells(html);
    expect(expected).toHaveLength(schema.columns.length);
    const total = computeSchemaTotal(schema, schema.sample!)!;
    expect(schema.columns.map((c) => total[c.key])).toEqual(expected);
    expect(total.no).toBe('합계 1건');
    expect(total.seqNo).toBe(2);
  });

  it('2단 헤더(회수실적 4칸)는 그대로다', () => {
    expect(schema.columns.filter((c) => c.group === '회수실적').map((c) => c.label)).toEqual(['회수원금', '회수수익', '회수총액', '감액금액']);
  });

  it('라벨 건수·연번은 합계 대상(필터 결과) 행 수를 따른다 — 0건이면 `합계 0건`·연번 1', () => {
    const t = computeSchemaTotal(schema, [])!;
    expect([t.no, t.seqNo, t.fundAmount]).toEqual(['합계 0건', 1, 0]);
  });
});

describe('② totals 는 opt-in — 선언한 스키마만 합계 행을 갖는다', () => {
  it('합계를 선언한 스키마는 원문 tfoot 이 있는 S1_32·S1_33 둘뿐이다', () => {
    expect(ALL_SCHEMAS.filter((s) => s.totals).map((s) => s.route).sort()).toEqual(['전체 투자실적', '투자기업 고용현황보고']);
  });
  it('미선언 스키마는 null(= pinned 행 없음)', () => {
    expect(computeSchemaTotal(resolveSchema('운용사 명세서'), [])).toBeNull();
  });
  it('zod 는 columns 에 없는 합계 key 를 거부한다(오타 = 조용한 빈 합계 방지)', () => {
    const bad = { ...resolveSchema('투자기업 고용현황보고'), totals: { label: '합계', rules: { salesAmtt: 'sum' } } };
    expect(() => parsePageSchema(bad)).toThrow();
  });
  it('GenericListPage 가 합계 행을 pinnedBottomRowData 로 넘기고, 합계 행을 수정·상세 대상에서 뺀다', () => {
    const gl = src('generic_list.tsx');
    expect(gl).toContain('computeSchemaTotal(schema, filtered');
    expect(gl).toContain('pinnedBottomRowData={pinnedBottom}');
    expect(gl).toMatch(/onRowDoubleClicked=\{editable \? \(e\) => \{ if \(detail === null && e\.data && !e\.rowPinned\)/);
    expect(gl).toContain('|| e.rowPinned) return;');
    expect(gl).toContain('p.node.rowPinned ? <TotalCell');
    // 엑셀도 합계 행을 붙인다(화면=엑셀)
    expect(gl).toContain('pinnedBottom ? [...filtered, ...pinnedBottom] : filtered');
  });
});

/* ─────────────── ③ S1_38 재무건정성비율 팝업 ─────────────── */
describe('③ S1_38 기준년월 → 운용사정량지표상세(재무건정성비율) 팝업 = 원문', () => {
  const html = M1('S1_38_운용사_재무정보_조회.html');
  const fn = html.slice(html.indexOf('function openRatioDetail'), html.indexOf("$('rows').addEventListener"));
  const schema = resolveSchema('운용사 재무정보 조회');

  it('제목 = 원문 h2(철자 `재무건정성` 그대로)', () => {
    expect(strip(fn.match(/<h2 id="rt-t">([\s\S]*?)<\/h2>/)![1])).toBe(GP_RATIO_TITLE);
  });

  it('kv 행 = 원문 info-tbl(운용사명=r.nm · GP구분=r.gb · 지표명 리터럴) + 빈 상태 문구', () => {
    const rows = [...fn.matchAll(/<tr><th scope="row">([^<]+)<\/th><td[^>]*>([^<]*)<\/td><\/tr>/g)].map((m) => [m[1], m[2]]);
    const s = schema.sample![0];
    const bind: Record<string, string> = { "'+r.nm+'": String(s.gp), "'+r.gb+'": String(s.gpType) };
    expect(gpRatioItems(s).map((o) => [o.l, o.v])).toEqual(rows.map(([l, v]) => [l, bind[v] ?? v]));
    expect(fn).toContain(`<td colspan="2" class="empty">${GP_RATIO_EMPTY}</td>`);
  });

  it('원문 DATA 전 행의 기준년월이 링크다(.gridlnk-btn — detailWhen 없음)', () => {
    const col = schema.columns.find((c) => c.key === 'baseYm')!;
    expect(col.detail).toBe('gpRatioDetail');
    expect(col.detailWhen).toBeUndefined();
    for (const r of schema.sample!) expect(linksDetail(col, r.baseYm)).toBe(true);
    expect(scriptLiteral<unknown[]>(html, 'DATA')).toHaveLength(schema.sample!.length);
  });

  it('GenericListPage 레지스트리 2곳(팝업·힌트)에 새 키가 있다(누락 = 클릭 시 런타임 오류)', () => {
    const gl = src('generic_list.tsx');
    expect(gl).toContain('gpRatioDetail: GpRatioDetailModal');
    expect(gl).toMatch(/gpRatioDetail: '[^']+'/);
  });
});

/* ─────────────── ④ 두 번째 원본 탭 ─────────────── */
describe('④ S5_117 일일보고 조회 = 원문 투자기업개요 프로퍼티 시트', () => {
  const html = read(DAILY_SOURCE);
  const blocks = [...html.matchAll(/<h3 class="section-head">([\s\S]*?)<\/h3>[\s\S]*?<table class="prop">([\s\S]*?)<\/table>/g)];

  it('원문 [타이틀] 과 블록 5개(제목·순서)', () => {
    expect(html).toContain(`<span class="dot"></span>${DAILY_TITLE}</h2>`);
    expect(blocks.map((b) => strip(b[1]))).toEqual(DAILY_SECTIONS.map((s) => s.title));
  });

  it.each(DAILY_SECTIONS.map((s, i) => [s.title, i] as const))('%s 블록의 행·칸이 원문 th·td 순서 그대로다', (_t, i) => {
    const rows = [...blocks[i][2].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((tr) =>
      [...tr[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => strip(c[1])));
    expect(DAILY_SECTIONS[i].rows.map((r) => [...r])).toEqual(rows);
  });
});

describe('④ S1_29 정기보고회수내역 = 원문 헤더·행·소계·합계', () => {
  const html = read(RECOVERY_SOURCE);
  type D = { grp: number; co: string; t: string; inv: number; done: boolean; rd: string; a: number; b: number; status: string; memo: string };
  const DATA = scriptLiteral<D[]>(html, 'DATA');
  const rows = RECOVERY_TABLE.rows;
  const tx = rows.filter((r) => !isRecoverySubtotal(r));
  const subs = rows.filter(isRecoverySubtotal);

  it('헤더 14칸 = 원문 thead 순서', () => {
    const head = html.match(/<thead>([\s\S]*?)<\/thead>/)![1];
    const ths = [...head.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map((m) => strip(m[1]));
    expect(headerSequence(RECOVERY_COLS)).toEqual(ths);
  });

  it('회수거래 11건 전 값 = 원문 DATA(수익 = B−A · 감액 0 · 빈 상태/비고 `-`)', () => {
    expect(tx).toHaveLength(DATA.length);
    expect(recoveryTxCount(rows)).toBe(11);
    tx.forEach((r, i) => {
      const o = DATA[i];
      expect([r.no, r.gp, r.fund, r.co, r.t, r.inv, r.done, r.rd, r.a, r.b, r.p, r.d, r.status, r.memo]).toEqual([
        String(i + 1), RECOVERY_GP, RECOVERY_FUND, o.co, o.t, o.inv, o.done ? 'O' : 'X', o.rd, o.a, o.b, o.b - o.a, 0, o.status || '-', o.memo || '-',
      ]);
    });
    expect(html).toContain(`var gp='${RECOVERY_GP}', fund='${RECOVERY_FUND}'`);
  });

  it('소계 = 원문 grp 6개, 각 grp 끝 · 투자금액은 grp 당 1번 · 합계 = 소계들의 합', () => {
    const grps = [...new Set(DATA.map((o) => o.grp))];
    expect(subs).toHaveLength(grps.length);
    let k = 0;
    for (const g of grps) {
      const items = DATA.filter((o) => o.grp === g);
      k += items.length;
      const sub = rows[k + grps.indexOf(g)];
      expect(isRecoverySubtotal(sub)).toBe(true);
      expect([sub.no, sub.inv, sub.a, sub.b, sub.p, sub.d]).toEqual([
        '소계', items[0].inv, items.reduce((a, o) => a + o.a, 0), items.reduce((a, o) => a + o.b, 0), items.reduce((a, o) => a + o.b - o.a, 0), 0,
      ]);
    }
    const total = computeTotal(RECOVERY_TABLE)!;
    const gInv = grps.reduce((a, g) => a + DATA.find((o) => o.grp === g)!.inv, 0);
    expect([total.no, total.inv, total.a, total.b, total.p, total.d]).toEqual([
      '합계', gInv, DATA.reduce((a, o) => a + o.a, 0), DATA.reduce((a, o) => a + o.b, 0), DATA.reduce((a, o) => a + o.b - o.a, 0), 0,
    ]);
    // 원문 tfoot 의 '-' 칸(회수완료 여부·회수일자·회수 상태·비고), colspan 5 라벨 영역(운용사~투자시점)은 빈 칸
    expect([total.done, total.rd, total.status, total.memo]).toEqual(['-', '-', '-', '-']);
    expect([total.gp, total.fund, total.co, total.t]).toEqual(['', '', '', '']);
  });

  it('금액 단위 자릿수 = 원문 UNITS(백만원 1 · 억원 2)', () => {
    expect(html).toContain("var UNITS={won:{div:1,dec:0},mn:{div:1000000,dec:1},eok:{div:100000000,dec:2}}");
    expect(RECOVERY_TABLE.unitDigits).toEqual({ 백만원: { min: 1, max: 1 }, 억원: { min: 2, max: 2 } });
  });

  it('옛 고아 스키마 `정기보고회수내역` 은 삭제됐다(절대경로 captureFile · 합성 더미 경로 제거)', () => {
    expect(ALL_SCHEMAS.some((s) => s.route === '정기보고회수내역')).toBe(false);
    expect(RECOVERY_SOURCE.startsWith('docs/mockups/')).toBe(true);
  });
});

/* ─────────────── ⑤ 리프 탭 결선 · 딥링크 ─────────────── */
describe('⑤ 원본 2개 리프 = 한 화면 안 탭으로 도달', () => {
  const app = src('app.tsx');
  const leaf = src('asset_leaf_tabs.tsx');

  it('custody-verify 리프가 실물검증 | 확정 탭을 갖고, 확정 탭이 S1_27 화면(CustodyConfirmManage)을 연다', () => {
    expect(app).toContain('else if (route === "custody-verify") page = <CustodyLeaf key={route} onNav={onNav} />;');
    expect(leaf).toContain("[{ id: 'verify', label: '실물검증' }, { id: 'confirm', label: '확정' }]");
    expect(leaf).toContain("tab === 'verify' ? <CustodyVerifyManage onNav={onNav} tabs={slot} /> : <CustodyConfirmManage onNav={onNav} tabs={slot} />");
  });

  it('딥링크 별칭 `자펀드수탁관리(확정)` → custody-confirm 은 유지되고, 같은 리프의 확정 탭으로 진입한다', () => {
    expect(app).toContain('"자펀드수탁관리(확정)": "custody-confirm"');
    expect(app).toContain('else if (route === "custody-confirm") page = <CustodyLeaf key={route} onNav={onNav} initial="confirm" />;');
  });

  it('수시보고 확인 = 수시보고(S1_04) | 일일보고 조회(S5_117), 정기보고 = 정기보고(S1_06) | 정기보고회수내역(S1_29)', () => {
    expect(app).toContain('else if (route === "occasional-report") page = <OccasionalReportLeaf onNav={onNav} />;');
    expect(app).toContain('else if (route === "regular-report") page = <RegularReportLeaf key={route} onNav={onNav} />;');
    expect(app).toContain('else if (route === "정기보고회수내역") page = <RegularReportLeaf key={route} onNav={onNav} initial="recovery" />;');
    expect(leaf).toContain("[{ id: 'occ', label: '수시보고' }, { id: 'daily', label: '일일보고 조회' }]");
    expect(leaf).toContain("[{ id: 'regular', label: '정기보고' }, { id: 'recovery', label: '정기보고회수내역' }]");
  });

  it('탭으로 묶인 화면은 리프의 제목·브레드크럼·즐겨찾기 route 를 쓴다(확정 탭도 `자펀드 수탁관리`)', () => {
    expect(leaf).toContain("label: '자펀드 수탁관리', crumbs: CUSTODY_CRUMBS, route: 'custody-verify'");
    for (const f of ['occasional_report_manage.tsx', 'regular_report_manage.tsx', 'custody_verify_manage.tsx', 'custody_confirm_manage.tsx']) {
      const page = src(f);
      expect(page, f).toContain('crumbs={tabs?.crumbs ??');
      expect(page, f).toContain('title={tabs?.label ??');
      expect(page, f).toContain('favRoute={tabs?.route ??');
      expect(page, f).toContain('<LeafTabBody slot={tabs}>');
    }
  });
});
