/* 총계정원장 — 조회 전용 리스트 (회계 > 장부조회 > 총계정원장, route acct-general-ledger, 화면ID ACC-011).
   출처: ACC-011 화면설계서 v1.0 slide 9~19(개요 9 · 화면 10 · 상세필터 11 · 계정별 상세내역 12 · 전표상세 13 · 이벤트 15~19).

   설계서 → 우리 규약
   - 툴바: ⟳ 조회(E02, 맨 끝). 선택 체크박스·선택 바 없음(조회 전용). 상세필터(E01)는 칩 줄 위 인라인 패널.
   - 그리드 6열: 계정코드 · 계정과목 · 기초잔액(조회 시작일 이전) · 차변금액 · 대변금액 · 금일잔액(조회 종료일) — 헤더에 날짜 동적 표기.
     계정코드 '중앙' → 좌측(정렬 규약, tabular-nums). 금액 4열 우측·천단위. 헤더 정렬 끔(계정코드 순서 고정).
     폭 = flex(6열 좁은 그리드 — AUTO_SIZE_CONTENT 는 날짜가 바뀌어 컬럼이 재생성되면 폭이 되돌아간다).
   - 상세필터 5개(slide 11) = 칩 줄 위 인라인 패널(2026-11-17 드로어 폐기 — apfs-detail-filter): 계정구분(셀렉트 — 검색창은 옵션 10개 이상일 때 자동,
     searchable 미지정 2026-11-03) · 기간*(시작~종료) · 미결재포함 · 모든계정포함 · 결산전표포함.
     즉시 반영 — 고르는 즉시 applied 반영. 검증 실패(기간 미입력 "기간을 입력하세요." ·
     시작>종료 "시작일은 종료일보다 늦을 수 없습니다.") = 기간 칸 빨간 테두리 + 패널 아래 안내, 결과 0건
     (2026-11-03 사용자 지시, 정본 privacy_access_log). [초기화] = 기본값 복원. 적용 칩: 값만 · 개별 ×, 기간은 필수라 × 없음.
   - 행 더블클릭 / Enter(E03) = 공용 「계정별 상세내역」(AccountDetailModal) — 같은 조건(계정구분·미결재·결산)·같은 기간을 넘긴다.
     원장과 팝업이 같은 subledger 계산이라 기초잔액 = 팝업 [전잔], 금일잔액 = 팝업 마지막 잔액이 구성상 성립(general_ledger_model.test).
     팝업 행 더블클릭(E06) = 전표상세(JournalEntryScreen readOnly, [닫기]만) · [전잔] 무반응 · 결과 없음 문구 — 모두 팝업이 소유.
   - 푸터: 새 창(E04, ⌥O) · 내보내기(E05, ⌥D — SheetJS, 금액 숫자 셀, 토스트 "Excel로 내보냈습니다") · 인쇄(⌘P, 그리드 인쇄).

   결정·가정(설계서와 다른 점 — PM 확인 필요)
   - 기간 기본값 = 당기 회기 시작(1/1) ~ 오늘: 기간이 필수인데 E00 은 "필터 없음 전체 조회"라 빈 기간으로 시작할 수 없다.
   - 결산전표포함 기본 = 부(slide 11 '미체크'). slide 10·16 와이어프레임 칩은 '전부포함' 이라 충돌.
   - 미결재포함·모든계정포함·결산전표포함 = 체크박스(PanelCheck — 2026-11-03 사용자 지시. 모든계정포함은 이 화면만 체크박스, 다른 장부는 여/부 셀렉트).
   - 설계서 하단도구는 [새 창]·[내보내기] 2개지만 푸터 액션은 프로젝트 규약상 항시 노출이라 인쇄 아이콘이 함께 보인다.
   - 팝업은 "새 창" 대신 Dialog(프로젝트 팝업 규약). 페이지 수(1페이지 분량)라 페이저·전체보기 없음.
   - 권한 기반 노출(내보내기·인쇄 = "인쇄·다운로드" 권한)은 RBAC 미구현이라 항상 노출. */
import '../../aggrid_shared.css';
import { useCallback, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellKeyDownEvent, CellStyle, ColDef, RowDoubleClickedEvent } from 'ag-grid-community';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { UI } from '../../components';
import { GridFrame, FooterActions, footerCount } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, numFmt, numStyle } from '../../aggrid_theme';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import { FilterPanel, PanelCheck, PanelRange, PanelSelect } from '../../filter_panel';   // 상세필터 인라인 패널(apfs-detail-filter)
import { filtersDirty } from '../../applied_filters';
import { FUND_ACCOUNTS } from '../slip/general_journal_data';
import { demoLedger, todayStr } from './ledger_data';
import { generalLedger, validatePeriod, MSG } from './ledger_model';
import type { GeneralLedgerRow } from './ledger_model';
import { flagChips } from '../ledger_filter_ui';
import { AccountDetailModal } from './account_detail_modal';
import { defaultGeneralLedgerFilter, openingHeader, closingHeader } from './general_ledger_model';
import type { GeneralLedgerFilter } from './general_ledger_model';

const { Button, IconBtn } = UI;

const TITLE = '총계정원장';

/* ── 그리드 ── */
const COL_DEF: ColDef = { ...DEFAULT_COL_DEF, sortable: false };   // 계정코드 순서 고정
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const codeStyle: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;
const amountCol = (field: keyof GeneralLedgerRow, headerName: string, minWidth: number): ColDef<GeneralLedgerRow> => ({
  field, headerName, flex: 1, minWidth, width: minWidth, type: 'rightAligned', valueFormatter: numFmt, cellStyle: numStyle() as any,
});
function makeColumns(from: string, to: string): ColDef<GeneralLedgerRow>[] {
  return [
    { field: 'code', headerName: '계정코드', width: 108, minWidth: 100, cellStyle: codeStyle },
    { field: 'name', headerName: '계정과목', flex: 1.4, minWidth: 200, width: 200, cellStyle: { ...flexCenter, fontWeight: 600 }, cellRenderer: textCell },
    amountCol('opening', openingHeader(from), 190),
    amountCol('debit', '차변금액', 150),
    amountCol('credit', '대변금액', 150),
    amountCol('closing', closingHeader(to), 170),
  ];
}

export function GeneralLedgerManage({ onNav }: { onNav?: (r: string) => void }) {
  const today = useMemo(() => todayStr(), []);
  const src = useMemo(() => demoLedger(today), [today]);   // 원장 1벌 — 그리드·계정별 상세내역·전표상세 공용
  const base = useMemo(() => defaultGeneralLedgerFilter(today), [today]);

  /* 상세필터 — applied = 패널·칩·그리드의 SSOT(초안 사본 없음 — 바꾸는 즉시 반영) */
  const [applied, setApplied] = useState<GeneralLedgerFilter>(base);
  const [detail, setDetail] = useState<{ code: string; name: string } | null>(null);

  const patch = (p: Partial<GeneralLedgerFilter>) => setApplied((a) => ({ ...a, ...p }));
  const setD = <K extends keyof GeneralLedgerFilter>(k: K) => (v: GeneralLedgerFilter[K]) => patch({ [k]: v } as Partial<GeneralLedgerFilter>);
  /* 기간 필수·순서 검증 — 렌더마다 applied 로. 실패면 기간 칸 표시 + 결과 0건 */
  const periodErr = validatePeriod(applied.from, applied.to, true);

  /* E00 · 조회 결과 — 공용 모델 그대로(페이지에서 재계산하지 않는다). 검증 실패면 계산하지 않는다(빈 날짜 → date-fns RangeError 방지) */
  const rows = useMemo(() => (periodErr ? [] : generalLedger(src.lines, applied, applied.from, applied.to)), [periodErr, src, applied]);
  const columnDefs = useMemo(() => makeColumns(applied.from, applied.to), [applied.from, applied.to]);

  /* 인쇄·내보내기 — 팝업이 열린 동안 끈다(skipInDialog 와 이중) */
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: !detail, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: !detail, skipInDialog: true });

  /* E03 행 더블클릭 / Enter → 계정별 상세내역 */
  const openDetail = useCallback((r: GeneralLedgerRow | undefined) => { if (r) setDetail({ code: r.code, name: r.name }); }, []);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<GeneralLedgerRow>) => { if (!e.rowPinned) openDetail(e.data); }, [openDetail]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<GeneralLedgerRow>) => {
    if ((e.event as KeyboardEvent | null)?.key === 'Enter' && !e.rowPinned) openDetail(e.data);
  }, [openDetail]);

  /* E02 조회 — 현재 조건으로 재조회(백엔드 없음 — 로컬 재계산) */
  const refresh = () => { if (periodErr) { toast.error(periodErr); return; } setApplied((a) => ({ ...a })); toast.success('조회되었습니다'); };

  /* E05 내보내기 — 화면 헤더 그대로(날짜 포함), 금액 4열 숫자 셀 */
  const exportExcel = () => {
    if (periodErr) { toast.error(periodErr); return; } // 검증 실패 = 0건 — 헤더만 있는 파일을 받지 않게
    const head = ['계정코드', '계정과목', openingHeader(applied.from), '차변금액', '대변금액', closingHeader(applied.to)];
    const body = rows.map((r) => [r.code, r.name, r.opening, r.debit, r.credit, r.closing]);
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    body.forEach((_, ri) => [2, 3, 4, 5].forEach((ci) => {
      const c = ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })];
      if (c) { c.t = 'n'; c.z = '#,##0'; }
    }));
    ws['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 26 }, { wch: 18 }, { wch: 18 }, { wch: 24 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, TITLE);
    XLSX.writeFile(wb, `${TITLE}_${applied.from}_${applied.to}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  /* 적용 칩 — 설계서 순서(미결재 · 모든계정 · 결산 · 기간 · 계정구분). 기간은 필수라 × 없음 */
  const chips = [
    ...flagChips(applied, base, patch),
    { label: '기간', value: `${applied.from || '…'} ~ ${applied.to || '…'}` },
    { label: '계정구분', value: applied.fundAccount, onClear: () => patch({ fundAccount: '' }) },
  ];

  return (
    <GridFrame
      crumbs={['홈', '회계', '장부조회', TITLE]}
      title={TITLE}
      favRoute="acct-general-ledger"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      appliedFilters={chips}
      /* 상세필터(E01) = 칩 줄 위 인라인 패널 — 바꾸는 즉시 applied 반영. 검증 문구는 패널 아래, [초기화] = 기본값(기간 = 당기 1/1 ~ 오늘) */
      filterPanel={
        <FilterPanel label="총계정원장 조회 조건" errors={[periodErr]}>
          <PanelSelect label="계정구분" value={applied.fundAccount} onChange={setD('fundAccount')} options={[...FUND_ACCOUNTS]} />
          <PanelRange label="기간" mode="day" from={applied.from} to={applied.to} onFrom={setD('from')} onTo={setD('to')} invalid={!!periodErr} />
          <PanelCheck label="미결재포함" checked={applied.includeUnapproved} onChange={setD('includeUnapproved')} />
          <PanelCheck label="모든계정포함" checked={applied.includeAll} onChange={setD('includeAll')} />
          <PanelCheck label="결산전표포함" checked={applied.includeClosing} onChange={setD('includeClosing')} />
        </FilterPanel>
      }
      filterReset={{ run: () => setApplied(base), dirty: filtersDirty(applied, base) }}
      toolbarRight={<>
        <span className="text-caption" style={{ fontSize: 12 }}>단위: 원</span>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{footerCount(rows.length, rows.length)}</span>}
      footerRight={<FooterActions onExport={exportExcel} />}>

      <div>
        <AgGridReact<GeneralLedgerRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={COL_DEF}
          getRowId={(p) => p.data.code}
          domLayout="autoHeight"
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={MSG.noResult}
        />
      </div>

      {/* E03 계정별 상세내역 — 원장과 같은 조건·기간(기초 = [전잔], 금일 = 마지막 잔액). E06 전표상세는 팝업이 연다 */}
      {detail && (
        <AccountDetailModal src={src} cond={applied} account={detail} from={applied.from} to={applied.to} onClose={() => setDetail(null)} />
      )}
    </GridFrame>
  );
}
