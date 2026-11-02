/* 기간 일괄 마감 모달(ACC-007 15p · E06) — 툴바 [기간 일괄 마감].
   - 읽기: 계정구분 * · 회기 기수 * · 대상 일자(N일, 휴일 포함 여부) · 미승인 전표 합계
   - 입력: 마감 기간 *(시작~종료 DatePicker 2개, 기본 = 직전 미마감일 ~ 오늘) · 비고(200자, 전 일자 공통)
   - 점검 결과 = 기간이 바뀔 때마다 일자별 자동 판정(bulkPreview) — 미통과 행은 danger 강조. 기간이 회기 밖·오늘 이후·역전이면 행 없이 안내만.
   - [일괄 마감] 항상 활성 → 검증(validate — 15p 표 0~7 순서): 4 = 안내 토스트 후 계속 · 5 = 오류 후 중단(마감 0건, 부분 마감 없음)
     오류는 모달 안 인라인 role=alert 한 곳에만 — 토스트를 겹치면 스크린리더가 같은 문구를 두 번 읽는다.
     · 통과 = 날짜 오름차순 순차 마감(페이지가 한 번에 반영 — 중간 실패 시 전체 롤백과 같은 결과).
   크롬: 46px 패밀리. 점검 결과 표 = 수제 <table>(tableLayout fixed · 0행 EmptyRow · 미승인 건수만 우측). */
import React from 'react';
import { UI } from '../../components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { PeriodPicker } from '../../ui/period-picker';
import { SuspenseField as Field, dayWrap, focusIn } from './suspense_clear_modal';
import { BULK_VERDICT_LABEL, CLOSE_MSG } from './daily_close_model';
import type { BulkCheck, BulkRow } from './daily_close_model';
import { ReadBox, RemarkInput } from './daily_close_process_modal';

const { Button, SaveButton, StatusBadge, EmptyRow } = UI;

const TH: React.CSSProperties = { padding: '6px 8px 10px 0', fontSize: 13, fontWeight: 700, color: 'var(--caption)' };
const TD: React.CSSProperties = { padding: '6px 8px 6px 0', fontSize: 13, borderTop: '1px solid var(--border)' };
const PREV_LABEL: Record<BulkRow['prev'], string> = { closed: '마감', planned: '이번 처리', open: '미마감' };

export function DailyCloseBulkModal({ account, termLabel, initial, plan, validate, onSave, onAbort, onInfo, onClose }: {
  account: string;
  termLabel: string;
  initial: [string, string];
  plan: (from: string, to: string) => { rows: BulkRow[]; notice: string | null };
  validate: (from: string, to: string, remark: string) => BulkCheck;
  /** 통과 — 페이지가 dates 를 한 번에 마감(원장·이력·토스트) */
  onSave: (dates: string[], remark: string, message: string) => void;
  /** 0(계정구분 미선택) — 모달 닫힘 */
  onAbort: (message: string) => void;
  onInfo: (message: string) => void;
  onClose: () => void;
}) {
  const dlgRef = React.useRef<DialogHandle>(null);
  const fromRef = React.useRef<HTMLDivElement>(null);
  const toRef = React.useRef<HTMLDivElement>(null);
  const remarkRef = React.useRef<HTMLTextAreaElement>(null);
  const [from, setFrom] = React.useState(initial[0]);
  const [to, setTo] = React.useState(initial[1]);
  const [remark, setRemark] = React.useState('');
  const [errField, setErrField] = React.useState<'from' | 'to' | 'remark' | null>(null);
  const [err, setErr] = React.useState('');
  const [failed, setFailed] = React.useState(false);   // 5 미통과로 중단된 뒤 ☒ 강조
  const { rows, notice } = React.useMemo(() => plan(from, to), [plan, from, to]);
  const targets = rows.filter((r) => r.verdict !== 'closed');
  const unapproved = targets.reduce((s, r) => s + r.unapproved, 0);
  const holidays = targets.filter((r) => r.holiday).length;
  const reset = () => { setErr(''); setErrField(null); setFailed(false); };

  const submit = () => {
    const c = validate(from, to, remark);
    if (c.info) onInfo(c.info);
    if (c.ok === false) {
      if (c.code === 'account') { onAbort(c.message); dlgRef.current?.close(); return undefined; }
      setErr(c.message); setErrField(c.field); setFailed(c.code === 'fail');
      if (c.field === 'from') focusIn(fromRef.current);
      else if (c.field === 'to') focusIn(toRef.current);
      else if (c.field === 'remark') remarkRef.current?.focus();
      return undefined;
    }
    return () => { onSave(c.dates, remark, c.message); dlgRef.current?.close(); };
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[760px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>기간 일괄 마감</DialogTitle>
          <DialogDescription className="sr-only">기간 안의 미마감 일자를 날짜 순으로 한 번에 마감합니다</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          {err && <p role="alert" className="m-0 mb-3.5 text-danger" style={{ fontSize: 12.5 }}>{err}</p>}
          <div className="grid grid-cols-1 min-[769px]:grid-cols-2 gap-x-6">
            <Field label="계정구분" required plain><ReadBox>{account}</ReadBox></Field>
            <Field label="회기 기수" required plain><ReadBox>{termLabel}</ReadBox></Field>
          </div>
          <Field label="마감 기간" required plain>
            <div className="flex items-center gap-2 flex-wrap">
              <div ref={fromRef} style={dayWrap}><PeriodPicker mode="day" value={from} onChange={(v) => { setFrom(v || ''); reset(); }} ariaLabel="마감 기간 시작일" invalid={errField === 'from'} /></div>
              <span className="text-caption">~</span>
              <div ref={toRef} style={dayWrap}><PeriodPicker mode="day" value={to} onChange={(v) => { setTo(v || ''); reset(); }} ariaLabel="마감 기간 종료일" invalid={errField === 'to'} /></div>
            </div>
          </Field>
          <div className="grid grid-cols-1 min-[769px]:grid-cols-2 gap-x-6">
            <Field label="대상 일자" plain><ReadBox><span className="tabular-nums">{`${String(targets.length)}일`}{holidays ? ` (휴일 ${String(holidays)}일 포함)` : ''}</span></ReadBox></Field>
            <Field label="미승인 전표" plain><ReadBox><span className="tabular-nums" style={unapproved ? { color: 'var(--danger-text)', fontWeight: 700 } : undefined}>{`${String(unapproved)}건`}</span><span className="text-caption"> (선택 계정구분)</span></ReadBox></Field>
          </div>
          <Field label="점검 결과" plain>
            <div className="overflow-x-auto" style={{ maxHeight: 260, overflowY: 'auto' }}>
              <table className="w-full border-collapse" style={{ minWidth: 520, tableLayout: 'fixed' }}>
                <colgroup><col style={{ width: 120 }} /><col style={{ width: 96 }} /><col style={{ width: 80 }} /><col style={{ width: 100 }} /><col /></colgroup>
                <thead><tr><th style={TH}>일자</th><th style={TH}>영업일구분</th><th style={{ ...TH, textAlign: 'right' }}>미승인</th><th style={TH}>직전 마감</th><th style={{ ...TH, paddingRight: 0 }}>판정</th></tr></thead>
                <tbody>
                  {rows.length === 0 && <EmptyRow span={5} msg={notice ?? '점검할 일자가 없습니다.'} hint={notice ? undefined : '마감 기간을 지정해 주세요.'} />}
                  {rows.map((r) => {
                    const bad = r.verdict !== 'ok' && r.verdict !== 'closed';
                    return (
                      <tr key={r.date} style={bad && failed ? { background: 'var(--danger-soft)' } : undefined}>
                        <td style={{ ...TD, fontVariantNumeric: 'tabular-nums' }}>{r.date}</td>
                        <td style={TD}>{r.holiday ? '휴일' : '영업일'}</td>
                        <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', ...(r.unapproved ? { color: 'var(--danger-text)', fontWeight: 700 } : null) }}>{`${String(r.unapproved)}건`}</td>
                        <td style={TD}>{PREV_LABEL[r.prev]}</td>
                        <td style={{ ...TD, paddingRight: 0 }}>
                          <StatusBadge tone={r.verdict === 'ok' ? 'success' : r.verdict === 'closed' ? 'muted' : 'danger'} label={BULK_VERDICT_LABEL[r.verdict]} size="sm" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Field>
          <Field label="비고" plain errMsg={errField === 'remark' ? CLOSE_MSG.remark : undefined}>
            <RemarkInput value={remark} onChange={(v) => { setRemark(v); if (errField === 'remark') reset(); }} invalid={errField === 'remark'} inputRef={remarkRef} />
            <span className="block text-caption" style={{ fontSize: 11.5 }}>전 일자에 공통 적용됩니다.</span>
          </Field>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>취소</Button>
            <SaveButton leadingIcon="check" busyLabel="마감 중" onSubmit={submit}>일괄 마감</SaveButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
