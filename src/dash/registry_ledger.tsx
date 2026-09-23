/* 부처보고 > 등록원부 > 등록원부관리 — 원문 S4_108_등록원부_관리(목록 + 팝업 6종).
   데이터·팝업 원문은 brief_data.ts SSOT, 팝업은 registry_ledger_modals.tsx, 표 규약은 risk_grid.tsx, 바깥 양식은 risk_page_kit.tsx.

   목업 → 우리 규약
   - 검색박스 명칭(텍스트, placeholder '조합 명칭 검색') · 비활성원부(제외/포함 라디오, 기본 제외) → 상세필터 드로어.
     사용자가 조건을 바꾸면 그때부터 행으로 **실제로 거른다**: 명칭 부분일치 · 제외면 활성상태 '비활성' 행을 숨긴다.
     ⚠ 첫 화면은 원문처럼 3행 전부다 — 원문 [조회] 가 토스트뿐이라 기본 '제외'가 적용되지 않은 채 3행을 그린다.
       그래서 라디오 기본값은 '제외'로 두되 조건 변경 전(applied=false)에는 거르지 않는다(ledgerShown, 테스트가 보증).
       초기화·새로고침(onReset)은 이 첫 화면 상태로 되돌린다. 원문 [조회] 버튼은 두지 않는다(변경 즉시 반영).
       푸터의 조건 표기(명칭·비활성원부)도 적용 중일 때만 붙인다 — 미적용인데 '제외'라 쓰면 비활성 행과 모순된다.
   - 목록바 [출력▾](등록원부 출력 · 등록원부 발급이력 출력) · [등록원부입력] · [등록원부업로드]+검토필요 → 툴바 액션(상세필터 오른쪽).
     출력 트리거는 UI.Button 이 Radix asChild 를 못 받아(forwardRef 없음) 트리거에 Button 스타일을 직접 얹는다.
     원문 [엑셀] → 푸터 내보내기(⌥D).
   - 원문 행 관리 버튼 3개·활성상태 스위치는 **행 안에 옮기지 않는다**(2026-09-23 사용자 결정 — 관리형 선택 바 규약,
     원문 배치를 따르지 않는다). 체크박스 선택 → 선택 바:
       [수정]·[조합원관리]·[전문인력관리] = 1건일 때만(한 조합에만 뜻이 있는 팝업) ·
       [활성화]/[비활성화] = N건(선택에 해당 상태 행이 있을 때만 노출 — #244 해제등록 게이팅 동형, 원문 토스트 문구) ·
       [삭제] · [선택 해제]. 행 더블클릭/Enter = 수정. 활성상태 칸은 표시 전용 배지(셀 클릭으로 상태를 바꾸지 않는다).
     삭제는 원문에 없다 — 관리형 선택 바 공통 구성(형제 4화면 통일)으로 둔다.
   - 원문 비활성 행 흐림(`tr.inact`)은 활성상태 배지가 같은 정보를 준다 — 행 전체 투명도는 대비를 깎아 두지 않는다. */
import React, { useCallback, useMemo, useState } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { toast } from './ui/sonner';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import { ReviewMarker } from './review_marker';
import { RiskPage } from './risk_page_kit';
import type { FilterSpec } from './risk_page_kit';
import { ReadGrid } from './risk_grid';
import { exportTables } from './risk_excel';
import type { Row } from './risk_table_meta';
import { LEDGER_TABLE, INACTIVE_OPTIONS, LEDGER_UPLOAD_NOTE, ledgerShown } from './brief_data';
import { useRowSelection, SelBar, DeleteDialog } from './trust_manage_kit';
import { LedgerFormModal, MembersModal, ExpertsModal, LedgerUploadModal, LedgerPrintModal, LedgerIssueHistoryModal } from './registry_ledger_modals';

const { Button } = UI;
const LABEL = '등록원부관리';

type Modal = null
  | { kind: 'ledger'; mode: 'new' | 'edit'; row?: Row }
  | { kind: 'members' | 'experts'; row: Row }
  | { kind: 'upload' | 'print' | 'history' | 'delete' };

/* 출력 드롭다운 — 트리거 className 은 UI.Button size="sm" variant="outline" 과 같은 규격(investment_review_manage ResultMenu 선례) */
function OutputMenu({ onPick }: { onPick: (k: 'print' | 'history') => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="ui-btn ui-outline inline-flex items-center justify-center gap-[7px] cursor-pointer font-[inherit] font-semibold rounded-[9px] whitespace-nowrap border transition-colors duration-tok-fast ease-ds px-[11px] py-1.5 text-[12.5px] bg-card text-foreground border-border-strong data-[state=open]:bg-muted">
        <Icon name="printer" size={14} stroke={2.2} />
        출력
        <Icon name="chevron-down" size={14} stroke={2.2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onPick('print')}>등록원부 출력</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onPick('history')}>등록원부 발급이력 출력</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RegistryLedgerManage({ onNav }: { onNav?: (r: string) => void }) {
  const masked = useMask();
  const [rows, setRows] = useState<Row[]>(LEDGER_TABLE.rows);
  const [name, setName] = useState('');
  const [inactive, setInactive] = useState<string>(INACTIVE_OPTIONS[0]);
  /* 검색조건 적용 여부 — 첫 화면은 미적용(원문 3행), 조건을 바꾸면 적용 */
  const [applied, setApplied] = useState(false);
  const [modal, setModal] = useState<Modal>(null);

  const shown = useMemo(() => ledgerShown(rows, name, inactive, applied), [rows, name, inactive, applied]);
  const reset = () => { setName(''); setInactive(INACTIVE_OPTIONS[0]); setApplied(false); };
  const changeName = (v: string) => { setName(v); setApplied(true); };
  const changeInactive = (v: string) => { setInactive(v); setApplied(true); };

  const { apiRef, selIds, onSelect, clear } = useRowSelection();
  const sel = useMemo(() => rows.filter((r) => selIds.includes(r.id)), [rows, selIds]);
  const single = sel.length === 1 ? sel[0] : undefined;

  /* 활성/비활성 전이 — 선택 N건 중 상태가 바뀌는 행만(원문 토스트 문구) */
  const setActive = (on: boolean) => {
    const ids = new Set(sel.filter((r) => (r.active === '활성') !== on).map((r) => r.id));
    setRows((prev) => prev.map((r) => (ids.has(r.id) ? { ...r, active: on ? '활성' : '비활성' } : r)));
    toast.success(on ? '등록원부를 활성화했습니다 (목업)' : '등록원부를 비활성화했습니다 (목업)');
  };
  const remove = () => {
    const ids = new Set(selIds);
    setRows((prev) => prev.filter((r) => !ids.has(r.id)));
    clear();
    setModal(null);
    toast.success('삭제되었습니다 (목업)');
  };
  /* 행 더블클릭·Enter = 수정(참조 안정: ReadGrid onRowOpen 계약) */
  const openEdit = useCallback((r: Row) => setModal({ kind: 'ledger', mode: 'edit', row: r }), []);

  const selActions = SelBar({
    count: sel.length, onClear: clear, onDelete: () => setModal({ kind: 'delete' }),
    single: single && <>
      <Button variant="primary" size="sm" leadingIcon="file" onClick={() => openEdit(single)}>수정</Button>
      <Button variant="outline" size="sm" onClick={() => setModal({ kind: 'members', row: single })}>조합원관리</Button>
      <Button variant="outline" size="sm" onClick={() => setModal({ kind: 'experts', row: single })}>전문인력관리</Button>
    </>,
    bulk: <>
      {sel.some((r) => r.active !== '활성') && <Button variant="outline" size="sm" leadingIcon="check" onClick={() => setActive(true)}>활성화</Button>}
      {sel.some((r) => r.active === '활성') && <Button variant="outline" size="sm" onClick={() => setActive(false)}>비활성화</Button>}
    </>,
  });

  const filters: FilterSpec[] = [
    { label: '명칭', kind: 'text', value: name, onChange: changeName, placeholder: '조합 명칭 검색' },
    { label: '비활성원부', kind: 'radio', value: inactive, onChange: changeInactive, options: INACTIVE_OPTIONS, chip: applied },
  ];
  const exportExcel = () => {
    exportTables(LABEL, [{ name: LABEL, table: LEDGER_TABLE, rows: shown }], null, masked);
    toast.success('Excel로 내보냈습니다');
  };
  const close = () => setModal(null);

  return (
    <RiskPage system="부처보고" group="등록원부" label={LABEL} route={LABEL} onNav={onNav}
      filters={filters} onReset={reset} contextActions={selActions}
      actions={<>
        <OutputMenu onPick={(k) => setModal({ kind: k })} />
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ kind: 'ledger', mode: 'new' })}>등록원부입력</Button>
        <span className="inline-flex items-center gap-1">
          <Button variant="outline" size="sm" leadingIcon="upload" onClick={() => setModal({ kind: 'upload' })}>등록원부업로드</Button>
          <ReviewMarker rec={LEDGER_UPLOAD_NOTE.rec} dat={LEDGER_UPLOAD_NOTE.dat} label="등록원부업로드" />
        </span>
      </>}
      footerLeft={<span>{applied && <>{name ? <><MT>{name}</MT> · </> : ''}비활성원부 {inactive} · </>}총 {mn(String(shown.length))}건</span>}
      onExport={exportExcel} exportEnabled={!modal}>
      <ReadGrid table={LEDGER_TABLE} rows={shown} ariaLabel={LABEL} selectable onSelect={onSelect} apiRef={apiRef} onRowOpen={openEdit} />
      {modal?.kind === 'delete' && <DeleteDialog title="등록원부 삭제" count={sel.length} onConfirm={remove} onClose={() => setModal(null)} />}
      {modal?.kind === 'ledger' && <LedgerFormModal mode={modal.mode} row={modal.row} onClose={close} />}
      {modal?.kind === 'members' && <MembersModal row={modal.row} onClose={close} />}
      {modal?.kind === 'experts' && <ExpertsModal row={modal.row} onClose={close} />}
      {modal?.kind === 'upload' && <LedgerUploadModal onClose={close} />}
      {modal?.kind === 'print' && <LedgerPrintModal onClose={close} />}
      {modal?.kind === 'history' && <LedgerIssueHistoryModal onClose={close} />}
    </RiskPage>
  );
}
