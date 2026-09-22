/* 운용인력 변동관리 — 팝업 2종 (등록 폼 / 해제등록 확인)
   출처: S2_59 목업의 `openReg()` · `openRelease()`(= S2_60 등록화면 팝업 정의를 흡수한 것 — 항목 7개 일치).

   ⚠ 수정·삭제 팝업은 **만들지 않는다** — 목업 리스트바 액션이 `등록`·`해제등록`·`엑셀` 3개뿐이고
     수정/삭제가 없다(2026-09-22 사용자 결정). 형제 litigation 의 `openDelete()`/edit 모드를
     이식하지 않는다.

   ⚠ 왜 RowFormModal(스키마 주도 공용 모달)이 아니라 전용 모달인가 — **값 계약**이 맞지 않는다
     (형제 litigation_form_modal 헤더와 동일한 ①②③):
     ① RowFormModal 의 `onSave` 는 `(row: Row) => void` 이고 내부에서 `buildRow` 를 거친다.
        buildRow 는 generic_list 의 Row 골격(icon·color·name·category·amount·change·status·trend)을
        **덮어써서** 돌려주고 `id` 를 `initial?.id ?? ''` 로 강제한다 → 우리 도메인 행(WorkforceRow)과
        무관한 8개 키가 섞인 객체를 받아 다시 7개만 골라내는 변환층이 필요하다.
     ② `initial?: Row` 도 WorkforceRow 를 캐스팅해 넘겨야 한다 — 형제 화면이 명시적으로 금지한 패턴이다
        ("행을 통째로 캐스팅해 넘기지 않는다 — 스키마에 없는 키가 섞이면 저장 시 조용히 되돌아올 수 있다").
     ③ 해제등록은 애초에 폼이 아니다 — 원문이 `role="alertdialog"`(입력 필드 없는 확인)라
        RowFormModal 로는 표현 자체가 안 된다.
     그 한 가지를 빼면 골격·규격은 RowFormModal 을 그대로 따른다 — 개별 컨트롤은 `SchemaField`,
     라벨 래퍼는 RowFormModal `Field` 규격 복제(className 지원 포함), 저장은 `UI.SaveButton`
     (submit 계약 = 실패 return / 성공 commit 반환).

   ⚠ 모달 폭 — RowFormModal 규격은 `wide = schema.fields.length > 6`. 등록 폼은 **7항목이라 wide 다**
     → 2단 그리드 + `max-w-[880px]`. `long:true` 인 textarea 는 `sm:col-span-2` 로 전체 폭.
     (형제 litigation 은 5항목이라 1단 `max-w-[460px]` 이었다 — 그대로 베끼면 안 되는 지점이다.)

   필드 정의(순서·라벨·옵션·placeholder·required)는 `workforce_manage_schemas.ts` 의 zod 검증된
   PageSchema 가 SSOT다 — 이 파일은 그 fields 를 순회해 렌더만 한다(항목을 여기 다시 적지 않는다). */
import React from 'react';
import { UI } from './components';
import { mn } from './mask';
import { SchemaField, isComplexControl, isPlainWrapControl } from './schemas/renderers';
import type { FieldSpec } from './schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from './ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';
import { toast } from './ui/sonner';
import { WORKFORCE_SCHEMA } from './workforce_manage_schemas';

const { Button, SaveButton } = UI;

/** 폼 값 — 키는 스키마 field.key, 값은 전부 문자열(SchemaField 값 계약). */
export type WorkforceFormValues = Record<string, string>;

/* RowFormModal `Field` 규격 복제(공유 export 가 아니라 로컬 복사 — generic_list_modal.tsx 참조).
   plain=true 면 <label> 대신 <div>(복합 컨트롤은 암묵 연결이 어긋난다 — 판정 SSOT 는 isPlainWrapControl).
   ⚠ `className` 을 받는다 — 2단 wide 그리드에서 `sm:col-span-2`(전체 폭)가 내려앉을 자리다.
     형제 litigation 의 Field 복사본은 1단 모달이라 className 이 없었다. 그대로 베끼면 textarea 가
     조용히 반 폭으로 렌더된다.
   ⚠ date/month 는 plain 으로 빼지 않는다 — isPlainWrapControl 이 둘 다 false 이고, 폼 모달 <label> 안
     트리거의 2회 토글은 실측 미재현이다(→[[apfs-datepicker]] 2026-09-17 계측 주석 · 형제 3화면 동일 판단). */
const labelStyle: React.CSSProperties = { fontSize: 12, marginBottom: 5 };
function Field({ label, children, errMsg, className, plain }: { label: string; children: React.ReactNode; errMsg?: string; className?: string; plain?: boolean }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className={`block mb-3.5 ${className ?? ''}`}>
      <span className="font-semibold text-caption block" style={labelStyle}>{label}</span>
      {children}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}

/* 초기값 시드 — RowFormModal 과 동일 규칙: initial 값 우선, 등록 모드에서 비어 있는 select 는 첫 옵션.
   (옵션형이 ''로 저장되면 그리드 셀이 빈칸으로 렌더된다 — apfs-form-modal 계약4)
   이 폼에 radio·switch 는 없으므로 select 만 다룬다(목업 openReg 에 radio 가 없다). */
function seedValues(fields: FieldSpec[], initial?: Partial<WorkforceFormValues>): WorkforceFormValues {
  const seed: WorkforceFormValues = {};
  for (const f of fields) {
    const from = initial ? String(initial[f.key] ?? '') : '';
    seed[f.key] = (!from && f.control === 'select') ? (f.options?.[0] ?? '') : from;
  }
  return seed;
}

/* ──────────────────────────────
   ① 운용인력변동 등록 — 목업 `openReg()`
   ⚠ 등록 전용이다(수정 모드 없음 — 목업에 수정 액션이 없다).
   ⚠ required 는 앞 4항목만 — 스키마 required 를 그대로 검증한다(빼거나 더하지 않는다).
────────────────────────────── */
export function WorkforceFormModal({ initial, onSave, onClose }: {
  initial?: Partial<WorkforceFormValues>;
  onSave: (values: WorkforceFormValues) => void;
  onClose: () => void;
}) {
  const [v, setV] = React.useState<WorkforceFormValues>(() => seedValues(WORKFORCE_SCHEMA.fields, initial));
  const [errKey, setErrKey] = React.useState('');
  const set = (k: string, val: string) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errKey === k) setErrKey('');   // 자기 키의 에러는 입력하는 즉시 지운다
  };

  const submit = () => {
    const miss = WORKFORCE_SCHEMA.fields.find((f) => f.required && !String(v[f.key] ?? '').trim());
    if (miss) { setErrKey(miss.key); return; }
    return () => {
      onSave({ ...v });
      toast.success('등록되었습니다 (목업)');
    };
  };

  const dlgRef = React.useRef<DialogHandle>(null);

  /* 항목 7개(>6) → RowFormModal 의 2단 wide 규격. 판정식을 리터럴로 굳히지 않고 스키마에서 계산한다
     (필드가 늘거나 줄면 폭도 따라간다 — RowFormModal 과 동일 동작). */
  const wide = WORKFORCE_SCHEMA.fields.length > 6;

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* 바깥 클릭으로는 안 닫힘 — 폼 작성 중 오터치 유실 방지(RowFormModal 동형) */}
      <DialogContent className={wide ? 'max-w-[880px] max-h-[88vh]' : 'max-w-[460px] max-h-[86vh]'} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>{WORKFORCE_SCHEMA.title}</DialogTitle>
          <DialogDescription className="sr-only">{WORKFORCE_SCHEMA.title} 양식</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          <div className={wide ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-5' : ''}>
            {WORKFORCE_SCHEMA.fields.map((f) => {
              /* 전체 폭 차지 판정 — RowFormModal 과 같은 식(textarea·file·복합 컨트롤·long).
                 이 폼에선 `운용인력변동내용`(textarea·long:true) 하나가 해당한다. */
              const span2 = wide && (f.control === 'textarea' || f.control === 'file' || isComplexControl(f.control) || !!f.long);
              return (
                <Field
                  key={f.key}
                  label={f.label + (f.required ? ' *' : '')}
                  className={span2 ? 'sm:col-span-2' : undefined}
                  plain={isPlainWrapControl(f.control)}
                  errMsg={errKey === f.key ? `${f.label}을(를) 입력하세요.` : undefined}>
                  <SchemaField field={f} value={v[f.key] ?? ''} onChange={(x) => set(f.key, x)} invalid={errKey === f.key} />
                </Field>
              );
            })}
          </div>
        </div>

        {/* 푸터 — 목업 modal-foot 구성(닫기·저장). 삭제 버튼은 없다(목업에 삭제 액션 자체가 없다) */}
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

/* ──────────────────────────────
   ② 해제등록 확인 — 목업 `openRelease()`. **원문에 정의가 있다**(role="alertdialog").
   문구도 목업 원문 그대로: "선택한 N건의 운용인력을 해제 처리하시겠습니까? 해제일자는 오늘 날짜로 기록됩니다."
   푸터도 원문 그대로 `취소` + `해제등록`(danger).
   ⚠ 해제일자 입력을 두지 않는다 — 원문이 "오늘 날짜로 기록"이라고 못 박았다. 형제 litigation 의
     `LitigationReleaseModal`(해제일자 date 입력)은 그쪽 원문에 팝업 정의가 없어 S2_55 를 차용한 것이라
     여기에 이식하면 원문을 덮어쓰는 셈이 된다.
   ⚠ `구분` 게이트를 두지 않는다 — 목업 `openRelease()` 도 이미 '해제'인 행을 막지 않고,
     원문에 그 도메인 규칙이 없으므로 임의로 만들지 않는다.
   ⚠ 저장 토스트는 여기가 아니라 호출부(commitRelease)가 띄운다 — AlertDialogAction 은 SaveButton 의
     submit 계약(성공 시 commit 반환)을 쓰지 않는다. 형제 `LitigationDeleteDialog` 배선과 동형이다.
────────────────────────────── */
export function WorkforceReleaseDialog({ count, onConfirm, onClose }: {
  /** 선택 건수 — 읽기전용 표시값(입력 대상 아님) */
  count: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>해제등록 확인</AlertDialogTitle>
          <AlertDialogDescription>
            선택한 <b className="text-foreground">{mn(String(count))}건</b>의 운용인력을 해제 처리하시겠습니까? 해제일자는 오늘 날짜로 기록됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} style={{ background: 'var(--danger)', color: 'var(--destructive-foreground)' }}>해제등록</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
