/* 휴일관리(ACC-025) — 「휴일 등록」/「휴일 수정」 모달(설계서 slide13 · E03·E04·E08).
   ⚠ RowFormModal(flat 스키마)로 담을 수 없어 전용 모달이다: ① 일자 중복 검증(수정 시 자기 자신 제외) ② 등록자 읽기전용(신규 = 데모 사용자,
     수정 = 기존 유지) ③ 입력/변경이 있을 때 닫기 확인(공용 dirty 가드가 없어 이 모달 안에 작게 구현 — depreciation_account_modal 관용구).
   - 항목 5개 → 1단 `max-w-[460px]`(RowFormModal 1단 규격), 46px 패밀리(헤더·본문·푸터 px-[46px]). 컨트롤 = SchemaField(34px).
   - 첫 초점 = 일자(DatePicker 트리거). 휴일명 30자·비고 100자 입력 제한(SchemaField 에 maxLength 가 없어 onChange 에서 자른다).
   - 휴일구분 기본 '선택해 주세요'(미선택) — 첫 옵션 자동 시드 없음.
   - E04 [저장](SaveButton): validateHoliday 순서(일자 → 일자 범위(기준년도 ±5년) → 중복 → 휴일명 → 휴일구분) 첫 미충족 1건 = 빨간 테두리 + 인라인 문구 + 토스트 + 초점, 입력값 보존.
     통과 = onSave → 토스트 "저장되었습니다" → handle.close()(exit 애니메이션 보존 — 부모는 onClose 에서만 modal 을 비운다).
   - 닫기(✕·Esc·[취소])는 requestClose 한 곳 — dirty 면 확인창 "작성 중인 내용이 사라집니다" [계속 작성]/[닫기]. */
import React from 'react';
import { UI } from '../../components';
import { SchemaField } from '../../schemas/renderers';
import type { FieldSpec } from '../../schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '../../ui/alert-dialog';
import { toast } from '../../ui/sonner';
import { HOLIDAY_TYPES } from './holiday_data';
import type { HolidayRow, HolidayType } from './holiday_data';
import { MEMO_MAX, MSG, NAME_MAX, isDirty, validateHoliday } from './holiday_model';
import type { HolidayField, HolidayFormValues, YearRange } from './holiday_model';

const { Button, IconBtn, SaveButton } = UI;

/** 부모가 받는 저장값 — id·등록자는 부모가 채운다 */
export type HolidayPatch = { date: string; name: string; type: HolidayType; memo: string };

const PLACEHOLDER = '선택해 주세요';
const fromSel = (x: string) => (x === PLACEHOLDER ? '' : x);
const toSel = (x: string) => x || PLACEHOLDER;
const F: Record<string, FieldSpec> = {
  date: { key: 'date', label: '일자', control: 'date', required: true },
  name: { key: 'name', label: '휴일명', control: 'text', required: true, placeholder: `최대 ${String(NAME_MAX)}자` },
  type: { key: 'type', label: '휴일구분', control: 'select', options: [PLACEHOLDER, ...HOLIDAY_TYPES], required: true },
  memo: { key: 'memo', label: '비고', control: 'text', placeholder: `최대 ${String(MEMO_MAX)}자`, long: true },
  createdBy: { key: 'createdBy', label: '등록자', control: 'readonly' },
};

/* 라벨 래퍼 — RowFormModal Field 규격 로컬 복제(형제 회계 모달과 동일). plain=<div>(버튼형 컨트롤 2회 발화 방지) */
function Field({ label, required, plain, errMsg, boxRef, children }: {
  label: string; required?: boolean; plain?: boolean; errMsg?: string; boxRef?: React.Ref<HTMLDivElement>; children: React.ReactNode;
}) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-3.5 min-w-0">
      <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>{label}{required ? ' *' : ''}</span>
      <div ref={boxRef}>{children}</div>
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}
const focusIn = (el: HTMLElement | null) => el?.querySelector<HTMLElement>('input:not([disabled]),select,button,textarea')?.focus();

export function HolidayFormModal({ mode, initial, rows, createdBy, yearRange, onSave, onClose }: {
  mode: 'create' | 'edit';
  /** 수정 대상 — 등록이면 없음 */
  initial?: HolidayRow;
  /** 중복 판정 원천(전체 휴일) */
  rows: readonly HolidayRow[];
  /** 등록자 표시 — 신규 = 데모 사용자, 수정 = 기존 등록자 */
  createdBy: string;
  /** 일자 허용 연도(기준년도 선택 범위와 같게) */
  yearRange: YearRange;
  onSave: (patch: HolidayPatch) => void;
  onClose: () => void;
}) {
  const dlgRef = React.useRef<DialogHandle>(null);
  const [base] = React.useState<HolidayFormValues>(() => (initial
    ? { date: initial.date, name: initial.name, type: initial.type, memo: initial.memo }
    : { date: '', name: '', type: '', memo: '' }));
  const [v, setV] = React.useState<HolidayFormValues>(base);
  const [err, setErr] = React.useState<{ key: HolidayField; msg: string } | null>(null);
  const [confirmClose, setConfirmClose] = React.useState(false);
  const dirty = isDirty(base, v);

  const set = <K extends keyof HolidayFormValues>(k: K, val: HolidayFormValues[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    setErr((e) => (e?.key === k ? null : e));
  };
  const errOf = (k: HolidayField) => (err?.key === k ? err.msg : undefined);
  const refs: Record<HolidayField, React.RefObject<HTMLDivElement | null>> = { date: React.useRef(null), name: React.useRef(null), type: React.useRef(null) };

  const requestClose = () => { if (dirty) setConfirmClose(true); else dlgRef.current?.close(); };

  /* E04 저장 — SaveButton 계약: 검증 실패 = undefined(스피너 없음), 통과 = commit 함수 */
  const submit = () => {
    const res = validateHoliday(v, rows, initial?.id, yearRange);
    if (res.ok === false) {
      setErr({ key: res.key, msg: res.msg });
      toast.error(res.msg);
      focusIn(refs[res.key].current);
      return undefined;
    }
    const patch: HolidayPatch = { date: v.date, name: v.name.trim(), type: v.type as HolidayType, memo: v.memo.trim() };
    return () => { onSave(patch); toast.success(MSG.saved); dlgRef.current?.close(); };
  };

  const title = mode === 'create' ? '휴일 등록' : '휴일 수정';

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent hideClose className="max-w-[460px] max-h-[86vh]" onInteractOutside={(e) => e.preventDefault()}
        /* 첫 초점 = 일자 — Radix 기본(첫 tabbable)이면 머리말 닫기 IconBtn 이 받아 툴팁이 뜨고 첫 Esc 를 가져간다 */
        onOpenAutoFocus={(e) => { e.preventDefault(); focusIn(refs.date.current); }}
        onEscapeKeyDown={(e) => { e.preventDefault(); if (!confirmClose) requestClose(); }}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">휴일 {mode === 'create' ? '등록' : '수정'} 양식</DialogDescription>
          <IconBtn icon="x" label="닫기" size={34} onClick={requestClose} />
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          <Field label="일자" required plain errMsg={errOf('date')} boxRef={refs.date}>
            <SchemaField field={F.date} value={v.date} invalid={!!errOf('date')} onChange={(x) => set('date', x)} />
          </Field>
          <Field label="휴일명" required errMsg={errOf('name')} boxRef={refs.name}>
            <SchemaField field={F.name} value={v.name} invalid={!!errOf('name')} onChange={(x) => set('name', x.slice(0, NAME_MAX))} />
          </Field>
          <Field label="휴일구분" required errMsg={errOf('type')} boxRef={refs.type}>
            <SchemaField field={F.type} value={toSel(v.type)} invalid={!!errOf('type')} onChange={(x) => set('type', fromSel(x) as HolidayType | '')} />
          </Field>
          <Field label="비고">
            <SchemaField field={F.memo} value={v.memo} onChange={(x) => set('memo', x.slice(0, MEMO_MAX))} />
          </Field>
          <Field label="등록자">
            <SchemaField field={F.createdBy} value={createdBy} onChange={() => undefined} />
          </Field>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={requestClose}>취소</Button>
            <SaveButton onSubmit={submit} />
          </div>
        </DialogFooter>

        {/* 입력 중 닫기 확인 — [닫기]는 확인창을 내린 뒤 handle.close() 로 exit 애니메이션을 지킨다 */}
        <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>닫기 확인</AlertDialogTitle>
              <AlertDialogDescription>{MSG.dirty}. 닫으시겠습니까?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>계속 작성</AlertDialogCancel>
              <Button variant="primary" size="sm" onClick={() => { setConfirmClose(false); dlgRef.current?.close(); }}>닫기</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
