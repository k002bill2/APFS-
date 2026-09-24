import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { APFS_DATA } from './data';
import { resolveSchema } from './schemas';
import type { Row } from './risk_table_meta';
import { headerSequence, amountText } from './risk_table_meta';
import { FUND_INFO_TABLE, FUND_INFO_PROVENANCE, FUND_INFO_KINDS, FUND_INFO_LISTS, FUND_OPTS, GP_TYPES, MONTHS, LIMIT_INDICATOR, MODAL_EMPTY, formFromRow, emptyForm } from './asset_fund_info_data';
import { REVIEW_STATS_TABLE, REVIEW_STATS_PROVENANCE, MOTHER_FUNDS, ACCOUNT_KINDS, REVIEW_STATS_RANGE, GP_OPTIONS, FUND_OPTIONS } from './review_stats_data';
import { REVIEW_STATS_PAGE } from './review_stats';
import { buildColumnDefs } from './risk_grid';
import type { ColDef } from 'ag-grid-community';

/* 투자자산관리 신규 4리프 — 라우트 결선 + **원본 목업 대비 출처 충실성**(risk_pages_17 · trust_pages_13 방식).
   - 자펀드정보관리(조합관리)  = S2_73 목록 + S2_74 등록 · S2_75 수정 팝업 → typed
   - 투심보고 통계(사후보고관리) = S1_28 투심승인정보조회 → typed(TablesPage)
   - 내부 투자심의 구성관리 · 체크리스트 관리 = 신규(현행 없음) → 스키마, provenance NEW · 행 0건
   ⚠ 원본 HTML 을 직접 읽어 `<script> var DATA` 리터럴을 평가하고 **모든 행**을 대조한다(중간 덤프를 믿지 않는다).
   ⚠ 라우트 키는 MENU(NFC)에서 파생한다(investment_asset_routes.test.ts 머리말 ⚠①). */

type MenuNode = { label: string; path?: string; children?: MenuNode[] };
const asset = (APFS_DATA.MENU as MenuNode[]).find((m) => m.label === '투자자산관리')!;
const leavesOf = (group: string) => asset.children!.find((g) => g.label === group)!.children!;
const routeOf = (group: string, label: string) => {
  const leaf = leavesOf(group).find((l) => l.label === label)!;
  return (leaf.path || leaf.label).normalize('NFC');
};

const read = (p: string) => readFileSync(p, 'utf8');
const S1 = (f: string) => `docs/mockups/01_투자자산관리/${f}`;
const S2 = (f: string) => `docs/mockups/02_조기경보/${f}`;

/* ─────────────── 원본 HTML 파서 ─────────────── */
const mainOf = (html: string) => html.match(/<main class="content">([\s\S]*?)<\/main>/)?.[1] ?? '';
const mainTables = (html: string): string[] => mainOf(html).match(/<table[\s\S]*?<\/table>/g) ?? [];
/** `<th>` 텍스트 열 — 태그 제거 · &amp;/&nbsp; 복원 · 공백 전부 제거 */
const thTexts = (frag: string): string[] =>
  [...frag.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map((m) => m[1]
    .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ''));
const squash = (xs: string[]) => xs.map((x) => x.replace(/\s+/g, ''));
/** `<script>` 안의 `var NAME=<리터럴>` 을 떼어 평가한다. 줄 끝 주석이 붙은 한 줄 리터럴(FUND_OPTS 등)도 받는다 */
function scriptLiteral<T>(html: string, name: string): T {
  const m = html.match(new RegExp(`var ${name}=([\\[{][\\s\\S]*?[\\]}]);\\s*(?:\\/\\/[^\\n]*)?\\n`));
  expect(m, `${name} 리터럴을 찾지 못했다`).not.toBeNull();
  // eslint-disable-next-line no-new-func
  return new Function(`return ${m![1]};`)() as T;
}
const strip = (r: Row) => { const { id: _id, ...rest } = r; return rest; };

/* ─────────────── 기대표 ─────────────── */
const TYPED: [group: string, label: string][] = [['조합관리', '자펀드정보관리'], ['사후보고관리', '투심보고 통계']];
const NEW_SCHEMA: [group: string, label: string][] = [['사후보고관리', '내부 투자심의 구성관리'], ['사후보고관리', '체크리스트 관리']];

describe('메뉴 IA — 조합관리·사후보고관리 리프 보존(추가·삭제·개명 없음)', () => {
  it('조합관리 3리프', () => {
    expect(leavesOf('조합관리').map((l) => l.label)).toEqual(['자펀드정보관리', '조합원정보조회', '자펀드별조합원조회']);
  });
  it('사후보고관리 8리프', () => {
    expect(leavesOf('사후보고관리').map((l) => l.label)).toEqual([
      '투심보고 확정 및 승인', '투심보고 통계', '내부 투자심의 구성관리', '체크리스트 관리',
      '수시보고 확인', '정기보고', '조합원총회', '조합예상자금요청보고',
    ]);
  });
  it('신규 4리프는 path 없이 라벨이 곧 route 이고 NFC 다', () => {
    for (const [g, l] of [...TYPED, ...NEW_SCHEMA]) {
      expect(routeOf(g, l)).toBe(l);
      expect(routeOf(g, l)).toBe(routeOf(g, l).normalize('NFC'));
    }
  });
});

describe('라우트 결선 — DEFAULT_SCHEMA 폴백 금지', () => {
  const app = read(new URL('./app.tsx', import.meta.url).pathname);
  it.each(TYPED.map(([g, l]) => [l, g] as const))('%s 는 app.tsx 전용 분기가 있고 스키마 레지스트리에 없다', (label, group) => {
    expect(app).toContain(`route === "${routeOf(group, label)}"`);
    expect(resolveSchema(routeOf(group, label)).provenance.sourceSystem).toBe('DEFAULT');
  });
  it.each(NEW_SCHEMA.map(([g, l]) => [l, g] as const))('%s 는 전용 스키마(NEW · 행 0건 · 등록/수정 폼)로 해석된다', (label, group) => {
    const s = resolveSchema(routeOf(group, label));
    expect(s.route).toBe(label);
    expect(s.title).toBe(label);
    expect(s.provenance.sourceSystem).toBe('NEW');
    expect(s.provenance.captureFile).toBe('');
    expect(s.sample, '빈 배열이어야 빈 표로 그려진다(미선언이면 합성 더미)').toEqual([]);
    expect(s.fields.length, '등록/수정 모달').toBeGreaterThan(0);
    expect(s.hideKpis).toBe(true);
    expect(app, 'typed 분기와 다투지 않는다').not.toContain(`route === "${label}"`);
  });
  it('구 투심승인정보조회 스키마(메뉴 미연결 route · 절대경로 출처)는 제거됐다', () => {
    expect(resolveSchema('투심승인정보조회').provenance.sourceSystem).toBe('DEFAULT');
    expect(existsSync(new URL('./schemas/투심승인정보조회.ts', import.meta.url).pathname)).toBe(false);
  });
});

describe('출처(provenance) — 저장소 상대경로 · 파일 실재', () => {
  it.each([
    ['자펀드정보관리', FUND_INFO_PROVENANCE.captureFiles, [S2('S2_73_자펀드_정보_관리.html'), S2('S2_74_자펀드_정보_등록.html'), S2('S2_75_자펀드_정보_수정.html')]],
    ['투심보고 통계', REVIEW_STATS_PROVENANCE.captureFiles, [S1('S1_28_투심승인정보조회.html')]],
  ] as const)('%s', (_l, actual, expected) => {
    expect(actual).toEqual(expected);
    for (const f of actual) {
      expect(f.startsWith('/'), '절대경로 금지').toBe(false);
      expect(existsSync(f), `${f} 없음`).toBe(true);
    }
  });
});

/* ─────────────── 자펀드정보관리 — S2_73 · S2_74 · S2_75 ─────────────── */
describe('자펀드정보관리 — S2_73 목록', () => {
  const html = read(S2('S2_73_자펀드_정보_관리.html'));
  it('헤더 = 원문 `<th>` 순서(2단: 투자기간 · 투자비율(%))', () => {
    expect(squash(headerSequence(FUND_INFO_TABLE.cols))).toEqual(thTexts(mainTables(html)[0]));
  });
  it('2단 그룹은 원문 colspan 과 같은 리프 수', () => {
    const count = (g: string) => FUND_INFO_TABLE.cols.filter((c) => c.group === g).length;
    expect(count('투자기간')).toBe(2);
    expect(count('투자비율(%)')).toBe(4);
  });
  it('행 = 원문 DATA 전 행·전 칸 그대로(1건, 합성 행 없음)', () => {
    const data = scriptLiteral<Record<string, unknown>[]>(html, 'DATA');
    expect(FUND_INFO_TABLE.rows.map(strip)).toEqual(data);
    expect(FUND_INFO_TABLE.rows[0].gp).toBe('미시간벤처캐피탈주식회사');
  });
  it('검색조건 구분 = 원문 select(기본 운용사, 전체 없음) · 대상 선택지 = 원문 LISTS(전체 제외)', () => {
    expect(FUND_INFO_KINDS).toEqual(['운용사', '자펀드']);
    const lists = scriptLiteral<Record<string, string[]>>(html, 'LISTS');
    for (const k of FUND_INFO_KINDS) expect(['전체', ...FUND_INFO_LISTS[k]]).toEqual(lists[k]);
  });
});

describe('자펀드정보관리 — 등록(S2_74)·수정(S2_75) 팝업', () => {
  const list = read(S2('S2_73_자펀드_정보_관리.html'));
  const reg = read(S2('S2_74_자펀드_정보_등록.html'));
  const edit = read(S2('S2_75_자펀드_정보_수정.html'));
  const modal = read(new URL('./asset_fund_info_modal.tsx', import.meta.url).pathname);
  it('선택지 = 원문 FUND_OPTS · GPTYPES · monthOpts(1~12)', () => {
    expect([...FUND_OPTS]).toEqual(scriptLiteral<string[]>(list, 'FUND_OPTS'));
    expect([...GP_TYPES]).toEqual(scriptLiteral<string[]>(list, 'GPTYPES'));
    expect([...GP_TYPES]).toEqual(scriptLiteral<string[]>(edit, 'GPTYPES'));
    expect(MONTHS).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
    /* 등록 원본은 자펀드 옵션을 인라인으로 적는다 — 같은 2건 */
    for (const f of FUND_OPTS) expect(reg).toContain(f.replace('&', '&amp;'));
  });
  it('폼 항목·표 헤더가 원문 팝업과 같다(자펀드 · 투자기간 · 결산월 / 한도관리 4열 / 운용사 6열)', () => {
    for (const src of [reg, edit]) {
      for (const lab of ['자펀드', '투자기간', '결산월', '한도관리', '운용사', '지표구분', '투자시작일자', '투자종료일자', '대표', '사업자번호', '운용사구분', '보고운용사코드', '행추가', '행삭제', '도움말'])
        expect(src, `원본에 ${lab} 없음`).toContain(lab);
    }
    for (const lab of ['>자펀드<', '>투자기간<', '>결산월<', 'title="한도관리"', 'title="운용사"', '>지표구분<', '>비율(%)<', '>투자시작일자<', '>투자종료일자<',
      '>대표<', '>운용사<', '>사업자번호<', '>운용사구분<', '>보고운용사코드<', '>행추가<', '>행삭제<', 'label="도움말"', '>닫기<', '>저장<'])
      expect(modal, `모달에 ${lab} 없음`).toContain(lab);
    expect(LIMIT_INDICATOR).toBe('의무투자비율');
    expect(reg).toContain(`>${MODAL_EMPTY}<`);
  });
  it('등록 = 빈 폼 · 두 표 빈 상태(원문 openReg / S2_74 캡처 기준)', () => {
    const f = emptyForm();
    expect(f.fund).toBe('');
    expect(f.limits).toEqual([]);
    expect(f.gps).toEqual([]);
  });
  it('수정 = 클릭한 행으로 채움(원문 S2_73 openEditFund(r)) — 원문 행에 없는 값은 빈 값', () => {
    const r = FUND_INFO_TABLE.rows[0];
    const f = formFromRow(r);
    expect(f).toMatchObject({ fund: r.fn, years: '', start: r.ps, end: r.pe, month: '' });
    expect(f.limits).toEqual([{ rate: r.must, start: r.ps, end: r.pe }]);
    expect(f.gps).toHaveLength(1);
    expect(f.gps[0]).toMatchObject({ rep: true, name: r.gp, bizno: '', otype: r.otype, month: '', code: '' });
    expect(list).toContain("gpRows=r.gpRows||[{rep:true,name:r.gp,bizno:'',otype:r.otype,month:'',code:''}]");
  });
});

/* ─────────────── 투심보고 통계 — S1_28 ─────────────── */
describe('투심보고 통계 — S1_28 투심승인정보조회', () => {
  const html = read(S1('S1_28_투심승인정보조회.html'));
  it('헤더 27열 = 원문 `<th>` 순서(투자금액의 단위 접미 `(원)` 은 단위 토글이 소유)', () => {
    const th = thTexts(mainTables(html)[0]).map((t) => t.replace(/^투자금액\(원\)$/, '투자금액'));
    expect(th).toHaveLength(27);
    expect(squash(headerSequence(REVIEW_STATS_TABLE.cols))).toEqual(th);
  });
  it('행 = 원문 DATA 27건 전 행·전 칸 그대로(null 포함) · 합계행 없음', () => {
    const data = scriptLiteral<Record<string, unknown>[]>(html, 'DATA');
    expect(data).toHaveLength(27);
    expect(REVIEW_STATS_TABLE.rows.map(strip)).toEqual(data);
    expect(REVIEW_STATS_TABLE.totalLabel).toBeUndefined();
    expect(REVIEW_STATS_TABLE.rows[0]).toMatchObject({ gp: '롯데벤처스(주)', corp: '(주)다름달음', amt: 2999774712 });
  });
  it('검색조건 = 원문 순서·기본값(모펀드 → 운용사 → 자펀드 → 계정구분 → 기준일자)', () => {
    expect(REVIEW_STATS_PAGE.filters.map((f) => f.label)).toEqual(['모펀드', '운용사', '자펀드', '계정구분', '기준일자']);
    expect(html).toContain(`<select id="f-mf">${MOTHER_FUNDS.map((m) => `<option>${m}</option>`).join('')}</select>`);
    expect(REVIEW_STATS_PAGE.filters[0]).toMatchObject({ def: '농식품모태펀드', allLabel: null });
    expect(html).toContain(`chipGroup('f-acc',['전체',${ACCOUNT_KINDS.map((a) => `'${a}'`).join(',')}],'전체')`);
    const [from, to] = REVIEW_STATS_RANGE.split('~');
    expect(html).toContain(`id="f-date1" value="${from}"`);
    expect(html).toContain(`id="f-date2" value="${to}"`);
  });
  it('행에 칸이 없는 조건(모펀드·계정구분·기준일자)은 행을 거르지 않는다(데이터 연동 후 적용) · 운용사/자펀드만 행 필터', () => {
    const keyed = Object.fromEntries(REVIEW_STATS_PAGE.filters.map((f) => [f.label, f.key]));
    expect(keyed).toEqual({ 모펀드: undefined, 운용사: 'gp', 자펀드: 'fund', 계정구분: undefined, 기준일자: undefined });
    /* 운용사·자펀드 선택지는 원문 행 값(창작 없음) */
    for (const g of GP_OPTIONS) expect(REVIEW_STATS_TABLE.rows.some((r) => r.gp === g)).toBe(true);
    for (const f of FUND_OPTIONS) expect(REVIEW_STATS_TABLE.rows.some((r) => r.fund === f)).toBe(true);
  });
  it('금액 단위 토글(원문 seg) · 브레드크럼 대분류/중분류 = 투자자산관리 > 사후보고관리', () => {
    expect(REVIEW_STATS_PAGE.unit).toBe(true);
    expect(html).toContain('aria-label="금액 단위 전환"');
    /* 소수 자릿수 = 원문 fmtAmt()(백만원 최대 1 · 억원 항상 2) */
    expect(html).toContain("return (v/1e6).toLocaleString('ko-KR',{maximumFractionDigits:1});");
    expect(html).toContain("return (v/1e8).toLocaleString('ko-KR',{minimumFractionDigits:2,maximumFractionDigits:2});");
    expect(amountText(2999774712, '억원', REVIEW_STATS_TABLE.unitDigits)).toBe('30.00');
    /* 헤더도 원문 render() 처럼 단위에 맞춰 바뀐다(`투자금액(원)` → `투자금액(억원)`) */
    expect(html).toContain("$('amt-h').textContent='투자금액('+unitLabel()+')';");
    const amtHead = (u: '원' | '백만원' | '억원') => (buildColumnDefs(REVIEW_STATS_TABLE, REVIEW_STATS_TABLE.rows, u) as ColDef[]).find((c) => c.colId === 'amt')?.headerName;
    expect(amtHead('원')).toBe('투자금액(원)');
    expect(amtHead('억원')).toBe('투자금액(억원)');
    /* 폭 하한도 단위 붙은 헤더로 잰다 — 백만원 헤더가 원 헤더보다 좁게 잡히면 잘린다 */
    const amtMin = (u: '원' | '백만원') => (buildColumnDefs(REVIEW_STATS_TABLE, [], u) as ColDef[]).find((c) => c.colId === 'amt')?.minWidth ?? 0;
    expect(amtMin('백만원')).toBeGreaterThan(amtMin('원'));
    /* opt-in — 선언하지 않은 금액 칸(공용 기본)은 라벨 그대로 */
    expect((buildColumnDefs({ ...REVIEW_STATS_TABLE, cols: [{ key: 'amt', label: '투자금액', kind: 'amount' }] }, [], '억원') as ColDef[])[0].headerName).toBe('투자금액');
    expect(amountText(2999774712, '백만원', REVIEW_STATS_TABLE.unitDigits)).toBe('2,999.8');
    expect(REVIEW_STATS_PAGE).toMatchObject({ system: '투자자산관리', group: '사후보고관리', label: '투심보고 통계', route: '투심보고 통계' });
  });
});
