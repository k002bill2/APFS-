import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { APFS_DATA } from './data';
import { resolveSchema } from './schemas';
import type { TableMeta, Provenance } from './risk_table_meta';
import { headerSequence, computeTotal, MOCKUP_DIR } from './risk_table_meta';
import { excelHeads } from './risk_excel';
import { NICE_TABS, CREDIT_TABS, NICE_PROVENANCE, CREDIT_PROVENANCE } from './risk_corp_info_data';
import { QUANT_LIST, QUANT_PROVENANCE, INDICATORS, MGR_TYPES, metricsFor, TREND_SECTIONS, TREND_PROVENANCE, monthLabels, TREND_FROM, TREND_TO, trendPointsInRange,
  RETURN_TABLE, RETURN_PROVENANCE, FUND_GRADE, MGR_GRADE, GRADE_PROVENANCE } from './risk_subfund_info_data';
import { MF_SUMMARY, MF_DETAIL, MF_PROVENANCE, mfTotal, FUND_VAL, FUND_VAL_PROVENANCE, INVESTEE_SUMMARY, INVESTEE_DETAIL, INVESTEE_VAL_PROVENANCE,
  ASSET_BALANCE, ASSET_TX, ASSET_TX_PROVENANCE, EXC_TABLES, EXC_PROVENANCE, PORTFOLIO_TABLES, PORTFOLIO_PROVENANCE } from './risk_valuation_data';
import { IRR_CONTRACT, IRR_CONTRACT_BASIS, IRR_CONTRACT_PROVENANCE, IRR_INVESTEE, IRR_INVESTEE_BASIS, IRR_INVESTEE_PROVENANCE,
  IRR_FUND, IRR_FUND_BASIS, IRR_FUND_PROVENANCE } from './risk_irr_data';

/* 조기경보 > 기업정보(2)·자펀드정보(5)·가치평가(10) = 17리프 — 라우트 결선 + **원본 목업 대비 출처 충실성**.

   ⚠ 이 파일은 데이터 모듈을 **원본 HTML(docs/mockups/02_조기경보/*.html)과 직접** 대조한다.
     중간 산출물(추출 덤프)을 믿지 않는다 — 옮겨 적다 한 줄이 빠지면 여기서 깨져야 한다.
   ⚠ 라우트 키는 MENU(NFC)에서 파생한다(investment_asset_routes.test.ts 머리말 ⚠① 과 같은 이유). */

type MenuNode = { label: string; path?: string; children?: MenuNode[] };
const risk = (APFS_DATA.MENU as MenuNode[]).find((m) => m.label === '조기경보')!;
const groupOf = (label: string) => risk.children!.find((g) => g.label === label)!;
const leavesOf = (label: string) => groupOf(label).children!;
const routeOf = (label: string) => {
  const all = ['기업정보', '자펀드정보', '가치평가'].flatMap(leavesOf);
  const leaf = all.find((l) => l.label === label)!;
  return (leaf.path || leaf.label).normalize('NFC');
};

const read = (p: string) => readFileSync(p, 'utf8');
const MOCK = (file: string) => `${MOCKUP_DIR}/${file}`;

/* ─────────────── 원본 HTML 파서(정규식 — 목업이 정형이라 충분하다) ─────────────── */
/** `<main class="content">` 안의 정적 `<table>` 들(등장 순서) */
const mainTables = (html: string): string[] => {
  const main = html.match(/<main class="content">([\s\S]*?)<\/main>/)?.[1] ?? '';
  return main.match(/<table[\s\S]*?<\/table>/g) ?? [];
};
/** `<th>` 텍스트 열 — 검토필요 버튼(`!`)·단위 span(.uh)·태그 제거, JS 단위 접미(`('+u+')`) 제거, 공백 전부 제거 */
const thTexts = (frag: string): string[] =>
  [...frag.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map((m) => m[1]
    .replace(/<button[\s\S]*?<\/button>/g, '')
    .replace(/<span[^>]*class="uh[^"]*"[^>]*>[\s\S]*?<\/span>/g, '')
    .replace(/<span[^>]*>\s*\('\+\w+\+'\)<\/span>/g, '')
    .replace(/\('\+\w+\+'\)/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ''));
const squash = (xs: string[]) => xs.map((x) => x.replace(/\s+/g, ''));
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;');

/** 첫 행의 원문 리터럴이 원본에 실제로 있는가(파생 칸·null 제외) */
function expectFirstRowInSource(t: TableMeta, html: string) {
  const r = t.rows[0];
  const derived = new Set(t.cols.filter((c) => c.derived).map((c) => c.key));
  for (const c of t.cols) {
    const v = r[c.key];
    if (v == null || derived.has(c.key)) continue;
    if (typeof v === 'number') {
      const a = Math.abs(v);
      const hit = html.includes(String(a)) || html.includes(a.toLocaleString('en-US')) || html.includes(v.toFixed(2));
      expect(hit, `${t.id}.${c.key}=${v} 가 원본에 없다`).toBe(true);
    } else {
      expect(html.includes(v) || html.includes(escapeHtml(v)), `${t.id}.${c.key}='${v}' 가 원본에 없다`).toBe(true);
    }
  }
}

/* ─────────────── 17리프 기대표 — 메뉴 라벨 · 트랙 · 원본 파일 ─────────────── */
type Track = 'typed' | 'schema';
const LEAVES: [label: string, track: Track, files: string[]][] = [
  ['투자기업정보(NICE평가정보)', 'typed', ['S2_65_기업개요.html', 'S2_66_업체사업장정보.html', 'S2_67_법정관리및화의정보.html']],
  ['투자기업신용정보 조회', 'typed', ['S2_69_신용등급.html', 'S2_68_현금흐름등급.html']],
  ['운용사 정량지표 관리', 'typed', ['S2_70_운용사_정량지표_관리.html', 'S2_71_운용사_정량지표_등록.html', 'S2_72_운용사_정량지표_수정.html']],
  ['운용사 유형별 정량지표 변동 조회', 'typed', ['S2_78_운용사_유형별_정량지표_변동.html']],
  ['운용사 재무정보 비교 조회', 'schema', ['S2_76_운용사_재무정보_비교조회.html']],
  ['자펀드 수익률정보 비교 조회', 'typed', ['S2_77_자펀드_수익률정보_비교조회.html']],
  ['자펀드 종합등급 변동 조회', 'typed', ['S2_79_종합등급_변동.html']],
  ['모태펀드 가치평가 결과조회', 'typed', ['S2_80_모태펀드_가치평가_결과조회.html']],
  ['투자조합 가치평가 결과조회', 'typed', ['S2_81_투자조합_가치평가_결과조회.html']],
  ['피투자회사 가치평가 결과조회', 'typed', ['S2_82_피투자회사_가치평가_결과조회.html']],
  ['자펀드 투자자산 및 거래내역 조회', 'typed', ['S2_84_자펀드_투자자산_및_거래내역_조회.html']],
  ['예외사항레포트', 'typed', ['S2_85_예외사항_레포트.html']],
  ['평가시점 데이터 확인', 'schema', ['S2_86_평가시점_데이터_확인.html']],
  ['Portfolio Report', 'typed', ['S2_83_Portfolio_Report.html']],
  ['투자기업별(계약별) IRR', 'typed', ['S2_87_투자기업별_계약별__IRR.html', 'S2_88_투자기업별_계약별__IRR_근거.html']],
  ['투자기업별 IRR', 'typed', ['S2_91_투자기업별_IRR.html', 'S2_92_투자기업별_IRR_근거.html']],
  ['자펀드별 IRR', 'typed', ['S2_89_자펀드별_IRR.html', 'S2_90_자펀드별_IRR_근거.html']],
];

/** typed 리프 → 데이터 모듈 PROVENANCE */
const TYPED_PROV: Record<string, Provenance> = {
  '투자기업정보(NICE평가정보)': NICE_PROVENANCE,
  '투자기업신용정보 조회': CREDIT_PROVENANCE,
  '운용사 정량지표 관리': QUANT_PROVENANCE,
  '운용사 유형별 정량지표 변동 조회': TREND_PROVENANCE,
  '자펀드 수익률정보 비교 조회': RETURN_PROVENANCE,
  '자펀드 종합등급 변동 조회': GRADE_PROVENANCE,
  '모태펀드 가치평가 결과조회': MF_PROVENANCE,
  '투자조합 가치평가 결과조회': FUND_VAL_PROVENANCE,
  '피투자회사 가치평가 결과조회': INVESTEE_VAL_PROVENANCE,
  '자펀드 투자자산 및 거래내역 조회': ASSET_TX_PROVENANCE,
  '예외사항레포트': EXC_PROVENANCE,
  'Portfolio Report': PORTFOLIO_PROVENANCE,
  '투자기업별(계약별) IRR': IRR_CONTRACT_PROVENANCE,
  '투자기업별 IRR': IRR_INVESTEE_PROVENANCE,
  '자펀드별 IRR': IRR_FUND_PROVENANCE,
};

describe('메뉴 IA — 17리프 라벨·route 보존', () => {
  it('기업정보·자펀드정보·가치평가 리프 라벨이 기대표와 같다(추가·삭제 없음)', () => {
    const labels = ['기업정보', '자펀드정보', '가치평가'].flatMap((g) => leavesOf(g).map((l) => l.label));
    expect(labels).toEqual(LEAVES.map(([l]) => l));
  });
  it('예외사항레포트는 기존 path "예외사항리포트" 를 유지한다', () => {
    expect(routeOf('예외사항레포트')).toBe('예외사항리포트');
  });
  it('모든 route 키가 NFC 다', () => {
    for (const [label] of LEAVES) expect(routeOf(label), label).toBe(routeOf(label).normalize('NFC'));
  });
});

describe('라우트 결선 — DEFAULT_SCHEMA 폴백 금지', () => {
  const app = read(new URL('./app.tsx', import.meta.url).pathname);
  it.each(LEAVES.filter(([, t]) => t === 'typed').map(([l]) => l))('%s 는 app.tsx 전용 분기가 있다', (label) => {
    expect(app).toContain(`route === "${routeOf(label)}"`);
  });
  it.each(LEAVES.filter(([, t]) => t === 'schema').map(([l]) => l))('%s 는 전용 스키마로 해석된다', (label) => {
    const s = resolveSchema(routeOf(label));
    expect(s.provenance.sourceSystem).not.toBe('DEFAULT');
    expect(s.route).toBe(routeOf(label));
    expect(s.title).toBe(label);
    expect(s.sample, '합성 더미 금지 — 원문 리터럴 sample 필수').toBeDefined();
  });
  it('typed 리프는 스키마 레지스트리에 없다(두 경로가 한 route 를 다투지 않는다)', () => {
    for (const [label, track] of LEAVES)
      if (track === 'typed') expect(resolveSchema(routeOf(label)).provenance.sourceSystem, label).toBe('DEFAULT');
  });
});

describe('출처(provenance) — 각 화면이 기대 목업을 가리킨다', () => {
  it.each(LEAVES.map(([l, t, f]) => [l, t, f] as const))('%s', (label, track, files) => {
    const expected = files.map(MOCK);
    const actual = track === 'schema' ? [resolveSchema(routeOf(label)).provenance.captureFile] : TYPED_PROV[label].captureFiles;
    expect(actual).toEqual(expected);
    for (const f of actual) {
      expect(f.startsWith('/'), `${label}: 절대경로 금지`).toBe(false);
      expect(existsSync(f), `${label}: ${f} 없음`).toBe(true);
    }
  });
});

/* ─────────────── 표별 대조 — 헤더(원문 <th> 순서) · 행 수 · 첫 행 값 ─────────────── */
type Case = [name: string, file: string, table: TableMeta, rows: number, pick: (html: string) => string];
const byMain = (i: number) => (html: string) => mainTables(html)[i] ?? '';
const byScript = (from: string) => (html: string) => {
  const i = html.indexOf(from);
  return i < 0 ? '' : html.slice(i, html.indexOf('</table>', i));
};

const CASES: Case[] = [
  ['기업개요', 'S2_65_기업개요.html', NICE_TABS[0].table, 1, byMain(0)],
  ['업체사업장정보', 'S2_66_업체사업장정보.html', NICE_TABS[1].table, 5, byMain(0)],
  ['법정관리및화의정보', 'S2_67_법정관리및화의정보.html', NICE_TABS[2].table, 6, byMain(0)],
  ['신용등급', 'S2_69_신용등급.html', CREDIT_TABS[0].table, 4, byMain(0)],
  ['현금흐름등급', 'S2_68_현금흐름등급.html', CREDIT_TABS[1].table, 4, byMain(0)],
  ['정량지표 목록', 'S2_70_운용사_정량지표_관리.html', QUANT_LIST, 5, byMain(0)],
  ['자펀드 수익률정보', 'S2_77_자펀드_수익률정보_비교조회.html', RETURN_TABLE, 1, byMain(0)],
  ['자펀드 종합등급', 'S2_79_종합등급_변동.html', FUND_GRADE, 3, byMain(0)],
  ['운용사 종합등급', 'S2_79_종합등급_변동.html', MGR_GRADE, 3, byMain(1)],
  ['모태펀드 결과', 'S2_80_모태펀드_가치평가_결과조회.html', MF_SUMMARY, 1, byMain(0)],
  ['모태펀드 상세', 'S2_80_모태펀드_가치평가_결과조회.html', MF_DETAIL, 1, byMain(1)],
  ['투자조합 가치평가', 'S2_81_투자조합_가치평가_결과조회.html', FUND_VAL, 1, byMain(0)],
  ['피투자회사 내역', 'S2_82_피투자회사_가치평가_결과조회.html', INVESTEE_SUMMARY, 1, byMain(0)],
  ['피투자회사 상세', 'S2_82_피투자회사_가치평가_결과조회.html', INVESTEE_DETAIL, 1, byMain(1)],
  ['투자잔액관리', 'S2_84_자펀드_투자자산_및_거래내역_조회.html', ASSET_BALANCE, 1, byMain(0)],
  ['거래내역', 'S2_84_자펀드_투자자산_및_거래내역_조회.html', ASSET_TX, 1, byMain(1)],
  ['평가방법론 변경', 'S2_85_예외사항_레포트.html', EXC_TABLES[0], 1, byMain(0)],
  ['동일기업 가치조정', 'S2_85_예외사항_레포트.html', EXC_TABLES[1], 0, byMain(1)],
  ['데이터 수정 후 평가', 'S2_85_예외사항_레포트.html', EXC_TABLES[2], 1, byMain(2)],
  ['평가 누락', 'S2_85_예외사항_레포트.html', EXC_TABLES[3], 1, byMain(3)],
  ['조합의 현황', 'S2_83_Portfolio_Report.html', PORTFOLIO_TABLES[0], 1, byMain(0)],
  ['조합의 운용성과', 'S2_83_Portfolio_Report.html', PORTFOLIO_TABLES[1], 1, byMain(1)],
  ['투자자산 별 상세', 'S2_83_Portfolio_Report.html', PORTFOLIO_TABLES[2], 1, byMain(2)],
  ['계약별 IRR', 'S2_87_투자기업별_계약별__IRR.html', IRR_CONTRACT, 1, byMain(0)],
  ['계약별 IRR 근거', 'S2_87_투자기업별_계약별__IRR.html', IRR_CONTRACT_BASIS.table, 1, byScript('function irrBody')],
  ['투자기업별 IRR', 'S2_91_투자기업별_IRR.html', IRR_INVESTEE, 1, byMain(0)],
  ['투자기업별 IRR 근거', 'S2_91_투자기업별_IRR.html', IRR_INVESTEE_BASIS.table, 1, byScript('function irrBody')],
  ['자펀드별 IRR', 'S2_89_자펀드별_IRR.html', IRR_FUND, 1, byMain(0)],
  ['자펀드별 IRR 근거', 'S2_89_자펀드별_IRR.html', IRR_FUND_BASIS.table, 1, byScript('function irrBody')],
];

describe('원본 대비 헤더 — `<th>` 열과 같은 순서·같은 텍스트', () => {
  it.each(CASES.map(([n, f, t, , pick]) => [n, f, t, pick] as const))('%s', (_n, file, table, pick) => {
    const frag = pick(read(MOCK(file)));
    expect(frag, `${file} 에서 표를 찾지 못했다`).not.toBe('');
    expect(squash(headerSequence(table.cols))).toEqual(thTexts(frag));
  });
});

describe('원본 대비 행 수·첫 행 값', () => {
  it.each(CASES.map(([n, f, t, rows]) => [n, f, t, rows] as const))('%s — %s 원본 %i행', (_n, file, table, rows) => {
    expect(table.rows.length).toBe(rows);
    if (rows > 0) expectFirstRowInSource(table, read(MOCK(file)));
  });
  it('모든 행 id 가 표 안에서 유일하다', () => {
    for (const [, , t] of CASES) expect(new Set(t.rows.map((r) => r.id)).size, t.id).toBe(t.rows.length);
  });
});

describe('통합 화면 — 탭/섹션 수', () => {
  it('투자기업정보(NICE평가정보)는 원문 3화면을 탭 3개로 보존한다', () => {
    expect(NICE_TABS.map((t) => t.source)).toEqual(NICE_PROVENANCE.captureFiles);
    expect(NICE_TABS.length).toBe(3);
  });
  it('투자기업신용정보 조회는 원문 2화면을 탭 2개로 보존한다', () => {
    expect(CREDIT_TABS.map((t) => t.source)).toEqual(CREDIT_PROVENANCE.captureFiles);
    expect(CREDIT_TABS.length).toBe(2);
  });
  it.each([...NICE_TABS, ...CREDIT_TABS].map((t) => [t.label, t.source] as const))('탭 "%s" 라벨 = 원문 <h1>', (label, file) => {
    expect(read(file)).toContain(`<h1>${label}</h1>`);
  });
  it('섹션(표) 수 = 원본 <table> 수', () => {
    expect(mainTables(read(MOCK('S2_80_모태펀드_가치평가_결과조회.html'))).length).toBe(2);
    expect(mainTables(read(MOCK('S2_82_피투자회사_가치평가_결과조회.html'))).length).toBe(2);
    expect(mainTables(read(MOCK('S2_84_자펀드_투자자산_및_거래내역_조회.html'))).length).toBe(2);
    expect(mainTables(read(MOCK('S2_85_예외사항_레포트.html'))).length).toBe(EXC_TABLES.length);
    expect(mainTables(read(MOCK('S2_83_Portfolio_Report.html'))).length).toBe(PORTFOLIO_TABLES.length);
    expect(mainTables(read(MOCK('S2_79_종합등급_변동.html'))).length).toBe(2);
    expect(TREND_SECTIONS.length).toBe((read(MOCK('S2_78_운용사_유형별_정량지표_변동.html')).match(/<section class="section"/g) ?? []).length);
  });
});

describe('합계 행 — 표마다 원문 규칙대로', () => {
  it('자펀드 수익률: 원문이 null 을 0 으로 더하므로 값 없는 금액 합계는 0, 수익률·등급은 -', () => {
    const t = computeTotal(RETURN_TABLE)!;
    expect(t.no).toBe('합계');
    expect(t.invest).toBe(0);
    expect(t.contrib).toBe(7000000000);
    expect(t.ret).toBe('-');
    expect(t.grade).toBe('-');
  });
  it('계약별 IRR: 보유주식수를 합산한다(원문 tfoot 4,680)', () => {
    expect(computeTotal(IRR_CONTRACT)!.shares).toBe(4680);
    expect(computeTotal(IRR_CONTRACT)!.total).toBe(1000045800);
  });
  it('Portfolio Report: 보유주식수는 -, Multiple 은 합계끼리 나눈 파생값', () => {
    const t = computeTotal(PORTFOLIO_TABLES[2])!;
    expect(t.sh).toBe('-');
    expect(t.mdc).toBe('1.00');
    expect(t.mfa).toBe('1.00');
  });
  it('피투자회사: 누적Multiple 합계 = 운용성과 합 ÷ 투자금액 합', () => {
    expect(computeTotal(INVESTEE_DETAIL)!.mult).toBe('1.00');
  });
  it('투자조합: 합계는 각자 자기 컬럼 아래(원문 colspan=5 밀림을 재현하지 않는다)', () => {
    const t = computeTotal(FUND_VAL)!;
    expect(t.ym).toBe('합계');
    expect(t.found).toBe(16000000000);
    expect(t.ol).toBe(1293799849);
    expect(t.mul).toBe('-');
  });
  it('종합등급: 총계 = 정상+주의+경고(원문 주의·경고는 0)', () => {
    const t = computeTotal(FUND_GRADE)!;
    expect(t.grade).toBe('총계');
    expect([t.y2021, t.y2022, t.y2023, t.y2024, t.y2025]).toEqual([60, 73, 76, 83, 83]);
  });
});

describe('엑셀 헤더', () => {
  it('금액 헤더는 단위 토글이 없는 화면(unit=null)도 (원)을 단다', () => {
    const { heads } = excelHeads(NICE_TABS[0].table, null);
    expect(heads[0]).toContain('투자잔액 (원)');
    expect(excelHeads(IRR_CONTRACT, '억원').heads[0]).toContain('총투자금액 (억원)');
  });
  it('2단 헤더는 그룹 가로 병합 + 비그룹 세로 병합', () => {
    const { heads, merges } = excelHeads(MF_DETAIL, '원');
    expect(heads).toHaveLength(2);
    expect(heads[0][7]).toBe('농식품모태펀드');
    expect(merges).toContainEqual({ s: { r: 0, c: 7 }, e: { r: 0, c: 8 } });
    expect(merges).toContainEqual({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
  });
});

describe('화면별 도메인 규칙', () => {
  it('모태펀드 총운영성과 = 평가액 + 기분배 + 미투자 + 기타자산 − 기타부채(원문 값과 일치)', () => {
    const r = MF_SUMMARY.rows[0] as Record<string, number>;
    expect(mfTotal({ aval: r.aval, dist: r.dist, uninv: 0, oa: 0, ol: 0 })).toBe(r.total);
    expect(mfTotal({ aval: 1, dist: 2, uninv: 3, oa: 4, ol: 5 })).toBe(5);
    expect(MF_SUMMARY.cols.filter((c) => c.editable).map((c) => c.label)).toEqual(['미투자자산', '기타자산', '기타부채']);
  });
  it('정량지표: 운용사 유형 6종·지표 7종, 원문에 없는 유형은 전부 미사용', () => {
    const html = read(MOCK('S2_70_운용사_정량지표_관리.html'));
    for (const t of MGR_TYPES) expect(html).toContain(`'${t}'`);
    for (const i of INDICATORS) expect(html).toContain(`'${i}'`);
    expect(metricsFor('증권회사').filter((d) => d.use).length).toBe(4);
    expect(metricsFor('은행').every((d) => !d.use && d.ok === '')).toBe(true);
  });
  it('정량지표 변동: 월 라벨 13개(원문 기본 기간) = 시계열 점 수', () => {
    const labels = monthLabels(TREND_FROM, TREND_TO);
    expect(labels[0]).toBe('2025.07');
    expect(labels.length).toBe(13);
    for (const s of TREND_SECTIONS) for (const se of s.series) expect(se.data.length, se.name).toBe(labels.length);
    const html = read(MOCK('S2_78_운용사_유형별_정량지표_변동.html'));
    for (const s of TREND_SECTIONS) for (const se of s.series) expect(html).toContain(`name:'${se.name}',avg:${se.avg}`);
  });
  it('정량지표 변동: 기간 선택은 점을 자기 월로 거른다(원문 라벨-값 어긋남을 재현하지 않는다)', () => {
    expect(trendPointsInRange(TREND_FROM, TREND_TO)).toHaveLength(13);
    expect(trendPointsInRange('2025-09', '2025-10')).toEqual([2, 3]);            // 2025.09·2025.10 = 3·4번째 점
    expect(trendPointsInRange('2026-07', '')).toEqual([12]);
    expect(trendPointsInRange('2024-01', '2024-12')).toEqual([]);              // 원천 값 없는 기간 = 빈 차트
  });
  it('IRR 근거 팝업 제목 = 원문 팝업 제목', () => {
    expect(read(MOCK('S2_87_투자기업별_계약별__IRR.html'))).toContain(`<h2 id="irrpop-t">${IRR_CONTRACT_BASIS.title}</h2>`);
    expect(read(MOCK('S2_91_투자기업별_IRR.html'))).toContain(`<h2 id="irrpop-t">${IRR_INVESTEE_BASIS.title}</h2>`);
    expect(read(MOCK('S2_89_자펀드별_IRR.html'))).toContain(`<h2 id="irrpop-t">${IRR_FUND_BASIS.title}</h2>`);
  });
});

describe('스키마 트랙 2리프 — 헤더·행', () => {
  it.each([
    ['운용사 재무정보 비교 조회', 'S2_76_운용사_재무정보_비교조회.html'],
    ['평가시점 데이터 확인', 'S2_86_평가시점_데이터_확인.html'],
  ] as const)('%s — 원문 <th> 열·1행', (label, file) => {
    const s = resolveSchema(routeOf(label));
    const html = read(MOCK(file));
    expect(squash(s.columns.map((c) => c.label))).toEqual(thTexts(mainTables(html)[0]));
    expect(s.sample!.length).toBe(1);
    expect(s.hideKpis).toBe(true);
  });
  it('운용사 재무정보 비교: 원문 실데이터 1건 값 그대로', () => {
    const r = resolveSchema('운용사 재무정보 비교 조회').sample![0];
    expect(r.nm).toBe('마이다스동아인베스트먼트(주)');
    expect(r.ta).toBe(11680451471);
    expect(r.sales).toBe('-');
  });
  it('평가시점 데이터: 원문 표시값(미보고·해당없음·무형자산상각비 0) 그대로', () => {
    const r = resolveSchema('평가시점 데이터 확인').sample![0];
    expect(r.comp).toBe('어업회사법인 페리프씨웍스 주식회사');
    expect(r.recovered).toBe(19489041);
    expect(r.asset).toBe('미보고');
    expect(r.amort).toBe(0);
    expect(r.closeMonth).toBe('12');
  });
});
