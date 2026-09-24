/* 조기경보 전월 비교 조회 — 조회 전용 비교 그리드 (조기경보 > … > 조기경보 전월 비교 조회).
   출처: docs/mockups/02_조기경보/S2_63_조기경보_전월_데이터_비교_조회.html (KRDS TO-BE) → APFS 디자인시스템으로 변형.
   형제 화면 `fund_early_warning.tsx`(S2_49)·`gp_early_warning.tsx`(S2_47)와 같은 구조·관례로 만든다.

   구성(목업 → 우리 규약):
   - 검색박스(기준년월) + 표 아래 범례 토글(등급 3 · 변동 3) → **상세필터 드로어** 3섹션(기준년월·등급·변동).
     목업의 `조회` 버튼은 없앴다(백엔드가 없어 필터가 즉시 반영된다). `엑셀`·`출력` 툴바 버튼은 없애고
     **푸터 FooterActions**(내보내기·인쇄 아이콘) + ⌥D/⌘P 단축키가 소유한다(골드 동형).
   - 그리드 1개 · 단일 헤더 7컬럼(No·구분·모펀드·항목·등급·당월·전월).
     `등급` 컬럼은 등급이 아니라 **변동 배지**(신규·해소·▲ 악화·▼ 개선·= 지속)를 보인다(목업 `chg()`).
     당월/전월 = `운용사명 + 등급 배지`, 대상이 아니면 `–`. 당월≠전월 행은 두 셀에 음영(목업 `td.diff`).
   - KPI 배지 행 없음(사용자 결정) · 행 선택 없음 · 합계행 없음 · 페이지네이션 없음 · 팝업 없음.
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·LNB·하단 설계메모는 프로토타입 스캐폴딩이라 이식하지 않는다.

   한계·가정:
   - 행 데이터는 목업 `DATA` 6행이 전부다(→ `ew_month_compare_model.ts`). 운용사 창작 금지.
   - `기준년월`은 **행을 거르지 않는 조회 기준 컨텍스트**다(형제 S2_47·S2_49 동형). 기본값 없음(사용자 결정).
     빈 값 가드 3곳: 적용 칩 · 푸터 캡션(`기준 X vs 전월 Y`) · 엑셀 파일명.
   - 필터 판정은 목업 `passFilter`/`chgKey` 를 그대로 옮긴 순수 함수(모델 모듈, 단위 테스트 有).
     → 신규는 변동 필터 대상이 아니고(항상 표시), 해소는 `개선·해소` 버킷, 등급은 당월 **또는** 전월 매칭.
   - No 는 필터 후 1..N 재번호다 — 외부필터 대신 **필터된 rowData** 를 넘긴다(rowIndex 기반 valueGetter 는
     필터 변경 후 갱신이 보장되지 않는다). 엑셀도 같은 배열을 써서 화면=엑셀이 자동으로 성립한다.

   ⚠️ AG Grid v35.3.1(v33+) Theming API: 레거시 CSS(ag-grid.css/ag-theme-*.css) import 금지. */
import './aggrid_shared.css';
import React, { useState, useMemo } from 'react';
import { UI } from './components';
import type { Tone } from './components';
import { Icon } from './icons';
import { GridFrame, FooterActions } from './grid_frame';
import { apfsTheme, DEFAULT_COL_DEF } from './aggrid_theme';
import { controlMinWidth } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellStyle, CellClassParams } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';
import { PeriodPicker } from './ui/period-picker';
import {
  ROWS, GRADES, CHG_KEYS, CHG_KEY_LABEL,
  chgLabel, prevMonth, visibleRows, isDiff, sideText, buildAoa,
} from './ew_month_compare_model';
import type { Grade, ChgKey, NumberedRow } from './ew_month_compare_model';

const { Button, IconBtn, StatusBadge } = UI;

const TITLE = '조기경보 전월 비교 조회';

/* 등급 → 배지 톤. 형제 조기경보 화면과 **같은 값**(각 화면이 로컬 선언하는 관례를 따른다 —
   gp_early_warning.tsx:69 · early_warning_manage.tsx:86 · fund_early_warning.tsx:74). */
const GRADE_TONE: Record<Grade, Tone> = { 정상: 'success', 주의: 'warning', 경고: 'danger' };

/* 변동 배지 → 톤. 목업 `.chg.up`=danger · `.chg.down`=ok · `.chg.same`=grey 를 기존 tone 으로 옮김.
   신규는 목업에서 `.chg up`(악화와 같은 톤)이다. */
const CHG_TONE: Record<string, Tone> = {
  '신규': 'danger', '▲ 악화': 'danger',
  '해소': 'success', '▼ 개선': 'success',
  '= 지속': 'muted',
};

const ALL_GRADES_ON: Record<Grade, boolean> = { 정상: true, 주의: true, 경고: true };
const ALL_CHG_ON: Record<ChgKey, boolean> = { up: true, down: true, same: true };

/* ──────────────────────────────
   컬럼 — 모듈 스코프 1회 생성(apfs-aggrid ⑥·⑦: 렌더마다 새 배열이면 폭이 선언값으로 되돌아간다)
────────────────────────────── */
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };

/* 당월≠전월 셀 음영 — 토큰만(`--info-soft`, 라이트/다크 양쪽 정의 — 등급 배지 soft 색(success·warning·danger)과 겹치지 않아 `주의` 배지가 묻히지 않는다). 한 행의 diff 여부는 불변이고
   getRowId 로 노드가 id 에 고정되므로 조건부 background 가 셀 재사용으로 잔존하지 않는다. */
const diffStyle = (p: CellClassParams<NumberedRow>): CellStyle => (
  p.data && isDiff(p.data) ? { ...flexCenter, background: 'var(--info-soft)' } : flexCenter
);

/* 당월/전월 셀 — 운용사명 + 등급 배지. 대상 아님이면 `–`. */
function SideCell({ gp, g }: { gp: string; g: Grade | '' }) {
  if (!g) return <span className="text-muted-foreground">–</span>;
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <span className="min-w-0 truncate">{gp}</span>
      <StatusBadge tone={GRADE_TONE[g]} label={g} size="lg" />
    </span>
  );
}

const txtCol = (field: keyof NumberedRow, header: string, width: number, opts: Partial<ColDef<NumberedRow>> = {}): ColDef<NumberedRow> => ({
  field, headerName: header, width, minWidth: width, cellStyle: flexCenter,
  cellRenderer: (p: any) => <span className="min-w-0 truncate">{p.value}</span>,
  ...opts,
});

const COLUMNS: ColDef<NumberedRow>[] = [
  /* No 는 필터 후 1..N 으로 다시 매긴 값 */
  { field: 'no', headerName: 'No', width: 64, minWidth: 64, pinned: 'left', type: 'rightAligned',
    cellStyle: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } as CellStyle,
    valueFormatter: (p) => (p.value == null ? '' : String(p.value)) },
  txtCol('gu', '구분', 140, { cellStyle: flexMid }),
  txtCol('mf', '모펀드', 140, { cellStyle: flexMid }),
  txtCol('it', '항목', 190, { flex: 1 }),
  /* 등급 = 변동 배지. valueGetter 가 문구를 내서 정렬·엑셀이 텍스트로 동작한다 */
  { colId: 'chg', headerName: '등급', width: 110, minWidth: 110, cellStyle: flexMid,
    valueGetter: (p) => (p.data ? chgLabel(p.data.cur, p.data.prev) : ''),
    cellRenderer: (p: any) => (p.value ? <StatusBadge tone={CHG_TONE[p.value] ?? 'muted'} label={p.value} size="lg" /> : null) },
  { colId: 'cur', headerName: '당월', width: 230, minWidth: 230, flex: 1, cellStyle: diffStyle,
    valueGetter: (p) => (p.data ? sideText(p.data.gp, p.data.cur) : ''),
    cellRenderer: (p: any) => (p.data ? <SideCell gp={p.data.gp} g={p.data.cur} /> : null) },
  { colId: 'prev', headerName: '전월', width: 230, minWidth: 230, flex: 1, cellStyle: diffStyle,
    valueGetter: (p) => (p.data ? sideText(p.data.gp, p.data.prev) : ''),
    cellRenderer: (p: any) => (p.data ? <SideCell gp={p.data.gp} g={p.data.prev} /> : null) },
];

/* ──────────────────────────────
   드로어 프리미티브(골드 로컬 복사 — 공유 export 아님)
────────────────────────────── */
function DrawerField({ label, plain, children }: { label: string; plain?: boolean; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </Wrap>
  );
}

/* 카테고리 토글 행 — generic_list.tsx `DrawerCheckRow` 동형(박스+체크, aria-pressed, 토큰 색) */
function DrawerCheckRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={checked}
      className="flex items-center gap-3 w-full text-left cursor-pointer border-0 py-2 px-0"
      style={{ background: 'transparent', font: 'inherit' }}>
      <span className="inline-flex items-center justify-center shrink-0" style={{
        width: 24, height: 24, borderRadius: 7, transition: 'all .15s var(--ease)',
        background: checked ? 'var(--primary)' : 'var(--card)',
        border: checked ? '1px solid var(--primary)' : '1.5px solid var(--border-strong)' }}>
        {checked && <Icon name="check" size={16} stroke={3} style={{ color: 'var(--primary-foreground)' }} />}
      </span>
      <span className="font-semibold text-foreground" style={{ fontSize: 14 }}>{label}</span>
    </button>
  );
}

const NO_ROWS = '<span style="padding:40px 0;display:inline-block;color:var(--muted-foreground);font-size:13px">조건에 맞는 비교 결과가 없습니다.</span>';
/* 필터가 rowData 자체를 비우므로 `noRowsToShow` 경로가 돈다. `noMatchingRows` 도 형제와 같이 둔다.
   객체 prop이라 모듈 상수(apfs-aggrid ⑦). */
const NO_ROWS_LOCALE = {
  noRowsToShow: '조건에 맞는 비교 결과가 없습니다.',
  noMatchingRows: '조건에 맞는 비교 결과가 없습니다.',
};

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function EwMonthCompare({ onNav }: { onNav?: (r: string) => void }) {

  const [filterOpen, setFilterOpen] = useState(false);
  const [fYm, setFYm] = useState('');   // 기본값 없음 — 미선택 상태로 시작(사용자 결정)
  const [gradeOn, setGradeOn] = useState<Record<Grade, boolean>>(ALL_GRADES_ON);
  const [chgOn, setChgOn] = useState<Record<ChgKey, boolean>>(ALL_CHG_ON);
  const clearFilters = () => { setFYm(''); setGradeOn(ALL_GRADES_ON); setChgOn(ALL_CHG_ON); };

  const gradeAll = GRADES.every((g) => gradeOn[g]);
  const chgAll = CHG_KEYS.every((k) => chgOn[k]);
  const prevYm = prevMonth(fYm);

  /* 필터 + 재번호 — 화면·엑셀 공용 */
  const visible = useMemo(() => visibleRows(ROWS, gradeOn, chgOn), [gradeOn, chgOn]);

  const refresh = () => { clearFilters(); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — 시트 1장 · 단일 헤더. 본문 = 화면과 같은 visible(화면=엑셀 불변식).
     등급/당월/전월은 텍스트(`▲ 악화`·`운용사 등급`·`–`)로 나간다. ── */
  const exportExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet(buildAoa(visible));
    ws['!cols'] = [{ wch: 5 }, { wch: 16 }, { wch: 16 }, { wch: 24 }, { wch: 10 }, { wch: 28 }, { wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '조기경보 전월 비교');
    XLSX.writeFile(wb, `조기경보_전월비교${fYm ? `_${fYm}` : ''}.xlsx`);   // 기준년월 미선택이면 접미사 없이
    toast.success('Excel로 내보냈습니다');
  };

  useHotkey(HOTKEYS.export.combo, () => exportExcel());
  useHotkey(HOTKEYS.print.combo, () => window.print());

  const gradeChipValue = GRADES.filter((g) => gradeOn[g]).join('·') || '등급 선택 안함';
  const chgChipValue = CHG_KEYS.filter((k) => chgOn[k]).map((k) => CHG_KEY_LABEL[k]).join('·') || '변동 선택 안함';

  return (
    <GridFrame
      crumbs={['홈', '조기경보', '조기경보', TITLE]}
      title={TITLE}
      cardTitle={TITLE}
      favRoute={TITLE}
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 적용된 필터 칩(값만) = appliedFilters(둘째 줄). 등급·변동 칩은 **그룹이 전부 on 이 아닐 때만** 하나씩 띄우고,
         값 = 켜진 항목 목록, × = 그 그룹을 전체 on 으로 되돌림(칩을 지웠는데 필터가 좁아지는 역설 방지). */
      appliedFilters={[
        { label: '기준년월', value: fYm, onClear: () => setFYm('') },
        { label: '등급', value: gradeAll ? '' : gradeChipValue, onClear: () => setGradeOn(ALL_GRADES_ON) },
        { label: '변동', value: chgAll ? '' : chgChipValue, onClear: () => setChgOn(ALL_CHG_ON) },
      ]}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      /* 목업 캡션 `총 N건 · 기준 X vs 전월 Y` — 기준년월은 선택했을 때만 앞에 붙인다(골드 푸터 캡션 위치) */
      footerLeft={(
        <span>{(fYm ? `기준 ${String(fYm)} vs 전월 ${String(prevYm)} · ` : '') + '총 ' + String(visible.length) + '건'}</span>
      )}
      footerRight={<FooterActions onExport={exportExcel} />}>

      <div className="apfs-grid-min">
        <AgGridReact<NumberedRow>
          theme={apfsTheme}
          rowData={visible}
          columnDefs={COLUMNS}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          localeText={NO_ROWS_LOCALE}
          overlayNoRowsTemplate={NO_ROWS}
        />
      </div>

      {/* ── 상세필터 드로어 — 목업 검색박스(기준년월) + 범례 토글(등급·변동) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">조기경보 전월 비교 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {/* 기준년월 — 행을 거르지 않는 조회 기준. PeriodPicker 트리거는 w-full 이라 fit-content 래퍼 */}
            <DrawerField label="기준년월" plain>
              <div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}>
                <PeriodPicker mode="month" value={fYm} onChange={(v) => setFYm(v || '')} ariaLabel="기준년월" />
              </div>
            </DrawerField>
            <DrawerField label="등급" plain>
              <div role="group" aria-label="등급">
                {GRADES.map((g) => (
                  <DrawerCheckRow key={g} label={g} checked={gradeOn[g]} onClick={() => setGradeOn((p) => ({ ...p, [g]: !p[g] }))} />
                ))}
              </div>
            </DrawerField>
            <DrawerField label="변동" plain>
              <div role="group" aria-label="변동">
                {CHG_KEYS.map((k) => (
                  <DrawerCheckRow key={k} label={CHG_KEY_LABEL[k]} checked={chgOn[k]} onClick={() => setChgOn((p) => ({ ...p, [k]: !p[k] }))} />
                ))}
              </div>
            </DrawerField>
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
