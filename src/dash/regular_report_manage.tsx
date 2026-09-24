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
         담당자는 원천에 옵션·샘플 값이 없어 옵션을 **지어내지 않는다**(빈 목록).
   - 목록 그리드 → AG Grid 단일 헤더(apfs-aggrid). **합계행 없음**(금액 컬럼이 없는 엔티티) ·
     **행 선택 = 체크박스 multiRow**(2026-09-24 사용자 결정) — 선택 바에서 확정여부 일괄 변경(확정/미확정).
     보고 내역이 없는 행(확정여부 빈칸)은 변경 대상에서 빼고 toast로 알린다(apfs-aggrid 게이트 필터형).
   - 확정여부 → **셀 안 네이티브 `<select>`**(목업 `.gsel` 그대로, 행별 aria-label 동일).
     목업의 보고 내역 없는 행(7·9)은 빈 셀 대신 샘플 보고서·수정일시·확정여부(미확정)로 채웠다(2026-09-24 사용자 결정 — 빈 셀 금지).
   - 상세조회 컬럼 → **삭제**(2026-09-24 사용자 결정). 상세 진입은 보고구분 '월간보고서' 배지(클릭·셀 Enter) 하나다.
   - 상세 진입(보고구분 '월간보고서' 배지 · 해당 셀 Enter)
       → 월간보고 상세(`monthly_report.tsx` 창 + `monthly_report_modal.tsx`의 `MonthlyReportBody`)를 **팝업 창**으로 연다
         (모달 아님, 사용자 결정 2026-09-24).
   - KPI 배지 행 → **미포함**(사용자 결정). 카드뷰 토글·`sub` 캡션·명세 팝업도 없다.
   - 엑셀 → SheetJS(단일 헤더 · 선택 체크박스 열 제외)
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·설계메모는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).

   한계·가정(결정 기록)
   - 상세 화면(S1_06_01)은 Shell 없는 route `#/monthly-report`를 이름 붙은 팝업 창('apfs-monthly-report')으로 연다 —
     반복 클릭은 같은 창을 재사용한다. 원천 데이터가 2026.01.31 보고 1건뿐이라 모든 월간보고서 행이 같은 보고를 연다.
   - 운용사·자펀드 셀은 목업이 `.linktxt`지만(설계메모: "명세서 이동 여부 검토필요") **링크로 만들지 않았다** —
     명세 팝업은 opt-in이고 이 화면은 미요청이다(apfs-spec-popup: 미포함이면 진입 배선을 넣지 않는다).
   - '보고서' 열은 첨부파일명 표시 전용이다(목업 설계메모: "클릭 이동 없음") — 링크·bullet·밑줄 없음(2026-09-24 사용자 결정).
   - 확정여부 컬럼에 `suppressKeyboardEvent`를 **브리프 명세 외로 1건 추가**했다: React 18은 합성 이벤트를
     루트 컨테이너에서 디스패치하므로 `onKeyDown`의 `stopPropagation`이 AG Grid의 셀 **네이티브** 리스너보다
     늦다. 그대로 두면 select에 초점이 있을 때 ↑↓가 값 변경 대신 셀 이동으로 가로채여 키보드로 값을 못 바꾼다. (런타임 확인 필요 항목).
   - 행 폭: 10컬럼 + 긴 조합명이라 `fitGridWidth`에서 텍스트 컬럼은 ellipsis로 잘린다(컬럼 리사이즈로 보완). */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유)
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { GridFrame, FooterActions } from './grid_frame';
import { LeafTabBody } from './leaf_tabs';   // 리프 탭 묶음(opt-in)
import type { LeafTabsSlot } from './leaf_tabs';
import { apfsTheme, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF } from './aggrid_theme';
import { controlMinWidth, drawerInputStyle as inputStyle } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, IRowNode, CellKeyDownEvent, CellStyle, SelectionChangedEvent } from 'ag-grid-community';
import { SELECTION_COL } from './aggrid_selection';   // 행선택 컬럼 = DS Checkbox(SSOT)
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';
import { PeriodPicker } from './ui/period-picker';
import { ConfirmCombo, uniformConfirm } from './confirm_combo';

const { Button, IconBtn, StatusBadge } = UI;

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
  /* 7행 — 반기보고서. 목업은 보고 내역이 없어 빈칸이지만 빈 셀을 두지 않기로 해(2026-09-24) 보고서·수정일시·확정여부는 샘플.
     ymKey는 상반기 말('2026-06')로 둬 기준년월 범위 필터에 걸리게 한다(표시값은 원문 '2026년 1/2분기'). */
  { id: 'rr-7', no: 7, gp: GP, fn: FN, ymKey: '2026-06', ymLabel: '2026년 1/2분기', rt: '반기보고서', file: '[보고서] AJ-ISU경기도애그리푸드투자조합 반기보고서_26.1H.pdf', updatedAt: '2026-07-30 오후 3:12:08', confirmed: '미확정', fundStatus: ST },
  { id: 'rr-8', no: 8, gp: GP, fn: FN, ymKey: '2026-07', ymLabel: '2026년 07월', rt: '월간보고서', file: '[보고서] AJ-ISU-경기도애그리푸드투자조합 월간보고서_26.07 (2).pdf', updatedAt: '2026-08-07 오후 4:09:29', confirmed: '확정', fundStatus: ST },
  /* 9행 — 목업은 보고 내역 없음(빈칸)이지만 7행과 같은 이유로 보고서·수정일시·확정여부는 샘플 */
  { id: 'rr-9', no: 9, gp: GP, fn: FN, ymKey: '2026-08', ymLabel: '2026년 08월', rt: '월간보고서', file: FILE('08'), updatedAt: '2026-09-07 오후 2:18:44', confirmed: '미확정', fundStatus: ST },
];

const PAGE_SIZE = 20;

/* 폭 관련 그리드 prop(`autoSizeStrategy`·`defaultColDef`)은 `aggrid_theme.ts`의 공용 상수를 쓴다 —
   인라인 리터럴 금지 이유(렌더마다 새 객체 → 폭이 선언값으로 되돌아감)는 그 파일 주석이 정본. */

/* 상세 진입 — 월간보고 route 를 팝업 창으로 연다(모달 아님). 모듈 스코프 = 컬럼 deps 안정.
   이름 붙은 창이라 반복 클릭은 같은 창을 재사용한다. `noopener`를 주지 않는다 — 같은 출처이고,
   주면 window.open 이 null 을 돌려 focus 를 못 주며, 팝업 쪽은 window.opener 로 '닫기' 표시 여부를 판단한다. */
const openDetail = () => {
  const url = `${window.location.pathname}${window.location.search}#/monthly-report`;
  const w = window.open(url, 'apfs-monthly-report', 'popup,width=1320,height=900');
  if (!w) { toast.error('팝업이 차단되어 월간보고를 열 수 없습니다. 이 사이트의 팝업을 허용한 뒤 다시 시도하세요.'); return; }
  w.focus();
};

/* ──────────────────────────────
   컬럼 정의 — 목업 헤더 순서·집합 그대로(단일 헤더):
     (선택) · No · 운용사 · 자펀드 · 보고년월 · 보고구분 · 보고서 · 수정일시 · 확정여부 · 조합상태   (목업의 상세조회는 삭제)
   ⚠ 좌측 고정은 No만 — 다른 컬럼에 `pinned`를 주면 컬럼이 좌측 영역으로 끌려와 목업 순서가 깨진다.
   ⚠ 합계행 없음(금액 컬럼이 없다). 선택 컬럼은 `SELECTION_COL`(좌측 고정 44px)이 그린다.
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
/* 모듈 스코프에 한 번만 만든다 — 렌더마다 새 컴포넌트 타입이면 AG Grid가 헤더를 통째로 remount한다 */

/* 텍스트 셀(운용사·자펀드) — flex 셀은 AG Grid 기본 ellipsis가 안 먹으므로 내부 span에 truncate를 준다 */
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;
/* 날짜성/라벨 값 — null 이면 빈 셀 */
const mnFmt = (p: { value: unknown }) => (p.value == null ? '' : String(p.value));

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
      if (p.value !== '월간보고서') return <StatusBadge tone="primary" label={p.value} size="lg" />;
      /* 링크 배지 = 라벨 뒤 external 아이콘(자펀드별 조기경보 등급 배지와 같은 규약·같은 보정값 — fund_early_warning.tsx 주석이 정본) */
      return (
        <button type="button" aria-label="월간보고서 상세 보기 (새 창)" title="월간보고 상세 (새 창)" onClick={openDetail}
          className="inline-flex items-center cursor-pointer border-0 p-0"
          style={{ font: 'inherit', background: 'transparent' }}>
          <StatusBadge tone="primary" size="lg"
            label={<>{p.value}<Icon name="external" size={13.5} stroke={2.4} style={{ position: 'relative', top: -0.75 }} /></>} />
        </button>
      );
    } },
  /* 보고서 — 파일명이 가장 긴 컬럼. 폭 전략은 `AUTO_SIZE_CONTENT`(내용 맞춤)다: 10컬럼 내용 폭 합이 프레임(1280)을 넘는
     넓은 표라 `fitGridWidth`를 쓰면 전 컬럼이 선언 폭 아래로 눌려 보고년월·수정일시·확정여부·상세조회 30셀이 잘렸다
     (2026-09-12 코디네이터 런타임 실측). 내용 맞춤이면 그리드가 프레임보다 넓어져 AG Grid 내부 가로 스크롤이 생기고 잘림은 0이다
     (apfs-aggrid "넓은 다열 테이블" 규약). 이 컬럼만 상한 520(더 긴 파일명은 truncate).
     ⚠ 첨부파일명 표시 전용(클릭 이동 없음 · bullet·밑줄 없음). */
  { field: 'file', headerName: '보고서', width: 180, minWidth: 150, maxWidth: 520, cellStyle: flexCenter,
    cellRenderer: (p: any) => (p.value
      ? <span className="min-w-0 truncate">{p.value}</span>
      : <span style={{ color: 'var(--muted-foreground)' }}>보고 내역이 없습니다.</span>) },
  { field: 'updatedAt', headerName: '수정일시', width: 180,
    cellStyle: { ...centerNum, color: 'var(--muted-foreground)' }, valueFormatter: mnFmt },
  /* 확정여부 — 셀은 보고 내역이 있는 행만 select. */
  { field: 'confirmed', headerName: '확정여부', width: 120, cellStyle: flexMid,
    /* 셀 안 select에 초점이 있을 때는 AG Grid 키 처리를 전부 끈다 — ↑↓가 값 변경 대신 셀 이동으로
       가로채이는 것을 막는다(합성 이벤트 stopPropagation으로는 못 막는다, 파일 상단 '한계'). */
    suppressKeyboardEvent: (p) => (p.event.target as HTMLElement | null)?.tagName === 'SELECT',
    cellRenderer: (p: any) => (p.value == null ? null
      : <ConfirmSelect value={p.value} no={p.data.no} onChange={(v) => patch(p.data.id, { confirmed: v })} />) },
  { field: 'fundStatus', headerName: '조합상태', width: 100, cellStyle: flexMid,
    cellRenderer: (p: any) => <StatusBadge tone="success" label={p.value} size="lg" /> },
];

/* 엑셀 컬럼 — 화면 컬럼과 1:1(화면=엑셀 불변식, 선택 체크박스 열 제외).
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

function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer motion-safe:active:scale-[.97]"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

function DrawerField({ label, noop, plain, children }: { label: string; noop?: boolean; plain?: boolean; children: React.ReactNode }) {
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

/* 행 선택 — 확정여부 일괄 변경이 N건에 그대로 적용되는 액션이라 multiRow(apfs-aggrid "체크박스" 절).
   선택은 체크박스로만(enableClickSelection:false 명시). 헤더 전체선택은 SELECTION_COL 의 DS 헤더가 그리므로
   내장 헤더는 끄고 범위를 'filtered' 로 맞춘다. 모듈 상수(렌더마다 새 객체면 컬럼 폭이 되돌아간다). */
const ROW_SELECTION = {
  mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered',
  enableClickSelection: false,
} as const;

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
/* tabs(opt-in) — 메뉴 리프가 원문 화면 2개를 탭으로 묶을 때(leaf_tabs.tsx). 미지정이면 종전 화면 그대로 */
export function RegularReportManage({ onNav, tabs }: { onNav?: (r: string) => void; tabs?: LeafTabsSlot }) {
  const apiRef = useRef<GridApi<RegularReportRow> | null>(null);
  const [rows, setRows] = useState<RegularReportRow[]>(DEMO);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });

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
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<RegularReportRow>) => (node.data ? passes(node.data) : true), [passes]);

  const filteredRows = useMemo(() => rows.filter(passes), [rows, passes]);
  const gpOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.gp))), [rows]);
  const fundOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.fn))), [rows]);
  const rtOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.rt))), [rows]);

  const onGridReady = useCallback((e: GridReadyEvent<RegularReportRow>) => { apiRef.current = e.api; }, []);

  /* 선택 SSOT = id 배열 하나(건수는 파생 — apfs-aggrid "선택 상태는 selIds 하나로") */
  const [selIds, setSelIds] = useState<string[]>([]);
  const selCount = selIds.length;
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<RegularReportRow>) => {
    setSelIds(e.api.getSelectedRows().map((r) => r.id));
  }, []);
  /* 확정여부 일괄 변경 — 게이트(confirmed != null — 현재 샘플은 전 행이 값이 있어 막히는 행이 없지만, 실데이터의 '보고 내역 없음' 행 방어로 둔다)는 요청 시점에 한 번만 평가한다.
     전부 막히면 아무것도 바꾸지 않고 알리고, 일부만 막히면 제외 건수를 함께 알린다. */
  const bulkConfirm = (v: Confirmed) => {
    const targets = rows.filter((r) => selIds.includes(r.id));
    const ok = targets.filter((r) => r.confirmed != null);
    const blocked = targets.length - ok.length;
    if (!ok.length) { toast.error('보고 내역이 있는 정기보고 행만 확정여부를 변경할 수 있습니다.'); return; }
    const okIds = new Set(ok.map((r) => r.id));
    setRows((prev) => prev.map((r) => (okIds.has(r.id) ? { ...r, confirmed: v } : r)));
    apiRef.current?.deselectAll();
    toast.success(`${String(ok.length)}건을 '${v}'(으)로 변경했습니다` + (blocked ? ` (확정 대상이 아닌 ${String(blocked)}건 제외)` : ''));
  };
  /* 선택 행의 현재 확정여부 — 전부 같으면 그 값, 섞였거나 없으면 null. 선택 바 콤보의 활성 세그먼트가 이 값을 따른다 */
  const selConfirmed = useMemo(() => uniformConfirm(rows.filter((r) => selIds.includes(r.id)).map((r) => r.confirmed)), [rows, selIds]);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* 키보드 — AG Grid의 Tab은 **셀 단위**로만 이동해 셀 안 컨트롤에 초점이 닿지 않는다.
     보고구분(월간) 셀 Enter = 상세 진입, 확정여부 셀 Enter = 셀 안 select로 초점 이동(WCAG 2.1.1). */
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
    /* 셀 안 링크·버튼에 초점이 있으면 네이티브 활성화가 이미 연다 — 여기서 또 열면 두 번 연다 */
    if ((ev.target as HTMLElement | null)?.closest?.('a,button')) return;
    if (colId === 'rt' && e.data?.rt === '월간보고서') { openDetail(); return; }
  }, []);

  const refresh = () => { setRows([...DEMO]); apiRef.current?.deselectAll(); clearFilters(); toast.success('새로고침했습니다'); };

  /* 선택 컨텍스트 액션 — GridFrame 이 툴바 좌측/하단 플로팅 바 중 한 곳에만 렌더한다 → 필터 칩은 filterChips 로 넘기고, 선택 중엔 GridFrame 이 칩을 +N 안으로 접는다 */
  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
      <ConfirmCombo value={selConfirmed} onPick={bulkConfirm} />
      <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
    </>
  ) : null;

  /* ── Excel(.xlsx) — 단일 헤더(합계행 없음) ── */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = filteredRows.map((r) => EXPORT_COLS.map((c) => {
      const v = c.get(r);
      if (typeof v === 'number') return v;
      return v;
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
      crumbs={tabs?.crumbs ?? ['홈', '투자자산관리', '사후보고관리', '정기보고']}
      title={tabs?.label ?? "정기보고"}
      favRoute={tabs?.route ?? "regular-report"}
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 = 주 필터 칩(보고구분) + 적용 중인 드로어 값 칩. 선택 중엔 비우고 선택 바(contextActions)가 대신한다 */
      filterChips={(['', '월간보고서', '반기보고서'] as ('' | ReportKind)[]).map((s) => ({ key: s || 'all', label: s || '보고구분: 전체', active: fRt === s, onSelect: () => setFRt(s) }))}
      appliedFilters={[
        { label: '운용사', value: fGp, onClear: () => setFGp('') },
        { label: '자펀드', value: fFund, onClear: () => setFFund('') },
        { label: '기준년월', value: fFrom || fTo ? `${fFrom || '…'} ~ ${fTo || '…'}` : '', onClear: () => { setFFrom(''); setFTo(''); } },
      ]}
      contextActions={selActions}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span>{'총 ' + String(filteredRows.length) + '개 중 ' + String(Math.min(shown, filteredRows.length)) + '개 항목 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <LeafTabBody slot={tabs}>
      <div>
        <AgGridReact<RegularReportRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}   // 내용 맞춤(넓은 10컬럼 표) — fitGridWidth는 셀 잘림 30건(실측)
          defaultColDef={DEFAULT_COL_DEF}
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          onSelectionChanged={onSelectionChanged}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조건에 맞는 정기보고 건이 없습니다.</span>'}
        />
      </div>
      </LeafTabBody>

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
            <DrawerField label="담당자" noop><DrawerSelect value={fMgr} onChange={setFMgr} options={[]} /></DrawerField>
            {/* 기준년월 — 월(YYYY-MM) 범위. PeriodPicker는 <label>로 명명되지 않으므로 plain + ariaLabel(apfs-datepicker) */}
            <DrawerField label="기준년월" plain>
              <div className="flex items-center gap-2 flex-wrap">
                <div style={{ width: 'fit-content', minWidth: controlMinWidth('select'), maxWidth: '100%' }}><PeriodPicker mode="month" value={fFrom} onChange={setFFrom} ariaLabel="기준년월 시작" /></div>
                <span className="text-caption">~</span>
                <div style={{ width: 'fit-content', minWidth: controlMinWidth('select'), maxWidth: '100%' }}><PeriodPicker mode="month" value={fTo} onChange={setFTo} ariaLabel="기준년월 종료" /></div>
              </div>
            </DrawerField>
            {/* 보고구분 — 툴바 칩과 같은 state 공유(옵션은 행에서 파생) */}
            <DrawerField label="보고구분"><DrawerSelect value={fRt} onChange={(v) => setFRt(v as '' | ReportKind)} options={rtOptions} /></DrawerField>
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
