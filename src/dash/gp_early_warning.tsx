/* 운용사별 조기경보 조회 — 조회 전용 매트릭스 페이지 (조기경보 > 조기경보 > 운용사별 조기경보 조회).
   출처: docs/mockups/02_조기경보/S2_47_운용사별_조기경보_조회.html (KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(모펀드·운용사·기준년월) → 상세필터 드로어 3항목. 목업 툴바의 `조회` 버튼은 없앴다
     (백엔드가 없어 필터가 즉시 반영된다). `엑셀`·`출력`은 툴바가 아니라 **푸터 FooterActions**가 소유한다.
   - 운용사구분 4종(벤처투자회사·증권회사·여신전문금융회사·은행) → **세로로 쌓인 그리드 4개**.
     탭으로 합치지 않는다 — 구분마다 지표1·지표2 컬럼(자본충실도/영업용순자본비율/…)이 달라 하나의
     컬럼 집합으로 표현할 수 없다(목업도 4개 표를 나란히 둔다).
   - 2단 그룹헤더(지표1·지표2·자기자본이익률·총자산수익률·법령위반·주주변동·소송여부·총점) → `ColGroupDef` + `marryChildren`.
   - 등급 셀 → `StatusBadge`(정상=success · 주의=warning · 경고=danger), `size="lg"`.
   - 행 더블클릭(+셀 Enter/Space) → 「운용사별 조기경보 재무정보」 팝업(`gp_early_warning_fin_modal.tsx`).
     ⚠ 목업 설계메모는 "단일 클릭"이라 적었으나 **앱 규약(더블클릭 진입)으로 뒤집었다**(2026-09-21 사용자 결정).
   - KPI 배지 행 없음 · 행 선택 없음 · 합계행 없음 · 페이지네이션 없음(그리드당 1행, 비율·등급이라 합계 무의미).
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·LNB·하단 설계메모/[확인 필요] 블록은 프로토타입 스캐폴딩이라
   이식하지 않는다(셸이 소유). 원문 미정의 사항은 재무정보 팝업 파일의 주석에 남겼다.

   한계·가정:
   - 행 데이터는 목업 실측 4행(구분당 1행)이 전부다 — 없는 운용사를 창작하지 않는다.
   - `기준년월`은 **행을 거르는 필터가 아니라 조회 기준 컨텍스트**다(custody_confirm_manage의 기준일자와 동형).
     `passes`에 넣지 않고 팝업 헤더/푸터 캡션에만 싣는다.
   - 각 지표 비율의 산출식은 원문에 정의가 없다(결과값만 제공) — 출처 값을 그대로 둔다(apfs-spec-popup 규약 7).

   ⚠️ AG Grid v35.3.1(v33+) Theming API: 레거시 CSS(ag-grid.css/ag-theme-*.css) import 금지. */
import './aggrid_shared.css';   // 합계행 opacity 버그 보정 + 공유 그리드 스타일(합계행이 없어도 공유 규칙은 필요)
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from './components';
import type { Tone } from './components';
import { Icon } from './icons';
import { GridFrame, FooterActions } from './grid_frame';
import { SectionHead } from './risk_grid';
import { apfsTheme, DEFAULT_COL_DEF, numStyle } from './aggrid_theme';
import { controlMinWidth, drawerInputStyle as inputStyle } from './schemas/renderers';   // 드로어 컨트롤 34px SSOT — 페이지 로컬 복제 금지
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ColGroupDef, GridApi, GridReadyEvent, IRowNode, CellStyle, CellKeyDownEvent, ValueFormatterParams, RowDoubleClickedEvent } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';
import { PeriodPicker } from './ui/period-picker';
import { GpEarlyWarningFinModal } from './gp_early_warning_fin_modal';

const { Button, IconBtn, StatusBadge } = UI;

/* ──────────────────────────────
   도메인 타입 — 목업 4개 표의 리프 컬럼을 그대로 편 구조(구분별 지표1·지표2만 라벨이 다르고 키는 공유)
────────────────────────────── */
export type Grade = '정상' | '주의' | '경고';
export type GpKind = '벤처투자회사' | '증권회사' | '여신전문금융회사' | '은행';

export interface GpEwRow {
  id: string;
  no: number;
  mf: string;          // 모펀드
  gp: string;          // 운용사
  kind: GpKind;        // 운용사구분
  m1: number | null; m1g: Grade | null;                        // 지표1 [비율·등급]
  m2: number | null; m2g: Grade | null;                        // 지표2 [비율·등급]
  roe: number | null; roeG: Grade | null; roeA: number | null; // 자기자본이익률 [비율·등급·연환산]
  roa: number | null; roaG: Grade | null; roaA: number | null; // 총자산수익률 [비율·등급·연환산]
  lawN: number | null; lawG: Grade | null;                     // 법령위반 [건수·등급]
  shN: number | null; shG: Grade | null;                       // 주주변동 [건수·등급]
  suitN: number | null; suitG: Grade | null;                   // 소송여부 [건수·등급]
  score: number | null; scoreG: Grade | null;                  // 총점 [점수·등급]
}

/* 등급 → 배지 톤. 목업 `.tag.g`=정상 · `.tag.a`=주의 · `.tag.d`=경고 */
const GRADE_TONE: Record<Grade, Tone> = { 정상: 'success', 주의: 'warning', 경고: 'danger' };

/* 기준년월 기본값 **없음**(2026-09-21 사용자 지시 "기준년월 디폴트 없애줘").
   목업 검색박스엔 `value="2026-07"` 이 박혀 있었으나, 임의의 기준월이 선택된 것처럼 보이는 편이
   비어 있는 것보다 오해를 부른다. 미선택('')이 초기 상태이고 초기화·칩 제거도 ''로 되돌린다.
   ⚠ 빈 값이 흐르는 자리 4곳에 각각 가드가 있다 — 푸터 캡션·적용 칩·엑셀 파일명·팝업 부제. */
const MOTHER_FUND = '농식품모태펀드';

/* 검색어 게이트 — 목업 검색박스에 검색어 입력이 없어 **OFF**로 둔다.
   되살릴 때는 이 상수만 true 로 바꾸면 드로어 필드와 `passes` 판정이 함께 살아난다. */
const SEARCHABLE = false;

/* ──────────────────────────────
   데이터 — 목업 4개 표의 실측값 그대로(구분당 1행). 신규 행 생성 금지.
   [운용사, 지표1 비율·등급, 지표2 비율·등급, ROE 비율·등급·연환산, ROA 비율·등급·연환산,
    법령위반 건수·등급, 주주변동 건수·등급, 소송여부 건수·등급, 총점 점수·등급]
────────────────────────────── */
const RAW: Record<GpKind, Omit<GpEwRow, 'id' | 'no' | 'mf' | 'kind'>> = {
  벤처투자회사: {
    gp: '마이다스동아인베스트먼트(주)',
    m1: 166.53, m1g: '정상', m2: 0.2, m2g: '정상',
    roe: 4.5, roeG: '정상', roeA: 2.15, roa: 4.47, roaG: '정상', roaA: 2.14,
    lawN: 0, lawG: '정상', shN: 0, shG: '정상', suitN: 0, suitG: '정상', score: 100, scoreG: '정상',
  },
  증권회사: {
    gp: '케이프투자증권',
    m1: 249.38, m1g: '정상', m2: 105.38, m2g: '정상',
    roe: 10.62, roeG: '정상', roeA: 0, roa: 1.34, roaG: '정상', roaA: 0,
    lawN: 0, lawG: '정상', shN: 0, shG: '정상', suitN: 0, suitG: '정상', score: 70, scoreG: '경고',
  },
  여신전문금융회사: {
    gp: '엔에이치농협캐피탈(주)',
    m1: 13.32, m1g: '정상', m2: 124.82, m2g: '정상',
    roe: 7.42, roeG: '정상', roeA: 4.91, roa: 1.01, roaG: '정상', roaA: 0.66,
    lawN: 0, lawG: '정상', shN: 0, shG: '정상', suitN: 0, suitG: '정상', score: 100, scoreG: '정상',
  },
  은행: {
    gp: '농협은행',
    m1: 113.47, m1g: '정상', m2: 18.01, m2g: '경고',
    roe: 4.69, roeG: '정상', roeA: 446.03, roa: 0.28, roaG: '정상', roaA: 25.83,
    lawN: 0, lawG: '정상', shN: 0, shG: '정상', suitN: 0, suitG: '정상', score: 89.5, scoreG: '주의',
  },
};

/* 섹션 정의 — 번호·구분명·지표1/2 라벨. 목업 섹션 순서 그대로(1 벤처투자회사 → 4 은행). */
interface SectionSpec { no: number; kind: GpKind; m1: string; m2: string }
const SECTIONS: SectionSpec[] = [
  { no: 1, kind: '벤처투자회사', m1: '자본충실도', m2: '부채비율' },
  { no: 2, kind: '증권회사', m1: '영업용순자본비율', m2: '유동성비율' },
  { no: 3, kind: '여신전문금융회사', m1: '조정자기자본비율', m2: '유동성비율' },
  { no: 4, kind: '은행', m1: 'BIS자기자본비율', m2: '유동성커버리지비율' },
];

/* 구분별 행(각 1건). No 는 그리드마다 1부터 — 목업 각 표의 `No` 열과 동일. */
const ROWS: Record<GpKind, GpEwRow[]> = SECTIONS.reduce((acc, s) => {
  acc[s.kind] = [{ id: 'gpew-' + s.no, no: 1, mf: MOTHER_FUND, kind: s.kind, ...RAW[s.kind] }];
  return acc;
}, {} as Record<GpKind, GpEwRow[]>);

/* ──────────────────────────────
   컬럼 정의 — 선두 4(No·모펀드·운용사·운용사구분) + 2단 그룹헤더 지표 18 = 22 리프
   ⚠ 폭 전략: 고정폭(flex 없음, autoSizeStrategy 없음). 리프 22개의 폭 합(≈2000)이 프레임(1280)을
     넘는 **넓은 표**라 flex 를 주면 지표 컬럼이 눌려 뭉개지고, `fitCellContents` 는 첫 프레임에
     컬럼 가상화를 풀면서 긴 그룹 라벨(유동성커버리지비율)이 폭을 지배한다(apfs-aggrid "컬럼 폭" 규약).
   ⚠ 팩토리는 **모듈 스코프에서 1회만** 실행해 상수로 고정한다 — 렌더마다 새 배열/컴포넌트 타입을 만들면
     AG Grid 가 헤더를 remount 하고 폭을 선언값으로 되돌린다(apfs-aggrid 계약 ⑥·⑦).
────────────────────────────── */
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };

/* 비율·점수 포매터 — 공유 `numFmt`(=fmt)는 비정수를 **소수 1자리로 반올림**해 목업 값 166.53·124.82 가
   166.5·124.8 로 바뀐다. 출처 값의 자릿수를 보존해야 하므로 이 화면은 2자리 상한 포매터를 쓴다.
   null 가드는 공유 포매터와 동일 계약. */
const ratioFmt = (p: ValueFormatterParams): string =>
  p.value == null ? '-' : String(Number(p.value).toLocaleString(undefined, { maximumFractionDigits: 2 }));
/* 건수 포매터 — 정수 콤마. null 은 '-' */
const countFmt = (p: ValueFormatterParams): string =>
  p.value == null ? '-' : String(Number(p.value).toLocaleString());

/* 등급 셀 — 상태 표식. 값이 없으면 빈 셀. */
function GradeCell({ v }: { v: Grade | null }) {
  if (!v) return null;
  return <StatusBadge tone={GRADE_TONE[v]} label={v} size="lg" />;
}

const numCol = (field: keyof GpEwRow, header: string, width: number, fmtr = ratioFmt): ColDef<GpEwRow> => ({
  field, headerName: header, width, minWidth: width,
  valueFormatter: fmtr, cellStyle: numStyle() as any, type: 'rightAligned',
});
/* 등급 리프 — StatusBadge(size lg)가 잘리지 않도록 최소 84px.
   정렬은 `DEFAULT_COL_DEF`의 sortable:true 를 그대로 둔다(등급 문자열 정렬이 유효하고,
   일부 컬럼만 정렬 불가면 헤더에 시각 단서가 없어 혼란스럽다). */
const gradeCol = (field: keyof GpEwRow, header = '등급'): ColDef<GpEwRow> => ({
  field, headerName: header, width: 84, minWidth: 84, cellStyle: flexMid,
  cellRenderer: (p: any) => <GradeCell v={(p.value ?? null) as Grade | null} />,
});
/* 텍스트 리프 */
const txtCol = (field: keyof GpEwRow, header: string, width: number): ColDef<GpEwRow> => ({
  field, headerName: header, width, minWidth: width, cellStyle: flexCenter,
  cellRenderer: (p: any) => <span className="min-w-0 truncate">{p.value}</span>,
});

function makeColumnDefs(label1: string, label2: string): (ColDef<GpEwRow> | ColGroupDef<GpEwRow>)[] {
  return [
    /* No 는 순번 — 행에 저장된 값이라 정렬해도 번호가 다시 매겨지지 않는다 */
    { field: 'no', headerName: 'No', width: 64, minWidth: 64, pinned: 'left', type: 'rightAligned',
      cellStyle: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } as CellStyle,
      valueFormatter: (p) => (p.value == null ? '' : String(p.value)) },
    txtCol('mf', '모펀드', 140),
    txtCol('gp', '운용사', 210),
    txtCol('kind', '운용사구분', 140),
    { headerName: label1, marryChildren: true, children: [numCol('m1', '비율', 94), gradeCol('m1g')] },
    { headerName: label2, marryChildren: true, children: [numCol('m2', '비율', 94), gradeCol('m2g')] },
    { headerName: '자기자본이익률', marryChildren: true, children: [numCol('roe', '비율', 94), gradeCol('roeG'), numCol('roeA', '연환산', 94)] },
    { headerName: '총자산수익률', marryChildren: true, children: [numCol('roa', '비율', 94), gradeCol('roaG'), numCol('roaA', '연환산', 94)] },
    { headerName: '법령위반', marryChildren: true, children: [numCol('lawN', '건수', 84, countFmt), gradeCol('lawG')] },
    { headerName: '주주변동', marryChildren: true, children: [numCol('shN', '건수', 84, countFmt), gradeCol('shG')] },
    { headerName: '소송여부', marryChildren: true, children: [numCol('suitN', '건수', 84, countFmt), gradeCol('suitG')] },
    { headerName: '총점', marryChildren: true, children: [numCol('score', '점수', 94), gradeCol('scoreG')] },
  ];
}

/* 구분별 컬럼 정의 — 모듈 스코프 1회 생성(참조 고정) */
const COLUMNS: Record<GpKind, (ColDef<GpEwRow> | ColGroupDef<GpEwRow>)[]> = SECTIONS.reduce((acc, s) => {
  acc[s.kind] = makeColumnDefs(s.m1, s.m2);
  return acc;
}, {} as Record<GpKind, (ColDef<GpEwRow> | ColGroupDef<GpEwRow>)[]>);

/* ──────────────────────────────
   Excel 헤더 — columnDefs 에서 **재귀로 병합/리프를 자동 산출**한다(이 화면은 2단).
   골드 `custody_confirm_manage.tsx`(깊이 N 재귀)를 이 파일에 한 번만 옮겨 4개 시트에 재사용한다.
   - 깊이 d 의 그룹이 리프 n 개를 덮으면 → heads[d] 에 이름 1 + 빈칸 n-1, 가로 병합
   - 깊이 d 의 리프는 → heads[d] 에 이름, 아래 행은 빈칸 + 세로 병합
   - 1칸짜리 병합(퇴화 범위)은 만들지 않는다
────────────────────────────── */
type AnyDef = ColDef<GpEwRow> | ColGroupDef<GpEwRow>;
const isGroup = (d: AnyDef): d is ColGroupDef<GpEwRow> => Array.isArray((d as ColGroupDef<GpEwRow>).children);
const depthOf = (d: AnyDef): number => (isGroup(d) ? 1 + Math.max(...d.children.map((k) => depthOf(k as AnyDef))) : 1);

function flattenForExcel(defs: AnyDef[]) {
  const maxDepth = Math.max(...defs.map(depthOf));
  const heads: string[][] = Array.from({ length: maxDepth }, () => [] as string[]);
  const keys: string[] = [];
  const merges: XLSX.Range[] = [];
  let c = 0;
  const walk = (d: AnyDef, row: number) => {
    if (isGroup(d)) {
      const start = c;
      d.children.forEach((k) => walk(k as AnyDef, row + 1));
      heads[row][start] = d.headerName ?? '';
      for (let i = start + 1; i < c; i += 1) heads[row][i] = '';
      if (c - 1 > start) merges.push({ s: { r: row, c: start }, e: { r: row, c: c - 1 } });
      return;
    }
    heads[row][c] = d.headerName ?? '';
    for (let r = row + 1; r < maxDepth; r += 1) heads[r][c] = '';
    if (row < maxDepth - 1) merges.push({ s: { r: row, c }, e: { r: maxDepth - 1, c } });
    keys.push(String(d.field));
    c += 1;
  };
  defs.forEach((d) => walk(d, 0));
  heads.forEach((row) => { for (let i = 0; i < c; i += 1) if (row[i] === undefined) row[i] = ''; });
  return { heads, keys, merges };
}

/* ──────────────────────────────
   드로어 프리미티브(골드 로컬 복사 — 공유 export 아님)
────────────────────────────── */
/* plain=true → <label> 대신 <div>: PeriodPicker 트리거는 <button>이라 <label> 암묵 연결이 안 되고(ariaLabel로 명명),
   <label> 안 버튼 클릭이 라벨 활성화와 겹쳐 2회 토글되는 것을 막는다 */
function DrawerField({ label, plain, children }: { label: string; plain?: boolean; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </Wrap>
  );
}

function DrawerSelect({ value, onChange, options, ariaLabel }: { value: string; onChange: (v: string) => void; options: string[]; ariaLabel?: string }) {
  return (
    <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
      <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
        <option value="">전체</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}

const GP_OPTIONS: string[] = SECTIONS.map((s) => RAW[s.kind].gp);
const NO_ROWS = '<span style="padding:40px 0;display:inline-block;color:var(--muted-foreground);font-size:13px">조건에 맞는 운용사가 없습니다.</span>';
/* ⚠ `overlayNoRowsTemplate`은 **rowData 자체가 빈** 경우에만 쓰인다. 필터로 0행이 된 경우 AG Grid v35는
   별도 오버레이(`NoMatchingRowsOverlayComponent`)를 띄워 기본 영문 "No Matching Rows"가 노출된다(2026-09-21 실측).
   운용사 1곳을 고르면 나머지 3개 그리드가 반드시 이 경로로 빈다 → 문구를 한글로 덮는다(선례 `early_warning_manage.tsx`).
   객체 prop이라 모듈 상수로 둔다(인라인 리터럴 = 렌더마다 새 객체 → 컬럼 폭 되돌림, apfs-aggrid ⑦). */
const NO_ROWS_LOCALE = {
  noRowsToShow: '조건에 맞는 운용사가 없습니다.',
  noMatchingRows: '조건에 맞는 운용사가 없습니다.',
};

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function GpEarlyWarning({ onNav }: { onNav?: (r: string) => void }) {
  /* 그리드 4개의 API — 구분(kind)을 키로 보관하고 필터 변경 시 전부 onFilterChanged() 한다 */
  const apisRef = useRef<Partial<Record<GpKind, GridApi<GpEwRow>>>>({});
  const [modalRow, setModalRow] = useState<GpEwRow | null>(null);

  /* 필터 — 모펀드·운용사는 행 필터, 기준년월은 조회 기준 컨텍스트(행을 거르지 않음) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fMf, setFMf] = useState('');
  const [fGp, setFGp] = useState('');
  const [fYm, setFYm] = useState('');   // 기본값 없음 — 미선택 상태로 시작한다
  const [q, setQ] = useState('');   // 검색어 — SEARCHABLE 게이트가 OFF면 드로어에 렌더되지 않는다
  const clearFilters = () => { setFMf(''); setFGp(''); setFYm(''); setQ(''); };

  const passes = useCallback((r: GpEwRow) => {
    if (SEARCHABLE && q && !(r.gp + r.mf).toLowerCase().includes(q.toLowerCase())) return false;
    return (!fMf || r.mf === fMf) && (!fGp || r.gp === fGp);
  }, [fMf, fGp, q]);

  const filterActive = Boolean(fMf || fGp || (SEARCHABLE && q));
  /* 그리드 4개 각각에 필터 재평가를 알린다(External Filter, Community) */
  useEffect(() => {
    SECTIONS.forEach((s) => apisRef.current[s.kind]?.onFilterChanged());
  }, [passes]);
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<GpEwRow>) => (node.data ? passes(node.data) : true), [passes]);

  /* 구분별 표시 건수(푸터 캡션·엑셀 본문 공용) */
  const visible = useMemo(() => {
    const out = {} as Record<GpKind, GpEwRow[]>;
    SECTIONS.forEach((s) => { out[s.kind] = ROWS[s.kind].filter(passes); });
    return out;
  }, [passes]);
  const totalShown = SECTIONS.reduce((n, s) => n + visible[s.kind].length, 0);

  const onGridReady = useCallback((kind: GpKind) => (e: GridReadyEvent<GpEwRow>) => { apisRef.current[kind] = e.api; }, []);

  /* 팝업 진입 — 행 더블클릭(앱 규약) + 셀 Enter/Space(키보드 경로).
     ⚠ Space 는 preventDefault 하지 않으면 팝업이 열리는 동안 페이지가 스크롤된다. */
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<GpEwRow>) => { if (e.data) setModalRow(e.data); }, []);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<GpEwRow>) => {
    const ev = e.event as KeyboardEvent | null;
    if (!ev || (ev.key !== 'Enter' && ev.key !== ' ')) return;
    ev.preventDefault();
    if (e.data) setModalRow(e.data);
  }, []);

  const refresh = () => { clearFilters(); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — **시트 4장**(시트명 = 운용사구분). 2단 헤더 병합·리프 키는 columnDefs 에서 자동 산출.
     본문은 **화면과 같은 필터 결과**(visible)를 쓴다 — 화면=엑셀 불변식(apfs-spec-popup 규약 6). ── */
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    SECTIONS.forEach((s) => {
      const defs = COLUMNS[s.kind];
      const { heads, keys, merges } = flattenForExcel(defs);
      const body = visible[s.kind].map((r) => keys.map((k) => {
        const v = (r as any)[k];
        if (v == null) return '';
        if (typeof v === 'number') return v;
        return String(v);
      }));
      const ws = XLSX.utils.aoa_to_sheet([...heads, ...body]);
      /* 숫자 리프에 화면과 같은 숫자서식(정수=콤마 / 소수=2자리 상한) */
      body.forEach((row, i) => row.forEach((v, j) => {
        if (typeof v !== 'number') return;
        const a = XLSX.utils.encode_cell({ r: i + heads.length, c: j });
        if (ws[a]) ws[a].z = Number.isInteger(v) ? '#,##0' : '#,##0.00';
      }));
      ws['!merges'] = merges;
      ws['!cols'] = keys.map((k) => ({ wch: k === 'gp' ? 28 : k === 'mf' || k === 'kind' ? 18 : k === 'no' ? 5 : 10 }));
      XLSX.utils.book_append_sheet(wb, ws, s.kind);
    });
    XLSX.writeFile(wb, `운용사별_조기경보${fYm ? `_${fYm}` : ''}.xlsx`);   // 기준년월 미선택이면 접미사 없이
    toast.success('Excel로 내보냈습니다');
  };

  /* 단축키 — ⌥D 내보내기 · ⌘P 인쇄. 화살표로 감싸야 한다(선언 전 참조 TDZ 방지).
     ⚠ 팝업이 열린 동안 ⌥D 는 끕다 — 팝업은 자체 `엑셀` 버튼을 가지므로 키보드 경로만 그걸 지나쳐
       배경 그리드(다른 데이터)를 내려받는 것은 혼란이다. ⌘P 는 그대로 둔다(팝업을 띄운 화면 인쇄는 정상). */
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: !modalRow });
  useHotkey(HOTKEYS.print.combo, () => window.print());

  return (
    <GridFrame
      crumbs={['홈', '조기경보', '조기경보', '운용사별 조기경보 조회']}
      title="운용사별 조기경보 조회"
      cardTitle="운용사별 조기경보 조회"
      favRoute="운용사별 조기경보 조회"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 적용된 필터 칩(값만)은 둘째 줄(appliedFilters). FilterChip 세트는 두지 않는다 —
         목업 검색박스에 카테고리형 주 필터가 없고, 4개 그리드가 이미 운용사구분 분해라 칩이 중복이다.
         기준년월은 조회 기준 컨텍스트 — 선택했을 때만 칩으로 띄운다 */
      appliedFilters={[
        { label: '모펀드', value: fMf, onClear: () => setFMf('') },
        { label: '운용사', value: fGp, onClear: () => setFGp('') },
        { label: '기준년월', value: fYm, onClear: () => setFYm('') },
      ]}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      /* 페이저 없음(그리드당 1행) → footerCenter 미전달, FooterActions 에 onToggleAll 미전달(버튼 3개) */
      /* 기준년월은 선택했을 때만 앞에 붙인다(미선택이면 '총 N건 · …'로 시작) */
      footerLeft={(
        <span>{(fYm ? `기준년월 ${String(fYm)} · ` : '') + '총 ' + String(totalShown) + '건 · '
          + SECTIONS.map((s) => `${s.kind} ${String(visible[s.kind].length)}`).join(' · ')}</span>
      )}
      footerRight={<FooterActions onExport={exportExcel} />}>

      <div>
        {SECTIONS.map((s) => (
          <section key={s.kind} aria-label={`${s.kind} 조기경보`}>
            {/* 다단 섹션 공용 헤더(apfs-section-stack) — 제목 15px·좌측 4px, 캡션에 지표 구성 */}
            <SectionHead title={s.kind}
              cap={`재무건전성 지표 — ${s.m1} · ${s.m2} · 자기자본이익률 · 총자산수익률 · 법령위반 · 주주변동 · 소송여부 · 총점 (비율/등급/연환산 2단 헤더)`} />
            {/* apfs-grid-min: autoHeight 그리드의 AG Grid 기본 최소 본문높이(150px)를 48px 로 낮춘다.
                그리드당 1행이라 그대로 두면 표 아래에 100px 넘는 빈 공간이 남는다(규칙·근거는 aggrid_shared.css). */}
            <div className="apfs-grid-min">
              <AgGridReact<GpEwRow>
                theme={apfsTheme}
                rowData={ROWS[s.kind]}
                columnDefs={COLUMNS[s.kind]}
                getRowId={(p) => p.data.id}
                domLayout="autoHeight"
                defaultColDef={DEFAULT_COL_DEF}
                isExternalFilterPresent={isExternalFilterPresent}
                doesExternalFilterPass={doesExternalFilterPass}
                onGridReady={onGridReady(s.kind)}
                onRowDoubleClicked={onRowDoubleClicked}
                onCellKeyDown={onCellKeyDown}
                localeText={NO_ROWS_LOCALE}
                overlayNoRowsTemplate={NO_ROWS}
              />
            </div>
          </section>
        ))}
      </div>

      {/* ── 상세필터 드로어 — 목업 검색박스 3항목(모펀드·운용사·기준년월) 순서 그대로 ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">운용사별 조기경보 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="모펀드">
              <DrawerSelect value={fMf} onChange={setFMf} options={[MOTHER_FUND]} ariaLabel="모펀드" />
            </DrawerField>
            <DrawerField label="운용사">
              <DrawerSelect value={fGp} onChange={setFGp} options={GP_OPTIONS} ariaLabel="운용사" />
            </DrawerField>
            {/* 기준년월 — 행을 거르지 않고 조회 기준을 정하는 값(팝업 부제에 실린다).
                PeriodPicker 트리거는 w-full 이라 fit-content 래퍼로 감싼다(apfs-datepicker "폭" 규칙) */}
            <DrawerField label="기준년월" plain>
              <div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}>
                <PeriodPicker mode="month" value={fYm} onChange={(v) => setFYm(v || '')} ariaLabel="기준년월" />
              </div>
            </DrawerField>
            {SEARCHABLE && (
              <DrawerField label="검색어">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="운용사명" style={inputStyle('text')} />
              </DrawerField>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 재무정보 팝업 — 행 더블클릭(또는 셀 Enter/Space)이 연다. 행 선택과 무관 ── */}
      {modalRow && (
        <GpEarlyWarningFinModal gp={modalRow.gp} kind={modalRow.kind} ym={fYm} onClose={() => setModalRow(null)} />
      )}

    </GridFrame>
  );
}
