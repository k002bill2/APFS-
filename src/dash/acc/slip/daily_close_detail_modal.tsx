/* 일마감 상세/취소 모달(ACC-007 14p · E05) — 캘린더 마감 셀 클릭 / 목록 마감 행 더블클릭.
   - 읽기: 계정구분·회기 기수 · 마감일자·마감상태 · 마감자/마감일시 · 전표 현황
   - 입력: 비고(수정 가능, 200자) · 마감 취소 사유 *([마감 취소] 시에만 필수)
   - [비고 저장] = 검증 1(200자) → 저장(2) — 모달 유지, 변경 이력은 페이지가 남긴다.
   - [마감 취소] = 검증 3(사유 — 미입력·200자 초과) → 4(역순)·5(년마감) — 페이지 validateCancel → 확인 창(6) → [취소 확인] → 페이지 반영(7) 후
     확인 창 exit 가 끝나면 이 모달도 닫는다(두 다이얼로그 exit 가 겹치지 않게 — journal_entry_screen [복원] 순서).
   크롬: 46px 패밀리. */
import React from 'react';
import { UI } from '../../components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { SuspenseField as Field } from './suspense_clear_modal';
import { CLOSE_MSG, dateWithDow, remarkError } from './daily_close_model';
import type { CancelCheck, DayInfo } from './daily_close_model';
import { ReadBox, RemarkInput, statsText } from './daily_close_process_modal';
import { StatusTag } from './daily_close_calendar';
import { CancelConfirmDialog } from './daily_close_cancel_dialog';

const { Button, SaveButton } = UI;

export function DailyCloseDetailModal({ info, account, termLabel, onSaveRemark, validateCancel, onCancel, onClose }: {
  info: DayInfo;
  account: string;
  termLabel: string;
  /** 비고 저장 — 페이지가 원장·이력·토스트 */
  onSaveRemark: (remark: string) => void;
  /** 취소 가능 여부(사유 → 역순 → 년마감) */
  validateCancel: (reason: string) => CancelCheck;
  onCancel: (reason: string) => void;
  onClose: () => void;
}) {
  const dlgRef = React.useRef<DialogHandle>(null);
  const remarkRef = React.useRef<HTMLTextAreaElement>(null);
  const reasonRef = React.useRef<HTMLTextAreaElement>(null);
  const c = info.closing;
  const [remark, setRemark] = React.useState(c?.remark ?? '');
  const [reason, setReason] = React.useState('');
  const [err, setErr] = React.useState<{ field: 'remark' | 'reason' | null; message: string } | null>(null);
  const [confirm, setConfirm] = React.useState(false);

  const saveRemark = () => {
    const m = remarkError(remark);
    if (m) { setErr({ field: 'remark', message: m }); remarkRef.current?.focus(); return undefined; }
    return () => { setErr(null); onSaveRemark(remark); };
  };
  const askCancel = () => {
    const r = validateCancel(reason);
    if (r.ok === false) {
      setErr({ field: r.code === 'reason' ? 'reason' : null, message: r.message });
      if (r.code === 'reason') reasonRef.current?.focus();
      return;
    }
    setErr(null);
    setConfirm(true);
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[720px] max-h-[86vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>일마감 상세/취소</DialogTitle>
          <DialogDescription className="sr-only">마감된 일자의 정보를 보고 비고를 수정하거나 마감을 취소합니다</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          {err && !err.field && <p role="alert" className="m-0 mb-3.5 text-danger" style={{ fontSize: 12.5 }}>{err.message}</p>}
          <div className="grid grid-cols-1 min-[769px]:grid-cols-2 gap-x-6">
            <Field label="계정구분" plain><ReadBox>{account}</ReadBox></Field>
            <Field label="회기 기수" plain><ReadBox>{termLabel}</ReadBox></Field>
            <Field label="마감일자" plain><ReadBox><span className="tabular-nums">{dateWithDow(info.date)}</span></ReadBox></Field>
            <Field label="마감상태" plain><ReadBox><StatusTag status={info.status} /></ReadBox></Field>
          </div>
          <Field label="마감자 / 마감일시" plain><ReadBox><span className="tabular-nums">{c ? `${c.closedBy} · ${c.closedAt}` : '-'}</span></ReadBox></Field>
          <Field label="전표 현황" plain><ReadBox><span className="tabular-nums">{statsText(info)}</span></ReadBox></Field>
          <Field label="비고" plain errMsg={err?.field === 'remark' ? CLOSE_MSG.remark : undefined}>
            <RemarkInput value={remark} onChange={(v) => { setRemark(v); if (err?.field === 'remark') setErr(null); }} invalid={err?.field === 'remark'} inputRef={remarkRef} />
          </Field>
          <Field label="마감 취소 사유" required plain errMsg={err?.field === 'reason' ? err.message : undefined}>
            <RemarkInput label="마감 취소 사유" value={reason} onChange={(v) => { setReason(v); if (err?.field === 'reason') setErr(null); }} invalid={err?.field === 'reason'} inputRef={reasonRef} />
            <span className="block text-caption" style={{ fontSize: 11.5 }}>마감 취소 시 필수</span>
          </Field>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <SaveButton leadingIcon="" onSubmit={saveRemark}>비고 저장</SaveButton>
            <Button variant="outline" size="sm" leadingIcon="x" onClick={askCancel}>마감 취소</Button>
          </div>
        </DialogFooter>
        {confirm && (
          <CancelConfirmDialog account={account} dates={[info.date]} withReason={false}
            onConfirm={() => onCancel(reason)}
            onClose={(done) => { setConfirm(false); if (done) dlgRef.current?.close(); }} />
        )}
      </DialogContent>
    </Dialog>
  );
}
