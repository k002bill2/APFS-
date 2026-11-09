/* 출자금현황 정보관리(ACC-022) — 「출자등록」·「분배등록」 모달(설계서 slide 12·13 · 이벤트 E04·E05·E07).
   한 컴포넌트가 kind('invest'|'distribute') × mode('create'|'edit')를 맡는다. 2단(max-w-[880px]) · 46px 패밀리 크롬.

   설계서 → 우리 규약
   - 저장 검증 = 모델 validateInvest / validateDistribute(설계서 ③ 순서) → 첫 미충족 항목 빨간 테두리 + 인라인 문구 + 토스트 + 포커스.
   - 금액 = 로컬 AmountInput(우측 정렬·천단위 콤마, CONTROL_BOX 34px 규격 공유). 공용 FIELD_CONTROLS 에 금액 컨트롤이 없어 여기 둔다.
   - 자동 항목(회차·잔액(전·후)·분배합계)은 읽기 전용 표시칸(우측 정렬).
   - 첨부 = 로컬 파일 선택·드롭 영역. FilePond(DocumentsField)는 형식 필터·설계서 오류 문구를 낼 수 없어 쓰지 않는다.
     파일당 20MB · PPT/PDF/XLS/HWP/이미지(checkAttachment) — 위반 파일은 첨부 취소 + 토스트 '20MB 이하 허용 형식만 첨부할 수 있습니다.'
   결정·가정
   - 회차: 등록 = 계정·구분별 최대 + 1(계정 미선택이면 '-'). 수정 = 같은 계정이면 기존 회차 유지, 계정을 바꾸면 새 계정 기준 재채번.
   - 잔액(전): 같은 계정에서 그리드와 같은 순서(compareInAccount — 기준일 → 출자 먼저 → 회차 → id)로 앞선 행 누계, 수정 시 자기 행 제외(contribution_model balanceBefore).
   - 저장 결과 어느 분배든 출자원금잔액이 음수가 되면 막는다(negativeBalanceAfter) — 출자 감액·이동, 뒤 분배를 음수로 만드는 소급 분배.
   - 원천세(C)는 입력칸이 없다(설계서) — 등록 0, 수정 시 기존값 유지(부모가 합친다).
   - 구분 미선택이면 A·B 모두 입력 가능. 구분을 고르면 비활성 항목을 0 으로 — 0 이 아니던 값을 지웠을 때만 안내 토스트.
   ⚠ 백엔드가 없어 저장은 부모의 로컬 행 상태만 바꾼다(첨부는 파일명만 보관). */
import React from 'react';
import { UI } from '../../components';
import { Icon } from '../../icons';
import { SchemaField } from '../../schemas/renderers';
import { CONTROL_BOX, controlFocusStyle } from '../../schemas/renderers';
import type { FieldSpec } from '../../schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { PeriodPicker } from '../../ui/period-picker';
import { toast } from '../../ui/sonner';
import { formatAmount, parseAmount } from '../slip/general_journal_model';
import { dayWrap, focusIn } from '../acc_form_helpers';
import { CONTRIB_ACCOUNTS, DIST_KINDS } from './contribution_data';
import type { ContribAccount, ContribRow, DistKind } from './contribution_data';
import {
  CONTRIB_MSG, ATTACH_ACCEPT, applyDistKind, balanceBefore, checkAttachment, incomeEnabled, needsIncome, needsPrincipal, negativeBalanceAfter, nextSeq, principalEnabled,
  validateDistribute, validateInvest,
} from './contribution_model';
import type { ContribField } from './contribution_model';

const { Button, SaveButton } = UI;

/** 부모가 받는 저장값 — id·원천세(C)는 부모가 채운다 */
export type ContribPatch = Omit<ContribRow, 'id' | 'withholding'>;

const PLACEHOLDER = '선택해 주세요';
const fromSel = (x: string) => (x === PLACEHOLDER ? '' : x);
const toSel = (x: string) => x || PLACEHOLDER;
const F_ACCOUNT: FieldSpec = { key: 'account', label: '계정구분', control: 'select', options: [PLACEHOLDER, ...CONTRIB_ACCOUNTS], required: true };
const F_DIST_KIND: FieldSpec = { key: 'distKind', label: '구분', control: 'select', options: [PLACEHOLDER, ...DIST_KINDS], required: true };
const F_MEMO: FieldSpec = { key: 'memo', label: '비고', control: 'textarea' };
const ro = (label: string): FieldSpec => ({ key: label, label, control: 'readonly' });

/* 라벨 래퍼 — RowFormModal Field 규격 로컬 복제(형제 회계 모달과 동일) */
function Field({ label, required, plain, full, errMsg, boxRef, children }: {
  label: string; required?: boolean; plain?: boolean; full?: boolean; errMsg?: string; boxRef?: React.Ref<HTMLDivElement>; children: React.ReactNode;
}) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className={`block mb-3.5 min-w-0 ${full ? 'sm:col-span-2' : ''}`}>
      <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>{label}{required ? ' *' : ''}</span>
      <div ref={boxRef}>{children}</div>
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}
const unitLabel: React.CSSProperties = { fontSize: 13.5, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' };
const AMOUNT_W: React.CSSProperties = { width: '100%', minWidth: 'min(200px, 100%)', maxWidth: 320 };

/** 금액 입력 — 우측 정렬·천단위 콤마(입력 즉시 정규화). disabled = --muted 배경(구분별 비활성 A/B) */
function AmountInput({ value, onChange, ariaLabel, invalid, required, disabled }: {
  value: number | null; onChange: (n: number | null) => void; ariaLabel: string; invalid?: boolean; required?: boolean; disabled?: boolean;
}) {
  const [focused, setFocused] = React.useState(false);
  const danger = !!invalid || (!!required && !disabled && !value);
  return (
    <input type="text" inputMode="numeric" aria-label={ariaLabel} value={formatAmount(value)} disabled={disabled}
      aria-invalid={invalid || undefined} aria-required={required || undefined}
      onChange={(e) => onChange(parseAmount(e.target.value.replace(/[^\d]/g, '')))}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      className="tabular"
      style={{
        ...AMOUNT_W, ...CONTROL_BOX, textAlign: 'right', borderRadius: 9, border: `1px solid ${danger ? 'var(--danger)' : 'var(--border-strong)'}`,
        background: disabled ? 'var(--muted)' : 'var(--card)', color: disabled ? 'var(--muted-foreground)' : 'var(--foreground)',
        cursor: disabled ? 'not-allowed' : undefined, transition: 'border-color .12s, box-shadow .12s',
        ...controlFocusStyle(focused && !disabled, danger),
      }} />
  );
}
/** 읽기 전용 금액 표시칸 — 우측 정렬 */
function AmountDisplay({ value, label }: { value: number | null; label: string }) {
  return (
    <div role="textbox" aria-readonly="true" aria-label={label} tabIndex={-1} className="tabular"
      style={{ ...AMOUNT_W, ...CONTROL_BOX, textAlign: 'right', borderRadius: 9, border: '1px solid var(--border-strong)', background: 'var(--muted)', color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden' }}>
      {value == null ? '-' : formatAmount(value)}
    </div>
  );
}
const Money = ({ children }: { children: React.ReactNode }) => <div className="flex items-center gap-2">{children}<span style={unitLabel}>원</span></div>;

/* 첨부 — 파일 선택 버튼 + 드래그&드롭. 위반 파일은 버리고 토스트(영역 유지) */
function AttachBox({ files, onChange, label }: { files: string[]; onChange: (f: string[]) => void; label: string }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);
  const add = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const ok: string[] = [];
    let bad = false;
    for (const f of Array.from(list)) { if (checkAttachment(f)) ok.push(f.name); else bad = true; }
    if (bad) toast.error(CONTRIB_MSG.attach);
    if (ok.length) onChange([...files, ...ok.filter((n) => !files.includes(n))]);
  };
  return (
    <div role="group" aria-label={label}>
      <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
        className="flex items-center gap-3 flex-wrap rounded-card-sm"
        style={{ padding: '10px 12px', border: `1px dashed ${over ? 'var(--ring)' : 'var(--border-strong)'}`, background: over ? 'var(--muted)' : 'transparent' }}>
        <Button variant="outline" size="sm" leadingIcon="upload" onClick={() => inputRef.current?.click()}>파일 선택</Button>
        <span className="text-caption" style={{ fontSize: 12 }}>드래그&드롭 · 최대 20MB (PPT/PDF/XLS/HWP/이미지)</span>
        <input ref={inputRef} type="file" multiple accept={ATTACH_ACCEPT} className="sr-only" tabIndex={-1} aria-hidden
          onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      </div>
      {files.length > 0 && (
        <ul className="m-0 mt-2 p-0 flex flex-col gap-1" style={{ listStyle: 'none' }}>
          {files.map((n) => (
            <li key={n} className="flex items-center gap-2" style={{ fontSize: 13 }}>
              <Icon name="file" size={14} />
              <span className="min-w-0 truncate">{n}</span>
              <button type="button" aria-label={`${n} 첨부 삭제`} onClick={() => onChange(files.filter((x) => x !== n))}
                className="inline-flex items-center justify-center border-0 bg-transparent cursor-pointer text-muted-foreground hover:text-foreground" style={{ minWidth: 24, minHeight: 24, padding: 0 }}>
                <Icon name="x" size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type V = {
  account: ContribAccount | ''; date: string; distKind: DistKind | '';
  pay: number | null; principal: number | null; income: number | null; perfFee: number | null; incentive: number | null; lac: number | null;
  memo: string; attachments: string[];
};

export function ContributionFormModal({ kind, mode, initial, rows, onSave, onClose }: {
  kind: 'invest' | 'distribute';
  mode: 'create' | 'edit';
  /** 수정 대상 — 없으면 등록 */
  initial?: ContribRow;
  /** 활성 행 전체(회차·잔액 계산 원천) */
  rows: readonly ContribRow[];
  onSave: (patch: ContribPatch, editId?: string) => void;
  onClose: () => void;
}) {
  const dlgRef = React.useRef<DialogHandle>(null);
  const isInvest = kind === 'invest';
  const rowKind = isInvest ? '출자' : '분배';
  const [v, setV] = React.useState<V>(() => (initial ? {
    account: initial.account, date: initial.date, distKind: initial.distKind,
    pay: initial.invest, principal: initial.principal, income: initial.income, perfFee: initial.perfFee, incentive: initial.incentive, lac: initial.lac,
    memo: initial.memo, attachments: [...initial.attachments],
  } : { account: '', date: '', distKind: '', pay: 0, principal: 0, income: 0, perfFee: 0, incentive: 0, lac: 0, memo: '', attachments: [] }));
  const [err, setErr] = React.useState<{ field: ContribField; message: string } | null>(null);
  const set = <K extends keyof V>(k: K, val: V[K], f?: ContribField) => {
    setV((p) => ({ ...p, [k]: val }));
    if (f) setErr((e) => (e?.field === f ? null : e));
  };
  const errOf = (f: ContribField) => (err?.field === f ? err.message : undefined);
  const refs: Record<ContribField, React.RefObject<HTMLDivElement | null>> = {
    account: React.useRef(null), date: React.useRef(null), pay: React.useRef(null), distKind: React.useRef(null), principal: React.useRef(null), income: React.useRef(null),
  };

  const editId = mode === 'edit' ? initial?.id : undefined;
  const seq = !v.account ? null
    : initial && mode === 'edit' && v.account === initial.account ? initial.seq
      : nextSeq(rows, v.account, rowKind, editId);
  const before = v.account ? balanceBefore(rows, v.account, v.date, rowKind, editId, seq) : 0;
  const after = isInvest ? before + (v.pay ?? 0) : before - (v.principal ?? 0);
  const distSum = (v.principal ?? 0) + (v.income ?? 0) + (v.perfFee ?? 0) + (v.incentive ?? 0);

  /* 구분 변경 — 비활성 항목 0. 0 이 아니던 값을 실제로 지웠을 때만 안내 */
  const changeDistKind = (k: DistKind | '') => {
    const r = applyDistKind(k, { principal: v.principal, income: v.income });
    setV((p) => ({ ...p, distKind: k, principal: r.principal, income: r.income }));
    setErr((e) => (e && (e.field === 'distKind' || e.field === 'principal' || e.field === 'income') ? null : e));
    if (r.cleared) toast(CONTRIB_MSG.kindReset);
  };

  /* E04·E05·E07 저장 */
  const submit = () => {
    const check = isInvest
      ? validateInvest({ account: v.account, date: v.date, pay: v.pay })
      : validateDistribute({ account: v.account, date: v.date, distKind: v.distKind, principal: v.principal, income: v.income }, before);
    if (check.ok === false) {
      setErr({ field: check.field, message: check.message });
      toast.error(check.message);
      focusIn(refs[check.field].current);
      return undefined;
    }
    const dk = v.distKind as DistKind;
    const patch: ContribPatch = isInvest
      ? { account: v.account as ContribAccount, date: v.date, seq, kind: '출자', distKind: '', invest: v.pay ?? 0, principal: 0, income: 0, perfFee: 0, incentive: 0, lac: 0, memo: v.memo, attachments: v.attachments }
      : {
          account: v.account as ContribAccount, date: v.date, seq, kind: '분배', distKind: dk, invest: 0,
          principal: needsPrincipal(dk) ? v.principal ?? 0 : 0, income: needsIncome(dk) ? v.income ?? 0 : 0,
          perfFee: v.perfFee ?? 0, incentive: v.incentive ?? 0, lac: v.lac ?? 0, memo: v.memo, attachments: v.attachments,
        };
    /* 음수 게이트 — 저장 결과 행(부모 save 와 같은 합성)에서 어느 분배든 잔액이 음수가 되면 막는다.
       출자: 수정에서 날짜만 옮겼으면 기준일, 아니면 납입금액. 분배: 수정에서 날짜를 바꾸고 A 를 늘리지 않았으면 기준일, 아니면 A */
    const next: ContribRow[] = editId ? rows.map((r) => (r.id === editId ? { ...r, ...patch } : r)) : [...rows, { ...patch, id: '\uffff', withholding: 0 }];
    if (negativeBalanceAfter(next).length) {
      const dateMoved = !!initial && mode === 'edit' && v.date !== initial.date;
      const field: ContribField = isInvest
        ? (dateMoved && (v.pay ?? 0) >= (initial?.invest ?? 0) ? 'date' : 'pay')
        : (dateMoved && (v.principal ?? 0) <= (initial?.principal ?? 0) ? 'date' : 'principal');
      setErr({ field, message: CONTRIB_MSG.overflow });
      toast.error(CONTRIB_MSG.overflow);
      focusIn(refs[field].current);
      return undefined;
    }
    return () => { onSave(patch, editId); toast.success(CONTRIB_MSG.saved); dlgRef.current?.close(); };
  };

  const title = isInvest ? '출자등록' : '분배등록';
  const dateLabel = isInvest ? '출자일' : '분배일';
  const aOn = principalEnabled(v.distKind), bOn = incomeEnabled(v.distKind);

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">{title}</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0">{mode === 'edit' ? '수정' : '등록'}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
            <Field label="계정구분" required errMsg={errOf('account')} boxRef={refs.account}>
              <SchemaField field={F_ACCOUNT} value={toSel(v.account)} invalid={!!errOf('account')} onChange={(x) => set('account', fromSel(x) as ContribAccount | '', 'account')} />
            </Field>
            <Field label={dateLabel} required plain errMsg={errOf('date')}>
              <div ref={refs.date} style={dayWrap}>
                <PeriodPicker mode="day" value={v.date} onChange={(x) => set('date', x || '', 'date')} ariaLabel={dateLabel} required invalid={!!errOf('date')} />
              </div>
            </Field>
            <Field label="회차">
              <SchemaField field={ro('회차')} value={seq == null ? '' : String(seq)} onChange={() => undefined} />
            </Field>

            {isInvest ? (
              <>
                <Field label="이번회차 납입금액" required errMsg={errOf('pay')} boxRef={refs.pay}>
                  <Money><AmountInput value={v.pay} onChange={(n) => set('pay', n, 'pay')} ariaLabel="이번회차 납입금액" required invalid={!!errOf('pay')} /></Money>
                </Field>
                <Field label="출자원금잔액(전)" plain><Money><AmountDisplay value={v.account ? before : null} label="출자원금잔액(전)" /></Money></Field>
                <Field label="출자원금잔액(후)" plain><Money><AmountDisplay value={v.account ? after : null} label="출자원금잔액(후)" /></Money></Field>
              </>
            ) : (
              <>
                <Field label="구분" required errMsg={errOf('distKind')} boxRef={refs.distKind}>
                  <SchemaField field={F_DIST_KIND} value={toSel(v.distKind)} invalid={!!errOf('distKind')} onChange={(x) => changeDistKind(fromSel(x) as DistKind | '')} />
                </Field>
                <Field label="분배전 출자원금잔액" plain><Money><AmountDisplay value={v.account ? before : null} label="분배전 출자원금잔액" /></Money></Field>
                <Field label="분배원금(A)" required={needsPrincipal(v.distKind)} errMsg={errOf('principal')} boxRef={refs.principal}>
                  <Money><AmountInput value={v.principal} onChange={(n) => set('principal', n, 'principal')} ariaLabel="분배원금(A)" required={needsPrincipal(v.distKind)} disabled={!aOn} invalid={!!errOf('principal')} /></Money>
                </Field>
                <Field label="분배수익(B)" required={needsIncome(v.distKind)} errMsg={errOf('income')} boxRef={refs.income}>
                  <Money><AmountInput value={v.income} onChange={(n) => set('income', n, 'income')} ariaLabel="분배수익(B)" required={needsIncome(v.distKind)} disabled={!bOn} invalid={!!errOf('income')} /></Money>
                </Field>
                <Field label="성과보수(D)"><Money><AmountInput value={v.perfFee} onChange={(n) => set('perfFee', n)} ariaLabel="성과보수(D)" /></Money></Field>
                <Field label="초과인센티브(E)"><Money><AmountInput value={v.incentive} onChange={(n) => set('incentive', n)} ariaLabel="초과인센티브(E)" /></Money></Field>
                <Field label="LAC"><Money><AmountInput value={v.lac} onChange={(n) => set('lac', n)} ariaLabel="LAC" /></Money></Field>
                <Field label="분배합계(A+B+D+E)" plain><Money><AmountDisplay value={distSum} label="분배합계(A+B+D+E)" /></Money></Field>
                <Field label="분배후 출자원금잔액" plain><Money><AmountDisplay value={v.account ? after : null} label="분배후 출자원금잔액" /></Money></Field>
              </>
            )}

            <Field label="비고" full>
              <SchemaField field={F_MEMO} value={v.memo} onChange={(x) => set('memo', x)} />
            </Field>
            <Field label="첨부파일" plain full>
              <AttachBox files={v.attachments} onChange={(f) => set('attachments', f)} label="첨부파일" />
            </Field>
          </div>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <SaveButton onSubmit={submit} />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
