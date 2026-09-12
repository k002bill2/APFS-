/* 정기보고 — 관리형 리스트 페이지 (투자자산관리 > 사후보고관리 > 정기보고).
   출처: S1_06_정기보고.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(모펀드·운용사·자펀드·계정구분·담당자·기준년월(시작~종료)·보고구분)
       → **보고구분 FilterChip**(툴바 좌) + 상세필터 드로어(Sheet, apfs-detail-filter). 드로어 항목 순서는
         목업 검색박스 순서 그대로. 검색어는 OFF(opt-in 미요청). 목업의 [조회] 버튼은 즉시 반영형이라 없다.
       ⚠ 기준년월은 **월(YYYY-MM) 범위 선택기**다(목업 설계메모 "셀렉트 금지") → `PeriodPicker mode="month"` 2개.
         목업 기본값 `2026-04 ~ 2026-04`은 **적용하지 않는다** — 9행 중 1행만 남아 첫 화면이 빈약해진다.
         빈 문자열 = 열린 경계(apfs-datepicker 함정).
       ⚠ 행 컬럼과 미연동인 항목(모펀드·계정구분·담당자)은 `noop` 캡션만 두고 `passes`에 넣지 않는다.
         담당자는 원천에 옵션·샘플 값이 없어 옵션을 **지어내지 않는다**(빈 목록 + 검토필요 마커).
   - 목록 그리드 → AG Grid 단일 헤더(apfs-aggrid). **합계행 없음**(금액 컬럼이 없는 엔티티) ·
     **행 선택 없음**(다건 액션이 없는 조회 화면) → selbar도 없다.
   - 확정여부 → **셀 안 네이티브 `<select>`**(목업 `.gsel` 그대로, 행별 aria-label 동일).
     보고 내역이 없는 행(7·9)은 목업처럼 빈 셀이다(수정일시·상세조회도 동상).
   - 상세 진입(보고구분 '월간보고서' 배지 · 상세조회 버튼 · 해당 셀 Enter)
       → 목업은 별도 화면 `S1_06_01_월간보고.html`로 이동하지만 **그 화면은 이번 변환 범위 밖**이라
         이동 대상이 없다. 가짜 상세 모달을 만들지 않고 toast로 한계를 알린다(아래 '한계').
   - KPI 배지 행 → **미포함**(사용자 결정). 카드뷰 토글·`sub` 캡션·명세 팝업도 없다.
   - 엑셀 → SheetJS(단일 헤더 · 액션 컬럼 '상세조회' 제외 · 마스크 시 실값 비노출)
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·설계메모는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).
   ⚠검토필요 마커는 **전수 이식**했다 — 목업 원문 3건: 검색 2건(담당자·보고구분) + 그리드 헤더 1건(확정여부).
     공용 `review_marker.tsx`, 규약은 apfs-grid 스킬.

   한계·가정(결정 기록)
   - 상세 화면(S1_06_01) 미포함 → 상세 진입 3경로 모두 toast 안내로 끝난다. 상세 모달을 위조하지 않았다.
   - 운용사·자펀드 셀은 목업이 `.linktxt`지만(설계메모: "명세서 이동 여부 검토필요") **링크로 만들지 않았다** —
     명세 팝업은 opt-in이고 이 화면은 미요청이다(apfs-spec-popup: 미포함이면 진입 배선을 넣지 않는다).
   - '보고서' 열은 첨부파일명 표시 전용이다(목업 설계메모: "클릭 이동 없음") → 링크가 아니다.
   - 확정여부 컬럼에 `suppressKeyboardEvent`를 **브리프 명세 외로 1건 추가**했다: React 18은 합성 이벤트를
     루트 컨테이너에서 디스패치하므로 `onKeyDown`의 `stopPropagation`이 AG Grid의 셀 **네이티브** 리스너보다
     늦다. 그대로 두면 select에 초점이 있을 때 ↑↓가 값 변경 대신 셀 이동으로 가로채여 키보드로 값을 못 바꾼다.
     헤더 Tab을 `suppressHeaderKeyboardEvent`로 빼는 것과 같은 탈출구다(런타임 확인 필요 항목).
   - 행 폭: 10컬럼 + 긴 조합명이라 `fitGridWidth`에서 텍스트 컬럼은 ellipsis로 잘린다(컬럼 리사이즈로 보완).
     마스크 경계 때문에 `tooltipField`는 두지 않는다(툴팁으로 실값이 샌다). */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유)
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame } from './grid_frame';
import { apfsTheme, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF } from './aggrid_theme';
import { controlMinWidth } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, IRowNode, CellKeyDownEvent, CellStyle } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';
import { PeriodPicker } from './ui/period-picker';
import { ReviewMarker, reviewInnerHeader } from './review_marker';
import type { ReviewNote } from './review_marker';

const { Button, IconBtn, StatusBadge, FilterChip } = UI;

/* ──────────────────────────────
   도메인 타입
────────────────────────────── */
/* 모듈 내부 전용 별칭(export 하지 않는다 — 공개 surface는 브리프대로 `RegularReportRow` + 컴포넌트뿐).
   인라인 유니언을 별칭으로 뽑은 이유는 확정여부 select 컴포넌트의 props 타입이 같은 집합을 재사용해서다. */
type ReportKind = '월간보고서' | '반기보고서';
type Confirmed = '확정' | '미확정';

export interface RegularReportRow {
  id: string; no: number;
  gp: string;                  // 운용사
  fn: string;                  // 자펀드
  ymKey: string;               // 기준년월 필터용 'YYYY-MM'(반기는 상반기 말 '2026-06')
  ymLabel: string;             // 보고년월 표시값 — 목업 그대로
  rt: ReportKind;              // 보고구분
  file: string | null;         // 보고서 첨부파일명(null = 목업 "보고 내역이 없습니다.")
  updatedAt: string | null;    // 수정일시 — 목업 문자열 그대로. 보고 없으면 null
  confirmed: Confirmed | null;  // 확정여부 — 보고 없으면 null(빈 셀)
  fundStatus: string;          // 조합상태
}

/* 데모 데이터 — 목업 `<tbody>` 9행 그대로(값 창작 없음). 9행 모두 같은 운용사·자펀드·조합상태다. */
const GP = '엔비에이치(NBH)캐피탈 주식회사';
const FN = 'AJ-ISU경기도애그리푸드투자조합';
const ST = '운영중';
/* 월간보고서 첨부파일명 패턴 — 8행만 원문이 다르다(조합명에 하이픈 1개 추가 + " (2)" 접미사)라 리터럴로 둔다 */
const FILE = (mm: string) => `[보고서] AJ-ISU경기도애그리푸드투자조합 월간보고서_26.${mm}.pdf`;

const DEMO: RegularReportRow[] = [
  { id: 'rr-1', no: 1, gp: GP, fn: FN, ymKey: '2026-01', ymLabel: '2026년 01월', rt: '월간보고서', file: FILE('01'), updatedAt: '2026-02-06 오후 1:47:50', confirmed: '확정', fundStatus: ST },
  { id: 'rr-2', no: 2, gp: GP, fn: FN, ymKey: '2026-02', ymLabel: '2026년 02월', rt: '월간보고서', file: FILE('02'), updatedAt: '2026-03-06 오후 4:41:27', confirmed: '확정', fundStatus: ST },
  { id: 'rr-3', no: 3, gp: GP, fn: FN, ymKey: '2026-03', ymLabel: '2026년 03월', rt: '월간보고서', file: FILE('03'), updatedAt: '2026-04-06 오후 9:52:22', confirmed: '확정', fundStatus: ST },
  { id: 'rr-4', no: 4, gp: GP, fn: FN, ymKey: '2026-04', ymLabel: '2026년 04월', rt: '월간보고서', file: FILE('04'), updatedAt: '2026-05-07 오후 5:55:38', confirmed: '확정', fundStatus: ST },
  { id: 'rr-5', no: 5, gp: GP, fn: FN, ymKey: '2026-05', ymLabel: '2026년 05월', rt: '월간보고서', file: FILE('05'), updatedAt: '2026-06-04 오후 4:27:21', confirmed: '확정', fundStatus: ST },
  { id: 'rr-6', no: 6, gp: GP, fn: FN, ymKey: '2026-06', ymLabel: '2026년 06월', rt: '월간보고서', file: FILE('06'), updatedAt: '2026-07-07 오후 8:35:43', confirmed: '확정', fundStatus: ST },
  /* 7행 — 반기보고서. 보고 내역이 없어 보고서·수정일시·확정여부·상세조회가 전부 비어 있다(목업 동일).
     ymKey는 상반기 말('2026-06')로 둬 기준년월 범위 필터에 걸리게 한다(표시값은 원문 '2026년 1/2분기'). */
  { id: 'rr-7', no: 7, gp: GP, fn: FN, ymKey: '2026-06', ymLabel: '2026년 1/2분기', rt: '반기보고서', file: null, updatedAt: null, confirmed: null, fundStatus: ST },
  { id: 'rr-8', no: 8, gp: GP, fn: FN, ymKey: '2026-07', ymLabel: '2026년 07월', rt: '월간보고서', file: '[보고서] AJ-ISU-경기도애그리푸드투자조합 월간보고서_26.07 (2).pdf', updatedAt: '2026-08-07 오후 4:09:29', confirmed: '확정', fundStatus: ST },
  /* 9행 — 월간보고서지만 보고 내역 없음. 목업에서 **보고구분 태그는 여전히 상세 링크**이고 상세조회 칸만 비어 있다 */
  { id: 'rr-9', no: 9, gp: GP, fn: FN, ymKey: '2026-08', ymLabel: '2026년 08월', rt: '월간보고서', file: null, updatedAt: null, confirmed: null, fundStatus: ST },
];

const PAGE_SIZE = 20;

/* 폭 관련 그리드 prop(`autoSizeStrategy`·`defaultColDef`)은 `aggrid_theme.ts`의 공용 상수를 쓴다 —
   인라인 리터럴 금지 이유(렌더마다 새 객체 → 폭이 선언값으로 되돌아감)는 그 파일 주석이 정본. */

/* 상세 진입 — 목업은 S1_06_01_월간보고.html로 이동하지만 그 화면은 이번 변환 범위 밖이다.
   이동 대상이 없으므로 한계를 알리는 toast로 끝낸다(가짜 상세 모달 금지). 모듈 스코프 = 컬럼 deps 안정. */
const openDetail = () => toast('월간보고 상세는 별도 화면(S1_06_01)으로 분리된 화면입니다 — 현 프로토타입 미포함');

/* ──────────────────────────────
   컬럼 정의 — 목업 헤더 순서·집합 그대로(단일 헤더):
     No · 운용사 · 자펀드 · 보고년월 · 보고구분 · 보고서 · 수정일시 · 확정여부(⚠) · 상세조회 · 조합상태
   ⚠ 좌측 고정은 No만 — 다른 컬럼에 `pinned`를 주면 컬럼이 좌측 영역으로 끌려와 목업 순서가 깨진다.
   ⚠ 합계행·행 선택 컬럼 없음(금액 컬럼이 없고 다건 액션도 없다).
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

/* ⚠검토필요 메모 — 목업 `S1_06_정기보고.html`의 `data-rec`/`data-dat` 원문 그대로(3건).
   설계 메모라 마스킹·엑셀 대상이 아니다. */
const CONFIRM_NOTE: ReviewNote = { rec: '확정 · 미확정', dat: "comp=셀렉트박스 · 샘플엔 '확정'만 · '미확정'은 추론" };
const FILTER_NOTES: Record<'mgr' | 'rt', ReviewNote> = {
  mgr: { rec: '담당자 목록(사용자 마스터 연동)', dat: '원천에 옵션·샘플 값 없음 — 실 목록 미확인' },
  rt: { rec: '월간보고서 외 반기/연간 등', dat: "원천 옵션 미기재 · 샘플 데이터엔 '월간보고서'만 존재" },
};
/* 모듈 스코프에 한 번만 만든다 — 렌더마다 새 컴포넌트 타입이면 AG Grid가 헤더를 통째로 remount한다 */
const CONFIRM_HEADER = reviewInnerHeader(CONFIRM_NOTE);

/* 텍스트 셀(운용사·자펀드) — flex 셀은 AG Grid 기본 ellipsis가 안 먹으므로 내부 span에 truncate를 준다 */
const textCell = (p: { value: string }) => <span className="min-w-0 truncate"><MT>{p.value}</MT></span>;
/* 날짜성/라벨 값은 mn() — ⚠ null 가드가 **mn보다 먼저**다(mn(null)은 문자열 'null'이 된다) */
const mnFmt = (p: { value: unknown }) => (p.value == null ? '' : mn(p.value));

/* 확정여부 셀 — 목업 `.gsel` 네이티브 select. 보고 내역이 있는 행만 렌더된다.
   ⚠ 높이 30px: `lineHeight`와 `minHeight`를 함께 줘야 Chrome UA 메트릭에서 어긋나지 않는다.
   ⚠ `fontFamily:'inherit'` — preflight:false라 native select가 UA 기본 폰트로 튄다. */
const confirmSelectStyle: React.CSSProperties = {
  height: 30, minHeight: 30, boxSizing: 'border-box', padding: '0 8px',
  fontSize: 14, lineHeight: '20px', fontFamily: 'inherit',
  border: '1px solid var(--border-strong)', borderRadius: 8,
  background: 'var(--card)', color: 'var(--foreground)',
};
const CONFIRM_OPTIONS: Confirmed[] = ['확정', '미확정'];

function ConfirmSelect({ value, no, onChange }: { value: Confirmed; no: number; onChange: (v: Confirmed) => void }) {
  /* 그리드 셀 이벤트와 충돌 방지 — 클릭/더블클릭으로 셀 포커스·편집 흐름을 흔들지 않는다.
     (키보드 가로채기는 합성 이벤트만으로는 못 막는다 → 컬럼 `suppressKeyboardEvent`가 정본. 파일 상단 '한계' 참조) */
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <select
      value={value}
      aria-label={`확정여부 ${no}행`}
      onChange={(e) => onChange(e.target.value as Confirmed)}
      onClick={stop} onDoubleClick={stop} onKeyDown={stop}
      style={confirmSelectStyle}>
      {CONFIRM_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

const makeColumns = (patch: (id: string, p: Partial<RegularReportRow>) => void): ColDef<RegularReportRow>[] => [
  { field: 'no', headerName: 'No', width: 68, maxWidth: 68, pinned: 'left', cellStyle: centerNum, valueFormatter: (p) => String(p.value) },
  /* 운용사·자펀드는 링크가 아니다(명세 팝업 미포함 — 파일 상단 '한계'). 긴 명칭 컬럼만 maxWidth 상한(apfs-aggrid 관리형 그리드 규약). */
  { field: 'gp', headerName: '운용사', width: 190, maxWidth: 240, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'fn', headerName: '자펀드', width: 196, maxWidth: 300, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'ymLabel', headerName: '보고년월', width: 112, cellStyle: centerNum, valueFormatter: mnFmt },
  /* 보고구분 — '월간보고서'만 상세 진입 링크(목업 `<a class="tag b">`), 반기보고서는 비링크 `<span>`.
     배지를 버튼으로 감싼다: `font:'inherit'`는 preflight:false에서 UA 기본 폰트(13.3px Arial)로 튀는 것을 막는다. */
  { field: 'rt', headerName: '보고구분', width: 110, cellStyle: flexMid,
    cellRenderer: (p: any) => {
      const badge = <StatusBadge tone="primary" label={p.value} size="lg" dot={false} />;
      if (p.value !== '월간보고서') return badge;
      return (
        <button type="button" aria-label="월간보고서 상세 보기" onClick={openDetail}
          className="inline-flex items-center cursor-pointer border-0 p-0"
          style={{ font: 'inherit', background: 'transparent' }}>{badge}</button>
      );
    } },
  /* 보고서 — 파일명이 가장 긴 컬럼. 폭 전략은 `AUTO_SIZE_CONTENT`(내용 맞춤)다: 10컬럼 내용 폭 합이 프레임(1280)을 넘는
     넓은 표라 `fitGridWidth`를 쓰면 전 컬럼이 선언 폭 아래로 눌려 보고년월·수정일시·확정여부·상세조회 30셀이 잘렸다
     (2026-09-12 코디네이터 런타임 실측). 내용 맞춤이면 그리드가 프레임보다 넓어져 AG Grid 내부 가로 스크롤이 생기고 잘림은 0이다
     (apfs-aggrid "넓은 다열 테이블" 규약). 이 컬럼만 상한 520(더 긴 파일명은 truncate).
     ⚠ 첨부파일명 표시 전용(클릭 이동 없음). 불릿 `• `은 장식이라 비마스킹, 파일명은 <MT>. */
  { field: 'file', headerName: '보고서', width: 180, minWidth: 150, maxWidth: 520, cellStyle: flexCenter,
    cellRenderer: (p: any) => (p.value
      ? <span className="min-w-0 truncate">{'• '}<MT>{p.value}</MT></span>
      : <span style={{ color: 'var(--muted-foreground)' }}>보고 내역이 없습니다.</span>) },
  { field: 'updatedAt', headerName: '수정일시', width: 180,
    cellStyle: { ...centerNum, color: 'var(--muted-foreground)' }, valueFormatter: mnFmt },
  /* 확정여부 — 헤더에 ⚠마커(목업 원문). 셀은 보고 내역이 있는 행만 select. */
  { field: 'confirmed', headerName: '확정여부', width: 120, cellStyle: flexMid,
    headerComponentParams: { innerHeaderComponent: CONFIRM_HEADER },
    /* Tab을 AG Grid 헤더 내비게이션에서 빼 브라우저 기본 순서로 넘긴다 — 안 하면 헤더 안의 ⚠마커 버튼에
       키보드로 도달할 수 없다(AG Grid가 Tab을 가로채 다음 헤더 셀로 이동). */
    suppressHeaderKeyboardEvent: (p) => p.event.key === 'Tab',
    /* 셀 안 select에 초점이 있을 때는 AG Grid 키 처리를 전부 끈다 — ↑↓가 값 변경 대신 셀 이동으로
       가로채이는 것을 막는다(합성 이벤트 stopPropagation으로는 못 막는다, 파일 상단 '한계'). */
    suppressKeyboardEvent: (p) => (p.event.target as HTMLElement | null)?.tagName === 'SELECT',
    cellRenderer: (p: any) => (p.value == null ? null
      : <ConfirmSelect value={p.value} no={p.data.no} onChange={(v) => patch(p.data.id, { confirmed: v })} />) },
  /* 상세조회 — 액션 컬럼(field 없음 → colId 명시, 정렬·엑셀 제외). 보고 내역이 있는 행만 버튼(목업 동일) */
  { colId: 'detail', headerName: '상세조회', width: 110, cellStyle: flexMid, sortable: false,
    cellRenderer: (p: any) => (p.data.file
      ? <Button variant="outline" size="sm" onClick={openDetail}>상세조회</Button>
      : null) },
  { field: 'fundStatus', headerName: '조합상태', width: 100, cellStyle: flexMid,
    cellRenderer: (p: any) => <StatusBadge tone="success" label={p.value} size="lg" dot={false} /> },
];

/* 엑셀 컬럼 — 화면 컬럼과 1:1(화면=엑셀 불변식), 액션 컬럼 '상세조회'만 제외.
   값 없음은 ''(목업 placeholder 문구 '보고 내역이 없습니다.'는 화면 표현이라 내보내지 않는다). */
type XCol = { header: string; get: (r: RegularReportRow) => string | number };
const EXPORT_COLS: XCol[] = [
  { header: 'No', get: (r) => r.no },
  { header: '운용사', get: (r) => r.gp },
  { header: '자펀드', get: (r) => r.fn },
  { header: '보고년월', get: (r) => r.ymLabel },
  { header: '보고구분', get: (r) => r.rt },
  { header: '보고서', get: (r) => r.file ?? '' },
  { header: '수정일시', get: (r) => r.updatedAt ?? '' },
  { header: '확정여부', get: (r) => r.confirmed ?? '' },
  { header: '조합상태', get: (r) => r.fundStatus },
];

const inputStyle = (kind?: string): React.CSSProperties => ({
  width: 'fit-content', minWidth: controlMinWidth(kind), maxWidth: '100%', boxSizing: 'border-box', padding: '9px 11px', fontFamily: 'inherit', fontSize: 14,
  border: '1px solid var(--input)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)',
});

function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer motion-safe:active:scale-[.97]"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

function DrawerField({ label, noop, plain, note, children }: { label: string; noop?: boolean; plain?: boolean; note?: ReviewNote; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>
        {label}{note && <ReviewMarker {...note} label={label} />}{noop && <span className="font-normal text-caption" style={{ fontSize: 12 }}> · 데이터 연동 후 적용</span>}
      </span>
      {children}
    </Wrap>
  );
}
function DrawerSelect({ value, onChange, options, all = '전체' }: { value: string; onChange: (v: string) => void; options: string[]; all?: string }) {
  return (
    <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
        <option value="">{all}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}

/* kebab(···) 더보기 — 내보내기(Excel)·인쇄. 목업엔 전역 신규 등록이 없어 kebab 단독(apfs-grid 툴바 규약) */
function MoreMenu({ onExport, size = 34 }: { onExport: () => void; size?: number }) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <DropdownMenuTrigger aria-label="더보기"
              className="inline-flex items-center justify-center rounded-card-sm bg-transparent border-0 text-muted-foreground transition-colors hover:text-primary data-[state=open]:bg-card data-[state=open]:text-primary"
              style={{ width: size, height: size }}>
              <Icon name="more" size={20} stroke={2} />
            </DropdownMenuTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>더보기</TooltipContent>
      </Tooltip>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onExport}>
          <Icon name="download" size={17} className="shrink-0 text-muted-foreground" />내보내기 (Excel)
          <DropdownMenuShortcut>{HOTKEYS.export.hint}</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.print()}>
          <Icon name="file" size={17} className="shrink-0 text-muted-foreground" />인쇄
          <DropdownMenuShortcut>{HOTKEYS.print.hint}</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function RegularReportManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<RegularReportRow> | null>(null);
  const [rows, setRows] = useState<RegularReportRow[]>(DEMO);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  const topMoreRef = useRef<HTMLSpanElement>(null);
  const [topMoreVisible, setTopMoreVisible] = useState(true);
  const masked = useMask();

  /* 행 패치 — 확정여부 select가 쓴다. useCallback + 함수형 업데이트로 **안정**해야 한다
     (컬럼 정의를 deps []로 고정하므로 불안정 함수를 캡처하면 낡은 값을 붙든다). */
  const patchRow = useCallback((id: string, patch: Partial<RegularReportRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);
  /* deps []: patchRow는 안정(useCallback) — 매 렌더 새 배열이면 그리드가 컬럼을 재생성하며 폭이 되돌아간다 */
  const columnDefs = useMemo(() => makeColumns(patchRow), [patchRow]);
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  /* 필터 — 보고구분은 툴바 칩 + 드로어가 **같은 state를 공유**한다(표시가 갈라지지 않게).
     나머지는 드로어. SSOT=개별 state(빈 값=미적용) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fRt, setFRt] = useState<'' | ReportKind>('');
  const [fGp, setFGp] = useState('');
  const [fFund, setFFund] = useState('');
  const [fFrom, setFFrom] = useState('');   // 기준년월 시작 'YYYY-MM'(빈 값=열린 경계)
  const [fTo, setFTo] = useState('');       // 기준년월 종료 'YYYY-MM'(동상)
  const [fMf, setFMf] = useState('');       // 모펀드 — 행 컬럼 아님(no-op)
  const [fAcc, setFAcc] = useState('');     // 계정구분 — 행 컬럼 아님(no-op)
  const [fMgr, setFMgr] = useState('');     // 담당자 — 원천에 옵션·샘플 값 없음(no-op, 옵션 없음)
  const clearFilters = () => { setFRt(''); setFGp(''); setFFund(''); setFFrom(''); setFTo(''); setFMf(''); setFAcc(''); setFMgr(''); };

  const passes = useCallback((r: RegularReportRow) => {
    if (fRt && r.rt !== fRt) return false;
    if (fGp && r.gp !== fGp) return false;
    if (fFund && r.fn !== fFund) return false;
    if (fFrom && r.ymKey < fFrom) return false;
    if (fTo && r.ymKey > fTo) return false;
    return true;
  }, [fRt, fGp, fFund, fFrom, fTo]);
  const filterActive = Boolean(fRt || fGp || fFund || fFrom || fTo);
  useEffect(() => { apiRef.current?.onFilterChanged(); }, [passes]);
  useEffect(() => {
    // 미지원 가드는 `if (!el) return`과 분리한다 — 합치면 초기값 true가 굳어 푸터 폴백 kebab이 영영
    // 안 뜨고 내보내기·인쇄 접근이 끊긴다(apfs-grid 푸터 골드 양식).
    if (typeof IntersectionObserver === 'undefined') { setTopMoreVisible(false); return; }
    const el = topMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setTopMoreVisible(e.isIntersecting), { root: null, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<RegularReportRow>) => (node.data ? passes(node.data) : true), [passes]);

  const filteredRows = useMemo(() => rows.filter(passes), [rows, passes]);
  const gpOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.gp))), [rows]);
  const fundOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.fn))), [rows]);
  const rtOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.rt))), [rows]);

  const onGridReady = useCallback((e: GridReadyEvent<RegularReportRow>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* 키보드 — AG Grid의 Tab은 **셀 단위**로만 이동해 셀 안 컨트롤에 초점이 닿지 않는다.
     보고구분/상세조회 셀 Enter = 상세 진입, 확정여부 셀 Enter = 셀 안 select로 초점 이동(WCAG 2.1.1). */
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<RegularReportRow>) => {
    const ev = e.event as KeyboardEvent | null;
    if (ev?.key !== 'Enter') return;
    const colId = e.column.getColId();
    if (colId === 'confirmed') {
      const target = ev.target as HTMLElement | null;
      if (target?.tagName === 'SELECT') return;       // 이미 select 안 — 네이티브 동작에 맡긴다
      const sel = target?.closest?.('.ag-cell')?.querySelector('select') as HTMLSelectElement | null;
      if (sel) sel.focus();
      return;
    }
    if (colId === 'rt' && e.data?.rt === '월간보고서') { openDetail(); return; }
    if (colId === 'detail' && e.data?.file) openDetail();
  }, []);

  const refresh = () => { setRows([...DEMO]); clearFilters(); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — 단일 헤더(합계행 없음). 마스크 ON이면 숫자 0·텍스트 비노출 ── */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = filteredRows.map((r) => EXPORT_COLS.map((c) => {
      const v = c.get(r);
      if (typeof v === 'number') return masked ? 0 : v;
      return masked ? '' : v;
    }));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '보고서' ? 54 : c.header === '자펀드' || c.header === '운용사' ? 26 : c.header === '수정일시' ? 22 : 12 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '정기보고');
    XLSX.writeFile(wb, '정기보고.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '사후보고관리', '정기보고']}
      title="정기보고"
      favRoute="regular-report"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 = 주 필터 칩(보고구분) + 적용 중인 드로어 값 칩. 행 선택이 없어 selbar는 존재하지 않는다. */
      toolbarLeft={(
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {(['', '월간보고서', '반기보고서'] as ('' | ReportKind)[]).map((s) => (
            <FilterChip key={s || 'all'} active={fRt === s} onClick={() => setFRt(s)}>{s || '전체'}</FilterChip>
          ))}
          {/* 값만 표시(접두사 없음) + × — 운용사·자펀드는 텍스트라 <MT>, 기준년월은 날짜성이라 mn() */}
          {([
            ['운용사', fGp, () => setFGp(''), true],
            ['자펀드', fFund, () => setFFund(''), true],
            ['기준년월 시작', fFrom, () => setFFrom(''), false],
            ['기준년월 종료', fTo, () => setFTo(''), false],
          ] as [string, string, () => void, boolean][]).filter(([, v]) => v).map(([label, value, clear, isText]) => (
            <span key={label} className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
              {isText ? <MT>{value}</MT> : mn(value)}
              <button type="button" onClick={clear} aria-label={label + ' 필터 제거'} className="inline-flex border-0 cursor-pointer p-0" style={{ background: 'transparent', color: 'inherit' }}>
                <Icon name="x" size={13} stroke={2.4} />
              </button>
            </span>
          ))}
        </>
      )}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
        <span ref={topMoreRef} className="inline-flex"><MoreMenu onExport={exportExcel} /></span>
      </>}
      footerLeft={<span>{'총 ' + mn(String(filteredRows.length)) + '개 중 ' + mn(String(Math.min(shown, filteredRows.length))) + '개 항목 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<>
        <IconBtn icon="download" label="다운로드" size={32} onClick={exportExcel} />
        <IconBtn icon="maximize" label="전체보기" size={32} active={showAll} pressed={showAll} onClick={() => setShowAll((v) => !v)} />
        <IconBtn icon="external" label="새 창" size={32} onClick={() => window.open(location.href, '_blank')} />
        {!topMoreVisible && <MoreMenu size={32} onExport={exportExcel} />}
      </>}>

      <div>
        <AgGridReact<RegularReportRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}   // 내용 맞춤(넓은 10컬럼 표) — fitGridWidth는 셀 잘림 30건(실측)
          defaultColDef={DEFAULT_COL_DEF}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조건에 맞는 정기보고 건이 없습니다.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어 — 목업 검색박스 순서 그대로(모펀드·운용사·자펀드·계정구분·담당자·기준년월·보고구분).
             검색어는 미사용(OFF). 컬럼 미연동 항목은 noop 캡션(apfs-detail-filter) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">정기보고 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="모펀드" noop><DrawerSelect value={fMf} onChange={setFMf} options={['농식품모태펀드', 'MOAF']} /></DrawerField>
            <DrawerField label="운용사"><DrawerSelect value={fGp} onChange={setFGp} options={gpOptions} /></DrawerField>
            <DrawerField label="자펀드"><DrawerSelect value={fFund} onChange={setFFund} options={fundOptions} /></DrawerField>
            <DrawerField label="계정구분" noop><DrawerSelect value={fAcc} onChange={setFAcc} options={['농식품', '수산']} /></DrawerField>
            {/* 담당자 — 원천에 옵션·샘플 값이 없어 옵션을 생성하지 않는다(빈 목록 = '전체'만) */}
            <DrawerField label="담당자" noop note={FILTER_NOTES.mgr}><DrawerSelect value={fMgr} onChange={setFMgr} options={[]} /></DrawerField>
            {/* 기준년월 — 월(YYYY-MM) 범위. PeriodPicker는 <label>로 명명되지 않으므로 plain + ariaLabel(apfs-datepicker) */}
            <DrawerField label="기준년월 시작" plain><div style={{ width: 'fit-content', minWidth: controlMinWidth('select'), maxWidth: '100%' }}><PeriodPicker mode="month" value={fFrom} onChange={setFFrom} ariaLabel="기준년월 시작" /></div></DrawerField>
            <DrawerField label="기준년월 종료" plain><div style={{ width: 'fit-content', minWidth: controlMinWidth('select'), maxWidth: '100%' }}><PeriodPicker mode="month" value={fTo} onChange={setFTo} ariaLabel="기준년월 종료" /></div></DrawerField>
            {/* 보고구분 — 툴바 칩과 같은 state 공유(옵션은 행에서 파생) */}
            <DrawerField label="보고구분" note={FILTER_NOTES.rt}><DrawerSelect value={fRt} onChange={(v) => setFRt(v as '' | ReportKind)} options={rtOptions} /></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

    </GridFrame>
  );
}
