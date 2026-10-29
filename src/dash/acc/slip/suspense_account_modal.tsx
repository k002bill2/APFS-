/* 계좌번호 변경 모달(ACC-005 E05) — 조회 전용 거래처·관리번호 + 계좌번호 *(같은 거래처 등록 계좌).
   저장 = 검증("계좌번호을(를) 선택하세요.") → onSave(페이지가 계좌정보·예금주 갱신·토스트) → exit 애니메이션으로 닫힘.
   크롬: 46px 패밀리(journal_reverse_modal 규격). */
import React from 'react';
import { UI } from '../../components';
import { SchemaField } from '../../schemas/renderers';
import type { FieldSpec } from '../../schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import type { SuspenseRow } from './suspense_data';
import { partnerAccounts, validateAccountChange } from './suspense_model';
import { SuspenseField, focusIn } from './suspense_clear_modal';

const { Button, SaveButton } = UI;

/* 거래처 등록 계좌가 0개(거래처 없음 '-' 행 등) — select 대신 안내 + 저장 비활성. 게이트(정확히 1건)는 설계서대로 유지 */
const NO_ACCOUNT_MSG = '등록된 거래처 계좌가 없습니다.';
const F_PARTNER: FieldSpec = { key: 'partner', label: '거래처', control: 'readonly' };
const F_MGMT: FieldSpec = { key: 'mgmtNo', label: '관리번호', control: 'readonly' };

export function SuspenseAccountModal({ target, onSave, onClose }: {
  target: SuspenseRow;
  onSave: (accountNo: string) => void;
  onClose: () => void;
}) {
  const dlgRef = React.useRef<DialogHandle>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const options = partnerAccounts(target.custNo).map((a) => a.accountNo);
  /* 현재 계좌가 등록 계좌에 있으면 그것을 기본 선택 */
  const [accountNo, setAccountNo] = React.useState(() => (options.includes(target.bankAccount) ? target.bankAccount : ''));
  const [err, setErr] = React.useState('');

  const submit = () => {
    const check = validateAccountChange(accountNo);
    if (check.ok === false) { setErr(check.message); focusIn(boxRef.current); return undefined; }
    return () => { onSave(accountNo); dlgRef.current?.close(); };
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[460px] max-h-[86vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>계좌번호 변경</DialogTitle>
          <DialogDescription className="sr-only">거래처에 등록된 계좌 중 하나로 계좌정보를 바꿉니다</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <SuspenseField label={F_PARTNER.label}><SchemaField field={F_PARTNER} value={target.partner} onChange={() => undefined} /></SuspenseField>
          <SuspenseField label={F_MGMT.label}><SchemaField field={F_MGMT} value={target.mgmtNo} onChange={() => undefined} /></SuspenseField>
          <SuspenseField label="계좌번호" required plain errMsg={err || undefined}>
            {options.length > 0 ? (
              <div ref={boxRef}>
                <SchemaField field={{ key: 'accountNo', label: '계좌번호', control: 'select', options, required: true, searchable: true }} value={accountNo}
                  invalid={!!err} onChange={(v) => { setAccountNo(v); setErr(''); }} />
              </div>
            ) : (
              <p role="note" className="m-0 text-muted-foreground" style={{ fontSize: 13 }}>{NO_ACCOUNT_MSG}</p>
            )}
          </SuspenseField>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <SaveButton onSubmit={submit} disabled={options.length === 0}>저장</SaveButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
