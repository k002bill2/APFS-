/* 자펀드별 조기경보 조회 — 조회 전용 매트릭스 페이지 (조기경보 > 조기경보 > 자펀드별 조기경보 조회).
   출처: docs/mockups/02_조기경보/S2_49_자펀드별_조기경보_조회.html (KRDS TO-BE) → APFS 디자인시스템으로 변형.
   형제 화면 `gp_early_warning.tsx`(S2_47 운용사별)와 같은 구조·같은 관례로 만든다.

   구성(목업 → 우리 규약):
   - 검색박스(모펀드·자펀드·기준년월) → 상세필터 드로어 3항목. 목업 툴바의 `조회` 버튼은 없앴다
     (백엔드가 없어 필터가 즉시 반영된다). `엑셀`·`출력`은 툴바가 아니라 **푸터 FooterActions**가 소유한다.
   - 그리드 1개 · 리프 14컬럼. 2단 그룹헤더는 **`한도관리` 하나뿐**이고(의무투자·일정규모이하투자·투자자산·미투자자산),
     나머지 10개는 최상위 컬럼이라 AG Grid 가 자동으로 2행을 세로 병합한다(목업 `rowspan="2"` 와 동형).
   - 등급 셀 → `StatusBadge`(정상=success · 주의=warning · 경고=danger), `size="lg" dot={false}`.
   - **`자펀드수익률` 셀**(행 전체가 아니다) 단일 클릭 + 셀 Enter/Space → 「자펀드별 조기경보 상세조회 -
     자펀드수익률」 팝업(`fund_early_warning_yield_modal.tsx`, 출처 S2_50).
     ⚠ 목업 `td.pick` 과 같은 **단일 클릭**이다(2026-09-21 사용자 지시). 셀이 링크 아이콘을 달아
       링크처럼 보이므로 링크처럼 한 번에 열린다. 형제 S2_47 은 트리거가 **행**이라 더블클릭을 유지한다.
     ⚠ 팝업 내용이 수익률 전용이라 트리거 스코프도 행이 아니라 **셀**이다 — 다른 셀은 아무 일도 하지 않는다.
   - KPI 배지 행 없음 · 행 선택 없음 · 합계행 없음 · 페이지네이션 없음(1행, 등급 문자열이라 합계 무의미).
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·LNB·하단 설계메모/[확인 필요] 블록은 프로토타입 스캐폴딩이라
   이식하지 않는다(셸이 소유).

   한계·가정:
   - 행 데이터는 목업 `DATA` 실측 **1행**이 전부다 — 없는 자펀드를 창작하지 않는다.
     등급 3단계(정상·주의·경고) 중 **주의 샘플은 원문에 없어 만들지 않는다**(목업 설계메모 명시).
   - `기준년월`은 **행을 거르는 필터가 아니라 조회 기준 컨텍스트**다(형제 S2_47·custody_confirm_manage 동형).
     `passes`에 넣지 않고 푸터 캡션·엑셀 파일명에만 싣는다.
   - 모펀드 옵션 `MOAF` 는 목업 `<select id="f-mf">` 원문 그대로다(행에는 없는 값이라 고르면 0행이 된다).

   ⚠️ AG Grid v35.3.1(v33+) Theming API: 레거시 CSS(ag-grid.css/ag-theme-*.css) import 금지. */
import './aggrid_shared.css';   // 합계행 opacity 버그 보정 + 공유 그리드 스타일(합계행이 없어도 공유 규칙은 필요)
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from './components';
import type { Tone } from './components';
import { Icon } from './icons';
import { GridFrame, FooterActions } from './grid_frame';
import { apfsTheme, DEFAULT_COL_DEF } from './aggrid_theme';
import { controlMinWidth, drawerInputStyle as inputStyle } from './schemas/renderers';   // 드로어 컨트롤 34px SSOT — 페이지 로컬 복제 금지
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ColGroupDef, GridApi, GridReadyEvent, IRowNode, CellStyle, CellKeyDownEvent, CellClickedEvent, ICellRendererParams } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';
import { PeriodPicker } from './ui/period-picker';
import { FundEarlyWarningYieldModal } from './fund_early_warning_yield_modal';

const { Button, IconBtn, StatusBadge } = UI;

/* ──────────────────────────────
   도메인 타입 — 목업 `DATA` 의 키를 그대로 편 구조
   (등급 3단계는 형제 S2_47 과 같은 체계지만, 두 화면은 각자 목업을 옮긴 독립 모듈이라 타입도 로컬 선언한다)
────────────────────────────── */
export type Grade = '정상' | '주의' | '경고';

export interface FundEwRow {
  id: string;
  no: number;
  mf: string;      // 모펀드
  gp: string;      // 운용사
  fn: string;      // 자펀드
  cs: string;      // 조합성격
  ret: Grade;      // 자펀드수익률  ← 이 셀만 상세 팝업 트리거
  viol: Grade;     // 규약위반
  mgr: Grade;      // 대표펀드매니저변동
  staff: Grade;    // 운용인력변동
  l1: Grade;       // 한도관리 > 의무투자
  l2: Grade;       // 한도관리 > 일정규모이하투자
  l3: Grade;       // 한도관리 > 투자자산
  l4: Grade;       // 한도관리 > 미투자자산
  total: Grade;    // 종합등급
}

/* 등급 → 배지 톤. 목업 `warn()`: `.tag.g`=정상 · `.tag.a`=주의 · `.tag.d`=경고 */
const GRADE_TONE: Record<Grade, Tone> = { 정상: 'success', 주의: 'warning', 경고: 'danger' };

/* 팝업 트리거가 되는 유일한 컬럼의 colId. 이 상수 하나가 셀 클릭·셀 Enter/Space 양쪽 게이트다 —
   게이트를 빼면 `종합등급` 셀에서 Enter 를 눌러도 수익률 팝업이 열린다(목업은 `td.pick` 에만 바인딩한다). */
const YIELD_COL = 'ret';

const MOTHER_FUND = '농식품모태펀드';
/* 모펀드 옵션 — 목업 `<select id="f-mf">` 원문(`농식품모태펀드`·`MOAF`). MOAF 는 행에 없는 값이라
   선택하면 0행이 되고 한글 no-rows 문구 경로가 실제로 돈다. */
const MF_OPTIONS = [MOTHER_FUND, 'MOAF'];

/* 기준년월 기본값 **없음**(형제 S2_47 과 동일 결정). 목업 검색박스엔 `value="2026-07"` 이 박혀 있었으나,
   임의의 기준월이 선택된 것처럼 보이는 편이 비어 있는 것보다 오해를 부른다.
   ⚠ 빈 값이 흐르는 자리 3곳에 각각 가드가 있다 — 적용 칩 · 푸터 캡션 · 엑셀 파일명(팝업 쪽 파일명 포함). */

/* 검색어 게이트 — 목업 검색박스에 검색어 입력이 없어 **OFF**로 둔다.
   되살릴 때는 이 상수만 true 로 바꾸면 드로어 필드와 `passes` 판정이 함께 살아난다. */
const SEARCHABLE = false;

/* ──────────────────────────────
   데이터 — 목업 `DATA` 실측 1행 그대로. 신규 행 생성 금지.
────────────────────────────── */
const ROWS: FundEwRow[] = [
  {
    id: 'fundew-1', no: 1,
    mf: MOTHER_FUND, gp: '(주)유니창업투자', fn: '유니 수산식품 투자조합1호', cs: '수산',
    ret: '경고', viol: '정상', mgr: '정상', staff: '정상',
    l1: '경고', l2: '경고', l3: '경고', l4: '정상', total: '경고',
  },
];

const FUND_OPTIONS: string[] = ROWS.map((r) => r.fn);

/* ──────────────────────────────
   컬럼 정의 — 리프 14(선두 5 + 등급 4 + 한도관리 그룹 4 + 종합등급 1)
   ⚠ 폭 전략: 고정폭(flex 없음, autoSizeStrategy 없음). 폭을 지배하는 건 배지(2글자)가 아니라
     **헤더 글자수**(대표펀드매니저변동·일정규모이하투자·자펀드수익률)다. 리프 폭 합(≈1800)이
     프레임(1280)을 넘는 넓은 표라 flex 를 주면 지표 컬럼이 눌려 뭉개진다(apfs-aggrid "컬럼 폭" 규약).
   ⚠ 배열은 **모듈 스코프에서 1회만** 만들어 상수로 고정한다 — 렌더마다 새 배열/컴포넌트 타입을 만들면
     AG Grid 가 헤더를 remount 하고 폭을 선언값으로 되돌린다(apfs-aggrid 계약 ⑥·⑦).
────────────────────────────── */
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };

/* 등급 셀 — 값이 없으면 빈 셀. */
function GradeCell({ v }: { v: Grade | null }) {
  if (!v) return null;
  return <StatusBadge tone={GRADE_TONE[v]} label={v} size="lg" dot={false} />;
}

/* 자펀드수익률 셀 — 이 한 셀만 팝업을 연다. 한 셀만 열리는 구조라 **시각 단서 없이는 발견이 불가능**하므로
   배지 안에 링크 아이콘을 넣고 포인터 커서를 준다(hover 전용 단서는 못 쓴다 — 보이지 않으면 없는 것과 같다).
   ⚠ 여기에 `tabIndex`/`role="button"` 을 주지 않는다 — `.ag-cell` 이 이미 포커스·탭 스톱을 소유해
     자식이 또 포커스를 받으면 탭 스톱이 2개가 되고 그리드 키보드 내비게이션과 싸운다.
     span 이 가지는 건 마우스 단서(커서·`title`)뿐이다.
   ⚠ **ARIA 는 span 이 아니라 포커스를 받는 `.ag-cell`(role=gridcell)에 실는다** — span 은 포커스 대상이
     아니라 거기 `aria-haspopup` 을 달아도 키보드·스크린리더 사용자에겐 도달하지 않는다.
     `params.eGridCell` 은 렌더 중에 건드리면 안 되는 외부 DOM 이라 `useEffect` 에서 설정하고,
     셀 재사용 시 잔존하지 않도록 cleanup 에서 지운다. 키보드 경로 자체는 `onCellKeyDown`(Enter/Space)이 담당한다. */
function YieldCell(p: ICellRendererParams<FundEwRow, Grade>) {
  const v = (p.value ?? null) as Grade | null;
  const cell = p.eGridCell;
  useEffect(() => {
    if (!cell || !v) return;
    cell.setAttribute('aria-haspopup', 'dialog');
    cell.setAttribute('aria-label', `${v} — 자펀드수익률 상세 조회 팝업 열기 (클릭 또는 Enter)`);
    return () => {
      cell.removeAttribute('aria-haspopup');
      cell.removeAttribute('aria-label');
    };
  }, [cell, v]);
  if (!v) return null;
  /* 링크 단서 = 배지 **안쪽** external 아이콘(2026-09-21 사용자 지시 "아이콘을 span안에 넣어줘").
     점선 밑줄(border-bottom) → 배지 옆 아이콘 → 배지 안 아이콘 순으로 바뀌었다: 밑줄은 배지의 둥근
     알약 모양과 어울리지 않았고, 배지 밖 아이콘은 알약과 따로 노는 덩어리로 읽혔다.
     ⚠ `label` 에 넣는 이유: `StatusBadge` 의 span 이 `color: toneVar(tone)[0]` 을 걸고 `Icon` 은
       `stroke="currentColor"` 라, **색 지정 없이** 등급 톤(정상/주의/경고)을 자동으로 물려받는다.
       배지 밖에 두면 톤 색을 손으로 계산해 넘겨야 하고 등급이 바뀔 때 갈라진다.
     배지의 `gap-[5px]` 가 라벨 텍스트와 아이콘 사이 간격을 준다(별도 래퍼 불필요).
     ⚠ `size`·`marginTop` 은 눈대중이 아니라 **실측값**이다(2026-09-21 사용자 지시 "높이 맞춰줘"):
       - lucide 글리프는 24 뷰박스 중 **20.4** 만 쓴다(stroke 번짐 포함, 상하 1.8 여백). 그래서 `size=12` 면
         잉크가 10.2px 인데 13px 볼드 한글의 잉크는 11.49px 라 아이콘이 11% 작아 보였다.
         `12 × 11.49/10.2 = 13.52` → **13.5** 로 두 잉크 높이가 맞는다.
       - 뷰박스 잉크는 상하 대칭(1.8/1.8)이라 아이콘의 잉크 중심 = 박스 중심이고, flex `items-center` 는
         그 박스를 **라인박스**(16.25px) 기준으로 센터링한다. 한글 잉크 중심은 라인박스 중심보다
         0.75px 위라 그만큼 올린다. 크기를 바꿔도 이 값은 그대로다(잉크가 대칭이라 중심이 안 움직인다).
       ⚠ 올릴 때 **음수 marginTop 을 쓰면 안 된다** — `align-items:center` 는 *마진 박스*를 중앙 정렬해서
         `-0.75` 를 줘도 실제로는 절반(0.375px)만 올라간다(실측 확인). `position:relative; top` 은
         정렬 계산 밖이라 준 만큼 그대로 움직인다.
       ⚠ Pretendard 13px/700 기준 실측이다 — 폰트나 배지 `size` 를 바꾸면 다시 재야 한다. */
  return (
    <span title="자펀드수익률 상세 조회 (클릭 또는 Enter)"
      className="inline-flex items-center"
      style={{ cursor: 'pointer' }}>
      <StatusBadge tone={GRADE_TONE[v]} size="lg" dot={false}
        label={<>{v}<Icon name="external" size={13.5} stroke={2.4} style={{ position: 'relative', top: -0.75 }} /></>} />
    </span>
  );
}

/* 등급 리프 — StatusBadge(size lg)가 잘리지 않도록 폭은 헤더 글자수 기준.
   정렬은 `DEFAULT_COL_DEF`의 sortable:true 를 그대로 둔다(등급 문자열 정렬이 유효하고,
   일부 컬럼만 정렬 불가면 헤더에 시각 단서가 없어 혼란스럽다). */
const gradeCol = (field: keyof FundEwRow, header: string, width: number): ColDef<FundEwRow> => ({
  field, headerName: header, width, minWidth: width, cellStyle: flexMid,
  cellRenderer: (p: any) => <GradeCell v={(p.value ?? null) as Grade | null} />,
});
/* 텍스트 리프 */
const txtCol = (field: keyof FundEwRow, header: string, width: number, center?: boolean): ColDef<FundEwRow> => ({
  field, headerName: header, width, minWidth: width, cellStyle: center ? flexMid : flexCenter,
  cellRenderer: (p: any) => <span className="min-w-0 truncate">{p.value}</span>,
});

const COLUMNS: (ColDef<FundEwRow> | ColGroupDef<FundEwRow>)[] = [
  /* No 는 행에 저장된 값이라 정렬해도 번호가 다시 매겨지지 않는다 */
  { field: 'no', headerName: 'No', width: 64, minWidth: 64, pinned: 'left', type: 'rightAligned',
    cellStyle: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } as CellStyle,
    valueFormatter: (p) => (p.value == null ? '' : String(p.value)) },
  txtCol('mf', '모펀드', 140),
  txtCol('gp', '운용사', 170),
  txtCol('fn', '자펀드', 260),
  txtCol('cs', '조합성격', 100, true),
  /* 자펀드수익률 = 팝업 트리거 셀(colId 'ret' = YIELD_COL) */
  { field: 'ret', headerName: '자펀드수익률', width: 132, minWidth: 132, cellStyle: flexMid,
    cellRenderer: YieldCell },
  gradeCol('viol', '규약위반', 106),
  gradeCol('mgr', '대표펀드매니저변동', 158),
  gradeCol('staff', '운용인력변동', 130),
  /* 목업의 유일한 2단 헤더 — `한도관리` colspan 4 */
  { headerName: '한도관리', marryChildren: true, children: [
    gradeCol('l1', '의무투자', 106),
    gradeCol('l2', '일정규모이하투자', 146),
    gradeCol('l3', '투자자산', 106),
    gradeCol('l4', '미투자자산', 120),
  ] },
  gradeCol('total', '종합등급', 110),
];

/* ──────────────────────────────
   Excel 헤더 — columnDefs 에서 **재귀로 병합/리프를 자동 산출**한다(이 화면은 2단).
   골드 `custody_confirm_manage.tsx`(깊이 N 재귀) → 형제 `gp_early_warning.tsx` 와 같은 1함수를 옮겨 쓴다.
   - 깊이 d 의 그룹이 리프 n 개를 덮으면 → heads[d] 에 이름 1 + 빈칸 n-1, 가로 병합
   - 깊이 d 의 리프는 → heads[d] 에 이름, 아래 행은 빈칸 + 세로 병합
   - 1칸짜리 병합(퇴화 범위)은 만들지 않는다
────────────────────────────── */
type AnyDef = ColDef<FundEwRow> | ColGroupDef<FundEwRow>;
const isGroup = (d: AnyDef): d is ColGroupDef<FundEwRow> => Array.isArray((d as ColGroupDef<FundEwRow>).children);
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

/* 적용 필터 칩 — 값만 표시(항목명 접두사 없음) + × 제거. */
function AppliedChip({ label, value, onClear }: { label: string; value: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold text-primary"
      style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
      {value}
      <button type="button" onClick={onClear} aria-label={`${label} 필터 제거`}
        className="inline-flex items-center justify-center border-0 cursor-pointer"
        style={{ background: 'transparent', color: 'inherit', minWidth: 24, minHeight: 24, padding: 0, margin: '-5px -4px -5px 0' }}>
        <Icon name="x" size={13} stroke={2.4} />
      </button>
    </span>
  );
}

const NO_ROWS = '<span style="padding:40px 0;display:inline-block;color:var(--muted-foreground);font-size:13px">조건에 맞는 자펀드가 없습니다.</span>';
/* ⚠ `overlayNoRowsTemplate`은 **rowData 자체가 빈** 경우에만 쓰인다. 필터로 0행이 된 경우 AG Grid v35는
   별도 오버레이(`NoMatchingRowsOverlayComponent`)를 띄워 기본 영문 "No Matching Rows"가 노출된다.
   모펀드 `MOAF` 를 고르면 이 경로로 비므로 문구를 한글로 덮는다(선례 `early_warning_manage.tsx`).
   설치된 v35 가 읽는 키는 `noRowsToShow`/`noMatchingRows` **둘뿐**이다 — 둘 다 남겨야 하고
   (지우면 필터 0행에서 영문 "No Matching Rows" 가 노출된다), 그 밖의 키는 죽은 키라 두지 않는다
   (형제 화면 `gp_early_warning.tsx` 와 동형).
   객체 prop이라 모듈 상수로 둔다(인라인 리터럴 = 렌더마다 새 객체 → 컬럼 폭 되돌림, apfs-aggrid ⑦). */
const NO_ROWS_LOCALE = {
  noRowsToShow: '조건에 맞는 자펀드가 없습니다.',
  noMatchingRows: '조건에 맞는 자펀드가 없습니다.',
};

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function FundEarlyWarning({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<FundEwRow> | null>(null);
  const [modalRow, setModalRow] = useState<FundEwRow | null>(null);

  /* 필터 — 모펀드·자펀드는 행 필터, 기준년월은 조회 기준 컨텍스트(행을 거르지 않음) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fMf, setFMf] = useState('');
  const [fFn, setFFn] = useState('');
  const [fYm, setFYm] = useState('');   // 기본값 없음 — 미선택 상태로 시작한다
  const [q, setQ] = useState('');       // 검색어 — SEARCHABLE 게이트가 OFF면 드로어에 렌더되지 않는다
  const clearFilters = () => { setFMf(''); setFFn(''); setFYm(''); setQ(''); };

  const passes = useCallback((r: FundEwRow) => {
    if (SEARCHABLE && q && !(r.fn + r.gp + r.mf).toLowerCase().includes(q.toLowerCase())) return false;
    return (!fMf || r.mf === fMf) && (!fFn || r.fn === fFn);
  }, [fMf, fFn, q]);

  /* 기준년월은 행을 거르지 않으므로 filterActive 에 넣지 않는다 */
  const filterActive = Boolean(fMf || fFn || (SEARCHABLE && q));
  useEffect(() => { apiRef.current?.onFilterChanged(); }, [passes]);
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<FundEwRow>) => (node.data ? passes(node.data) : true), [passes]);

  /* 표시 건수(푸터 캡션·엑셀 본문 공용) — 화면=엑셀 불변식 */
  const visible = useMemo(() => ROWS.filter(passes), [passes]);

  const onGridReady = useCallback((e: GridReadyEvent<FundEwRow>) => { apiRef.current = e.api; }, []);

  /* 팝업 진입 — **`자펀드수익률` 셀** 단일 클릭 + 그 셀에서 Enter/Space(키보드 경로).
     ⚠ 2026-09-21 사용자 지시로 더블클릭 → **원클릭**으로 바꿨다. 셀이 링크 아이콘을 달아 링크처럼
       보이므로 링크처럼 한 번에 열려야 한다(목업 `td.pick` 도 원래 단일 클릭이었다).
       행 선택이 없는 조회 전용 화면이라 클릭이 다른 동작과 충돌하지 않는다.
       ⚠ 형제 화면 S2_47(운용사별)은 **행 전체**가 트리거라 더블클릭을 유지한다 — 행 단위 원클릭은
         스크롤·드래그 중 오발동이 잦다. 트리거 스코프가 달라 규약도 갈리는 것이 맞다.
     ⚠ colId 게이트가 없으면 다른 셀에서도 열린다(목업은 `td.pick` 에만 바인딩한다).
     ⚠ Space 는 preventDefault 하지 않으면 팝업이 열리는 동안 페이지가 스크롤된다. */
  const onCellClicked = useCallback((e: CellClickedEvent<FundEwRow>) => {
    if (e.column?.getColId() !== YIELD_COL) return;
    if (e.data) setModalRow(e.data);
  }, []);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<FundEwRow>) => {
    if (e.column?.getColId() !== YIELD_COL) return;
    const ev = e.event as KeyboardEvent | null;
    if (!ev || (ev.key !== 'Enter' && ev.key !== ' ')) return;
    ev.preventDefault();
    if (e.data) setModalRow(e.data);
  }, []);

  const refresh = () => { clearFilters(); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — **시트 1장**. 2단 헤더 병합(`한도관리` 4열)·리프 키는 columnDefs 에서 자동 산출.
     본문은 **화면과 같은 필터 결과**(visible)를 쓴다 — 화면=엑셀 불변식(apfs-spec-popup 규약 6). ── */
  const exportExcel = () => {
    const { heads, keys, merges } = flattenForExcel(COLUMNS);
    const body = visible.map((r) => keys.map((k) => {
      const v = (r as any)[k];
      if (v == null) return '';
      if (typeof v === 'number') return v;
      return String(v);
    }));
    const ws = XLSX.utils.aoa_to_sheet([...heads, ...body]);
    ws['!merges'] = merges;
    ws['!cols'] = keys.map((k) => ({ wch: k === 'fn' ? 30 : k === 'gp' ? 22 : k === 'mf' ? 18 : k === 'no' ? 5 : 14 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '자펀드별 조기경보');
    XLSX.writeFile(wb, `자펀드별_조기경보${fYm ? `_${fYm}` : ''}.xlsx`);   // 기준년월 미선택이면 접미사 없이
    toast.success('Excel로 내보냈습니다');
  };

  /* 단축키 — ⌥D 내보내기 · ⌘P 인쇄. 화살표로 감싸야 한다(선언 전 참조 TDZ 방지).
     ⚠ 팝업이 열린 동안 ⌥D 는 끕다 — 팝업은 자체 `엑셀` 버튼을 가지므로 키보드 경로만 그걸 지나쳐
       배경 그리드(다른 데이터)를 내려받는 것은 혼란이다. ⌘P 는 그대로 둔다(팝업을 띄운 화면 인쇄는 정상). */
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: !modalRow });
  useHotkey(HOTKEYS.print.combo, () => window.print());

  return (
    <GridFrame
      crumbs={['홈', '조기경보', '조기경보', '자펀드별 조기경보 조회']}
      title="자펀드별 조기경보 조회"
      cardTitle="자펀드별 조기경보 조회"
      favRoute="자펀드별 조기경보 조회"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 = 적용된 필터 칩(값만). FilterChip 세트는 두지 않는다 —
         목업 검색박스에 카테고리형 주 필터가 없다(형제 S2_47 과 같은 판단). */
      toolbarLeft={(
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {!fMf && !fFn && !fYm && <span className="text-caption" style={{ fontSize: 12.5 }}>전체</span>}
          {fMf && <AppliedChip label="모펀드" value={fMf} onClear={() => setFMf('')} />}
          {fFn && <AppliedChip label="자펀드" value={fFn} onClear={() => setFFn('')} />}
          {/* 기준년월은 조회 기준 컨텍스트 — 선택했을 때만 칩으로 띄운다 */}
          {fYm && <AppliedChip label="기준년월" value={fYm} onClear={() => setFYm('')} />}
        </>
      )}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      /* 페이저 없음(1행) → footerCenter 미전달, FooterActions 에 onToggleAll 미전달(버튼 3개) */
      /* 기준년월은 선택했을 때만 앞에 붙인다(미선택이면 '총 N건'으로 시작) — 목업 툴바 `총 N건` 이식 */
      footerLeft={(
        <span>{(fYm ? `기준년월 ${String(fYm)} · ` : '') + '총 ' + String(visible.length) + '건'}</span>
      )}
      footerRight={<FooterActions onExport={exportExcel} />}>

      {/* apfs-grid-min: autoHeight 그리드의 AG Grid 기본 최소 본문높이(150px)를 48px 로 낮춘다.
          행이 1개뿐이라 그대로 두면 표 아래에 100px 넘는 빈 공간이 남는다(규칙·근거는 aggrid_shared.css). */}
      <div className="apfs-grid-min">
        <AgGridReact<FundEwRow>
          theme={apfsTheme}
          rowData={ROWS}
          columnDefs={COLUMNS}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onGridReady={onGridReady}
          onCellClicked={onCellClicked}
          onCellKeyDown={onCellKeyDown}
          localeText={NO_ROWS_LOCALE}
          overlayNoRowsTemplate={NO_ROWS}
        />
      </div>

      {/* ── 상세필터 드로어 — 목업 검색박스 3항목(모펀드·자펀드·기준년월) 순서 그대로 ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">자펀드별 조기경보 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="모펀드">
              <DrawerSelect value={fMf} onChange={setFMf} options={MF_OPTIONS} ariaLabel="모펀드" />
            </DrawerField>
            <DrawerField label="자펀드">
              <DrawerSelect value={fFn} onChange={setFFn} options={FUND_OPTIONS} ariaLabel="자펀드" />
            </DrawerField>
            {/* 기준년월 — 행을 거르지 않고 조회 기준을 정하는 값.
                PeriodPicker 트리거는 w-full 이라 fit-content 래퍼로 감싼다(apfs-datepicker "폭" 규칙) */}
            <DrawerField label="기준년월" plain>
              <div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}>
                <PeriodPicker mode="month" value={fYm} onChange={(v) => setFYm(v || '')} ariaLabel="기준년월" />
              </div>
            </DrawerField>
            {SEARCHABLE && (
              <DrawerField label="검색어">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="자펀드명" style={inputStyle('text')} />
              </DrawerField>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 자펀드수익률 상세 팝업 — `자펀드수익률` 셀 클릭(또는 그 셀 Enter/Space)이 연다 ── */}
      {modalRow && (
        <FundEarlyWarningYieldModal fund={modalRow.fn} ym={fYm} onClose={() => setModalRow(null)} />
      )}

    </GridFrame>
  );
}
