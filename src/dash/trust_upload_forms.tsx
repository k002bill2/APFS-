/* 수탁보고 > 모태펀드 수탁 — 계좌정보 관리(S3_103) · 입출금 정보관리(S3_105) = 관리형 목록.

   원문 S3_103/S3_105 는 **파일명 드롭존 + [확인] 업로드 폼뿐**이다. 2026-09-23 사용자 결정으로 관리형 목록 화면으로 올렸다:
   - 목록 = 형제 비교조회 화면(S3_104 계좌정보조회 · S3_106 입출금정보조회)의 표 선언·원문 DATA 를 그대로 쓴다(SSOT 공유, 행 복제 없음).
   - 등록·업로드 → 툴바 등록 콤보 버튼 [+ ○○ 등록 | ▾](2026-09-24 사용자 결정): 본 버튼 = 등록, ▾ 메뉴 `○○ 업로드` →
     업로드 모달(파일명 드롭존 + [확인], 원문 토스트 문구 그대로) · 체크박스 선택 → 선택 바 [수정](1건)·[삭제]·[선택 해제] ·
     행 더블클릭/Enter = 수정. 등록/수정 폼은 원문에 없어 목록 컬럼을 옮긴 추정(trust_manage_schemas).
   - KPI 배지 행 미포함(기본값 — 형제 수탁보고 화면과 같다) · 카드뷰·명세 팝업 없음 · 엑셀은 푸터 내보내기(⌥D). */
import React, { useCallback, useState } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import { toast } from './ui/sonner';
import { RiskPage } from './risk_page_kit';
import { ReadGrid } from './risk_grid';
import { exportTables } from './risk_excel';
import type { TableMeta, Row } from './risk_table_meta';
import type { PageSchema } from './schemas/types';
import { UploadModal } from './trust_upload';
import { useRowSelection, SelBar, DeleteDialog, RowEditModal, formFromRow, rowPatch, nextRow } from './trust_manage_kit';
import { ACCOUNT_FORM, CASHFLOW_FORM } from './trust_manage_schemas';
import { ACCOUNT_TABLE, CASHFLOW_TABLE, CASHFLOW_UPLOAD_HINT } from './trust_mother_data';

const { Button } = UI;

interface ManageConfig {
  label: string;
  /** 엔티티명 — 등록/수정/삭제 제목·버튼 라벨(`계좌정보 등록`) */
  entity: string;
  table: TableMeta;
  form: PageSchema;
  idPrefix: string;
  /** 업로드 모달 — 원문 폼 그대로 */
  fileLabel: string;
  hint?: string;
  emptyMsg: string;
  doneMsg: string;
}

/* 등록 콤보 버튼 — [+ ○○ 등록 | ▾]. 본 버튼 = 등록, ▾ = 추가 등록 경로 메뉴(업로드).
   클래스는 UI.Button size="sm" variant="outline" 규격(registry_ledger OutputMenu 선례 — UI.Button 은 Radix asChild 트리거가 될 수 없다) */
const BTN = 'ui-btn ui-outline inline-flex items-center justify-center gap-[7px] cursor-pointer font-[inherit] font-semibold whitespace-nowrap border transition-colors duration-tok-fast ease-ds py-1.5 text-[12.5px] bg-card text-foreground border-border-strong hover:bg-muted';
function RegisterCombo({ entity, onRegister, onUpload }: { entity: string; onRegister: () => void; onUpload: () => void }) {
  return (
    <span className="inline-flex items-stretch">
      <button type="button" className={`${BTN} px-[11px] rounded-l-[9px]`} onClick={onRegister}>
        <Icon name="plus" size={14} stroke={2.2} />{entity} 등록
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={`${entity} 등록 방법 더보기`} className={`${BTN} px-[7px] rounded-r-[9px] -ml-px data-[state=open]:bg-muted`}>
          <Icon name="chevron-down" size={14} stroke={2.2} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onUpload}><Icon name="upload" size={14} stroke={2.2} />{entity} 업로드</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

type Modal = null | { kind: 'create' } | { kind: 'edit'; id: string } | { kind: 'delete' } | { kind: 'upload' };

function ManageListPage({ cfg, onNav }: { cfg: ManageConfig; onNav?: (r: string) => void }) {
  const [rows, setRows] = useState<Row[]>(cfg.table.rows);
  const { apiRef, selIds, onSelect, clear } = useRowSelection();
  const [modal, setModal] = useState<Modal>(null);

  const openEdit = useCallback((r: Row) => setModal({ kind: 'edit', id: r.id }), []);
  const editRow = modal?.kind === 'edit' ? rows.find((r) => r.id === modal.id) : undefined;
  const save = (vals: Record<string, string>) => {
    const patch = rowPatch(cfg.table, vals);
    if (editRow) { setRows((prev) => prev.map((r) => (r.id === editRow.id ? { ...r, ...patch } : r))); return; }
    const { id, no } = nextRow(rows, cfg.idPrefix);
    setRows((prev) => [{ ...patch, id, no }, ...prev]);   // 신규는 선두 — 방금 등록한 행이 바로 보인다
  };
  const remove = () => {
    const ids = new Set(selIds);
    setRows((prev) => prev.filter((r) => !ids.has(r.id)));
    clear();
    setModal(null);
    toast.success('삭제되었습니다 (목업)');
  };
  const exportExcel = () => {
    exportTables(cfg.label, [{ name: cfg.label, table: cfg.table, rows }], null);
    toast.success('Excel로 내보냈습니다');
  };

  const single = selIds.length === 1 ? rows.find((r) => r.id === selIds[0]) : undefined;
  const selActions = SelBar({
    count: selIds.length, onClear: clear, onDelete: () => setModal({ kind: 'delete' }),
    single: single && <Button variant="primary" size="sm" leadingIcon="file" onClick={() => openEdit(single)}>수정</Button>,
  });

  return (
    <RiskPage system="수탁보고" group="모태펀드 수탁" label={cfg.label} route={cfg.label} onNav={onNav}
      onReset={clear} contextActions={selActions}
      actions={<RegisterCombo entity={cfg.entity} onRegister={() => setModal({ kind: 'create' })} onUpload={() => setModal({ kind: 'upload' })} />}
      footerLeft={<span>총 {String(rows.length)}건</span>}
      onExport={exportExcel} exportEnabled={!modal}>
      <ReadGrid table={cfg.table} rows={rows} ariaLabel={cfg.label} selectable onSelect={onSelect} selectedIds={selIds} apiRef={apiRef} onRowOpen={openEdit} />
      {(modal?.kind === 'create' || editRow) && (
        <RowEditModal schema={cfg.form} mode={editRow ? 'edit' : 'create'} title={`${cfg.entity} ${editRow ? '수정' : '등록'}`}
          initial={editRow ? formFromRow(cfg.form, editRow) : undefined} onSave={save} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'delete' && <DeleteDialog title={`${cfg.entity} 삭제`} count={selIds.length} onConfirm={remove} onClose={() => setModal(null)} />}
      {modal?.kind === 'upload' && (
        <UploadModal title={`${cfg.entity} 업로드`} label={cfg.fileLabel} hint={cfg.hint} emptyMsg={cfg.emptyMsg} doneMsg={cfg.doneMsg} onClose={() => setModal(null)} />
      )}
    </RiskPage>
  );
}

const ACCOUNT: ManageConfig = {
  label: '계좌정보 관리', entity: '계좌정보', table: ACCOUNT_TABLE, form: ACCOUNT_FORM, idPrefix: 'acc',
  fileLabel: '계좌정보 파일', emptyMsg: '파일을 선택하세요', doneMsg: '등록되었습니다 (목업)',
};
const CASHFLOW: ManageConfig = {
  label: '입출금 정보관리', entity: '입출금정보', table: CASHFLOW_TABLE, form: CASHFLOW_FORM, idPrefix: 'cf',
  fileLabel: '입출금정보 파일', hint: CASHFLOW_UPLOAD_HINT, emptyMsg: '파일을 먼저 선택하세요', doneMsg: '처리되었습니다 (목업)',
};

/** 계좌정보 관리 — S3_103(업로드) + S3_104 목록 */
export function AccountInfoManage({ onNav }: { onNav?: (r: string) => void }) { return <ManageListPage cfg={ACCOUNT} onNav={onNav} />; }
/** 입출금 정보관리 — S3_105(업로드) + S3_106 목록 */
export function CashflowInfoManage({ onNav }: { onNav?: (r: string) => void }) { return <ManageListPage cfg={CASHFLOW} onNav={onNav} />; }
