/* 부처보고 > 등록원부 > 등록원부관리 — 원문 S4_108_등록원부_관리(목록 + 팝업 6종).
   데이터·팝업 원문은 brief_data.ts SSOT, 팝업은 registry_ledger_modals.tsx, 표 규약은 risk_grid.tsx, 바깥 양식은 risk_page_kit.tsx.

   목업 → 우리 규약
   - 검색박스 명칭(텍스트, placeholder '조합 명칭 검색') · 비활성원부(제외/포함 라디오, 기본 제외) → 상세필터 드로어.
     둘 다 행으로 **실제로 거른다**: 명칭 부분일치 · 제외면 활성상태 '비활성' 행을 숨긴다.
     ⚠ 그래서 첫 화면은 원문 3행 중 2행이다 — 원문이 3행을 그린 것은 [조회] 가 토스트뿐이라 필터가 적용되지 않았기 때문이다.
       '포함' 으로 바꾸면 3행(테스트가 보증). 원문 [조회] 버튼은 두지 않는다(즉시 반영).
   - 목록바 [출력▾](등록원부 출력 · 등록원부 발급이력 출력) · [등록원부입력] · [등록원부업로드]+검토필요 → 툴바 액션(상세필터 오른쪽).
     출력 트리거는 UI.Button 이 Radix asChild 를 못 받아(forwardRef 없음) 트리거에 Button 스타일을 직접 얹는다.
     원문 [엑셀] → 푸터 내보내기(⌥D). 엑셀에서 '관리'(버튼 묶음) 칸은 뺀다.
   - 행 관리 버튼 3개(수정 · 조합원관리 · 전문인력관리) → 각 팝업. 활성상태 스위치 → 행 state 즉시 전이 + 원문 토스트.
     행 선택 없음(원문도 선택 체크박스가 없다 — 액션은 행 버튼이 가진다).
   - 원문 비활성 행 흐림(`tr.inact`)은 스위치 라벨 '비활성'이 같은 정보를 준다 — 행 전체 투명도는 대비를 깎아 두지 않는다. */
import React, { useCallback, useMemo, useState } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { toast } from './ui/sonner';
import { Switch } from './ui/switch';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import { ReviewMarker } from './review_marker';
import { RiskPage } from './risk_page_kit';
import type { FilterSpec } from './risk_page_kit';
import { ReadGrid } from './risk_grid';
import type { CellRenderers } from './risk_grid';
import { exportTables } from './risk_excel';
import type { Row } from './risk_table_meta';
import { LEDGER_TABLE, INACTIVE_OPTIONS, LEDGER_UPLOAD_NOTE, ledgerRows } from './brief_data';
import { LedgerFormModal, MembersModal, ExpertsModal, LedgerUploadModal, LedgerPrintModal, LedgerIssueHistoryModal } from './registry_ledger_modals';

const { Button } = UI;
const LABEL = '등록원부관리';

type Modal = null
  | { kind: 'ledger'; mode: 'new' | 'edit'; row?: Row }
  | { kind: 'members' | 'experts'; row: Row }
  | { kind: 'upload' | 'print' | 'history' };

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
  const [modal, setModal] = useState<Modal>(null);

  const shown = useMemo(() => ledgerRows(rows, name, inactive), [rows, name, inactive]);
  const reset = () => { setName(''); setInactive(INACTIVE_OPTIONS[0]); };

  const toggle = useCallback((id: string, on: boolean) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, active: on ? '활성' : '비활성' } : r)));
    toast.success(on ? '등록원부를 활성화했습니다 (목업)' : '등록원부를 비활성화했습니다 (목업)');
  }, []);

  /* 참조 안정 필수 — 바뀌면 ReadGrid 컬럼 정의가 다시 만들어진다 */
  const renderers = useMemo<CellRenderers>(() => ({
    mgmt: (r) => (
      <span className="inline-flex gap-1">
        <Button variant="outline" size="sm" onClick={() => setModal({ kind: 'ledger', mode: 'edit', row: r })}>수정</Button>
        <Button variant="outline" size="sm" onClick={() => setModal({ kind: 'members', row: r })}>조합원관리</Button>
        <Button variant="outline" size="sm" onClick={() => setModal({ kind: 'experts', row: r })}>전문인력관리</Button>
      </span>
    ),
    active: (r) => {
      const on = r.active === '활성';
      const id = `ledger-active-${r.id}`;
      return (
        <span className="inline-flex items-center gap-2">
          <Switch id={id} checked={on} onCheckedChange={(c) => toggle(r.id, c)} aria-label={`${masked ? `${String(r.no)}번 행` : String(r.nm)} 활성상태`} />
          <label htmlFor={id} className="cursor-pointer" style={{ fontSize: 13, color: on ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{on ? '활성' : '비활성'}</label>
        </span>
      );
    },
  }), [toggle, masked]);

  const filters: FilterSpec[] = [
    { label: '명칭', kind: 'text', value: name, onChange: setName, placeholder: '조합 명칭 검색' },
    { label: '비활성원부', kind: 'radio', value: inactive, onChange: setInactive, options: INACTIVE_OPTIONS },
  ];
  const exportExcel = () => {
    exportTables(LABEL, [{ name: LABEL, table: LEDGER_TABLE, rows: shown }], null, masked);
    toast.success('Excel로 내보냈습니다');
  };
  const close = () => setModal(null);

  return (
    <RiskPage system="부처보고" group="등록원부" label={LABEL} route={LABEL} onNav={onNav}
      filters={filters} onReset={reset}
      actions={<>
        <OutputMenu onPick={(k) => setModal({ kind: k })} />
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ kind: 'ledger', mode: 'new' })}>등록원부입력</Button>
        <span className="inline-flex items-center gap-1">
          <Button variant="outline" size="sm" leadingIcon="upload" onClick={() => setModal({ kind: 'upload' })}>등록원부업로드</Button>
          <ReviewMarker rec={LEDGER_UPLOAD_NOTE.rec} dat={LEDGER_UPLOAD_NOTE.dat} label="등록원부업로드" />
        </span>
      </>}
      footerLeft={<span>{name ? <><MT>{name}</MT> · </> : ''}비활성원부 {inactive} · 총 {mn(String(shown.length))}건</span>}
      onExport={exportExcel} exportEnabled={!modal}>
      <ReadGrid table={LEDGER_TABLE} rows={shown} ariaLabel={LABEL} cellRenderers={renderers} />
      {modal?.kind === 'ledger' && <LedgerFormModal mode={modal.mode} row={modal.row} onClose={close} />}
      {modal?.kind === 'members' && <MembersModal row={modal.row} onClose={close} />}
      {modal?.kind === 'experts' && <ExpertsModal row={modal.row} onClose={close} />}
      {modal?.kind === 'upload' && <LedgerUploadModal onClose={close} />}
      {modal?.kind === 'print' && <LedgerPrintModal onClose={close} />}
      {modal?.kind === 'history' && <LedgerIssueHistoryModal onClose={close} />}
    </RiskPage>
  );
}
