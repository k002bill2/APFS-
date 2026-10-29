/* 채권채무상계 모달(ACC-005 E04).
   - 조회 전용: 거래처·계정구분·채권/채무 계정과목·채권/채무 발생일·채권/채무 발생전표·상계금액·상계분개(차) 채무과목 / 대) 채권과목)
   - 입력: 정리일(기본 오늘) · 정리자(기본 로그인 사용자) · 정리사유(기본 "채권채무 상계") · 정리적요
   - 저장 검증은 페이지가 저장 시점 원장으로 한다(validate): 'stale' = 모달 닫고 목록 갱신, 그 외 실패 = 모달 유지(정리일 칸 포커스).
   크롬: 46px 패밀리 · 2단. */
import React from 'react';
import { UI } from '../../components';
import { SchemaField } from '../../schemas/renderers';
import type { FieldSpec } from '../../schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { PeriodPicker } from '../../ui/period-picker';
import { CURRENT_USER, PL_EMPLOYEES, todayStr } from './general_journal_data';
import { formatAmount } from './general_journal_model';
import type { SuspenseRow } from './suspense_data';
import { DEFAULT_OFFSET_REASON, remainingOf } from './suspense_model';
import type { OffsetCheck, OffsetInput } from './suspense_model';
import { SuspenseField, dayWrap, focusIn } from './suspense_clear_modal';

const { Button, SaveButton } = UI;

const ro = (label: string): FieldSpec => ({ key: label, label, control: 'readonly' });
const F_CLEARER: FieldSpec = { key: 'clearer', label: '정리자', control: 'select', options: [...PL_EMPLOYEES] };
const F_REASON: FieldSpec = { key: 'reason', label: '정리사유', control: 'text' };
const F_MEMO: FieldSpec = { key: 'memo', label: '정리적요', control: 'text' };

export function SuspenseOffsetModal({ claim, debt, validate, onSave, onStale, onClose }: {
  claim: SuspenseRow;
  debt: SuspenseRow;
  /** 저장 검증 — 페이지가 저장 시점 원장으로 본다(validateOffset) */
  validate: (input: OffsetInput) => OffsetCheck;
  /** 반영(상계전표 생성·토스트) — 검증 통과 후 SaveButton commit 에서 */
  onSave: (input: OffsetInput) => void;
  /** 대상 상태가 바뀜 — 페이지가 안내·목록 갱신, 모달은 닫힌다 */
  onStale: (message: string) => void;
  onClose: () => void;
}) {
  const dlgRef = React.useRef<DialogHandle>(null);
  const dateRef = React.useRef<HTMLDivElement>(null);
  const [date, setDate] = React.useState(todayStr);
  const [clearer, setClearer] = React.useState(CURRENT_USER);
  const [reason, setReason] = React.useState(DEFAULT_OFFSET_REASON);
  const [memo, setMemo] = React.useState('');
  const [err, setErr] = React.useState('');
  const [dateErr, setDateErr] = React.useState(false);   // 정리일 칸 표시는 정리일·마감월 사유일 때만(불일치는 날짜 문제가 아니다)
  const amount = remainingOf(claim);

  const submit = () => {
    const input: OffsetInput = { date, clearer, reason, memo };
    const check = validate(input);
    if (check.ok === false) {
      if (check.code === 'stale') { onStale(check.message); dlgRef.current?.close(); return undefined; }
      setErr(check.message);   // 마감월·불일치·정리일 미입력 = 모달 유지
      const onDate = check.code === 'date' || check.code === 'closed';
      setDateErr(onDate);
      if (onDate) focusIn(dateRef.current);
      return undefined;
    }
    return () => { onSave(input); dlgRef.current?.close(); };
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[760px] max-h-[86vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>채권채무상계</DialogTitle>
          <DialogDescription className="sr-only">같은 거래처의 채권·채무 미결 건을 상계 처리합니다</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          {err && <p role="alert" className="m-0 mb-3.5 text-danger" style={{ fontSize: 12.5 }}>{err}</p>}
          <div className="grid grid-cols-1 min-[769px]:grid-cols-2 gap-x-6">
            <SuspenseField label="거래처"><SchemaField field={ro('거래처')} value={claim.partner} onChange={() => undefined} /></SuspenseField>
            <SuspenseField label="계정구분"><SchemaField field={ro('계정구분')} value={claim.fundAccount} onChange={() => undefined} /></SuspenseField>
            <SuspenseField label="채권 계정과목"><SchemaField field={ro('채권 계정과목')} value={claim.accountName} onChange={() => undefined} /></SuspenseField>
            <SuspenseField label="채무 계정과목"><SchemaField field={ro('채무 계정과목')} value={debt.accountName} onChange={() => undefined} /></SuspenseField>
            <SuspenseField label="채권 발생일"><SchemaField field={ro('채권 발생일')} value={claim.occurDate} onChange={() => undefined} /></SuspenseField>
            <SuspenseField label="채무 발생일"><SchemaField field={ro('채무 발생일')} value={debt.occurDate} onChange={() => undefined} /></SuspenseField>
            <SuspenseField label="채권 발생전표"><SchemaField field={ro('채권 발생전표')} value={claim.occurSlipNo} onChange={() => undefined} /></SuspenseField>
            <SuspenseField label="채무 발생전표"><SchemaField field={ro('채무 발생전표')} value={debt.occurSlipNo} onChange={() => undefined} /></SuspenseField>
            <SuspenseField label="상계금액"><SchemaField field={ro('상계금액')} value={formatAmount(amount)} onChange={() => undefined} /></SuspenseField>
            <SuspenseField label="상계분개" plain>
              <div className="rounded-card-sm border border-border text-muted-foreground" style={{ padding: '7px 12px', fontSize: 13, background: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                <div>차변 {debt.accountName} {formatAmount(amount)}</div>
                <div>대변 {claim.accountName} {formatAmount(amount)}</div>
              </div>
            </SuspenseField>

            <SuspenseField label="정리일" required plain>
              <div ref={dateRef} style={dayWrap}>
                <PeriodPicker mode="day" value={date} onChange={(v) => { setDate(v || ''); setErr(''); setDateErr(false); }} ariaLabel="정리일" required invalid={dateErr} />
              </div>
            </SuspenseField>
            <SuspenseField label="정리자"><SchemaField field={F_CLEARER} value={clearer} onChange={setClearer} /></SuspenseField>
            <SuspenseField label="정리사유"><SchemaField field={F_REASON} value={reason} onChange={setReason} /></SuspenseField>
            <SuspenseField label="정리적요"><SchemaField field={F_MEMO} value={memo} onChange={setMemo} /></SuspenseField>
          </div>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <SaveButton onSubmit={submit}>저장</SaveButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
