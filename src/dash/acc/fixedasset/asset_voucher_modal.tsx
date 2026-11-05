/* 유무형자산관리(ACC-017) — 「전표생성」 모달(설계서 slide15 · E06).
   - 대상 = 선택 행 중 전표 미생성 건 → 계정구분별 전표 1건(탭 = 계정구분, 공용 TabBar).
   - 탭마다 전표구분(자동: 총괄 = 자산취득 · 변동내역 = 처분·불용) · 전표일자*(기본 대상 중 가장 늦은 취득일·변동일) · 적요*(기본값 defaultMemo)
     · 분개 미리보기(자동 — fixed_asset_model acquisitionLines / disposalLines).
   - [생성]은 모든 탭의 차변 합계 = 대변 합계일 때만 활성. 클릭 시 validateVouchers(전표일자·적요) — 문제 탭으로 전환 + 토스트.
   - 생성 반영(채번·결재상태)은 부모(commitVouchers)가 한다.
   크롬: 46px 패밀리 · max-w-[760px]. 분개 표 = 수제 <table>(daily_close_bulk_modal 규격 — 금액만 우측). */
import React from 'react';
import { UI } from '../../components';
import { SchemaField } from '../../schemas/renderers';
import type { FieldSpec } from '../../schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { PeriodPicker } from '../../ui/period-picker';
import { toast } from '../../ui/sonner';
import { TabBar, TabPanel } from '../../risk_page_kit';
import { formatAmount } from '../slip/general_journal_model';
import { SuspenseField as Field, dayWrap, focusIn } from '../slip/suspense_clear_modal';
import { isBalanced, lineSum, validateVouchers } from './fixed_asset_model';
import type { VoucherDraft } from './fixed_asset_model';

const { Button, SaveButton } = UI;

const TH: React.CSSProperties = { padding: '6px 8px 10px 0', fontSize: 13, fontWeight: 700, color: 'var(--caption)', textAlign: 'left' };
const TD: React.CSSProperties = { padding: '6px 8px 6px 0', fontSize: 13, borderTop: '1px solid var(--border)' };
const NUM: React.CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const ro = (label: string): FieldSpec => ({ key: label, label, control: 'readonly' });
const F_MEMO: FieldSpec = { key: 'memo', label: '적요', control: 'text', required: true, long: true };
const amount = (n: number) => (n ? formatAmount(n) : '');

export function AssetVoucherModal({ source, excluded, drafts: initial, onCreate, onClose }: {
  source: '총괄' | '변동내역';
  excluded: number;
  drafts: VoucherDraft[];
  onCreate: (drafts: VoucherDraft[]) => void;
  onClose: () => void;
}) {
  const dlgRef = React.useRef<DialogHandle>(null);
  const idBase = React.useId();
  const [drafts, setDrafts] = React.useState<VoucherDraft[]>(initial);
  const [tab, setTab] = React.useState(0);
  const [err, setErr] = React.useState<{ index: number; field: 'date' | 'memo' | 'lines'; message: string } | null>(null);
  const dateRef = React.useRef<HTMLDivElement>(null);
  const memoRef = React.useRef<HTMLDivElement>(null);
  const d = drafts[tab];
  const total = drafts.reduce((s, x) => s + x.count, 0);
  const allBalanced = drafts.every((x) => isBalanced(x.lines));
  const errOf = (f: 'date' | 'memo') => (err && err.index === tab && err.field === f ? err.message : undefined);
  const patch = (p: Partial<VoucherDraft>) => {
    setDrafts((ds) => ds.map((x, i) => (i === tab ? { ...x, ...p } : x)));
    setErr(null);
  };
  const tabs = drafts.map((x, i) => ({ id: String(i), label: `${x.fund} (${String(x.count)}건)` }));
  const sum = lineSum(d.lines);

  const submit = () => {
    const check = validateVouchers(drafts);
    if (check.ok === false) {
      setErr(check);
      setTab(check.index);
      toast.error(check.message);
      requestAnimationFrame(() => focusIn((check.field === 'memo' ? memoRef : dateRef).current));
      return undefined;
    }
    return () => { onCreate(drafts); dlgRef.current?.close(); };
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[760px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>전표생성</DialogTitle>
          <DialogDescription className="sr-only">선택한 건을 계정구분별 전표로 생성합니다</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <Field label="대상" plain>
            <SchemaField field={ro('대상')} fill onChange={() => undefined}
              value={`${source} 선택 ${String(total)}건 (전표 미생성)${excluded ? ` · 제외 ${String(excluded)}건` : ''} → 계정구분별 전표 ${String(drafts.length)}건`} />
          </Field>
          <TabBar tabs={tabs} value={String(tab)} onChange={(id) => setTab(Number(id))} idBase={idBase} label="계정구분" />
          <TabPanel idBase={idBase} value={String(tab)}>
            <div className="grid grid-cols-1 min-[769px]:grid-cols-2 gap-x-6 pt-4">
              <Field label="전표구분"><SchemaField field={ro('전표구분')} value={`${d.kind} (자동)`} onChange={() => undefined} /></Field>
              <Field label="전표일자" required plain errMsg={errOf('date')}>
                <div ref={dateRef} style={dayWrap}>
                  <PeriodPicker mode="day" value={d.date} onChange={(x) => patch({ date: x || '' })} ariaLabel="전표일자" required invalid={!!errOf('date')} />
                </div>
              </Field>
            </div>
            <Field label="적요" required errMsg={errOf('memo')}>
              <div ref={memoRef}><SchemaField field={F_MEMO} value={d.memo} invalid={!!errOf('memo')} onChange={(x) => patch({ memo: x })} /></div>
            </Field>
            <Field label={`분개 미리보기 (${d.fund})`} plain>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: 520, tableLayout: 'fixed' }}>
                  <colgroup><col style={{ width: 72 }} /><col /><col style={{ width: 140 }} /><col style={{ width: 140 }} /></colgroup>
                  <thead><tr><th style={TH}>구분</th><th style={TH}>계정과목</th><th style={{ ...TH, ...NUM }}>차변</th><th style={{ ...TH, ...NUM, paddingRight: 0 }}>대변</th></tr></thead>
                  <tbody>
                    {d.lines.map((l, i) => (
                      <tr key={`${l.side}-${l.account}-${String(i)}`}>
                        <td style={TD}>{l.side}</td>
                        <td style={TD}>{l.account}{l.note && <span className="text-caption">{` (${l.note})`}</span>}</td>
                        <td style={{ ...TD, ...NUM }}>{amount(l.debit)}</td>
                        <td style={{ ...TD, ...NUM, paddingRight: 0 }}>{amount(l.credit)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--muted)', fontWeight: 700 }}>
                      <td style={TD}>합계</td>
                      <td style={TD}>{isBalanced(d.lines) ? '' : <span className="text-danger">차대 불일치</span>}</td>
                      <td style={{ ...TD, ...NUM }}>{formatAmount(sum.debit)}</td>
                      <td style={{ ...TD, ...NUM, paddingRight: 0 }}>{formatAmount(sum.credit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Field>
          </TabPanel>
        </div>
        <DialogFooter className="px-[46px]">
          <div className="text-caption" style={{ fontSize: 12 }}>{allBalanced ? '' : '차변과 대변 합계가 맞지 않는 전표가 있어 생성할 수 없습니다.'}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <SaveButton leadingIcon="" busyLabel="생성 중" disabled={!allBalanced} onSubmit={submit}>생성</SaveButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
