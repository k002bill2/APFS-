/* 회기 생성 모달(ACC-016 E11 · slide 15) — 계정구분*(회기가 없는 계정구분만) · 기수 "1기" 고정 · 시작일* · 종료일(시작 연도 12-31 자동).
   [생성] = 서버 실행 흉내라 SaveButton(busyLabel "생성 중"). 검증(필수·중복)은 클릭 시점에 모델(createFirstFiscal)로 미리 돌려
   실패면 스피너 없이 필드 에러(빨간 테두리 + 인라인 + 토스트), 통과면 400ms 뒤 onCreate → 닫힘.
   골격 = journal_reverse_modal(46px 인셋 · SchemaField 34px 컨트롤 재사용).
   계정구분 기본값 = 선택 가능한 첫 계정구분(폼 모달 첫 옵션 시드 관용구 — 설계서 '선택하세요' 빈 상태 대신). */
import React from 'react';
import { UI } from '../../components';
import { SchemaField, isPlainWrapControl } from '../../schemas/renderers';
import type { FieldSpec } from '../../schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { toast } from '../../ui/sonner';
import { createFirstFiscal } from './fiscal_rollover_model';
import type { FiscalRow } from './fiscal_rollover_model';

const { Button, SaveButton } = UI;

const F_TERM: FieldSpec = { key: 'term', label: '기수', control: 'readonly' };
const F_START: FieldSpec = { key: 'start', label: '시작일', control: 'date', required: true };
const F_END: FieldSpec = { key: 'end', label: '종료일', control: 'readonly' };

/* RowFormModal `Field` 규격(로컬 복제 — 형제 모달과 동일) */
function Field({ label, children, errMsg, plain, hint }: { label: string; children: React.ReactNode; errMsg?: string; plain?: boolean; hint?: string }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-3.5">
      <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>{label}</span>
      {children}
      {hint && !errMsg && <span className="text-caption block mt-1" style={{ fontSize: 11.5 }}>{hint}</span>}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}

type Err = { account?: string; start?: string };

export function FiscalCreateModal({ rows, accounts, defaultStart, onCreate, onClose }: {
  rows: readonly FiscalRow[];
  /** 선택 가능한 계정구분(회기가 없는 것만) */
  accounts: readonly string[];
  defaultStart: string;
  onCreate: (account: string, startDate: string) => void;
  onClose: () => void;
}) {
  const dlgRef = React.useRef<DialogHandle>(null);
  const [account, setAccount] = React.useState(accounts[0] ?? '');
  const [start, setStart] = React.useState(defaultStart);
  const [err, setErr] = React.useState<Err>({});
  const fAccount: FieldSpec = { key: 'account', label: '계정구분', control: 'select', required: true, options: [...accounts] };
  /* 종료일 = 시작일 연도 말일(시작일 변경 시 재계산, 읽기전용) */
  const end = /^\d{4}/.test(start) ? `${start.slice(0, 4)}-12-31` : '';

  /* E11 생성 — SaveButton 계약: 검증 실패 = undefined, 통과 = commit 함수 */
  const submit = () => {
    const e: Err = {};
    if (!account) e.account = '계정구분을 선택하세요.';
    if (!start) e.start = '시작일을 입력하세요.';
    if (!e.account && !e.start) {
      try { createFirstFiscal(rows, account, start); }
      catch (x) { e.account = (x as Error).message; }
    }
    if (e.account || e.start) { setErr(e); toast.error((e.account || e.start) as string); return; }
    return () => { onCreate(account, start); dlgRef.current?.close(); };
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[460px] max-h-[86vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>회기 생성</DialogTitle>
          <DialogDescription className="sr-only">회기가 없는 계정구분에 최초 1기 회기를 생성합니다</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <Field label="계정구분 *" plain={isPlainWrapControl(fAccount.control)} errMsg={err.account} hint="회기가 없는 계정구분만 선택할 수 있습니다.">
            <SchemaField field={fAccount} value={account} onChange={(v) => { setAccount(v); setErr((x) => ({ ...x, account: undefined })); }} invalid={!!err.account} />
          </Field>
          <Field label={F_TERM.label}>
            <SchemaField field={F_TERM} value="1기" onChange={() => undefined} />
          </Field>
          <Field label={F_START.label + ' *'} plain={isPlainWrapControl(F_START.control)} errMsg={err.start}>
            <SchemaField field={F_START} value={start} onChange={(v) => { setStart(v); if (v) setErr((x) => ({ ...x, start: undefined })); }} invalid={!!err.start} />
          </Field>
          <Field label={F_END.label} hint="시작일 연도의 12-31 자동">
            <SchemaField field={F_END} value={end} onChange={() => undefined} />
          </Field>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>취소</Button>
            <SaveButton leadingIcon="" busyLabel="생성 중" onSubmit={submit}>생성</SaveButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
