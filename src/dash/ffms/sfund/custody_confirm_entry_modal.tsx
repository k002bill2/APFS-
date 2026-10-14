/* 대사 결과 단건 등록 / 수정 — 팝업 (자펀드수탁관리(확정) 툴바 [단건 등록] · 행 '관리' 열 [수정]으로 진입).
   출처: S1_27_자펀드수탁관리_확정_.html 하단 `<script>`의 `entryHTML(mode,r)`·`openEntry` → APFS 디자인시스템으로 변형.
   2026-09 회의록(농협 수탁시스템 사용자 인터뷰 2026-06-23) 개선 요청 ① — 파일 재업로드 없이 개별 건을 등록·수정.

   구성(목업 → 우리 규약):
   - `.frow 운용사*`·`자펀드*` 텍스트 입력          → `SchemaField`(text, required)
   - `tagSel` 5개(O/X/-) select                      → `SchemaField`(radio — DS RadioGroup). 3지선다라 펼쳐 보인다
   - `확정여부` select(확정/미확정)                   → `SchemaField`(radio)
   - `.modal-foot 취소·저장`                          → `DialogFooter` 취소(outline) · 저장(primary)
   - 제목은 모드로 갈린다: 등록='대사 결과 단건 등록' · 수정='대사 결과 수정'(목업 그대로)
   골격(Dialog · `px-[46px]` 인셋 · Field 래퍼)은 `custody_verify_memo_modal.tsx` 복사 관례.

   한계·가정(결정 기록)
   - 저장 규칙은 목업 JS 그대로: 5개 항목 중 X가 하나라도 있으면 `일치여부=불일치`, 아니면 `일치`.
     확정여부는 **사용자가 고른 값 그대로** 저장한다(목업은 X가 있어도 확정여부를 강제로 바꾸지 않는다).
   - 등록 기본값은 목업 `{inv:['-','-'],nt:['-','-'],ni:'-',confirm:'미확정'}` 그대로. */
import React from 'react';
import { UI } from '../../components';
import { SchemaField } from '../../schemas/renderers';
import type { FieldSpec } from '../../schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { toast } from '../../ui/sonner';
import type { CustodyConfirmRow, Mark, ConfirmState } from './custody_confirm_manage';

const { Button, SaveButton } = UI;

/** 저장 값 — 행에서 id·no를 뺀 나머지(일치여부는 마크에서 파생해 함께 싣는다) */
export type CustodyEntryValue = Omit<CustodyConfirmRow, 'id' | 'no'>;

/* 라벨 + 컨트롤 래퍼 — `custody_verify_memo_modal`의 Field 규격 그대로(로컬 복사).
   plain=true → `<label>` 대신 `<div>`: RadioGroupItem은 <button role=radio>라 <label> 안에 두면 클릭이 2회 발화한다 */
function Field({ label, plain, errMsg, children }: { label: string; plain?: boolean; errMsg?: string; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-3.5">
      <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>{label}</span>
      {children}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}

const MARKS: Mark[] = ['O', 'X', '-'];
const GP_FIELD: FieldSpec = { key: 'gp', label: '운용사', control: 'text', required: true };
const FN_FIELD: FieldSpec = { key: 'fn', label: '자펀드', control: 'text', required: true };
const CONFIRM_FIELD: FieldSpec = { key: 'confirm', label: '확정여부', control: 'radio', options: ['확정', '미확정'] };

/* 마크 5항목 — 목업 `tagSel` 라벨·순서 그대로 */
type MarkKey = 'invShares' | 'invBal' | 'ntShares' | 'ntBal' | 'niBal';
const MARK_FIELDS: { key: MarkKey; spec: FieldSpec }[] = ([
  ['invShares', '투자자산·보유주수'],
  ['invBal', '투자자산·잔액'],
  ['ntShares', '미투자자산거래·보유주수'],
  ['ntBal', '미투자자산거래·잔액'],
  ['niBal', '미투자자산·잔액'],
] as [MarkKey, string][]).map(([key, label]) => ({ key, spec: { key, label, control: 'radio', options: MARKS } }));

const EMPTY: CustodyEntryValue = {
  gp: '', fn: '', invShares: '-', invBal: '-', ntShares: '-', ntBal: '-', niBal: '-', status: '일치', confirm: '미확정',
};

export function CustodyEntryModal({ row, onSave, onClose }: {
  /** 수정 대상 행 — 없으면 단건 등록 모드 */
  row?: CustodyConfirmRow;
  onSave: (v: CustodyEntryValue) => void;
  onClose: () => void;
}) {
  const edit = Boolean(row);
  const [v, setV] = React.useState<CustodyEntryValue>(() => {
    if (!row) return EMPTY;
    const { id: _id, no: _no, ...rest } = row;
    return rest;
  });
  const [errKey, setErrKey] = React.useState<'' | 'gp' | 'fn'>('');
  const dlgRef = React.useRef<DialogHandle>(null);

  const set = <K extends keyof CustodyEntryValue>(k: K, val: CustodyEntryValue[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errKey === k) setErrKey('');
  };

  const submit = () => {
    const gp = v.gp.trim(), fn = v.fn.trim();
    if (!gp) { setErrKey('gp'); return; }
    if (!fn) { setErrKey('fn'); return; }
    setErrKey('');
    /* 목업 규칙: 5개 마크 중 X가 하나라도 있으면 불일치 */
    const marks = MARK_FIELDS.map((m) => v[m.key]);
    const next: CustodyEntryValue = { ...v, gp, fn, status: marks.includes('X') ? '불일치' : '일치' };
    return () => { onSave(next); toast.success(edit ? '수정되었습니다' : '등록되었습니다'); };
  };

  const title = edit ? '대사 결과 수정' : '대사 결과 단건 등록';

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* 바깥 클릭으로 닫히지 않는다 — 작성 중 오터치 유실 방지(메모 팝업과 동일 계약) */}
      <DialogContent className="max-w-[560px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">자펀드 수탁 대사 결과를 {edit ? '수정' : '등록'}하는 양식</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]" style={{ fontSize: 13.5 }}>
          <Field label="운용사 *" errMsg={errKey === 'gp' ? '운용사를 입력하세요.' : undefined}>
            <SchemaField field={GP_FIELD} value={v.gp} onChange={(x) => set('gp', x)} invalid={errKey === 'gp'} />
          </Field>
          <Field label="자펀드 *" errMsg={errKey === 'fn' ? '자펀드를 입력하세요.' : undefined}>
            <SchemaField field={FN_FIELD} value={v.fn} onChange={(x) => set('fn', x)} invalid={errKey === 'fn'} />
          </Field>
          {MARK_FIELDS.map((m) => (
            <Field key={m.key} label={m.spec.label} plain>
              <SchemaField field={m.spec} value={v[m.key]} onChange={(x) => set(m.key, x as Mark)} />
            </Field>
          ))}
          <Field label="확정여부" plain>
            <SchemaField field={CONFIRM_FIELD} value={v.confirm} onChange={(x) => set('confirm', x as ConfirmState)} />
          </Field>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>취소</Button>
            <SaveButton onSubmit={submit} />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
