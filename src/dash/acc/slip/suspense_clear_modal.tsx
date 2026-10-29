/* 미결계정정리 모달(ACC-005 E02).
   - 조회 전용 7항목: 계정구분·거래처·계정과목·발생일·발생금액·발생적요·발생전표(다건이면 대표값 + "외 N건", 발생일은 범위, 발생금액은 합계)
   - 입력: 정리일(기본 오늘) · 정리금액(기본 미정리잔액 — 단건만 편집, 다건은 각 행 잔액 전액이라 합계 읽기 전용) · 정리사유 ⓘ · 정리자(기본 로그인 사용자)
     · 계좌번호 *(그 계정구분의 운용계좌) · 정리 계정과목 *(조회 전용 — 계좌 선택 시 예금 과목 자동) · 정리적요 ⓘ
   - 저장 검증은 위→아래 첫 미충족 1건만 안내 + 그 칸 포커스(validateClear). 성공 = onSave(페이지가 반영·토스트) 후 exit 애니메이션으로 닫힘.
   크롬: 46px 패밀리(journal_reverse_modal 과 같은 규격) · 항목 > 6 이라 2단. 컨트롤은 SchemaField(34px CONTROL_BOX) 재사용. */
import React from 'react';
import { UI } from '../../components';
import { Icon } from '../../icons';
import { SchemaField, controlMinWidth } from '../../schemas/renderers';
import type { FieldSpec } from '../../schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { PeriodPicker } from '../../ui/period-picker';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../ui/tooltip';
import { CURRENT_USER, FUND_BANK_ACCOUNTS, PL_EMPLOYEES, todayStr } from './general_journal_data';
import { formatAmount, parseAmount } from './general_journal_model';
import { DEPOSIT_ACCOUNT } from './suspense_data';
import type { SuspenseRow } from './suspense_data';
import { clearAccountFor, remainingOf, validateClear } from './suspense_model';
import type { ClearField, ClearInput } from './suspense_model';

const { Button, SaveButton } = UI;

/* RowFormModal `Field` 규격(로컬 복제 — 형제 모달과 동일). plain=<div>(버튼형 컨트롤 2회 발화 방지). tip = 라벨 옆 ⓘ 툴팁 */
export function SuspenseField({ label, children, errMsg, plain, required, tip }: { label: string; children: React.ReactNode; errMsg?: string; plain?: boolean; required?: boolean; tip?: string }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-3.5 min-w-0">
      <span className="font-semibold text-caption flex items-center gap-1" style={{ fontSize: 12, marginBottom: 5 }}>
        {label}{required ? ' *' : ''}
        {tip && <InfoTip label={label} text={tip} />}
      </span>
      {children}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}

/* ⓘ — 라벨 보조 설명(DS Tooltip, 포커스·호버 모두 노출).
   <button> 이 아닌 span 트리거 — <label> 안의 첫 labelable 요소가 되면 라벨이 입력칸 대신 ⓘ 를 가리킨다(HTML label 규칙). */
export function InfoTip({ label, text }: { label: string; text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span role="button" tabIndex={0} aria-label={`${label} 설명`} className="inline-flex items-center cursor-help text-muted-foreground">
          <Icon name="info" size={13} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

/* PeriodPicker 트리거는 w-full — fit-content 래퍼 필수(apfs-datepicker "폭") */
export const dayWrap: React.CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' };

/** 첫 번째 포커스 가능한 컨트롤로 이동(SchemaField 는 ref 를 노출하지 않는다) */
export const focusIn = (el: HTMLElement | null) => el?.querySelector<HTMLElement>('input:not([disabled]),select,button,textarea')?.focus();

const ro = (label: string): FieldSpec => ({ key: label, label, control: 'readonly' });
const F_AMOUNT: FieldSpec = { key: 'amount', label: '정리금액', control: 'text', required: true };
const F_REASON: FieldSpec = { key: 'reason', label: '정리사유', control: 'text' };
const F_CLEARER: FieldSpec = { key: 'clearer', label: '정리자', control: 'select', options: [...PL_EMPLOYEES] };
const F_MEMO: FieldSpec = { key: 'memo', label: '정리적요', control: 'text' };

/** 다건 대표값 — 값이 모두 같으면 그 값, 다르면 "첫 값 외 N건" */
export function repValue(values: readonly string[]): string {
  if (!values.length) return '-';
  return values.every((v) => v === values[0]) ? values[0] : `${values[0]} 외 ${String(values.length - 1)}건`;
}

export function SuspenseClearModal({ targets, onSave, onClose }: {
  targets: SuspenseRow[];
  onSave: (input: ClearInput) => void;
  onClose: () => void;
}) {
  const dlgRef = React.useRef<DialogHandle>(null);
  const single = targets.length === 1;
  const remaining = targets.reduce((s, r) => s + remainingOf(r), 0);
  const first = targets[0];
  const bankOptions = first ? FUND_BANK_ACCOUNTS[first.fundAccount] : [];

  const [date, setDate] = React.useState(todayStr);
  const [amountText, setAmountText] = React.useState(() => formatAmount(remaining));
  const [reason, setReason] = React.useState('');
  const [clearer, setClearer] = React.useState(CURRENT_USER);
  const [bankAccount, setBankAccount] = React.useState('');
  const [memo, setMemo] = React.useState('');
  const [err, setErr] = React.useState<{ field: ClearField; message: string } | null>(null);
  const clearAccountCode = clearAccountFor(bankAccount);

  const refs = {
    date: React.useRef<HTMLDivElement>(null), amount: React.useRef<HTMLDivElement>(null),
    bankAccount: React.useRef<HTMLDivElement>(null), clearAccount: React.useRef<HTMLDivElement>(null),
  };
  const errOf = (f: ClearField) => (err?.field === f ? err.message : undefined);
  const clearErr = (f: ClearField) => setErr((e) => (e?.field === f ? null : e));

  const dates = targets.map((r) => r.occurDate).sort();
  const occurDate = dates.length ? (dates[0] === dates[dates.length - 1] ? dates[0] : `${dates[0]} ~ ${dates[dates.length - 1]}`) : '-';

  const submit = () => {
    const input: ClearInput = { date, amount: single ? parseAmount(amountText) : remaining, reason, clearer, bankAccount, clearAccountCode, memo };
    const check = validateClear(input, remaining);
    if (check.ok === false) {
      setErr({ field: check.field, message: check.message });
      focusIn(refs[check.field].current);
      return undefined;
    }
    return () => { onSave(input); dlgRef.current?.close(); };
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[760px] max-h-[86vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">미결계정정리</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0">{`${String(targets.length)}건`}</DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <div className="grid grid-cols-1 min-[769px]:grid-cols-2 gap-x-6">
            <SuspenseField label="계정구분"><SchemaField field={ro('계정구분')} value={first?.fundAccount ?? '-'} onChange={() => undefined} /></SuspenseField>
            <SuspenseField label="거래처"><SchemaField field={ro('거래처')} value={repValue(targets.map((r) => r.partner))} onChange={() => undefined} /></SuspenseField>
            <SuspenseField label="계정과목"><SchemaField field={ro('계정과목')} value={first?.accountName ?? '-'} onChange={() => undefined} /></SuspenseField>
            <SuspenseField label="발생일"><SchemaField field={ro('발생일')} value={occurDate} onChange={() => undefined} /></SuspenseField>
            <SuspenseField label="발생금액"><SchemaField field={ro('발생금액')} value={formatAmount(targets.reduce((s, r) => s + r.occurAmount, 0))} onChange={() => undefined} /></SuspenseField>
            <SuspenseField label="발생적요"><SchemaField field={ro('발생적요')} value={repValue(targets.map((r) => r.memo))} onChange={() => undefined} /></SuspenseField>
            <SuspenseField label="발생전표"><SchemaField field={ro('발생전표')} value={repValue(targets.map((r) => r.occurSlipNo))} onChange={() => undefined} /></SuspenseField>
            <div aria-hidden />

            <SuspenseField label="정리일" required plain errMsg={errOf('date')}>
              <div ref={refs.date} style={dayWrap}>
                <PeriodPicker mode="day" value={date} onChange={(v) => { setDate(v || ''); clearErr('date'); }} ariaLabel="정리일" required invalid={!!errOf('date')} />
              </div>
            </SuspenseField>
            <SuspenseField label={single ? '정리금액' : '정리금액(합계)'} required errMsg={errOf('amount')} tip={single ? `미정리잔액 ${formatAmount(remaining)}원 이내` : '다건은 각 건의 미정리잔액을 전액 정리합니다'}>
              <div ref={refs.amount}>
                {single
                  ? <SchemaField field={F_AMOUNT} value={amountText} invalid={!!errOf('amount')}
                      onChange={(v) => { setAmountText(formatAmount(parseAmount(v.replace(/[^\d]/g, '')))); clearErr('amount'); }} />
                  : <SchemaField field={ro('정리금액')} value={formatAmount(remaining)} onChange={() => undefined} />}
              </div>
            </SuspenseField>
            <SuspenseField label="정리사유" tip="정리전표의 헤더 적요로 들어갑니다">
              <SchemaField field={F_REASON} value={reason} onChange={setReason} />
            </SuspenseField>
            <SuspenseField label="정리자"><SchemaField field={F_CLEARER} value={clearer} onChange={setClearer} /></SuspenseField>
            <SuspenseField label="계좌번호" required plain errMsg={errOf('bankAccount')}>
              <div ref={refs.bankAccount}>
                <SchemaField field={{ key: 'bank', label: '계좌번호', control: 'select', options: bankOptions, required: true, searchable: true }} value={bankAccount}
                  invalid={!!errOf('bankAccount')} onChange={(v) => { setBankAccount(v); clearErr('bankAccount'); clearErr('clearAccount'); }} />
              </div>
            </SuspenseField>
            <SuspenseField label="정리 계정과목" required errMsg={errOf('clearAccount')}>
              <div ref={refs.clearAccount}>
                <SchemaField field={ro('정리 계정과목')} value={clearAccountCode && DEPOSIT_ACCOUNT ? `${DEPOSIT_ACCOUNT.name} (${DEPOSIT_ACCOUNT.code})` : ''} onChange={() => undefined} />
              </div>
            </SuspenseField>
            <SuspenseField label="정리적요" tip="분개 행 적요로 들어갑니다(비우면 정리사유)">
              <SchemaField field={F_MEMO} value={memo} onChange={setMemo} />
            </SuspenseField>
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
