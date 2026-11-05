/* 계정과목 설정 모달(ACC-018 E03 · slide 12·17) — 자산유형 5행 × 차변/대변(계정코드 표시 · 계정과목 [검색]) 2단 헤더 표.
   - 계정코드는 직접 입력하지 않는다 — [검색] → 계정과목 검색 팝업(ACC-001 공통, 입력 계정만 선택)에서 고르면 코드·과목이 같이 채워진다.
     검색 원천 = 공용 계정과목 + 이 화면 매핑 계정(depreciation_data DEPR_ACCOUNTS — slide 12 코드가 공용 목록에 없어서).
   - [저장](SaveButton): 위→아래·좌→우 첫 미충족 1건 → 그 칸 빨간 테두리 + 인라인 문구 + 토스트 + 그 칸 [검색]에 초점.
     기본값이 전부 채워져 있고 검색은 값을 바꾸기만 해서 미선택 상태는 화면에서 나오지 않는다(검증은 모델에 남김 — daily_close 선례).
   - 닫기(X·Esc·[닫기])는 requestClose 한 곳 — 바뀐 값이 있으면 "저장하지 않고 닫으시겠습니까?" 확인(journal_entry_screen 관용구).
   - 크롬: 46px 패밀리(헤더·본문·푸터 px-[46px]). */
import React, { useMemo, useRef, useState } from 'react';
import { UI } from '../../components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '../../ui/alert-dialog';
import { toast } from '../../ui/sonner';
import { AccountSearchModal } from '../account_search_modal';
import { ACCOUNTS } from '../account_data';
import type { AccountItem } from '../account_data';
import { DEPR_ACCOUNTS } from './depreciation_data';
import type { AcctMapping } from './depreciation_data';
import { MSG, mappingSnapshot, validateMapping } from './depreciation_model';
import type { MappingError, MappingSide } from './depreciation_model';

const { Button, IconBtn, SaveButton } = UI;

/* 검색 원천 — 공용 + 매핑 계정(코드 중복 제거, 코드 오름차순은 팝업이 정렬) */
const SEARCH_LIST: readonly AccountItem[] = [...ACCOUNTS, ...DEPR_ACCOUNTS.filter((d) => !ACCOUNTS.some((a) => a.code === d.code))];
const inputOnly = (a: AccountItem) => a.inputYn === 'Y';
const SIDE_LABEL: Record<MappingSide, string> = { debit: '차변', credit: '대변' };

const th: React.CSSProperties = { padding: '8px 10px', fontSize: 13, fontWeight: 600, textAlign: 'left', background: 'var(--grid-header)', borderBottom: '1px solid var(--border)', color: 'var(--foreground)' };
const td: React.CSSProperties = { padding: '6px 10px', fontSize: 13.5, borderBottom: '1px solid var(--border)', verticalAlign: 'middle' };
const groupTh: React.CSSProperties = { ...th, borderLeft: '1px solid var(--border)' };

export function DepreciationAccountModal({ initial, onSave, onClose }: {
  initial: readonly AcctMapping[];
  onSave: (rows: AcctMapping[]) => void;
  onClose: () => void;
}) {
  const dlgRef = useRef<DialogHandle>(null);
  const [rows, setRows] = useState<AcctMapping[]>(() => initial.map((r) => ({ ...r })));
  const baseline = useMemo(() => mappingSnapshot(initial), [initial]);
  const dirty = mappingSnapshot(rows) !== baseline;
  const [err, setErr] = useState<MappingError | null>(null);
  const [search, setSearch] = useState<{ index: number; side: MappingSide } | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const cellKey = (i: number, s: MappingSide) => `${String(i)}-${s}`;

  const requestClose = () => { if (dirty) setConfirmClose(true); else dlgRef.current?.close(); };

  const pick = (a: AccountItem) => {
    if (!search) return;
    const { index, side } = search;
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, [side]: { code: a.code, name: a.name } } : r)));
    if (err && err.index === index && err.side === side) setErr(null);
  };

  /* 저장 — SaveButton 계약: 검증 실패 = undefined(스피너 없음), 통과 = commit */
  const save = () => {
    const e = validateMapping(rows);
    if (e) {
      setErr(e);
      toast.error(e.msg);
      tableRef.current?.querySelector<HTMLButtonElement>(`[data-cell="${cellKey(e.index, e.side)}"] button`)?.focus();
      return undefined;
    }
    const snapshot = rows;
    return () => {
      onSave(snapshot);
      toast.success(MSG.saved);
      dlgRef.current?.close();
    };
  };

  const acctCell = (r: AcctMapping, i: number, side: MappingSide) => {
    const v = r[side];
    const bad = err?.index === i && err.side === side;
    return (
      <>
        <td style={{ ...td, borderLeft: '1px solid var(--border)' }} className="tabular-nums">{v.code || <span className="text-caption">–</span>}</td>
        <td data-cell={cellKey(i, side)} style={{ ...td, borderLeft: '1px solid var(--border)', boxShadow: bad ? 'inset 0 0 0 2px var(--danger)' : undefined }}>
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="min-w-0 flex-1 truncate">{v.name || <span className="text-caption">미선택</span>}</span>
            <Button variant="outline" size="sm" onClick={() => setSearch({ index: i, side })}>
              검색<span className="sr-only"> {r.assetType} {SIDE_LABEL[side]} 계정과목</span>
            </Button>
          </span>
        </td>
      </>
    );
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent hideClose className="max-w-[860px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}
        /* 첫 초점 = 다이얼로그 컨테이너 — Radix 기본(첫 tabbable)이면 머리말 닫기 IconBtn 툴팁이 뜨고 첫 Esc 를 가져간다(journal_entry_screen 실측 관용구) */
        onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement | null)?.focus(); }}
        onEscapeKeyDown={(e) => { e.preventDefault(); if (!confirmClose && !search) requestClose(); }}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>계정과목 설정</DialogTitle>
          <DialogDescription className="sr-only">자산유형별 감가상각 차변·대변 계정과목을 지정합니다</DialogDescription>
          <IconBtn icon="x" label="닫기" size={34} onClick={requestClose} />
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          <table ref={tableRef} className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'fixed', border: '1px solid var(--border)' }}>
            <colgroup>
              <col style={{ width: 110 }} /><col style={{ width: 96 }} /><col /><col style={{ width: 96 }} /><col />
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2} scope="col" style={th}>자산유형</th>
                <th colSpan={2} scope="colgroup" style={groupTh}>차변</th>
                <th colSpan={2} scope="colgroup" style={groupTh}>대변</th>
              </tr>
              <tr>
                <th scope="col" style={groupTh}>계정코드</th><th scope="col" style={groupTh}>계정과목 *</th>
                <th scope="col" style={groupTh}>계정코드</th><th scope="col" style={groupTh}>계정과목 *</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.assetType}>
                  <th scope="row" style={{ ...td, fontWeight: 600, textAlign: 'left' }}>{r.assetType}</th>
                  {acctCell(r, i, 'debit')}
                  {acctCell(r, i, 'credit')}
                </tr>
              ))}
            </tbody>
          </table>
          {err && <p role="alert" className="text-danger m-0 mt-2" style={{ fontSize: 12.5 }}>{`${rows[err.index].assetType} — ${err.msg}`}</p>}
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={requestClose}>닫기</Button>
            <SaveButton size="md" onSubmit={save} />
          </div>
        </DialogFooter>

        <AccountSearchModal
          open={search !== null}
          onOpenChange={(o) => { if (!o) setSearch(null); }}
          list={SEARCH_LIST}
          selectable={inputOnly}
          initialSelected={search ? rows[search.index][search.side].code : undefined}
          onSelect={pick}
        />

        {/* 입력 중 닫기 확인(journal_entry_screen 동형) — [닫기]는 확인창을 내린 뒤 handle.close() 로 exit 애니메이션을 지킨다 */}
        <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>닫기 확인</AlertDialogTitle>
              <AlertDialogDescription>저장하지 않고 닫으시겠습니까?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <Button variant="primary" size="sm" onClick={() => { setConfirmClose(false); dlgRef.current?.close(); }}>닫기</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
