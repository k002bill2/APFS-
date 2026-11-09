/* 유무형자산관리(ACC-017) — 「유무형자산관리 — 변동 등록」 모달(설계서 slide14 · E04).
   - 총괄 탭에서 선택한 자산 1건 기준. 자산정보(계정구분~잔여수량)는 표시 전용(회색).
   - 입력: 변동구분* · 변동일*(기본 오늘) · 처리구분* · 처리수량(C — 부분일 때만, 전체면 잔여수량 자동) · 매각액(E — 처분만, 불용이면 0 고정) · 비고.
   - 자동: 개별상각액(D) · 취득가액 감소액(F = A ÷ B × C) · 처분손익(H = D − E − G + F) — fixed_asset_model previewChange.
   - 저장 검증 = validateChange(slide14 ③ 순서 · 문구) — 첫 미충족 항목 빨간 테두리 + 인라인 문구 + 토스트 + 포커스.
   - 거래처 = 자산 구입처 표시(처분 상대 선택은 설계서 '확인 필요'라 미구현).
   크롬: 46px 패밀리 · 2단(suspense_clear_modal 과 같은 규격). */
import React from 'react';
import { UI } from '../../components';
import { SchemaField } from '../../schemas/renderers';
import type { FieldSpec } from '../../schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { PeriodPicker } from '../../ui/period-picker';
import { toast } from '../../ui/sonner';
import { formatAmount, parseAmount } from '../slip/general_journal_model';
import { SuspenseField as Field } from '../slip/suspense_clear_modal';
import { dayWrap, focusIn } from '../acc_form_helpers';
import { CHANGE_KINDS, PROC_KINDS } from './fixed_asset_data';
import type { AssetChange, ChangeKind, ProcKind } from './fixed_asset_data';
import { CHANGE_MSG, previewChange, validateChange } from './fixed_asset_model';
import type { AssetView, ChangeField, ChangeInput } from './fixed_asset_model';

const { Button, SaveButton } = UI;

const PLACEHOLDER = '선택해 주세요';
const fromSel = (x: string) => (x === PLACEHOLDER ? '' : x);
const toSel = (x: string) => x || PLACEHOLDER;
const ro = (label: string): FieldSpec => ({ key: label, label, control: 'readonly' });
const F_KIND: FieldSpec = { key: 'kind', label: '변동구분', control: 'select', options: [PLACEHOLDER, ...CHANGE_KINDS], required: true };
const F_PROC: FieldSpec = { key: 'proc', label: '처리구분', control: 'select', options: [PLACEHOLDER, ...PROC_KINDS], required: true };
const F_QTY: FieldSpec = { key: 'qty', label: '처리수량(C)', control: 'text', required: true };
const F_SALE: FieldSpec = { key: 'sale', label: '매각액(E)', control: 'text', required: true };
const F_MEMO: FieldSpec = { key: 'memo', label: '비고', control: 'text', long: true };
const won = (n: number | null) => (n == null ? '' : `${formatAmount(n)} 원`);
const Show = ({ label, value }: { label: string; value: string }) => (
  <Field label={label}><SchemaField field={ro(label)} value={value} onChange={() => undefined} /></Field>
);

export function AssetChangeModal({ asset, changes, today, onSave, onClose }: {
  asset: AssetView;
  changes: readonly AssetChange[];
  today: string;
  onSave: (input: ChangeInput) => void;
  onClose: () => void;
}) {
  const dlgRef = React.useRef<DialogHandle>(null);
  const [kind, setKind] = React.useState<ChangeKind | ''>('');
  const [date, setDate] = React.useState(today);
  const [proc, setProc] = React.useState<ProcKind | ''>('');
  const [qtyText, setQtyText] = React.useState('');
  const [saleText, setSaleText] = React.useState('');
  const [memo, setMemo] = React.useState('');
  const [err, setErr] = React.useState<{ field: ChangeField; message: string } | null>(null);
  const errOf = (f: ChangeField) => (err?.field === f ? err.message : undefined);
  const clearErr = (f: ChangeField) => setErr((e) => (e?.field === f ? null : e));
  const refs: Record<ChangeField, React.RefObject<HTMLDivElement | null>> = {
    kind: React.useRef(null), date: React.useRef(null), proc: React.useRef(null), qty: React.useRef(null), sale: React.useRef(null),
  };

  const input: ChangeInput = { kind, date, proc, qty: qtyText ? Number(qtyText) : null, sale: parseAmount(saleText), memo };
  const p = previewChange(asset, changes, input);

  const submit = () => {
    const check = validateChange(asset, input);
    if (check.ok === false) {
      setErr({ field: check.field, message: check.message });
      toast.error(check.message);
      focusIn(refs[check.field].current);
      return undefined;
    }
    return () => { onSave(input); toast.success(CHANGE_MSG.saved); dlgRef.current?.close(); };
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">유무형자산관리 — 변동 등록</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0">{`${asset.assetNo} · ${asset.name}`}</DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <fieldset className="border-0 p-0 m-0 mb-7" style={{ minWidth: 0 }}>
            <legend className="w-full flex items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mb-3">자산정보</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
              <Show label="계정구분" value={asset.fund} />
              <div className="hidden sm:block" aria-hidden="true" />
              <Show label="자산유형" value={asset.assetType} />
              <Show label="자산명" value={asset.name} />
              <Show label="모델명" value={asset.model} />
              <Show label="차량번호" value={asset.vehicleNo} />
              <Show label="취득원가" value={won(asset.cost)} />
              <Show label="수량 / 단가" value={`${String(asset.qty)} / ${won(asset.unitPrice)}`} />
              <Show label="미상각잔액(A)" value={won(p.A)} />
              <Show label="잔여수량(B)" value={String(p.B)} />
            </div>
          </fieldset>
          <fieldset className="border-0 p-0 m-0" style={{ minWidth: 0 }}>
            <legend className="w-full flex items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mb-3">변동정보</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
              <Field label="변동구분" required errMsg={errOf('kind')}>
                <div ref={refs.kind}>
                  <SchemaField field={F_KIND} value={toSel(kind)} invalid={!!errOf('kind')}
                    onChange={(x) => { const k = fromSel(x) as ChangeKind | ''; setKind(k); if (k === '불용') setSaleText(''); clearErr('kind'); clearErr('sale'); }} />
                </div>
              </Field>
              <Field label="변동일" required plain errMsg={errOf('date')}>
                <div ref={refs.date} style={dayWrap}>
                  <PeriodPicker mode="day" value={date} onChange={(x) => { setDate(x || ''); clearErr('date'); }} ariaLabel="변동일" required invalid={!!errOf('date')} />
                </div>
              </Field>
              <Field label="처리구분" required errMsg={errOf('proc')}>
                <div ref={refs.proc}>
                  <SchemaField field={F_PROC} value={toSel(proc)} invalid={!!errOf('proc')}
                    onChange={(x) => { setProc(fromSel(x) as ProcKind | ''); clearErr('proc'); clearErr('qty'); }} />
                </div>
              </Field>
              <Show label="거래처" value={asset.supplier} />
              <Field label="처리수량(C)" required={proc === '부분'} errMsg={errOf('qty')}>
                <div ref={refs.qty}>
                  {proc === '부분'
                    ? <SchemaField field={F_QTY} value={qtyText} invalid={!!errOf('qty')} onChange={(x) => { setQtyText(x.replace(/[^\d]/g, '')); clearErr('qty'); }} />
                    : <SchemaField field={ro('처리수량(C)')} value={proc === '전체' ? String(p.B) : '부분 선택 시 입력'} onChange={() => undefined} />}
                </div>
              </Field>
              <Show label="잔존가액(처리 후)" value={won(p.A - p.F)} />
              <Show label="개별상각액(D)" value={won(p.D)} />
              <Field label="매각액(E)" required={kind === '처분'} errMsg={errOf('sale')}>
                <div ref={refs.sale}>
                  {kind === '불용'
                    ? <SchemaField field={ro('매각액(E)')} value={won(0)} onChange={() => undefined} />
                    : <SchemaField field={F_SALE} value={saleText} invalid={!!errOf('sale')}
                        onChange={(x) => { setSaleText(formatAmount(parseAmount(x.replace(/[^\d]/g, '')))); clearErr('sale'); }} />}
                </div>
              </Field>
              <Show label="취득가액 감소액(F=A/B×C)" value={won(p.F)} />
              <Show label="전기말누계액(G)" value={won(p.G)} />
              <Show label="처분손익(H=D−E−G+F)" value={won(p.H)} />
              <div className="hidden sm:block" aria-hidden="true" />
              <div className="sm:col-span-2">
                <Field label="비고"><SchemaField field={F_MEMO} value={memo} onChange={setMemo} /></Field>
              </div>
            </div>
          </fieldset>
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
