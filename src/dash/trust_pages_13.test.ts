import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { APFS_DATA } from './data';
import { resolveSchema } from './schemas';
import type { TableMeta, Provenance, Row } from './risk_table_meta';
import { headerSequence, computeTotal, amountText } from './risk_table_meta';
import { tableSheet } from './risk_excel';
import { rowPatch } from './trust_manage_rows';
import { PHYSICAL_FORM, FUND_CODE_FORM, ACCOUNT_FORM, CASHFLOW_FORM, BIG_DISPLAY, MID_DISPLAY, displayCode } from './trust_manage_schemas';
import {
  PHYSICAL_TABLE, PHYSICAL_PROVENANCE, BIG_LABEL, MID_LABEL, BIG_OPTIONS, MID_OPTIONS, optionCode, GP_PLACEHOLDER,
  SECURITIES_TABLE, SECURITIES_PROVENANCE, VERIFY_TABLES, VERIFY_PROVENANCE, VERIFY_INVEST_TOTAL, VERIFY_FUND,
  SECURITIES_COMPARE, SECURITIES_COMPARE_PROVENANCE, CODE_TABLE, CODE_PROVENANCE, CODE_GROUPS, CODE_DEFAULT,
  FUND_CODE_TABLE, FUND_CODE_PROVENANCE, FUND_CODE_ORGS,
} from './trust_sub_data';
import {
  MOTHER_CODE_TABLE, MOTHER_CODE_PROVENANCE, MOTHER_CODE_GROUPS, MOTHER_CODE_DEFAULT, ACCOUNT_UPLOAD_PROVENANCE, CASHFLOW_UPLOAD_PROVENANCE,
  CASHFLOW_UPLOAD_HINT, CASHFLOW_TABLE, CASHFLOW_PROVENANCE, CASHFLOW_RANGE, ACCOUNT_TABLE, ACCOUNT_PROVENANCE, ACCOUNT_RANGE,
} from './trust_mother_data';
import {
  YEARLY_PROVENANCE, YEARLY_TABLES, YEARLY_TOTALS_LIT, YEARLY_FOOTNOTES, YEARLY_BASE_YM, BASES, COMB_TYPES, ACCOUNT_TYPES, DETAIL_ROWS, DETAIL_EMPTY,
  detailTable, detailRows, LEDGER_TABLE, LEDGER_PROVENANCE, INACTIVE_OPTIONS, HIST_SECTIONS, HIST_REQUIRED,
  MEMBER_ROWS, PAYMENT_ROWS, EXPERT_ROWS, CAREER_ROWS, INVEST_CAREER_ROWS, MEMBER_FORM, EXPERT_FORM, PRINT_DATE, ISSUE_HISTORY, ledgerRows, ledgerShown, ledgerPatch,
} from './brief_data';

/* 부처보고(2) · 수탁보고(11) = 13리프 — 라우트 결선 + **원본 목업 대비 출처 충실성**(risk_pages_17.test.ts 방식).

   ⚠ 데이터 모듈을 원본 HTML(docs/mockups/03_자산수탁 · 04_모태펀드보고)과 **직접** 대조한다.
     목업 행이 JS(`<script> var DATA=[…]`)로 그려지는 화면은 그 리터럴을 떼어 실제로 평가해 **모든 행**을 비교한다
     (중간 덤프를 믿지 않는다 — 옮겨 적다 한 칸이 틀리면 여기서 깨져야 한다).
   ⚠ 라우트 키는 MENU(NFC)에서 파생한다. */

type MenuNode = { id?: string; label: string; path?: string; children?: MenuNode[] };
const MENU = APFS_DATA.MENU as MenuNode[];
const leavesOf = (id: string) => MENU.find((m) => m.id === id)!.children!.flatMap((g) => g.children!);
const ALL_LEAVES = [...leavesOf('report'), ...leavesOf('trustee')];
const routeOf = (label: string) => {
  const leaf = ALL_LEAVES.find((l) => l.label === label)!;
  return (leaf.path || leaf.label).normalize('NFC');
};

const read = (p: string) => readFileSync(p, 'utf8');
const T = (f: string) => `docs/mockups/03_자산수탁/${f}`;
const B = (f: string) => `docs/mockups/04_모태펀드보고/${f}`;

/* ─────────────── 원본 HTML 파서 ─────────────── */
const mainOf = (html: string) => html.match(/<main class="content">([\s\S]*?)<\/main>/)?.[1] ?? '';
const mainTables = (html: string): string[] => mainOf(html).match(/<table[\s\S]*?<\/table>/g) ?? [];
/** `<th>` 텍스트 열 — 태그 제거 · &amp; 복원 · 공백 전부 제거 */
const thTexts = (frag: string): string[] =>
  [...frag.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ''));
const squash = (xs: string[]) => xs.map((x) => x.replace(/\s+/g, ''));
/** 특정 구역(tbody·tfoot)의 행별 `<td>` 텍스트 */
const tdRows = (frag: string, part: 'tbody' | 'tfoot'): string[][] => {
  const body = frag.match(new RegExp(`<${part}>([\\s\\S]*?)</${part}>`))?.[1] ?? '';
  return [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((tr) =>
    [...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((td) => td[1].replace(/<[^>]+>/g, '').trim()));
};
/** `<script>` 안의 `var NAME=<리터럴>;` 을 떼어 평가한다(목업 리터럴은 순수 JS 객체·배열이다). N=null 은 S3_98 의 결측 표기 */
function scriptLiteral<T>(html: string, name: string): T {
  const m = html.match(new RegExp(`var ${name}=([\\[{][\\s\\S]*?[\\]}]);\\n`));
  expect(m, `${name} 리터럴을 찾지 못했다`).not.toBeNull();
  // eslint-disable-next-line no-new-func
  return new Function('N', `return ${m![1]};`)(null) as T;
}
/** 화면 표시 문자열(원문 표기와 같은 서식) */
const shown = (v: unknown) => (v == null ? '-' : typeof v === 'number' ? v.toLocaleString('en-US') : String(v));

/* ─────────────── 13리프 기대표 ─────────────── */
/* 13리프 전부 typed — 단일 헤더 화면(공통코드 2 · 계좌정보 비교조회)도 원문 검색조건(기본값 있는 코드구분 select ·
   기본 기간)을 스키마 필터가 담지 못해 TablesPage 로 둔다(trust_table_pages.tsx 머리말) */
const LEAVES: [label: string, prov: Provenance, files: string[]][] = [
  ['연도별투자현황', YEARLY_PROVENANCE, [B('03_연도별투자현황/mockup/연도별투자현황_목업.html'), B('04_연도별투자현황상세/mockup/연도별투자현황상세_목업.html')]],
  ['등록원부관리', LEDGER_PROVENANCE, [B('S4_108_등록원부_관리.html')]],
  ['실물자료관리(업로드)', PHYSICAL_PROVENANCE, [T('S3_98_실물자료_조회__월별_.html')]],
  ['실물검증비교조회', VERIFY_PROVENANCE, [T('S3_101_실물검증_조회.html')]],
  ['유가증권관리(업로드)', SECURITIES_PROVENANCE, []],
  ['유가증권비교조회', SECURITIES_COMPARE_PROVENANCE, []],
  ['공통코드조회', CODE_PROVENANCE, [T('S3_100_공통코드.html')]],
  ['자펀드코드 조회', FUND_CODE_PROVENANCE, [T('S3_99_조합코드_관리.html')]],
  ['모태수탁 공통코드', MOTHER_CODE_PROVENANCE, [T('S3_102_모태수탁공통코드.html')]],
  ['계좌정보 관리', ACCOUNT_UPLOAD_PROVENANCE, [T('S3_103_계좌정보관리.html')]],
  ['계좌정보 비교조회', ACCOUNT_PROVENANCE, [T('S3_104_계좌정보조회.html')]],
  ['입출금 정보관리', CASHFLOW_UPLOAD_PROVENANCE, [T('S3_105_입출금정보관리.html')]],
  ['입출금정보 비교조회', CASHFLOW_PROVENANCE, [T('S3_106_입출금정보조회.html')]],
];
const NEW_LEAVES = ['유가증권관리(업로드)', '유가증권비교조회'];

describe('메뉴 IA — 13리프 라벨·route 보존', () => {
  it('부처보고·수탁보고 리프 라벨이 기대표와 같다(추가·삭제·개명 없음)', () => {
    expect(ALL_LEAVES.map((l) => l.label)).toEqual(LEAVES.map(([l]) => l));
  });
  it('연도별투자현황은 기존 path "report-bucheo" 를 유지한다', () => {
    expect(routeOf('연도별투자현황')).toBe('report-bucheo');
  });
  it('모든 route 키가 NFC 다', () => {
    for (const [label] of LEAVES) expect(routeOf(label), label).toBe(routeOf(label).normalize('NFC'));
  });
});

describe('라우트 결선 — DEFAULT_SCHEMA 폴백 금지', () => {
  const app = read(new URL('./app.tsx', import.meta.url).pathname);
  it.each(LEAVES.map(([l]) => l))('%s 는 app.tsx 전용 분기가 있다', (label) => {
    expect(app).toContain(`route === "${routeOf(label)}"`);
  });
  it('13리프 모두 스키마 레지스트리에 없다(두 경로가 한 route 를 다투지 않는다)', () => {
    for (const [label] of LEAVES) expect(resolveSchema(routeOf(label)).provenance.sourceSystem, label).toBe('DEFAULT');
  });
});

describe('출처(provenance) — 각 화면이 기대 목업을 가리킨다', () => {
  it.each(LEAVES.map(([l, p, f]) => [l, p, f] as const))('%s', (label, prov, files) => {
    const actual = prov.captureFiles;
    expect(actual).toEqual(files);
    for (const f of actual) {
      expect(f.startsWith('/'), `${label}: 절대경로 금지`).toBe(false);
      expect(existsSync(f), `${label}: ${f} 없음`).toBe(true);
    }
  });
  it.each(NEW_LEAVES)('%s 는 신규 — sourceSystem NEW · 원천 파일 없음', (label) => {
    const prov = LEAVES.find(([l]) => l === label)![1];
    expect(prov.sourceSystem).toBe('NEW');
    expect(prov.captureFiles).toEqual([]);
  });
});

/* ─────────────── 헤더 — 원문 `<th>` 순서·텍스트 ─────────────── */
describe('원본 대비 헤더', () => {
  const cases: [string, string, TableMeta, number, ((xs: string[]) => string[])?][] = [
    /* S3_98 첫 `<th>선택</th>` = AG Grid 선택 컬럼(DS Checkbox) — 표 선언이 아니라 그리드가 그린다 */
    ['실물자료', T('S3_98_실물자료_조회__월별_.html'), PHYSICAL_TABLE, 0, (xs) => xs.slice(1)],
    ['실물검증 투자자산', T('S3_101_실물검증_조회.html'), VERIFY_TABLES[0], 0],
    ['실물검증 미투자자산 거래', T('S3_101_실물검증_조회.html'), VERIFY_TABLES[1], 1],
    ['실물검증 미투자자산', T('S3_101_실물검증_조회.html'), VERIFY_TABLES[2], 2],
    ['공통코드', T('S3_100_공통코드.html'), CODE_TABLE, 0],
    ['조합코드', T('S3_99_조합코드_관리.html'), FUND_CODE_TABLE, 0],
    ['모태수탁공통코드', T('S3_102_모태수탁공통코드.html'), MOTHER_CODE_TABLE, 0],
    ['입출금정보', T('S3_106_입출금정보조회.html'), CASHFLOW_TABLE, 0],
    /* 원문 `관리`(행 버튼 묶음) 칸은 의도적으로 뺀다 — 행 액션은 선택 바가 가진다(2026-09-23 관리형 규약) */
    ['등록원부', B('S4_108_등록원부_관리.html'), LEDGER_TABLE, 0, (xs) => xs.filter((x) => x !== '관리')],
    /* 연도 컬럼 헤더는 조회기준 라디오 값(원문 기본 선정년도) */
    ['연도별 투자현황', B('03_연도별투자현황/mockup/연도별투자현황_목업.html'), YEARLY_TABLES['선정년도'], 0],
    ['연도별 투자현황 상세', B('04_연도별투자현황상세/mockup/연도별투자현황상세_목업.html'), detailTable('선정년도'), 0],
    /* 신규 2리프 = 형제 화면 헤더 그대로(준용) */
    ['유가증권관리 ← S3_98', T('S3_98_실물자료_조회__월별_.html'), SECURITIES_TABLE, 0, (xs) => xs.slice(1)],
    ['유가증권비교 ← S3_101 투자자산', T('S3_101_실물검증_조회.html'), SECURITIES_COMPARE, 0],
  ];
  it.each(cases)('%s', (_n, file, table, idx, adjust) => {
    const frag = mainTables(read(file))[idx];
    expect(frag, `${file} 에서 표 ${idx} 를 찾지 못했다`).toBeTruthy();
    const th = thTexts(frag);
    expect(squash(headerSequence(table.cols))).toEqual(adjust ? adjust(th) : th);
  });
  it('조회기준 결성년도 → 연도 컬럼 헤더가 결성년도(원문 #basisCol 동적 라벨)', () => {
    expect(YEARLY_TABLES['결성년도'].cols[1].label).toBe('결성년도');
    expect(detailTable('결성년도').cols[1].label).toBe('결성년도');
  });
  it('계좌정보 비교조회: 원문 18열 — 원본액 헤더의 단위 span 은 단위 토글(엑셀은 헤더 단위)이 대신한다', () => {
    const th = thTexts(mainTables(read(T('S3_104_계좌정보조회.html')))[0]);
    expect(squash(headerSequence(ACCOUNT_TABLE.cols).map((l) => (l === '원본액' ? '원본액(원)' : l)))).toEqual(th);
  });
});

/* ─────────────── 행 — 원문 리터럴 전 행 대조 ─────────────── */
describe('원본 대비 행(값·순서·개수)', () => {
  it('실물자료(S3_98): 원문 DATA 1행 — 분류는 코드+(한글명), 사업자번호는 bizFmt, 결측은 null', () => {
    const src = scriptLiteral<Record<string, unknown>[]>(read(T('S3_98_실물자료_조회__월별_.html')), 'DATA');
    expect(PHYSICAL_TABLE.rows).toHaveLength(src.length);
    src.forEach((s, i) => {
      const r = PHYSICAL_TABLE.rows[i];
      for (const k of ['custodian', 'ym', 'seq', 'union', 'item', 'code', 'acct', 'shares', 'balance', 'interest']) expect(r[k], k).toBe(s[k]);
      expect(r.big).toBe(`${s.big} (${BIG_LABEL[s.big as string]})`);
      expect(r.mid).toBe(`${s.mid} (${MID_LABEL[s.mid as string]})`);
      expect(r.bigCode).toBe(s.big);
      expect(r.midCode).toBe(s.mid);
      const b = String(s.biz);
      expect(r.biz).toBe(`${b.slice(0, 3)}-${b.slice(3, 5)}-${b.slice(5)}`);
    });
  });
  it('실물검증(S3_101): 정적 tbody 셀 텍스트 = 화면 표시값(투자자산 1 · 미투자자산 거래 0 · 미투자자산 1)', () => {
    const html = read(T('S3_101_실물검증_조회.html'));
    VERIFY_TABLES.forEach((t, i) => {
      const src = tdRows(mainTables(html)[i], 'tbody').filter((r) => r.length > 1);   // 빈 상태 1칸 행 제외
      expect(t.rows.map((r) => t.cols.map((c) => shown(r[c.key]))), t.id).toEqual(src);
    });
    expect(VERIFY_TABLES[1].empty).toBe(tdRows(mainTables(html)[1], 'tbody')[0][0]);
  });
  it('공통코드(S3_100)·모태수탁공통코드(S3_102): 행 = 원문 LISTS 를 펼친 것(grp = LISTS 키)', () => {
    for (const [file, table] of [[T('S3_100_공통코드.html'), CODE_TABLE], [T('S3_102_모태수탁공통코드.html'), MOTHER_CODE_TABLE]] as const) {
      const lists = scriptLiteral<Record<string, { code: string; name: string; note: string }[]>>(read(file), 'LISTS');
      const flat = Object.entries(lists).flatMap(([grp, xs]) => xs.map((x) => ({ grp, code: x.code, name: x.name, note: x.note || null })));
      expect(table.rows.map(({ grp, code, name, note }) => ({ grp, code, name, note }))).toEqual(flat);
    }
  });
  it('조합코드(S3_99): 원문 DATA 4행(원문 "데모 행" 포함 — 개수 그대로) · 체크값 Y/N', () => {
    const src = scriptLiteral<{ no: number; nm: string; code: string; sub: boolean; mo: boolean }[]>(read(T('S3_99_조합코드_관리.html')), 'DATA');
    expect(FUND_CODE_TABLE.rows.map(({ no, nm, code, sub, mo }) => ({ no, nm, code, sub: sub === 'Y', mo: mo === 'Y' }))).toEqual(src);
  });
  it('입출금정보(S3_106): 원문 DATA 1행(원문 키 id → io)', () => {
    const src = scriptLiteral<Record<string, unknown>[]>(read(T('S3_106_입출금정보조회.html')), 'DATA');
    expect(CASHFLOW_TABLE.rows).toHaveLength(src.length);
    const { id: io, ...rest } = src[0];
    const r = CASHFLOW_TABLE.rows[0];
    expect(r.io).toBe(io);
    for (const [k, v] of Object.entries(rest)) expect(r[k], k).toBe(v);
  });
  it('계좌정보 비교조회(S3_104): 원문 DATA 1행(비고 "" → 원문 표시 "-")', () => {
    const src = scriptLiteral<Record<string, unknown>[]>(read(T('S3_104_계좌정보조회.html')), 'DATA');
    expect(ACCOUNT_TABLE.rows).toHaveLength(src.length);
    for (const [k, v] of Object.entries(src[0])) expect(ACCOUNT_TABLE.rows[0][k], k).toBe(k === 'memo' && v === '' ? '-' : v);
  });
  it('등록원부(S4_108): 원문 DATA 3행(원천 1 + 도메인 정합 샘플 2 — 개수 그대로) · 금액 문자열 → 원 · active → 활성/비활성', () => {
    const src = scriptLiteral<{ no: number; regno: string; nm: string; dur: string; amt: string; gp: string; active: boolean }[]>(read(B('S4_108_등록원부_관리.html')), 'DATA');
    expect(LEDGER_TABLE.rows.map(({ no, regno, nm, dur, amt, gp, active }) => ({ no, regno, nm, dur, amt, gp, active })))
      .toEqual(src.map((s) => ({ ...s, amt: Number(s.amt.replace(/,/g, '')), active: s.active ? '활성' : '비활성' })));
  });
  it('연도별투자현황: 원문 DATA_SEL·DATA_FORM 각 4행(백만원 문자열 → 원 ×10⁶)', () => {
    const html = read(B('03_연도별투자현황/mockup/연도별투자현황_목업.html'));
    type Lit = Record<string, string>;
    const amounts = ['ct', 'mc', 'a', 'ma', 'b1', 'b2', 'cc', 'rec', 'pf'];
    for (const [name, basis] of [['DATA_SEL', '선정년도'], ['DATA_FORM', '결성년도']] as const) {
      const src = scriptLiteral<Lit[]>(html, name);
      const rows = YEARLY_TABLES[basis].rows;
      expect(rows, name).toHaveLength(src.length);
      src.forEach((s, i) => {
        expect([rows[i].g, rows[i].y, rows[i].c, rows[i].mul]).toEqual([s.g, s.y, Number(s.c), s.mul]);
        for (const k of amounts) expect(rows[i][k], `${name}[${i}].${k}`).toBe(Number(s[k].replace(/,/g, '')) * 1e6);
      });
    }
  });
  it('연도별투자현황상세: 원문 DATA 4행(원 단위)', () => {
    const src = scriptLiteral<Record<string, unknown>[]>(read(B('04_연도별투자현황상세/mockup/연도별투자현황상세_목업.html')), 'DATA');
    expect(DETAIL_ROWS).toHaveLength(src.length);
    src.forEach((s, i) => { for (const [k, v] of Object.entries(s)) expect(DETAIL_ROWS[i][k], `${i}.${k}`).toBe(v); });
  });
  it('신규 2리프는 행을 만들지 않는다(빈 상태)', () => {
    expect(SECURITIES_TABLE.rows).toEqual([]);
    expect(SECURITIES_COMPARE.rows).toEqual([]);
  });
  it('빈 상태 문구 = 원문 그대로', () => {
    expect(read(T('S3_98_실물자료_조회__월별_.html'))).toContain(`class="empty">${PHYSICAL_TABLE.empty}</td>`);
    expect(read(T('S3_100_공통코드.html'))).toContain(`colspan="3">${CODE_TABLE.empty}</td>`);
    expect(read(T('S3_102_모태수탁공통코드.html'))).toContain(`class="empty">${MOTHER_CODE_TABLE.empty}</td>`);
    expect(read(B('04_연도별투자현황상세/mockup/연도별투자현황상세_목업.html'))).toContain(`hidden>${DETAIL_EMPTY}</div>`);
  });
  it('모든 행 id 가 표 안에서 유일하다', () => {
    const tables = [PHYSICAL_TABLE, ...VERIFY_TABLES, CODE_TABLE, FUND_CODE_TABLE, MOTHER_CODE_TABLE, ACCOUNT_TABLE, CASHFLOW_TABLE, LEDGER_TABLE, ...Object.values(YEARLY_TABLES)];
    for (const t of tables) expect(new Set(t.rows.map((r: Row) => r.id)).size, t.id).toBe(t.rows.length);
    expect(new Set(DETAIL_ROWS.map((r) => r.id)).size).toBe(DETAIL_ROWS.length);
  });
});

/* ─────────────── 탭/섹션/팝업 수 ─────────────── */
describe('통합 화면 — 탭·섹션·팝업 수', () => {
  it('연도별투자현황 = 원문 2화면(요약·상세) → 탭 2, 탭 라벨 = 원문 <h1>', () => {
    const [a, b] = YEARLY_PROVENANCE.captureFiles.map(read);
    expect(a).toContain('<h1>연도별투자현황</h1>');
    expect(b).toContain('<h1>연도별투자현황상세</h1>');
    expect(read(new URL('./report_bucheo.tsx', import.meta.url).pathname)).toMatch(/label: '연도별투자현황' }[\s\S]*label: '연도별투자현황상세' }/);
  });
  it('실물검증 = 원문 <section> 3개 = 표 3장(섹션 제목 원문 그대로)', () => {
    const html = read(T('S3_101_실물검증_조회.html'));
    expect(mainTables(html)).toHaveLength(VERIFY_TABLES.length);
    expect([...mainOf(html).matchAll(/<h2>([^<]+)<\/h2>/g)].map((m) => m[1])).toEqual(VERIFY_TABLES.map((t) => t.title));
  });
  it('등록원부 = 원문 팝업 6종(openLedger·openMembers·openExperts·openUpload·openRegOut·openRegHist)', () => {
    const html = read(B('S4_108_등록원부_관리.html'));
    expect((html.match(/function open(Ledger|Members|Experts|Upload|RegOut|RegHist)\(/g) ?? []).length).toBe(6);
    const modals = read(new URL('./registry_ledger_modals.tsx', import.meta.url).pathname);
    for (const name of ['LedgerFormModal', 'MembersModal', 'ExpertsModal', 'LedgerUploadModal', 'LedgerPrintModal', 'LedgerIssueHistoryModal'])
      expect(modals).toContain(`export function ${name}(`);
  });
  it('등록원부 팝업 A: 이력 섹션 6개(제목·이력 헤더·필수 경고 문구 원문 그대로)', () => {
    const html = read(B('S4_108_등록원부_관리.html'));
    for (const s of HIST_SECTIONS) {
      expect(html, s.title).toContain(`histSec('${s.key}','${s.title}'`);
      expect(html, s.key).toContain(`'${HIST_REQUIRED[s.key]}'`);
      for (const h of s.heads) expect(html, `${s.key}:${h}`).toMatch(new RegExp(`<th[^>]*>${h.replace(/[()]/g, '\\$&')}</th>`));
      if (s.editValue) for (const part of s.editValue.split('~')) expect(html, `${s.key} 수정 기본값`).toContain(part);
    }
  });
  it('등록원부 팝업 B·C·E·F: 표·폼 리터럴이 원문에 있다', () => {
    const html = read(B('S4_108_등록원부_관리.html')).replace(/&amp;/g, '&');
    const cells = [...MEMBER_ROWS, ...PAYMENT_ROWS, ...EXPERT_ROWS, ...CAREER_ROWS, ...INVEST_CAREER_ROWS].flat();
    for (const c of cells) expect(html, c).toContain(`>${c}<`);
    for (const v of [...Object.values(MEMBER_FORM), ...Object.values(EXPERT_FORM)].filter(Boolean)) expect(html, v).toContain(v);
    expect(html).toContain(`value="${PRINT_DATE}"`);
    expect(html).toContain(`{no:${ISSUE_HISTORY[0].no},date:'${ISSUE_HISTORY[0].date}'}`);
  });
});

/* ─────────────── 합계 규칙 ─────────────── */
describe('합계 행 — 표마다 원문 규칙대로', () => {
  it('실물검증 투자자산: 원문 tfoot 리터럴(표시 1행의 합이 아니다 — 재계산하지 않는다)', () => {
    const html = read(T('S3_101_실물검증_조회.html'));
    const foot = tdRows(mainTables(html)[0], 'tfoot')[0];
    const t = computeTotal(VERIFY_TABLES[0])!;
    expect(VERIFY_TABLES[0].cols.map((c) => (t[c.key] === '' ? '' : shown(t[c.key])))).toEqual(foot);
    expect(t.oSh).toBe(VERIFY_INVEST_TOTAL.shares);
    expect(t.oSh).not.toBe(VERIFY_TABLES[0].rows[0].oSh);
  });
  it('실물검증 미투자자산: 잔액 합산 = 원문 tfoot 157,699,996 · 미투자자산 거래는 합계 없음', () => {
    const html = read(T('S3_101_실물검증_조회.html'));
    const foot = tdRows(mainTables(html)[2], 'tfoot')[0];
    const t = computeTotal(VERIFY_TABLES[2])!;
    expect(VERIFY_TABLES[2].cols.map((c) => (t[c.key] === '' ? '' : shown(t[c.key])))).toEqual(foot);
    expect(computeTotal(VERIFY_TABLES[1])).toBeNull();
  });
  it('연도별투자현황: 두 조회기준 모두 합계 = 원문 TOTALS(백만원) · 조합수 11 · 연도 - · 투자배수 1.63', () => {
    const lit = scriptLiteral<Record<string, string>>(read(B('03_연도별투자현황/mockup/연도별투자현황_목업.html')), 'TOTALS');
    for (const basis of BASES) {
      const t = computeTotal(YEARLY_TABLES[basis])!;
      expect([t.g, t.y, t.c, t.mul], basis).toEqual(['합계', '-', YEARLY_TOTALS_LIT.c, YEARLY_TOTALS_LIT.mul]);
      for (const [k, v] of Object.entries(lit)) expect(t[k], `${basis}.${k}`).toBe(Number(v.replace(/,/g, '')) * 1e6);
    }
    expect(read(B('03_연도별투자현황/mockup/연도별투자현황_목업.html'))).toContain(`<td class="c">${YEARLY_TOTALS_LIT.c}</td>`);
  });
  it('합계가 없는 표(원문 tfoot 없음): 공통코드·조합코드·입출금·등록원부·연도별 상세', () => {
    for (const t of [CODE_TABLE, MOTHER_CODE_TABLE, FUND_CODE_TABLE, ACCOUNT_TABLE, CASHFLOW_TABLE, LEDGER_TABLE, detailTable('선정년도')]) expect(computeTotal(t), t.id).toBeNull();
  });
});

/* ─────────────── 검색조건 · 도메인 규칙 ─────────────── */
describe('검색조건 — 원문 옵션·기본값', () => {
  it('실물자료: 대분류 8 · 중분류 15 옵션 = 원문 <option> 표기, 운용사 placeholder', () => {
    const html = read(T('S3_98_실물자료_조회__월별_.html'));
    for (const o of [...BIG_OPTIONS, ...MID_OPTIONS]) expect(html).toContain(`">${o}</option>`);
    expect(BIG_OPTIONS).toHaveLength(8);
    expect(MID_OPTIONS).toHaveLength(15);
    expect(optionCode('[B2] 신주인수권부사채')).toBe('B2');
    expect(html).toContain(`<option value="">${GP_PLACEHOLDER}</option>`);
  });
  it('공통코드 9종(기본 유형분류) · 모태수탁 7종(기본 거래구분) = 원문 select', () => {
    const a = read(T('S3_100_공통코드.html'));
    const b = read(T('S3_102_모태수탁공통코드.html'));
    expect([...a.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1])).toEqual([...CODE_GROUPS]);
    expect([...b.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1])).toEqual([...MOTHER_CODE_GROUPS]);
    expect(a).toContain(`value="${CODE_DEFAULT}" selected`);
    expect(b).toContain(`value="${MOTHER_CODE_DEFAULT}" selected`);
  });
  it('기본값: 실물검증 자펀드·기준년월 · 조합코드 수탁기관 · 입출금 거래일자 기간 · 연도별 기준월', () => {
    const v = read(T('S3_101_실물검증_조회.html'));
    expect(v).toContain(`<option>${VERIFY_FUND}</option>`);
    expect(read(T('S3_99_조합코드_관리.html'))).toContain(`<option>${FUND_CODE_ORGS[0]}</option>`);
    for (const [range, file] of [[CASHFLOW_RANGE, 'S3_106_입출금정보조회.html'], [ACCOUNT_RANGE, 'S3_104_계좌정보조회.html']]) {
      const [from, to] = range.split('~');
      const c = read(T(file));
      expect(c, file).toContain(`id="f-from" value="${from}"`);
      expect(c, file).toContain(`id="f-to" value="${to}"`);
    }
    expect(read(B('03_연도별투자현황/mockup/연도별투자현황_목업.html'))).toContain(`value="${YEARLY_BASE_YM}"`);
    for (const a of ACCOUNT_TYPES) expect(read(B('03_연도별투자현황/mockup/연도별투자현황_목업.html'))).toContain(`<option>${a}</option>`);
    for (const k of COMB_TYPES) expect(read(B('04_연도별투자현황상세/mockup/연도별투자현황상세_목업.html'))).toContain(`value="${k}"`);
    for (const k of INACTIVE_OPTIONS) expect(read(B('S4_108_등록원부_관리.html'))).toContain(`>${k}</label>`);
  });
  it('입출금정보관리 드롭존 안내 = 원문 #dzHint', () => {
    expect(read(T('S3_105_입출금정보관리.html'))).toContain(`id="dzHint">${CASHFLOW_UPLOAD_HINT}</p>`);
  });
});

describe('화면별 도메인 규칙', () => {
  it('등록원부 비활성원부: 제외(기본) = 활성 2행 · 포함 = 3행 · 명칭 부분일치', () => {
    expect(ledgerRows(LEDGER_TABLE.rows, '', '제외').map((r) => r.regno)).toEqual(['2011-10', '2012-05']);
    expect(ledgerRows(LEDGER_TABLE.rows, '', '포함')).toHaveLength(3);
    expect(ledgerRows(LEDGER_TABLE.rows, '수산', '포함').map((r) => r.regno)).toEqual(['2011-10', '2015-03']);
  });
  it('등록원부 첫 화면 = 원문 DATA 행 수(3) — 기본 \'제외\'는 조건 변경 전엔 미적용, 변경 후엔 비활성 제외', () => {
    const src = scriptLiteral<unknown[]>(read(B('S4_108_등록원부_관리.html')), 'DATA');
    const initial = ledgerShown(LEDGER_TABLE.rows, '', INACTIVE_OPTIONS[0], false);
    expect(initial).toHaveLength(src.length);
    expect(initial).toHaveLength(3);
    expect(ledgerShown(LEDGER_TABLE.rows, '', INACTIVE_OPTIONS[0], true).map((r) => r.regno)).toEqual(['2011-10', '2012-05']);
    expect(ledgerShown(LEDGER_TABLE.rows, '', '포함', true)).toHaveLength(3);
  });
  it('실물자료 선택 컬럼 헤더 = 원문 첫 `<th>선택</th>` (옵트인 — 공용 SELECTION_COL 은 그대로)', () => {
    /* aggrid_selection.tsx 는 UI(@/ 별칭) 를 끌어와 node 환경에서 import 할 수 없다 — 소스 텍스트로 대조한다 */
    const [table] = mainTables(read(T('S3_98_실물자료_조회__월별_.html')));
    const sel = read(new URL('./aggrid_selection.tsx', import.meta.url).pathname);
    const label = sel.match(/export const SELECTION_HEADER_LABEL = '([^']+)';/)?.[1];
    expect(label).toBe(thTexts(table)[0]);
    expect(label).toBe('선택');
    const base = sel.match(/export const SELECTION_COL: SelectionColumnDef = \{([\s\S]*?)\n\};/)?.[1] ?? '';
    expect(base).toContain('width: 44');
    expect(base).not.toMatch(/headerName|headerComponentParams/);
    const labeled = sel.match(/export const LABELED_SELECTION_COL: SelectionColumnDef = \{([\s\S]*?)\n\};/)?.[1] ?? '';
    expect(labeled).toContain('headerName: SELECTION_HEADER_LABEL');
    expect(labeled).toContain('headerComponentParams: { label: SELECTION_HEADER_LABEL }');
    const page = read(new URL('./trust_physical_upload.tsx', import.meta.url).pathname);
    expect(page).toContain('selectionCol={LABELED_SELECTION_COL}');
  });
  it('연도별 상세 조합구분: 운영조합 → 운영 행만 + No 재부여 · 결성년도 → 연도 칸 yf', () => {
    const r = detailRows('결성년도', '운영조합');
    expect(r.map((x) => [x.no, x.y, x.fn])).toEqual([[1, '2012', '한투 농식품 투자조합'], [2, '2014', 'IMM 스마트농업 투자조합']]);
    expect(detailRows('선정년도', '전체').map((x) => x.y)).toEqual(['2010', '2012', '2013', '2015']);
    expect(detailRows('선정년도', '청산조합')).toHaveLength(2);
  });
  it('연도별 금액 표기 = 원문 fmt() 소수 자릿수(요약 억원 최대 1 · 상세 억원 항상 1 · 백만원 정수)', () => {
    const y = YEARLY_TABLES['선정년도'].unitDigits;
    const d = detailTable('선정년도').unitDigits;
    expect(amountText(16000000000, '억원', y)).toBe('160');
    expect(amountText(270000000, '억원', y)).toBe('2.7');
    expect(amountText(32000000000, '억원', d)).toBe('320.0');
    expect(amountText(39713485321, '억원', d)).toBe('397.1');
    expect(amountText(39713485321, '백만원', d)).toBe('39,713');
    expect(amountText(16000000000, '백만원', y)).toBe('16,000');
  });
  it('실물검증·입출금 금액 표기 = 원문 fmt()(백만원 최대 1 · 억원 최대 2)', () => {
    for (const t of [...VERIFY_TABLES, CASHFLOW_TABLE, SECURITIES_COMPARE]) {
      expect(amountText(1810188000, '백만원', t.unitDigits), t.id).toBe('1,810.2');
      expect(amountText(1810188000, '억원', t.unitDigits), t.id).toBe('18.1');
      expect(amountText(157699996, '억원', t.unitDigits), t.id).toBe('1.58');
      expect(amountText(1810188000, '원', t.unitDigits), t.id).toBe('1,810,188,000');
    }
  });
  it('연도별 안내문 3줄 = 원문 .foot-note', () => {
    const html = read(B('03_연도별투자현황/mockup/연도별투자현황_목업.html'));
    const note = html.match(/<p class="foot-note" id="notice">([\s\S]*?)<\/p>/)![1].split('<br>');
    expect(note).toEqual([...YEARLY_FOOTNOTES]);
  });
  it('등록원부 엑셀: 헤더 = 표 선언 순서(조작 칸 없음)', () => {
    const ws = tableSheet(LEDGER_TABLE, LEDGER_TABLE.rows, null);
    const head = (XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][])[0];
    expect(head).toEqual(LEDGER_TABLE.cols.map((c) => c.label));
  });
  it('엑셀 금액 = 화면 금액(표 선언 unitDigits 자릿수) — 화면 17.6 이면 엑셀도 17.6', () => {
    const tables = [...Object.values(YEARLY_TABLES), ...BASES.map((b) => ({ ...detailTable(b), rows: detailRows(b, COMB_TYPES[0]) })), ...VERIFY_TABLES, CASHFLOW_TABLE];
    let checked = 0;
    for (const t of tables) for (const unit of ['백만원', '억원'] as const) {
      const ws = tableSheet(t, t.rows, unit);
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as string[][];
      const heads = t.cols.some((c) => c.group) ? 2 : 1;
      const cols = t.cols.filter((c) => !c.noExport);
      t.rows.forEach((r, i) => cols.forEach((c, j) => {
        if (c.kind !== 'amount' || typeof r[c.key] !== 'number') return;
        expect(aoa[heads + i][j], `${t.id} ${unit} ${c.key}`).toBe(amountText(r[c.key] as number, unit, t.unitDigits));
        checked++;
      }));
    }
    expect(checked).toBeGreaterThan(0);
  });
  it('업로드 드롭존 = 통일 파일존 DocumentsField(FilePond) — 자체 <input type=file> 금지(apfs-form-modal file 규약)', () => {
    const src = read(new URL('./trust_upload.tsx', import.meta.url).pathname);
    expect(src).toMatch(/import \{ DocumentsField \} from '\.\/fields\/DocumentsField'/);
    expect(src).toMatch(/<DocumentsField /);
    expect(src).not.toMatch(/type="file"|onDrop=/);
    expect(src).toMatch(/describedBy=\{hint \? hintId : undefined\}/);   // 보조 문구 = 드롭존 접근 설명(aria-describedby)
    for (const f of ['trust_physical_upload.tsx', 'trust_upload_forms.tsx', 'registry_ledger_modals.tsx']) {
      expect(read(new URL(`./${f}`, import.meta.url).pathname), f).not.toMatch(/type="file"/);
    }
  });
  it('업로드 용량 제한 = 원문 명시 화면만(S3_98·유가증권·S4_108 20MB) · 계좌/입출금은 무제한', () => {
    const r = (f: string) => read(new URL(`./${f}`, import.meta.url).pathname);
    expect(r('trust_upload.tsx')).not.toMatch(/maxSize = '/);
    expect(r('trust_physical_upload.tsx')).toMatch(/<UploadDropzone [^>]*maxSize="20MB"/);
    expect(r('registry_ledger_modals.tsx')).toMatch(/<UploadDropzone [^>]*maxSize="20MB"/);
    expect(r('trust_upload_forms.tsx')).not.toMatch(/maxSize/);
  });
  it('등록원부 비활성원부 칩 = 적용 전 숨김(첫 화면 3행인데 제외 칩이 보이면 오해)', () => {
    const kit = read(new URL('./risk_page_kit.tsx', import.meta.url).pathname);
    expect(kit).toMatch(/filters\.filter\(\(f\) => f\.value && f\.chip !== false\)/);
    expect(read(new URL('./registry_ledger.tsx', import.meta.url).pathname)).toMatch(/options: INACTIVE_OPTIONS, chip: applied/);
  });
});

/* 관리형 화면 규약(2026-09-23 사용자 결정) — 체크박스 선택 → 선택 바. 목업의 행 버튼·셀 스위치/입력칸 배치를 옮기지 않는다 */
describe('관리형 선택 바 규약', () => {
  const MANAGE = ['registry_ledger.tsx', 'trust_fund_code.tsx', 'trust_physical_upload.tsx', 'trust_upload_forms.tsx'];
  const src = (f: string) => read(new URL(`./${f}`, import.meta.url).pathname);
  it.each(MANAGE)('%s: 체크박스 선택 + 선택 바 + 더블클릭 수정, 셀 안 조작 UI 없음', (f) => {
    const s = src(f);
    expect(s).toMatch(/<ReadGrid [^>]*\bselectable\b/);
    expect(s).toMatch(/<ReadGrid [^>]*onRowOpen=\{openEdit\}/);
    expect(s).toMatch(/<ReadGrid [^>]*selectedIds=\{selIds\}/);   // rowData 변경 후 선택 복원(restoreSelection)
    expect(s).toMatch(/contextActions=\{selActions\}/);
    expect(s).toMatch(/SelBar\(\{/);
    expect(s).not.toMatch(/cellRenderers=|<Switch|<Checkbox|<input/);
  });
  it('등록원부: 관리 칸 없음 · 활성상태 = 배지 · 선택 바에 단건 3종 + 활성화/비활성화', () => {
    expect(LEDGER_TABLE.cols.map((c) => c.key)).not.toContain('mgmt');
    expect(LEDGER_TABLE.cols.find((c) => c.key === 'active')?.kind).toBe('badge');
    const s = src('registry_ledger.tsx');
    for (const label of ['수정', '조합원관리', '전문인력관리', '활성화', '비활성화']) expect(s, label).toContain(`>${label}</Button>`);
  });
  it('자펀드코드: Y/N = 표시 전용 배지', () => {
    for (const k of ['sub', 'mo']) expect(FUND_CODE_TABLE.cols.find((c) => c.key === k)?.kind, k).toBe('badge');
  });
  it('계좌정보·입출금 관리 = 목록(형제 비교조회 표) + 등록·업로드 툴바', () => {
    const s = src('trust_upload_forms.tsx');
    expect(s).toMatch(/table: ACCOUNT_TABLE/);
    expect(s).toMatch(/table: CASHFLOW_TABLE/);
    expect(s).toMatch(/\{cfg\.entity\} 등록<\/Button>/);
    expect(s).toMatch(/>업로드<\/Button>/);
  });
  it('폼 → 행 변환: 숫자·금액은 Number, 빈 값은 null(0 으로 바꾸지 않는다)', () => {
    expect(rowPatch(CASHFLOW_TABLE, { prin: '3,000', pl: '', memo: ' 적요 ', dt: '2026-07-13' }))
      .toEqual({ prin: 3000, pl: null, memo: '적요', dt: '2026-07-13' });
  });
  it('실물자료 폼 분류 옵션 = 행 표시 형식(코드 (한글명)) · 숨은 코드 재계산', () => {
    for (const r of PHYSICAL_TABLE.rows) {
      expect(BIG_DISPLAY).toContain(r.big);
      expect(MID_DISPLAY).toContain(r.mid);
      expect(displayCode(String(r.big))).toBe(r.bigCode);
      expect(displayCode(String(r.mid))).toBe(r.midCode);
    }
  });
  it('폼 항목 = 목록 컬럼(창작 항목 없음 · No 제외)', () => {
    const cases: [TableMeta, { fields: { key: string }[] }][] = [[PHYSICAL_TABLE, PHYSICAL_FORM], [FUND_CODE_TABLE, FUND_CODE_FORM], [ACCOUNT_TABLE, ACCOUNT_FORM], [CASHFLOW_TABLE, CASHFLOW_FORM]];
    for (const [t, f] of cases) {
      const cols = new Set(t.cols.map((c) => c.key));
      for (const x of f.fields) expect(cols.has(x.key), `${t.id}.${x.key}`).toBe(true);
    }
  });
});

describe('등록원부 저장 → 목록 반영 · 팝업 안 표 선택 규약', () => {
  it('폼 값 → 행 조각: 존속기간 결합 · 금액 숫자 · 빈 값 null', () => {
    expect(ledgerPatch({ regno: ' 2026-01 ', nm: '신규조합', dur1: '2026-01-01', dur2: '2033-12-31', amt: '5,000,000,000', gpname: '(주)테스트' }))
      .toEqual({ regno: '2026-01', nm: '신규조합', dur: '2026-01-01 ~ 2033-12-31', amt: 5000000000, gp: '(주)테스트' });
    expect(ledgerPatch({ regno: 'x', nm: 'y', dur1: '', dur2: '', amt: '', gpname: '' })).toEqual({ regno: 'x', nm: 'y', dur: null, amt: null, gp: null });
  });
  it('등록원부 목록: 저장이 행을 교체/선두 추가한다(모달은 id 만 든다)', () => {
    const s = read(new URL('./registry_ledger.tsx', import.meta.url).pathname);
    expect(s).toMatch(/onSave=\{saveLedger\}/);
    expect(s).toMatch(/kind: 'ledger'; mode: 'new' \| 'edit'; id\?: string/);
  });
  it('팝업 안 표: 행 버튼 없음 — 체크박스 + 표 위 선택 바', () => {
    const s = read(new URL('./registry_ledger_modals.tsx', import.meta.url).pathname);
    const mini = s.slice(s.indexOf('function MiniTable('), s.indexOf('A — 등록원부 입력/수정'));
    expect(mini).toMatch(/<Checkbox /);
    expect(mini).toMatch(/건 선택됨/);
    expect(mini).not.toMatch(/<td[^>]*>\s*<span className="inline-flex gap-1">/);
    expect(s.match(/<MiniTable /g)?.length).toBe((s.match(/<MiniTable [^>]*onDelete=/g) ?? []).length);
  });
});
