/* 조기경보 결과정보 관리 — 관리형 페이지 (조기경보 > 조기경보 > 조기경보 결과정보 관리).
   출처: S2_61_조기경보_결과정보_관리.html(KRDS TO-BE) + S2_62(생성 확인 팝업 — 목업에 이미 이식돼 있음)
   → APFS 디자인시스템으로 변형. 골드 레퍼런스: custody_verify_manage.tsx(섹션 적층형).

   구성(목업 → 우리 규약):
   - 검색박스(기준년월 + [조회]) → 툴바 좌 `PeriodPicker mode="month"`(apfs-datepicker). [조회] 버튼은 없다 —
     월을 고르면 즉시 반영된다. 필터가 기준년월 하나뿐이라 상세필터 드로어·검색어는 두지 않는다.
   - `.actbar`(생성·확정·마감·마감해제) → 툴바 우 버튼 4개 **상태 무관 상시 노출**(아래 '한계·가정' 첫 항목).
   - 섹션 2개(조기경보 생성 결과내역 · 운용사 재무정보 보고) → **GridFrame 하나 안에 세로로 쌓은 AG Grid 2개**.
     섹션 경계는 번호 칩 + 제목 + 캡션(총 N건 · 기준년월) 헤더 행(목업 `.sectitle`+`.listbar` 통합).
     섹션2 헤더 우측에 목업 `.acts`(전체권한부여·전체권한해제) 버튼.
   - O/X(목업 `.tag g`/`.tag n`) → `StatusBadge size="lg" dot={false}` O=success · X=muted. null 은 muted 텍스트 '-'.
     생성여부 셀은 배지 옆에 생성일시(목업 `.ts`)를 작은 muted 텍스트로 붙인다.
   - 섹션2 수정권한처리 → 셀 안 outline 버튼 → 확인 다이얼로그.
   - 확인 다이얼로그(목업 `confirmDlg`) → Radix AlertDialog(`ew_result_dialogs.tsx`), 기본 포커스=취소.
     확정은 목업과 같이 다이얼로그 없이 토스트만 띄운다.
   - 합계행·행 선택·페이지네이션·등록 없음 → selbar·pinned 합계·페이저도 없다(목업 동일). KPI 배지 행 미포함(사용자 결정).
   - 엑셀 → SheetJS 워크북 1개 + 시트 2개("생성결과내역"·"재무정보보고"). 단일 헤더라 병합 없음.
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·설계메모는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).
   ⚠검토필요 마커 1건: 생성 확인 다이얼로그 본문(목업 원문 그대로). 섹션2 전월 규칙은 [확인 필요]로 아래 주석에만 기록한다
     (섹션2 헤더 마커는 2026-09-23 사용자 결정으로 제거).

   한계·가정(결정 기록)
   - **섹션2 기준년월 = 선택 월의 전월(-1)** — 목업이 상단 2026-07 / 섹션2 2026-06 으로 그렸고 설계메모가
     "전월 집계인지 하드코딩 오류인지" [확인 필요]로 남겼다. 목업 그대로 전월로 둔다(주석에만 기록 — 화면 마커는 2026-09-23 사용자 결정으로 제거).
   - **기획서 범위로 한정(2026-09-23 사용자 결정)** — 기획서(통합_화면_구조도_v1.5.xlsx)는 버튼·확인팝업만 정의하고
     처리 효과가 없다 → 생성·확정·마감·마감해제·수정권한처리·전체권한부여·전체권한해제 버튼은 **상태 무관 상시 노출**,
     확인 후 **토스트만**(데이터 불변). 섹션2가 빈 월은 전체권한 버튼만 비활성(대상 없음).
   - **"수정권한"의 의미·범위 미정의** [확인 필요] — 부여 시 운용사가 어느 화면·항목을 수정할 수 있는지, 기준년월 한정인지,
     재무정보 등록/보고 화면 편집 가능 여부와 어떻게 연동되는지 원문에 없다(목업 설계메모). 여기선 값을 바꾸지 않는다.
   - **더미 데이터는 목업 원문 2건뿐**(섹션1 2026-07 · 섹션2 2026-06) — 그 외 월은 빈 그리드. 값 창작 금지.
   - **데이터는 불변 상수**(월 키로 보관, 백엔드 없음) — 새로고침 버튼은 기준년월을 기본값(2026-07)으로 되돌린다.
   - 금액이 없는 조회·상태관리 화면이라 단위 표기·단위 토글이 없다(목업 설계메모와 동일 결론).
   - 마스크 경계 때문에 `tooltipField`는 두지 않는다(툴팁으로 실값이 샌다). 순번·배지·헤더는 가리지 않는다. */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정 + autoHeight sticky 헤더(공유)
import React, { useState, useCallback, useMemo } from 'react';
import { UI } from './components';
import { mn, MT, useMask } from './mask';
import { GridFrame, FooterActions } from './grid_frame';
import { apfsTheme, DEFAULT_COL_DEF } from './aggrid_theme';
import { controlMinWidth } from './schemas/renderers';   // 컨트롤 폭 하한 SSOT(fit-content 짝)
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellStyle } from 'ag-grid-community';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용)
import { PeriodPicker } from './ui/period-picker';
import { ReviewMarker } from './review_marker';
import type { ReviewNote } from './review_marker';
import { EwConfirmDialog } from './ew_result_dialogs';
import { prevYm } from './ew_result_model';   // 섹션2 기준년월 = 전월(순수함수 — 유닛 테스트 대상)

const { Button, IconBtn, StatusBadge } = UI;

/* ──────────────────────────────
   도메인 타입 — 목업 2개 표의 컬럼 집합 그대로
────────────────────────────── */
export type OX = 'O' | 'X';

/** 섹션1 조기경보 생성 결과내역 한 행 */
export interface EwResultRow {
  id: string; no: number; ym: string; info: string;
  make: OX; makeTs: string | null;   // 생성여부 + 생성일시(목업 `.ts`)
  mod: OX; cfm: OX; cls: OX;         // 수정·확정·마감여부
}
/** 섹션2 운용사 재무정보 보고 한 행 */
export interface GpReportRow {
  id: string; no: number; ym: string; gp: string;
  rep: OX | null; cons: OX | null; perm: OX | null;   // 보고·정합성·수정권한여부(null = '-')
}

/* 데모 데이터 — 목업 `<script>` D1·D2 원문 그대로(창작 없음). 월(YYYY-MM) 키로 보관한다.
   섹션2 행은 **자기 기준년월(2026-06)** 키로 둔다 → 선택 월의 전월로 찾으면 2026-07 선택 시 이 행이 나온다. */
const RESULT_DEMO: Record<string, EwResultRow[]> = {
  '2026-07': [
    { id: 'ew-r-2026-07', no: 1, ym: '2026-07', info: '운용사지표결과정보', make: 'O', makeTs: '2026-07-23 15:06:03', mod: 'X', cfm: 'O', cls: 'X' },
  ],
};
const REPORT_DEMO: Record<string, GpReportRow[]> = {
  '2026-06': [
    { id: 'ew-g-2026-06-1', no: 1, ym: '2026-06', gp: '(주)에코캐피탈', rep: 'X', cons: 'O', perm: 'X' },
  ],
};

/* 기준년월 기본값 — 목업 `#f-ym` value */
const BASE_YM = '2026-07';

/* ⚠검토필요 메모 — 설계 메모라 마스킹·엑셀 대상이 아니다.
   MAKE_NOTE = 목업 425행 `data-rec`/`data-dat` 원문 그대로. */
const MAKE_NOTE: ReviewNote = {
  rec: '안내문구 원문 확정 필요 — 비고(O열) 원문 없음',
  dat: '「생성하시겠습니까?」 (P열 실데이터 샘플)',
};

/* ──────────────────────────────
   컬럼 정의 — 목업 thead 순서·집합 그대로(단일 헤더 7컬럼 × 2)
   ⚠ 폭 전략 = **flex + minWidth**(`autoSizeStrategy` 없음) — 7컬럼 내용 폭 합이 프레임보다 좁아 내용 맞춤을 쓰면
     오른쪽에 빈 거터가 남는다(workforce_manage 와 같은 상황). flex 컬럼에도 `width: minWidth` 필수(apfs-aggrid ⑨).
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

const dashCell = <span style={{ color: 'var(--muted-foreground)' }}>-</span>;
/* O/X 셀 — O=success · X=muted(중립). null 은 값 없음 표식이라 배지가 아니라 muted 텍스트 */
const OX_TONE = { O: 'success', X: 'muted' } as const;
const oxBadge = (v: OX | null | undefined) =>
  (v == null ? dashCell : <StatusBadge tone={OX_TONE[v]} label={v} size="lg" dot={false} />);
const oxCell = (p: { value: OX | null }) => oxBadge(p.value);
/* 텍스트 셀 — flex 셀은 AG Grid 기본 ellipsis가 안 먹으므로 내부 span에 truncate */
const textCell = (p: { value: string }) => <span className="min-w-0 truncate"><MT>{p.value}</MT></span>;
/* 기준년월 — 행 데이터라 mn() */
const ymFmt = (p: { value?: string | null }) => (p.value ? mn(p.value) : '-');

/* 생성여부 셀 — 배지 + 생성일시. 값은 `make|makeTs` 결합 문자열(valueGetter) — 셀 값이 두 필드를 모두 반영해야
   (데이터 연동 후) 일시만 바뀌어도 AG Grid 델타 갱신이 셀을 다시 그린다. */
const MAKE_COL = 'makeState';
const makeCell = (p: { value: string }) => {
  const [make, ts] = String(p.value ?? '').split('|');
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      {oxBadge((make || null) as OX | null)}
      {ts && <span className="truncate" style={{ fontSize: 12, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>{mn(ts)}</span>}
    </span>
  );
};

const seqCol = <T,>(): ColDef<T> =>
  /* 순번은 축이라 비마스킹(mn 미적용) */
  ({ field: 'no' as ColDef<T>['field'], headerName: '순번', width: 72, maxWidth: 72, pinned: 'left', cellStyle: centerNum, valueFormatter: (p) => String(p.value) });
const ymCol = <T,>(): ColDef<T> =>
  ({ field: 'ym' as ColDef<T>['field'], headerName: '기준년월', flex: 0.7, minWidth: 100, width: 100, cellStyle: centerNum, valueFormatter: ymFmt });
const oxCol = <T,>(field: string, headerName: string): ColDef<T> =>
  ({ field: field as ColDef<T>['field'], headerName, flex: 0.7, minWidth: 104, width: 104, cellStyle: flexMid, cellRenderer: oxCell });

const RESULT_COLS: ColDef<EwResultRow>[] = [
  seqCol<EwResultRow>(),
  ymCol<EwResultRow>(),
  { field: 'info', headerName: '생성정보', flex: 1.4, minWidth: 160, width: 160, cellStyle: flexCenter, cellRenderer: textCell },
  { colId: MAKE_COL, headerName: '생성여부', flex: 1.3, minWidth: 196, width: 196, cellStyle: flexMid,
    valueGetter: (p) => (p.data ? `${p.data.make}|${p.data.makeTs ?? ''}` : ''), cellRenderer: makeCell },
  oxCol<EwResultRow>('mod', '수정여부'),
  oxCol<EwResultRow>('cfm', '확정여부'),
  oxCol<EwResultRow>('cls', '마감여부'),
];

/* 수정권한처리 버튼 컬럼의 colId — 조작 요소라 엑셀 직렬화에서 제외한다 */
const PERM_ACTION_COL = 'permAct';
type OpenPerm = () => void;

function makeReportCols(openPerm: OpenPerm): ColDef<GpReportRow>[] {
  return [
    seqCol<GpReportRow>(),
    ymCol<GpReportRow>(),
    { field: 'gp', headerName: '운용사', flex: 1.4, minWidth: 160, width: 160, cellStyle: flexCenter, cellRenderer: textCell },
    oxCol<GpReportRow>('rep', '보고여부'),
    oxCol<GpReportRow>('cons', '정합성여부'),
    oxCol<GpReportRow>('perm', '수정권한여부'),
    /* 액션 컬럼(정렬·엑셀 제외). UI.Button은 aria-label을 받지 않으므로 접근名은 sr-only로 보강("1행 ") */
    { colId: PERM_ACTION_COL, headerName: '수정권한처리', flex: 0.9, minWidth: 128, width: 128, sortable: false, cellStyle: flexMid,
      cellRenderer: (p: { data?: GpReportRow }) => (p.data
        ? <Button variant="outline" size="sm" onClick={() => openPerm()}>
            <span className="sr-only">{p.data.no + '행 '}</span>수정권한처리
          </Button>
        : null) },
  ];
}

/* ──────────────────────────────
   Excel — 섹션별 시트 2개(단일 헤더). O/X 는 화면에서도 가리지 않는 배지라 마스크 대상이 아니다.
   생성일시는 화면에선 생성여부 셀 안에 붙어 있지만 엑셀에선 **별도 열**로 푼다(한 셀에 섞으면 정렬·필터 불가).
────────────────────────────── */
type XCol<T> = { header: string; get: (r: T) => string | number | null; masked?: boolean; wide?: boolean };
const RESULT_X: XCol<EwResultRow>[] = [
  { header: '순번', get: (r) => r.no },
  { header: '기준년월', get: (r) => r.ym, masked: true },
  { header: '생성정보', get: (r) => r.info, masked: true, wide: true },
  { header: '생성여부', get: (r) => r.make },
  { header: '생성일시', get: (r) => r.makeTs, masked: true, wide: true },
  { header: '수정여부', get: (r) => r.mod },
  { header: '확정여부', get: (r) => r.cfm },
  { header: '마감여부', get: (r) => r.cls },
];
const REPORT_X: XCol<GpReportRow>[] = [
  { header: '순번', get: (r) => r.no },
  { header: '기준년월', get: (r) => r.ym, masked: true },
  { header: '운용사', get: (r) => r.gp, masked: true, wide: true },
  { header: '보고여부', get: (r) => r.rep },
  { header: '정합성여부', get: (r) => r.cons },
  { header: '수정권한여부', get: (r) => r.perm },
];
function toSheet<T>(cols: XCol<T>[], rows: T[], masked: boolean): XLSX.WorkSheet {
  const body = rows.map((r) => cols.map((c) => {
    const v = c.get(r);
    if (v == null) return '-';
    return c.masked && masked ? '' : v;
  }));
  const ws = XLSX.utils.aoa_to_sheet([cols.map((c) => c.header), ...body]);
  ws['!cols'] = cols.map((c) => ({ wch: c.wide ? 24 : 12 }));
  return ws;
}

/* ──────────────────────────────
   페이지 로컬 프리미티브(골드 복사 + actions 슬롯)
────────────────────────────── */
/* 섹션 헤더 — 목업 `.sectitle`(제목) + `.listbar`(캡션·우측 버튼)을 한 행으로 합친다.
   번호 칩은 ColorChip(아이콘 전용)이 아니라 숫자를 담는 primary soft 배지다. */
function SectionHead({ n, title, cap, actions }: { n: string; title: string; cap: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 flex-wrap" style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
      <span aria-hidden className="inline-flex items-center justify-center shrink-0 font-bold"
        style={{ width: 20, height: 20, borderRadius: 6, fontSize: 12, background: 'color-mix(in srgb, var(--primary) 13%, transparent)', color: 'var(--primary)' }}>{n}</span>
      {/* preflight:false — h4는 UA 기본 마진이 살아 있어 m-0 필수 */}
      <h4 className="font-bold m-0" style={{ fontSize: 15 }}>{title}</h4>
      <span className="text-caption inline-flex items-center" style={{ fontSize: 12.5 }}>{cap}</span>
      {actions && <div className="ml-auto flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}

const NO_ROWS = '<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회된 데이터가 없습니다.</span>';

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null
  | { kind: 'close' | 'reopen'; ym: string }   // 본문에 기준년월을 싣는다
  | { kind: 'make' | 'grantAll' | 'revokeAll' | 'perm' };

/* 확인 후 토스트 — 기획서에 처리 효과 정의가 없어 데이터는 바꾸지 않는다(파일 상단 '한계·가정') */
const DONE_TOAST: Record<NonNullable<ModalState>['kind'], string> = {
  make: '생성되었습니다',
  close: '마감 처리되었습니다',
  reopen: '마감이 해제되었습니다',
  grantAll: '전체권한부여 되었습니다',
  revokeAll: '전체권한해제 되었습니다',
  perm: '권한처리 되었습니다',
};

export function EwResultManage({ onNav }: { onNav?: (r: string) => void }) {
  const [ym, setYm] = useState(BASE_YM);
  const [modal, setModal] = useState<ModalState>(null);
  const masked = useMask();

  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: modal === null });

  /* 섹션2 기준년월 = 선택 월의 전월(파일 상단 '한계·가정') */
  const reportYm = prevYm(ym);
  const resultRows = useMemo(() => RESULT_DEMO[ym] ?? [], [ym]);
  const reportRows = useMemo(() => (reportYm ? REPORT_DEMO[reportYm] ?? [] : []), [reportYm]);

  /* 컬럼 정의 — openPerm(안정)만 캡처하므로 deps는 [openPerm](apfs-aggrid 계약6) */
  const openPerm = useCallback<OpenPerm>(() => setModal({ kind: 'perm' }), []);
  const reportCols = useMemo(() => makeReportCols(openPerm), [openPerm]);

  /* 확정 — 목업과 같이 다이얼로그 없이 토스트만 */
  const doConfirm = () => toast.success('결과정보를 확정했습니다');

  /* 확인 다이얼로그 확정 — 토스트만. 닫힘은 AlertDialog deferred close → onClose 가 처리(여기서 setModal(null) 하지 않는다) */
  const commit = () => { if (modal) toast.success(DONE_TOAST[modal.kind]); };

  const refresh = () => {
    setYm(BASE_YM);
    toast.success('새로고침했습니다');
  };

  /* ── Excel(.xlsx) — 워크북 1개 + 섹션 시트 2개. 마스크 ON이면 텍스트·일시 비노출(O/X·순번은 유지) ── */
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, toSheet(RESULT_X, resultRows, masked), '생성결과내역');
    XLSX.utils.book_append_sheet(wb, toSheet(REPORT_X, reportRows, masked), '재무정보보고');
    XLSX.writeFile(wb, '조기경보 결과정보 관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  /* 다이얼로그 문구 — 목업 confirmDlg 호출 원문 그대로 */
  const dialog = (() => {
    if (!modal) return null;
    const ymB = <b className="text-foreground">{mn('ym' in modal ? modal.ym : '')}</b>;   // close·reopen 만 사용
    switch (modal.kind) {
      case 'make': return { title: '조기경보 결과정보 관리 - 생성 확인', ok: '확인',
        body: <span className="inline-flex items-center">생성하시겠습니까?<ReviewMarker {...MAKE_NOTE} label="생성 확인 안내문구" /></span> };
      case 'close': return { title: '마감 처리', ok: '마감',
        body: <>기준년월 {ymB}의 조기경보 결과정보를 마감하시겠습니까?<br />마감 후에는 수정이 제한됩니다.</> };
      case 'reopen': return { title: '마감해제', ok: '마감해제', body: <>기준년월 {ymB}의 마감을 해제하시겠습니까?</> };
      case 'grantAll': return { title: '전체권한부여', ok: '부여', body: '운용사 재무정보 보고 대상 전체에 수정 권한을 일괄 부여하시겠습니까?' };
      case 'revokeAll': return { title: '전체권한해제', ok: '해제', body: '운용사 재무정보 보고 대상 전체의 수정 권한을 일괄 해제하시겠습니까?' };
      case 'perm': return { title: '수정권한처리', ok: '처리', body: '권한처리하시겠습니까?' };
    }
  })();

  const noReport = reportRows.length === 0;

  return (
    <GridFrame
      crumbs={['홈', '조기경보', '조기경보', '조기경보 결과정보 관리']}
      title="조기경보 결과정보 관리"
      cardTitle="조기경보 결과정보 관리"
      favRoute="조기경보 결과정보 관리"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 = 기준년월(주 조회조건, 즉시 반영). PeriodPicker 트리거는 w-full 이라 fit-content 래퍼(apfs-datepicker "폭") */
      toolbarLeft={(
        <div className="flex items-center gap-2">
          <span className="font-semibold text-muted-foreground whitespace-nowrap" style={{ fontSize: 13 }}>기준년월</span>
          <div style={{ width: 'fit-content', minWidth: controlMinWidth('month'), maxWidth: '100%' }}>
            <PeriodPicker mode="month" value={ym} onChange={(v) => setYm(v || BASE_YM)} ariaLabel="기준년월" />
          </div>
        </div>
      )}
      /* 툴바 우 = 워크플로 버튼 4개(상태 무관 상시 노출) → 새로고침 */
      toolbarRight={<>
        <Button variant="outline" size="sm" onClick={() => setModal({ kind: 'make' })}>생성</Button>
        <Button variant="outline" size="sm" onClick={doConfirm}>확정</Button>
        <Button variant="outline" size="sm" onClick={() => setModal({ kind: 'close', ym })}>마감</Button>
        <Button variant="outline" size="sm" onClick={() => setModal({ kind: 'reopen', ym })}>마감해제</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      /* 푸터 좌 = 섹션별 건수(페이지네이션이 없어 '총 N개 중 M개' 형식이 성립하지 않는다) */
      footerLeft={<span>{'생성 결과내역 ' + mn(String(resultRows.length)) + '건 · 운용사 재무정보 보고 ' + mn(String(reportRows.length)) + '건'}</span>}
      footerRight={<FooterActions onExport={exportExcel} />}>

      {/* ── ① 조기경보 생성 결과내역 (선택 월) ── */}
      <SectionHead n="1" title="조기경보 생성 결과내역"
        cap={<>총 {mn(String(resultRows.length))}건 · 기준년월 {mn(ym)}</>} />
      <div>
        <AgGridReact<EwResultRow>
          theme={apfsTheme}
          rowData={resultRows}
          columnDefs={RESULT_COLS}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          overlayNoRowsTemplate={NO_ROWS}
        />
      </div>

      {/* ── ② 운용사 재무정보 보고 (선택 월의 전월) ── */}
      <SectionHead n="2" title="운용사 재무정보 보고"
        cap={<>총 {mn(String(reportRows.length))}건 · 기준년월 {reportYm ? mn(reportYm) : '-'}</>}
        actions={<>
          <Button variant="outline" size="sm" disabled={noReport} onClick={() => setModal({ kind: 'grantAll' })}>전체권한부여</Button>
          <Button variant="outline" size="sm" disabled={noReport} onClick={() => setModal({ kind: 'revokeAll' })}>전체권한해제</Button>
        </>} />
      <div>
        <AgGridReact<GpReportRow>
          theme={apfsTheme}
          rowData={reportRows}
          columnDefs={reportCols}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          overlayNoRowsTemplate={NO_ROWS}
        />
      </div>

      {/* ── 확인 다이얼로그 — 조건부 마운트. 닫힘 후 onClose 에서 state 해제 ── */}
      {dialog && (
        <EwConfirmDialog title={dialog.title} body={dialog.body} okLabel={dialog.ok}
          onConfirm={commit} onClose={() => setModal(null)} />
      )}
    </GridFrame>
  );
}
