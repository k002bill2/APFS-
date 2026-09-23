/* 출자/분배조회(농금원) — 조회형 리스트 페이지 (투자자산관리 > 자펀드 관리 > 출자/분배조회(농금원)).
   출처: S1_21__농금원_출자배분관리.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(모펀드·운용사·자펀드·계정구분·조회기준·기준일자 시작~종료)
       → **조회기준은 툴바 주 필터 FilterChip**(상세·요약·전체·출자·배분·기타, 목업 기본 '상세'),
         나머지는 상세필터 드로어(Sheet). 항목 순서는 목업 검색박스 순서 그대로. 검색어는 OFF(목업에 없음).
         목업 [조회] 버튼은 즉시 반영형이라 없다. 기준일자 목업 기본값 2024-08-12는 **적용하지 않는다**
         (빈 문자열 = 열린 경계, apfs-datepicker 함정).
   - 목록 그리드(28열) → AG Grid 단일 헤더 28열. 목업 `render()`처럼 **자펀드(거래) 그룹 단위**로
         [조합원 행 … , 소계 행] 을 평탄화해 rowData로 싣고, 전 그룹 합계는 pinned bottom 1행(목업 tfoot).
   - 목록바 금액단위 seg → 툴바 우측 `단위: {unit}` 캡션 + SegTabs(원/백만원/억원, **기본 원** = 목업 기본값).
         데이터는 원 저장 → 그리드 `context={{unit}}` + 단위 변경 시 `refreshCells({force:true})`.
   - 거래일자 셀 → **링크(LinkCell)**: 거래구분 '배분'이면 배분거래수정, '출자'면 출자거래 수정 팝업(클릭·셀 Enter).
   - 수탁데이터 확인검토 셀 → '일치' 배지 / '확인'+배분이면 [확인] 버튼(배분거래등록 팝업) / 그 외 배지·'-'.
   - KPI 배지 행 · 카드뷰 · 명세 팝업 · 행 선택 · 등록 → **없음**(목업에 없는 조회 전용 화면).
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·설계메모는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).

   한계·가정(결정 기록)
   - **rowspan 미재현**: 목업은 운용사·자펀드·계정구분·등록일·결성액·약정총액·거래구분·상세구분·거래일자·
     납입총액·배분총액·실입금총액을 `rowspan=n`으로 1회만 그리지만 AG Grid엔 행 병합이 없다 →
     **그룹의 전 조합원 행에 같은 값**을 싣는다(값 창작이 아니라 같은 값의 반복 표시).
     4개 그룹집계(약정총액·납입총액·배분총액·실입금총액)는 평탄화 시점에 그룹에서 계산해 행에 넣는다.
   - **정렬 금지**: 전 컬럼 `sortable:false`. 행 순서(그룹 → 소계)가 의미라 정렬하면 소계가 흩어진다
     (DEFAULT_COL_DEF는 공유 SSOT라 그대로 두고 컬럼 팩토리에서 덮는다).
   - **필터는 AG Grid External이 아니라 React에서 그룹 단위**로 건다 — 평탄화된 행을 거르면 소계가
     자기 멤버 없이 살아남는다. `passes(group)` → filteredGroups → displayRows 순서다.
   - **조회기준 동작은 추론**이다(목업은 select만 있고 동작 미구현): 상세·전체=조합원행+소계, 요약=소계만,
     출자·배분=그 거래구분 그룹만(상세 형태), 기타=출자·배분 둘 다 아닌 그룹(현재 데이터 0건 → 빈 그리드).
   - **소계 행의 '-' 배치는 목업 `groupTotalsRow` 그대로**다 — 배분총액은 값이 있는데 납입총액·실입금총액은
     '-'다(비대칭이지만 원문이므로 고르게 펴지 않는다).
   - **배분거래등록(확인 버튼)은 현재 데이터로 도달할 수 없다** — `chk==='확인'`은 그룹2(출자)에만 있어
     배지로 렌더된다. 목업 조건(배분 + 확인)을 그대로 구현만 해 두고 도달용 데이터를 지어내지 않는다.
   - **수탁데이터 확인검토의 빈칸 기준은 원문 미정의**(목업 설계메모 [확인 필요]) — 값 그대로 '-'로 표시한다.
   - 출자거래 수정 팝업 데이터는 목록과 다른 자펀드(목업 `INVEST_GROUP`)다 — 모달 파일 주석 참조. */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유) — 없으면 합계행이 안 보인다
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { GridFrame, FooterActions } from './grid_frame';
import { apfsTheme, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF, numStyle } from './aggrid_theme';
import { controlMinWidth, drawerInputStyle as inputStyle } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type {
  ColDef, GridApi, GridReadyEvent, CellKeyDownEvent, CellStyle, ValueFormatterParams, RowClassParams, RowStyle,
} from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용 → 알려진 파싱 CVE 비해당)
import { PeriodPicker } from './ui/period-picker';
import { DistTxModal, InvestTxModal } from './apfs_contribution_tx_modal';

const { Button, IconBtn, StatusBadge, FilterChip, SegTabs } = UI;

/* ──────────────────────────────
   도메인 타입 — 목업 GROUPS(자펀드 거래 1건 = 1그룹, 그 안에 조합원 N명)
────────────────────────────── */
export type Acc = '농식품' | '수산';
export type Tx = '출자' | '배분';
export type Grade = 'GP' | 'LP' | 'SP';
export type Chk = '' | '일치' | '확인';

export interface TxMember {
  mem: string; mg: Grade; mc: number;
  pay: number | null;                                  // 납입금액(배분 거래는 없음 → '-')
  prin: number; prof: number; perf: number;            // 원금·수익(세전)·성과보수
  etc: number; prio: number; wht: number;              // 기타(이자 등)·우선손실충당·원천징수
  netin: number;                                       // 실 입금액 = prin+prof+perf+prio+etc+wht
  bal: number | null;                                  // 보유잔액(출자 거래는 없음 → '-')
  chk: Chk; red: string; memo: string;
}
export interface TxGroup {
  gi: number; un: string; fn: string; acc: Acc; rd: string; form: number;
  tx: Tx; dtx: string; td: string; members: TxMember[];
}

/* 데모 데이터 — 목업 `GROUPS` 값 그대로(콤마 문자열 → number, 값 창작 없음).
   그룹1은 실데이터, 그룹2는 참고 화면 캡처(축소본)에서 옮긴 도메인 정합 샘플(목업 주석). */
const GROUPS: TxGroup[] = [
  {
    gi: 0, un: '미시간벤처캐피탈주식회사', fn: '미시간글로벌식품산업투자조합2호', acc: '농식품',
    rd: '2013-09-24', form: 10_000_000_000, tx: '배분', dtx: '배분', td: '2026-02-09',
    members: [
      { mem: '농식품모태펀드', mg: 'SP', mc: 7_000_000_000, pay: null, prin: 1_408_139_071, prof: 0, perf: 0, etc: 0, prio: 0, wht: 0, netin: 1_408_139_071, bal: 3_701_860_929, chk: '일치', red: '', memo: '' },
      { mem: '미시간벤처캐피탈', mg: 'GP', mc: 1_000_000_000, pay: null, prin: 106_391_583, prof: -270_000_000, perf: 0, etc: 0, prio: 0, wht: 0, netin: -163_608_417, bal: 623_608_417, chk: '', red: '', memo: '1차 분배시 분배금 손실충당 반영' },
      { mem: 'LOWDHAM HOLDINGS PTELIMITED', mg: 'LP', mc: 1_500_000_000, pay: null, prin: 392_936_872, prof: 0, perf: 0, etc: 0, prio: 0, wht: -895_360, netin: 392_041_512, bal: 702_063_128, chk: '', red: '', memo: '' },
      { mem: '한국농업기술진흥원', mg: 'LP', mc: 500_000_000, pay: null, prin: 130_978_957, prof: 0, perf: 0, etc: 0, prio: 0, wht: 0, netin: 130_978_957, bal: 234_021_043, chk: '', red: '', memo: '' },
    ],
  },
  {
    gi: 1, un: '유니온투자파트너스(주)', fn: '유니온수산투자조합', acc: '수산',
    rd: '2022-07-28', form: 10_000_000_000, tx: '출자', dtx: '추가출자', td: '2026-04-21',
    members: [
      { mem: '농식품모태펀드', mg: 'SP', mc: 7_000_000_000, pay: 1_050_000_000, prin: 0, prof: 0, perf: 0, etc: 0, prio: 0, wht: 0, netin: 0, bal: null, chk: '확인', red: '', memo: '' },
      { mem: '유니온투자파트너스(주)', mg: 'LP', mc: 1_500_000_000, pay: 225_000_000, prin: 0, prof: 0, perf: 0, etc: 0, prio: 0, wht: 0, netin: 0, bal: null, chk: '확인', red: '', memo: '' },
      { mem: '유니온테크', mg: 'LP', mc: 1_500_000_000, pay: 225_000_000, prin: 0, prof: 0, perf: 0, etc: 0, prio: 0, wht: 0, netin: 0, bal: null, chk: '', red: '', memo: '' },
    ],
  },
];

const PAGE_SIZE = 20;

/* ──────────────────────────────
   표시행 — 목업 render()의 평탄화. 조합원 행 + 그룹 끝 소계 행
   ⚠ 그룹 4개 집계(약정총액·납입총액·배분총액·실입금총액)는 목업이 rowspan으로 1회만 그리는 값이라
     여기서 그룹에서 계산해 전 조합원 행에 반복해 싣는다(파일 상단 '한계').
   ⚠ `null` 단독 타입 필드를 만들지 않는다 — `keyof DistRow`를 받는 컬럼 팩토리에서 AG Grid
     NestedFieldPaths가 키를 탈락시켜 tsc 오류를 낸다(그래서 전부 `T | null`).
────────────────────────────── */
type RowKind = 'row' | 'subtotal';

export interface DistRow {
  id: string; kind: RowKind; gi: number; tx: Tx | null;
  no: number | null;
  un: string | null; fn: string | null; acc: string | null; rd: string | null; form: number | null;
  mem: string | null; mg: Grade | null; mc: number | null; mtc: number | null;
  dtx: string | null; td: string | null;
  pay: number | null; paytot: number | null;
  prin: number | null; prof: number | null; perf: number | null; disttot: number | null;
  etc: number | null; prio: number | null; wht: number | null; netin: number | null; netintot: number | null;
  bal: number | null; chk: Chk | null; red: string | null; memo: string | null;
}

type SumKey = 'pay' | 'prin' | 'prof' | 'perf' | 'etc' | 'prio' | 'wht' | 'netin';
const SUM_KEYS: SumKey[] = ['pay', 'prin', 'prof', 'perf', 'etc', 'prio', 'wht', 'netin'];
/** 목업 `sumBy` — null(납입금액 미해당)은 0으로 센다 */
const sumBy = (members: TxMember[], k: SumKey | 'mc'): number => members.reduce((a, m) => a + (Number(m[k]) || 0), 0);

interface GroupTotals { mtc: number; pay: number; prin: number; prof: number; perf: number; etc: number; prio: number; wht: number; netin: number; disttot: number }
const totalsOf = (members: TxMember[]): GroupTotals => {
  const t = Object.fromEntries(SUM_KEYS.map((k) => [k, sumBy(members, k)])) as Record<SumKey, number>;
  return { ...t, mtc: sumBy(members, 'mc'), disttot: t.prin + t.prof + t.perf };
};

/** 소계·합계 행의 공통 골격 — 목업 `groupTotalsRow(label, …)`: colspan=13 뒤로 값 10개 + '-' 5개.
    ⚠ 납입총액·실입금총액이 '-'인데 배분총액만 값인 비대칭은 원문 그대로다(파일 상단 '한계'). */
const totalRow = (id: string, gi: number, t: GroupTotals): DistRow => ({
  id, kind: 'subtotal', gi, tx: null, no: null,
  un: null, fn: null, acc: null, rd: null, form: null,
  mem: null, mg: null, mc: null, mtc: null, dtx: null, td: null,
  pay: t.pay, paytot: null,
  prin: t.prin, prof: t.prof, perf: t.perf, disttot: t.disttot,
  etc: t.etc, prio: t.prio, wht: t.wht, netin: t.netin, netintot: null,
  bal: null, chk: null, red: null, memo: null,
});

/** 조회기준 — 목업 `#f-basis` 옵션 그대로. 동작은 추론(파일 상단 '한계') */
type Basis = '상세' | '요약' | '전체' | '출자' | '배분' | '기타';
const BASES: Basis[] = ['상세', '요약', '전체', '출자', '배분', '기타'];
const DEFAULT_BASIS: Basis = '상세';

/** 조회기준이 그룹을 거르는 규칙 — 출자·배분은 그 거래구분만, 기타는 둘 다 아닌 그룹 */
const basisKeepsGroup = (basis: Basis, g: TxGroup): boolean =>
  basis === '출자' || basis === '배분' ? g.tx === basis
    : basis === '기타' ? g.tx !== '출자' && g.tx !== '배분'
      : true;

/** 그룹 배열 → 표시행. '요약'이면 소계 행만 남긴다(NO 셀은 그대로 '소 계') */
function flatten(groups: TxGroup[], basis: Basis): DistRow[] {
  const out: DistRow[] = [];
  let no = 0;
  for (const g of groups) {
    const t = totalsOf(g.members);
    if (basis !== '요약') {
      g.members.forEach((m, mi) => {
        no += 1;
        out.push({
          id: `g${g.gi}-m${mi}`, kind: 'row', gi: g.gi, tx: g.tx, no,
          un: g.un, fn: g.fn, acc: g.acc, rd: g.rd, form: g.form,
          mem: m.mem, mg: m.mg, mc: m.mc, mtc: t.mtc,
          dtx: g.dtx, td: g.td,
          pay: m.pay, paytot: t.pay,
          prin: m.prin, prof: m.prof, perf: m.perf, disttot: t.disttot,
          etc: m.etc, prio: m.prio, wht: m.wht, netin: m.netin, netintot: t.netin,
          bal: m.bal, chk: m.chk, red: m.red, memo: m.memo,
        });
      });
    }
    out.push(totalRow(`g${g.gi}-sub`, g.gi, t));
  }
  return out;
}

/** 전 그룹 합계(목업 tfoot `grand`) — 소계의 합이 아니라 전 조합원의 합 */
const grandRow = (groups: TxGroup[]): DistRow =>
  ({ ...totalRow('__grand', -1, totalsOf(groups.flatMap((g) => g.members))) });

/* ──────────────────────────────
   금액 단위 전환 — 데이터는 **원 저장**(목업 fmt() 배율 그대로)
────────────────────────────── */
type Unit = '원' | '백만원' | '억원';
const UNITS: Unit[] = ['원', '백만원', '억원'];
const DEFAULT_UNIT: Unit = '원';   // 목업 기본값(aria-pressed=true가 '원')

/** 원 저장값 → 선택 단위 수치(엑셀 숫자 셀용). 백만원은 목업이 `Math.round`라 정수다 */
const toUnit = (won: number, unit: Unit): number =>
  unit === '원' ? won : unit === '백만원' ? Math.round(won / 1e6) : won / 1e8;
/** 표시 문자열 — 목업 `fmt()` 그대로(원·백만원=정수 콤마, 억원=소수 2자리까지) */
const unitText = (won: number, unit: Unit): string =>
  unit === '억원' ? (won / 1e8).toLocaleString('ko-KR', { maximumFractionDigits: 2 }) : toUnit(won, unit).toLocaleString('ko-KR');
/** 엑셀 숫자서식 — 화면 소수 자릿수와 일치 */
const Z_BY_UNIT: Record<Unit, string> = { 원: '#,##0', 백만원: '#,##0', 억원: '#,##0.##' };

/* ──────────────────────────────
   컬럼 정의 — 목업 `<thead>` 28열 순서 그대로(단일 헤더)
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

const dash = <span style={{ color: 'var(--muted-foreground)' }}>-</span>;

/** 금액 셀 — context.unit로 환산. 값 없음은 '-'(목업 `money()`) */
const moneyFmt = (p: ValueFormatterParams): string => {
  if (p.value == null) return '-';
  const unit = (p.context as { unit?: Unit } | undefined)?.unit ?? DEFAULT_UNIT;
  return String(unitText(p.value as number, unit));
};
/** 목업 소계행의 `colspan=13`에 덮이는 금액 열(결성액·약정금액·약정총액)은 '-'가 아니라 **빈 칸**이다 */
const moneyBlankFmt = (p: ValueFormatterParams): string => (p.value == null ? '' : moneyFmt(p));

/** 음수 금액은 danger 텍스트색(목업 수익배분 -270,000,000 등). numStyle을 대체하지 않고 감싼다 */
const moneyStyle = (strong?: boolean) => (p: { value: unknown; node: { rowPinned?: string | null } }): CellStyle => {
  const base = numStyle(strong)(p);
  return typeof p.value === 'number' && p.value < 0 ? { ...base, color: 'var(--danger-text)' } : base;
};

/* ⚠ 전 컬럼 sortable:false — DEFAULT_COL_DEF(공유 SSOT)는 sortable:true라 팩토리에서 덮는다 */
/** 텍스트 열 — 소계·합계 행은 값이 null이라 빈 칸(목업 colspan 자리) */
const txt = (field: keyof DistRow, header: string, width: number, maxWidth?: number): ColDef<DistRow> => ({
  field, headerName: header, width, maxWidth, sortable: false, cellStyle: flexCenter,
  cellRenderer: (p: any) => (p.value == null ? null : <span className="min-w-0 truncate">{p.value}</span>),
});
/** 가운데 정렬 분류 텍스트(계정구분·상세구분) */
const ctr = (field: keyof DistRow, header: string, width: number): ColDef<DistRow> => ({
  field, headerName: header, width, sortable: false, cellStyle: flexMid,
  cellRenderer: (p: any) => (p.value == null ? null : p.value),
});
/** 날짜 열 */
const dt = (field: keyof DistRow, header: string, width: number): ColDef<DistRow> => ({
  field, headerName: header, width, sortable: false, cellStyle: centerNum,
  valueFormatter: (p) => (p.value == null ? '' : String(p.value)),
});
const amt = (field: keyof DistRow, header: string, strong?: boolean, width = 148): ColDef<DistRow> => ({
  field, headerName: header, width, sortable: false, type: 'rightAligned',
  valueFormatter: moneyFmt, cellStyle: moneyStyle(strong) as any,
});
/** 소계행에서 빈 칸이 되는 금액 열 */
const amtBlank = (field: keyof DistRow, header: string, width = 148): ColDef<DistRow> => ({
  ...amt(field, header, false, width), valueFormatter: moneyBlankFmt,
});
/** 값 없으면 '-'인 텍스트 열(감액여부·비고) — 조합원 행의 ''도 '-'다(목업 `dash()`) */
const dashTxt = (field: keyof DistRow, header: string, width: number, maxWidth?: number): ColDef<DistRow> => ({
  field, headerName: header, width, maxWidth, sortable: false, cellStyle: flexCenter,
  cellRenderer: (p: any) => (p.value ? <span className="min-w-0 truncate">{p.value}</span> : dash),
});

/* 중립 회색 칩(목업 `.tag.n`) — Tone에 중립 톤이 없어 직접 만든다.
   기하는 StatusBadge size="lg"와 동일. */
function NeutralChip({ v }: { v: string }) {
  return <span className="inline-flex items-center rounded-[7px] bg-muted px-[10px] py-[4px] text-[13px] font-bold leading-tight text-muted-foreground">{v}</span>;
}

/* 거래일자 셀 링크 — 클릭 시 편집 팝업(골드 `general_meeting_manage.tsx` LinkCell 복사).
   ⚠ `title`엔 동작 힌트만 담는다.
   ⚠ 폰트는 inline `font:'inherit'` — preflight:false라 button이 UA 기본(13.3px Arial)으로 튄다. */
function LinkCell({ value, hint, onClick }: { value: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button" title={hint} onClick={onClick}
      className="min-w-0 truncate text-left text-primary font-semibold no-underline hover:underline cursor-pointer tabular"
      style={{ font: 'inherit', fontWeight: 600, background: 'transparent', border: 0, padding: 0 }}>
      {String(value)}
    </button>
  );
}

/** 수탁데이터 확인검토 셀 — 목업 `chkCell(s, gi, tx)` 그대로 */
function ChkCell({ v, tx, onRegister }: { v: Chk; tx: Tx | null; onRegister: () => void }) {
  if (v === '일치') return <StatusBadge tone="success" label="일치" size="lg" dot={false} />;
  if (v === '확인') {
    /* 배분 거래에서만 클릭 가능한 [확인] 버튼(배분거래등록). 출자 거래는 비활성 배지(목업 지시 2026-08-31) */
    return tx === '배분'
      ? <Button variant="outline" size="sm" onClick={onRegister}>확인<span className="sr-only"> — 배분거래등록 팝업 열기</span></Button>
      : <StatusBadge tone="info" label="확인" size="lg" dot={false} />;
  }
  return dash;
}

interface CellActions { openTx: (gi: number, mode: 'register' | 'edit') => void }

const makeColumns = (act: CellActions): ColDef<DistRow>[] => [
  /* 소계·합계 행은 목업 라벨을 그 자리에 쓴다 */
  { field: 'no', headerName: 'NO', width: 72, maxWidth: 72, pinned: 'left', sortable: false, cellStyle: centerNum,
    valueFormatter: (p) => (p.node?.rowPinned ? '합 계' : p.value == null ? '소 계' : String(p.value)) },
  txt('un', '운용사', 190, 230),
  txt('fn', '자펀드', 230, 280),
  ctr('acc', '계정구분', 100),
  dt('rd', '등록일', 116),
  amtBlank('form', '결성액'),
  txt('mem', '조합원', 210, 260),
  { field: 'mg', headerName: '조합원구분', width: 112, sortable: false, cellStyle: flexMid,
    cellRenderer: (p: any) => (p.value == null ? null : <NeutralChip v={p.value as Grade} />) },
  amtBlank('mc', '조합원 약정금액'),
  amtBlank('mtc', '조합원 약정총액'),
  /* 거래구분 — 배분은 강조(primary), 출자는 중립 회색(목업 `txTag`의 tag b / tag n) */
  { field: 'tx', headerName: '거래구분', width: 104, sortable: false, cellStyle: flexMid,
    cellRenderer: (p: any) => (p.value == null ? null
      : p.value === '배분' ? <StatusBadge tone="primary" label="배분" size="lg" dot={false} /> : <NeutralChip v={p.value as string} />) },
  ctr('dtx', '상세구분', 110),
  /* 거래일자 — 편집 팝업 진입점(클릭 / 셀 Enter). 소계·합계 행은 링크가 아니다 */
  { field: 'td', headerName: '거래일자', width: 124, sortable: false, cellStyle: flexMid,
    cellRenderer: (p: any) => (p.value == null ? null
      : <LinkCell value={p.value} hint={p.data?.tx === '출자' ? '출자거래 수정 열기' : '배분거래수정 열기'}
          onClick={() => p.data && act.openTx(p.data.gi, 'edit')} />) },
  amt('pay', '납입금액'),
  amt('paytot', '조합 납입총액'),
  amt('prin', '원금배분액'),
  amt('prof', '수익배분액(세전)'),
  amt('perf', '성과보수액'),
  amt('disttot', '조합 배분총액', true),
  amt('etc', '기타배분액(이자 등)'),
  amt('prio', '우선손실충당액'),
  amt('wht', '원천징수세액'),
  amt('netin', '실 입금액', true),
  amt('netintot', '실 입금총액', true),
  amt('bal', '보유잔액'),
  { field: 'chk', headerName: '수탁데이터 확인검토', width: 160, sortable: false, cellStyle: flexMid,
    cellRenderer: (p: any) => (p.value == null ? dash
      : <ChkCell v={p.value as Chk} tx={p.data?.tx ?? null} onRegister={() => p.data && act.openTx(p.data.gi, 'register')} />) },
  dashTxt('red', '감액여부', 104),
  dashTxt('memo', '비고', 220, 280),
];

/* 소계 행 강조 — 목업 `tr.subtotal`(회색 배경 + 굵게). 모듈 스코프 함수라 렌더 간 참조 고정 */
const getRowStyle = (p: RowClassParams<DistRow>): RowStyle | undefined =>
  p.data?.kind === 'subtotal' ? { background: 'var(--muted)', fontWeight: 700 } : undefined;

/** 엑셀 금액 열(선택 단위 숫자 셀) */
const MONEY = new Set<string>(['form', 'mc', 'mtc', 'pay', 'paytot', 'prin', 'prof', 'perf', 'disttot', 'etc', 'prio', 'wht', 'netin', 'netintot', 'bal']);

/** Excel 헤더·리프 키를 columnDefs에서 자동 산출(28컬럼 수작업 오프바이원 방지). 단일 헤더라 병합 없음 */
function flattenForExcel(defs: ColDef<DistRow>[], unit: Unit) {
  const head: string[] = [], keys: string[] = [];
  for (const col of defs) {
    const h = col.headerName ?? '';
    /* 커뮤니티 xlsx는 셀 스타일을 못 써 단위를 헤더로만 전달(asset_funding 방식) */
    head.push(MONEY.has(String(col.field)) ? `${h}(${unit})` : h);
    keys.push(String(col.field));
  }
  return { head, keys };
}

/* ──────────────────────────────
   로컬 헬퍼 — 골드(gp_contribution_manage·fund_stats)에서 복사. 공유 export 아님
────────────────────────────── */

function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer motion-safe:active:scale-[.97]"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

/* plain=true → <label> 대신 <div>: PeriodPicker 트리거는 <button>이라 <label> 안에서 2회 토글된다 */
function DrawerField({ label, noop, plain, children }: { label: string; noop?: boolean; plain?: boolean; children: ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>
        {label}{noop && <span className="font-normal text-caption" style={{ fontSize: 12 }}> · 데이터 연동 후 적용</span>}
      </span>
      {children}
    </Wrap>
  );
}
/* noAll — '전체'(빈 값) 선택지가 없는 항목(조회기준은 늘 하나가 잡혀 있다) */
function DrawerSelect({ value, onChange, options, all = '전체', noAll }: { value: string; onChange: (v: string) => void; options: string[]; all?: string; noAll?: boolean }) {
  return (
    <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
        {!noAll && <option value="">{all}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}

type ModalState = null | { kind: 'dist'; gi: number; mode: 'register' | 'edit' } | { kind: 'invest' };

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function ApfsContributionManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<DistRow> | null>(null);
  const [groups, setGroups] = useState<TxGroup[]>(GROUPS);
  const [modal, setModal] = useState<ModalState>(null);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);

  /* 필터 — 조회기준은 툴바 칩 + 드로어가 **같은 state를 공유**한다(표시가 갈라지지 않게) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [basis, setBasis] = useState<Basis>(DEFAULT_BASIS);
  const [fMf, setFMf] = useState('');     // 모펀드 — 그룹 컬럼 아님(no-op)
  const [fUn, setFUn] = useState('');
  const [fFn, setFFn] = useState('');
  const [fAcc, setFAcc] = useState('');
  const [fFrom, setFFrom] = useState(''); // 기준일자 시작 'YYYY-MM-DD'(빈 값=열린 경계)
  const [fTo, setFTo] = useState('');     // 기준일자 종료(동상)
  const clearFilters = () => { setBasis(DEFAULT_BASIS); setFMf(''); setFUn(''); setFFn(''); setFAcc(''); setFFrom(''); setFTo(''); };

  /* deps []: setModal은 안정(useState 세터) — 매 렌더 새 배열이면 그리드가 컬럼을 재생성하며 폭이 되돌아간다 */
  const openTx = useCallback((gi: number, mode: 'register' | 'edit') => {
    /* 모듈 상수에서 찾아도 안전하다 — 그룹 정체성(gi·tx·un·fn…)은 불변이고 저장이 바꾸는 건 members뿐이다.
       (state를 deps에 넣으면 columnDefs가 매 저장마다 재생성돼 컬럼 폭이 선언값으로 되돌아간다) */
    const g = GROUPS.find((x) => x.gi === gi);
    /* 거래구분이 '출자'면 별 데이터(INVEST_GROUP)를 쓰는 출자거래 수정 팝업이다(목업 동형) */
    if (mode === 'edit' && g?.tx === '출자') { setModal({ kind: 'invest' }); return; }
    setModal({ kind: 'dist', gi, mode });
  }, []);
  const columnDefs = useMemo(() => makeColumns({ openTx }), [openTx]);
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  /* ⚠ 필터는 **그룹 단위**다 — 평탄화된 행을 거르면 소계가 자기 멤버 없이 살아남는다(파일 상단 '한계').
     AG Grid External Filter를 쓰지 않는 이유도 같다(행 단위로만 동작). */
  const passes = useCallback((g: TxGroup) => {
    if (fUn && g.un !== fUn) return false;
    if (fFn && g.fn !== fFn) return false;
    if (fAcc && g.acc !== fAcc) return false;
    if (fFrom && g.td < fFrom) return false;   // 기준일자 = 거래일자, 'YYYY-MM-DD' 사전식 비교
    if (fTo && g.td > fTo) return false;
    return basisKeepsGroup(basis, g);
  }, [fUn, fFn, fAcc, fFrom, fTo, basis]);

  const filteredGroups = useMemo(() => groups.filter(passes), [groups, passes]);
  const displayRows = useMemo(() => flatten(filteredGroups, basis), [filteredGroups, basis]);
  /* 조합원 행 수 — 푸터 '총 N개'의 기준(목업 `#cnt`도 소계·합계를 세지 않는다) */
  /* pinned 합계 — 인라인 배열 금지(참조가 매 렌더 바뀌면 고정행이 재생성된다).
     결과가 0건이면 0으로 채운 가짜 합계행을 띄우지 않는다(빈 그리드 문구만 보이게) */
  const pinnedBottom = useMemo(() => (displayRows.length ? [grandRow(filteredGroups)] : []), [filteredGroups, displayRows.length]);

  const unOptions = useMemo(() => Array.from(new Set(groups.map((g) => g.un))), [groups]);
  const fnOptions = useMemo(() => Array.from(new Set(groups.map((g) => g.fn))), [groups]);

  /* 그리드 context — 금액 포매터(moneyFmt)가 참조 */
  const gridContext = useMemo(() => ({ unit }), [unit]);
  /* 단위 변경 → 금액 셀 재포맷. 본문 + pinned 합계행 모두 */
  useEffect(() => { apiRef.current?.refreshCells({ force: true }); }, [unit]);

  const onGridReady = useCallback((e: GridReadyEvent<DistRow>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* 키보드 진입 — AG Grid의 Tab은 **셀 단위**로만 이동해 셀 안 button에 초점이 닿지 않는다.
     거래일자 Enter = 편집 팝업, 수탁확인검토 Enter = 배분거래등록(버튼이 있는 조건일 때만). WCAG 2.1.1 */
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<DistRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter') return;
    if (e.node?.rowPinned || !e.data || e.data.kind !== 'row') return;
    const col = e.column.getColId();
    if (col === 'td') openTx(e.data.gi, 'edit');
    else if (col === 'chk' && e.data.chk === '확인' && e.data.tx === '배분') openTx(e.data.gi, 'register');
  }, [openTx]);

  const refresh = () => { setGroups(GROUPS); clearFilters(); toast.success('새로고침했습니다'); };

  /* 배분거래 저장 — 대상 그룹의 members만 불변 갱신(다른 그룹·필드는 그대로) */
  const saveDist = (gi: number, members: TxMember[]) => {
    setGroups((prev) => prev.map((g) => (g.gi === gi ? { ...g, members } : g)));
    setModal(null);
    toast.success('저장되었습니다 (목업)');
  };

  /* ── Excel(.xlsx) — 단일 헤더 28열 + 표시행(조합원+소계) + 합계, 선택 단위 환산. ── */
  const exportExcel = () => {
    const { head, keys } = flattenForExcel(columnDefs, unit);
    const src = [...displayRows, ...pinnedBottom];   // 화면 렌더 소스와 같은 구성(화면=엑셀 불변식)
    const body = src.map((r) => keys.map((k) => {
      const v = (r as any)[k];
      /* NO — 소계·합계는 화면과 같은 라벨 */
      if (k === 'no') return r.id === '__grand' ? '합 계' : v == null ? '소 계' : v;
      if (v == null) return '';
      if (MONEY.has(k)) return toUnit(v as number, unit);
      return v;
    }));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    src.forEach((r, i) => keys.forEach((k, j) => {
      if (!MONEY.has(k) || (r as any)[k] == null) return;
      const a = XLSX.utils.encode_cell({ r: i + 1, c: j });
      if (ws[a]) ws[a].z = Z_BY_UNIT[unit];
    }));
    ws['!cols'] = keys.map((k) => ({ wch: k === 'fn' || k === 'mem' ? 28 : k === 'un' || k === 'memo' ? 22 : MONEY.has(k) ? 17 : 12 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '출자·분배조회(농금원)');
    XLSX.writeFile(wb, `출자·분배조회(농금원)_${unit}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(displayRows.length, 1) : PAGE_SIZE;
  /* 페이지네이션은 표시행(조합원+소계) 기준이고, 총 건수는 조합원 행만 센다(목업 `#cnt`) */
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  const distGroup = modal?.kind === 'dist' ? groups.find((g) => g.gi === modal.gi) ?? null : null;

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '자펀드 관리', '출자/분배조회(농금원)']}
      title="출자/분배조회(농금원)"
      favRoute="apfs-contribution"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 = 주 필터 칩(조회기준) + 적용 중인 드로어 값 칩. 행 선택이 없어 selbar는 존재하지 않는다 */
      toolbarLeft={(
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {BASES.map((b) => (
            <FilterChip key={b} active={basis === b} onClick={() => setBasis(b)}>{b}</FilterChip>
          ))}
          {/* 값만 표시(접두사 없음) + × */}
          {([
            ['운용사', fUn, () => setFUn(''), true],
            ['자펀드', fFn, () => setFFn(''), true],
            ['계정구분', fAcc, () => setFAcc(''), true],
            ['기준일자 시작', fFrom, () => setFFrom(''), false],
            ['기준일자 종료', fTo, () => setFTo(''), false],
          ] as [string, string, () => void, boolean][]).filter(([, v]) => v).map(([label, value, clear, isText]) => (
            <span key={label} className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
              {isText ? value : String(value)}
              <button type="button" onClick={clear} aria-label={label + ' 필터 제거'} className="inline-flex items-center justify-center border-0 cursor-pointer" style={{ background: 'transparent', color: 'inherit', minWidth: 24, minHeight: 24, padding: 0, margin: '-5px -4px -5px 0' }}>
                <Icon name="x" size={13} stroke={2.4} />
              </button>
            </span>
          ))}
        </>
      )}
      toolbarRight={<>
        {/* 금액 단위 전환(목업 목록바 `.seg.sm`) — 캡션 + 세그먼트 */}
        <span className="text-caption font-semibold whitespace-nowrap" style={{ fontSize: 12, marginRight: 6 }}>{'단위: ' + unit}</span>
        <SegTabs size="sm" value={unit} onChange={(v) => setUnit(v as Unit)} options={UNITS.map((u) => ({ value: u, label: u }))} />
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span>{/* 총계는 그리드 표시행(조합원+소계) 기준 — shown이 같은 행 집합의 페이지 슬라이스라 분모·분자를 맞춘다 */
        '총 ' + String(displayRows.length) + '개 중 ' + String(shown) + '개 항목 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      {/* AG Grid 본체 — 단일 헤더 28열 + 인라인 소계 행 + pinned 합계.
          가로는 AG Grid 내부 스크롤(28열이라 프레임보다 넓다 → AUTO_SIZE_CONTENT + 텍스트 컬럼 maxWidth 캡) */}
      <div>
        <AgGridReact<DistRow>
          theme={apfsTheme}
          rowData={displayRows}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          context={gridContext}
          getRowStyle={getRowStyle}
          pinnedBottomRowData={pinnedBottom}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}
          defaultColDef={DEFAULT_COL_DEF}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조건에 맞는 출자·배분 내역이 없습니다.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어 — 목업 검색박스 순서 그대로(모펀드·운용사·자펀드·계정구분·조회기준·기준일자).
             검색어는 없다(목업 미포함). 모펀드는 그룹 컬럼과 미연동이라 noop 캡션 ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">출자/분배조회(농금원) 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="모펀드" noop><DrawerSelect value={fMf} onChange={setFMf} options={['농식품모태펀드', 'MOAF']} /></DrawerField>
            <DrawerField label="운용사"><DrawerSelect value={fUn} onChange={setFUn} options={unOptions} /></DrawerField>
            <DrawerField label="자펀드"><DrawerSelect value={fFn} onChange={setFFn} options={fnOptions} /></DrawerField>
            {/* 목업은 전체/농식품/수산 칩 그룹 — DrawerSelect의 첫 옵션 '전체'가 같은 역할을 한다 */}
            <DrawerField label="계정구분"><DrawerSelect value={fAcc} onChange={setFAcc} options={['농식품', '수산']} /></DrawerField>
            {/* 조회기준은 툴바 칩과 같은 state를 공유한다(한 항목·두 진입점). 늘 하나가 잡혀 있어 '전체' 빈 값이 없다 */}
            <DrawerField label="조회기준"><DrawerSelect value={basis} onChange={(v) => setBasis(v as Basis)} options={BASES} noAll /></DrawerField>
            {/* 기준일자 = 거래일자 범위. PeriodPicker는 <label>로 명명되지 않으므로 plain + ariaLabel(apfs-datepicker) */}
            <DrawerField label="기준일자 시작" plain><div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}><PeriodPicker mode="day" value={fFrom} onChange={setFFrom} ariaLabel="기준일자 시작일" /></div></DrawerField>
            <DrawerField label="기준일자 종료" plain><div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}><PeriodPicker mode="day" value={fTo} onChange={setFTo} ariaLabel="기준일자 종료일" /></div></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* 편집 팝업 — 조건부 마운트(open prop 없음) */}
      {modal?.kind === 'dist' && distGroup && (
        <DistTxModal group={distGroup} mode={modal.mode} onClose={() => setModal(null)}
          onSave={(members) => saveDist(distGroup.gi, members)} />
      )}
      {modal?.kind === 'invest' && <InvestTxModal onClose={() => setModal(null)} />}

    </GridFrame>
  );
}
