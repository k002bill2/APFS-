/* 일마감 처리 모달(ACC-007 13p · E04) — 캘린더 미마감·진행중 셀 클릭 / 목록 미마감·진행중 행 더블클릭.
   - 읽기 7항목: 계정구분 * · 회기 기수 * · 마감일자 * · 영업일 구분 · 직전 일자 마감 · 전표 현황 · 마감 전 점검(자동 판정 ☑/☒)
   - 입력: 비고(200자 — maxLength 로 자르지 않고 저장 시 검증해 "200자 이내" 안내)
   - [마감 처리] = 점검 미통과면 disabled. 저장 검증은 페이지가 저장 시점 원장으로 한다(validate — 13p 표 0~8 순서):
     then 'close' = 토스트 + 모달 닫힘(이미 마감 = 재조회) · 'stay' = 모달 유지 · 'remark' = 비고 칸 포커스.
   크롬: 46px 패밀리(형제 모달 suspense_* 와 같은 규격). */
import React from 'react';
import { SquareCheck, SquareX } from 'lucide-react';
import { UI } from '../../components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { SuspenseField as Field } from './suspense_clear_modal';
import { CLOSE_MSG, REMARK_MAX, checksPass, dateWithDayKind, dateWithDow } from './daily_close_model';
import type { CloseCheck, CloseChecks, DayInfo } from './daily_close_model';

const { Button, SaveButton } = UI;

/** 표시 전용 값 상자(SchemaField readonly 와 같은 룩) */
export function ReadBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card-sm border border-border" style={{ padding: '7px 12px', fontSize: 13.5, background: 'var(--muted)', minHeight: 34, boxSizing: 'border-box', overflowWrap: 'anywhere' }}>{children}</div>
  );
}

/** 비고 textarea + 글자 수 — 200자 초과도 입력은 받고 검증에서 막는다 */
export function RemarkInput({ value, onChange, invalid, inputRef, label = '비고' }: { value: string; onChange: (v: string) => void; invalid?: boolean; inputRef?: React.Ref<HTMLTextAreaElement>; label?: string }) {
  const over = value.length > REMARK_MAX;
  return (
    <>
      <textarea ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} rows={3} aria-label={label} aria-invalid={invalid || undefined}
        className="w-full rounded-card-sm"
        style={{ boxSizing: 'border-box', padding: '7px 12px', fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', background: 'var(--card)', color: 'var(--foreground)', border: `1px solid ${invalid ? 'var(--danger)' : 'var(--border-strong)'}` }} />
      <span className="block tabular-nums" style={{ fontSize: 11.5, marginTop: 3, textAlign: 'right', color: over ? 'var(--danger-text)' : 'var(--caption)' }}>{value.length} / {REMARK_MAX}</span>
    </>
  );
}

const statsText = (d: DayInfo) => `승인 ${String(d.approved)}건 · 미승인 ${String(d.unapproved)}건 · 삭제 ${String(d.deleted)}건 (선택 계정구분 기준)`;
export { statsText };

function CheckItem({ pass, label }: { pass: boolean; label: string }) {
  const I = pass ? SquareCheck : SquareX;
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color: pass ? 'var(--success-text)' : 'var(--danger-text)', fontWeight: pass ? 500 : 700 }}>
      <I size={16} strokeWidth={2.2} aria-hidden />{label}<span className="sr-only">{pass ? ' 통과' : ' 미통과'}</span>
    </span>
  );
}

export function DailyCloseProcessModal({ info, account, termLabel, checks, validate, onSave, onAbort, onClose }: {
  info: DayInfo;
  account: string;
  termLabel: string;
  checks: CloseChecks;
  validate: (remark: string) => CloseCheck;
  onSave: (remark: string) => void;
  /** then 'close' 검증 실패 — 페이지가 토스트(+재조회), 모달은 닫힌다 */
  onAbort: (check: Extract<CloseCheck, { ok: false }>) => void;
  onClose: () => void;
}) {
  const dlgRef = React.useRef<DialogHandle>(null);
  const remarkRef = React.useRef<HTMLTextAreaElement>(null);
  const [remark, setRemark] = React.useState('');
  const [err, setErr] = React.useState('');
  const [remarkErr, setRemarkErr] = React.useState(false);
  const pass = checksPass(checks);
  const fails = [
    !checks.prevClosed && CLOSE_MSG.prev(checks.prevDate),
    !checks.noUnapproved && CLOSE_MSG.unapproved(info.unapproved),
    !checks.balanced && CLOSE_MSG.imbalance,
  ].filter(Boolean) as string[];

  const submit = () => {
    const c = validate(remark);
    if (c.ok === false) {
      if (c.then === 'close') { onAbort(c); dlgRef.current?.close(); return undefined; }
      setErr(c.message);
      setRemarkErr(c.then === 'remark');
      if (c.then === 'remark') remarkRef.current?.focus();
      return undefined;
    }
    return () => { onSave(remark); dlgRef.current?.close(); };
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[720px] max-h-[86vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>일마감 처리</DialogTitle>
          <DialogDescription className="sr-only">선택한 일자의 마감 전 점검을 확인하고 마감 처리합니다</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          {err && <p role="alert" className="m-0 mb-3.5 text-danger" style={{ fontSize: 12.5 }}>{err}</p>}
          <div className="grid grid-cols-1 min-[769px]:grid-cols-2 gap-x-6">
            <Field label="계정구분" required plain><ReadBox>{account}</ReadBox></Field>
            <Field label="회기 기수" required plain><ReadBox>{termLabel}</ReadBox></Field>
            <Field label="마감일자" required plain><ReadBox><span className="tabular-nums">{dateWithDow(info.date)}</span></ReadBox></Field>
            <Field label="영업일 구분" plain><ReadBox>{info.holiday ? (info.holidayName === '휴일' ? '휴일' : `휴일(${info.holidayName})`) : '영업일'}</ReadBox></Field>
          </div>
          <Field label="직전 일자 마감" plain>
            <ReadBox>
              <span className="tabular-nums">{dateWithDayKind(checks.prevDate)}</span>{' '}
              <span style={{ color: checks.prevClosed ? 'var(--success-text)' : 'var(--danger-text)', fontWeight: 700 }}>{checks.prevClosed ? '마감' : '미마감'}</span>
              <span className="text-caption"> (동일 계정구분)</span>
            </ReadBox>
          </Field>
          <Field label="전표 현황" plain><ReadBox><span className="tabular-nums">{statsText(info)}</span></ReadBox></Field>
          <Field label="마감 전 점검" plain>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5" style={{ fontSize: 13.5, padding: '4px 0' }}>
              <CheckItem pass={checks.prevClosed} label="직전 일자 마감 완료" />
              <CheckItem pass={checks.noUnapproved} label="미승인 전표 없음" />
              <CheckItem pass={checks.balanced} label="전표 차대 일치" />
            </div>
            {fails.length > 0 && (
              <ul className="m-0 mt-1.5 pl-4" style={{ fontSize: 12.5, color: 'var(--danger-text)' }}>
                {fails.map((m) => <li key={m}>{m}</li>)}
              </ul>
            )}
          </Field>
          <Field label="비고" plain errMsg={remarkErr ? CLOSE_MSG.remark : undefined}>
            <RemarkInput value={remark} onChange={(v) => { setRemark(v); setRemarkErr(false); setErr(''); }} invalid={remarkErr} inputRef={remarkRef} />
          </Field>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>취소</Button>
            <SaveButton leadingIcon="check" busyLabel="마감 중" disabled={!pass} onSubmit={submit}>마감 처리</SaveButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
