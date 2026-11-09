/* 마감 취소 확인(ACC-007 14p 검증 6 · E09) — 상세/취소 모달의 [마감 취소]와 목록 선택 바 [마감 취소]가 같이 쓴다.
   - 안내: "[계정구분] YYYY-MM-DD 일마감을 취소하시겠습니까? 취소 후 해당 일자 전표 입력이 다시 허용됩니다." (복수면 기간 + N일)
   - 사유: withReason 이면 이 창에서 입력(E09 — 미입력·200자 초과 시 reasonError 문구 + 포커스), 아니면 상세 모달에서 받은 사유를 그대로 쓴다.
   - [취소 확인] = SaveButton. 닫기는 핸들 close(exit 애니메이션 뒤 onClose). onDone 은 확인으로 닫혔을 때만 true. */
import React from 'react';
import { UI } from '../../components';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '../../ui/alert-dialog';
import type { DialogHandle } from '../../ui/dialog';
import { CANCEL_MSG, reasonError } from './daily_close_model';
import { RemarkInput } from './daily_close_process_modal';
import { SuspenseField as Field } from './suspense_clear_modal';

const { SaveButton } = UI;

export function CancelConfirmDialog({ account, dates, withReason, onConfirm, onClose }: {
  account: string;
  dates: readonly string[];
  /** true = 이 창에서 사유 입력(E09). false = 호출부가 이미 받은 사유 사용 */
  withReason: boolean;
  /** 검증을 통과해 실행할 때 — 사유를 넘긴다 */
  onConfirm: (reason: string) => void;
  /** 닫힘(exit 끝). confirmed = [취소 확인]으로 닫혔는가 */
  onClose: (confirmed: boolean) => void;
}) {
  const ref = React.useRef<DialogHandle>(null);
  const reasonRef = React.useRef<HTMLTextAreaElement>(null);
  const doneRef = React.useRef(false);
  const [reason, setReason] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);
  const sorted = [...dates].sort();
  const target = sorted.length > 1 ? `${sorted[0]} ~ ${sorted[sorted.length - 1]}(${String(sorted.length)}일)` : sorted[0];

  const submit = () => {
    const m = withReason ? reasonError(reason) : null;
    if (m) { setErr(m); reasonRef.current?.focus(); return undefined; }
    return () => { doneRef.current = true; onConfirm(reason); ref.current?.close(); };
  };

  return (
    <AlertDialog ref={ref} open onOpenChange={(o) => { if (!o) onClose(doneRef.current); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>마감 취소 확인</AlertDialogTitle>
          <AlertDialogDescription>{`[${account}] ${CANCEL_MSG.confirm(target)}`}</AlertDialogDescription>
        </AlertDialogHeader>
        {withReason && (
          <div style={{ padding: '0 18px' }}>
            <Field label="마감 취소 사유" required plain errMsg={err ?? undefined}>
              <RemarkInput label="마감 취소 사유" value={reason} onChange={(v) => { setReason(v); setErr(null); }} invalid={!!err} inputRef={reasonRef} />
            </Field>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <SaveButton leadingIcon="" busyLabel="취소 중" style={{ background: 'var(--danger-fill)', color: 'var(--danger-fill-foreground)' }} onSubmit={submit}>취소 확인</SaveButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
