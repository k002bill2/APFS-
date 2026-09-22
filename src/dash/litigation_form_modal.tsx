/* 운용사 소송관리 — 팝업 3종 (등록·수정 폼 / 해제등록 / 삭제 확인)
   출처: S2_57 목업의 `openReg(idx)` · `openDelete()`(= S2_58 등록화면 팝업 정의를 흡수한 것).
   해제등록 팝업만 **원문에 정의가 없어** 형제 S2_55 규격을 차용했다(→ litigation_manage_schemas.ts 헤더).

   ⚠ 왜 RowFormModal(스키마 주도 공용 모달)이 아니라 전용 모달인가 — 조건부 필수 때문이 아니다
     (이 화면엔 조건부 필수가 없다). **값 계약**이 맞지 않는다(형제 shareholder_form_modal 헤더와 동일한 ①②③):
     ① RowFormModal 의 `onSave` 는 `(row: Row) => void` 이고 내부에서 `buildRow` 를 거친다.
        buildRow 는 generic_list 의 Row 골격(icon·color·name·category·amount·change·status·trend)을
        **덮어써서** 돌려주고 `id` 를 `initial?.id ?? ''` 로 강제한다 → 우리 도메인 행(LitigationRow)과
        무관한 8개 키가 섞인 객체를 받아 다시 5개만 골라내는 변환층이 필요하다.
     ② `initial?: Row` 도 LitigationRow 를 캐스팅해 넘겨야 한다 — 형제 화면이 명시적으로 금지한 패턴이다
        ("행을 통째로 캐스팅해 넘기지 않는다 — 스키마에 없는 키가 섞이면 저장 시 조용히 되돌아올 수 있다").
     ③ 해제등록은 어차피 전용이다 — `선택 대상`(readonly)이 **화면 상태에서 주입**되는 값인데
        RowFormModal 은 vals 를 내부에서만 소유하고 시드도 Row 에서만 받는다. 푸터도 `닫기`+`해제등록` 이고
        RowFormModal 은 `취소`+`저장` 고정이다.
     그 한 가지를 빼면 골격·규격은 RowFormModal 을 그대로 따른다 — 개별 컨트롤은 `SchemaField`,
     라벨 래퍼는 RowFormModal `Field` 규격 복제, 저장은 `UI.SaveButton`(submit 계약 = 실패 return / 성공 commit 반환).

   ⚠ 모달 폭 — RowFormModal 규격은 `wide = schema.fields.length > 6`. 등록 폼은 **5항목이라 wide 가 아니다**
     → 2단 그리드가 아니라 1단 좁은 모달(`max-w-[460px]`)이다. `long:true` 는 그 안에서 컨트롤 폭 100% 만 켠다.

   필드 정의(순서·라벨·옵션·placeholder)는 `litigation_manage_schemas.ts` 의 zod 검증된 PageSchema 가
   SSOT다 — 이 파일은 그 fields 를 순회해 렌더만 한다(항목을 여기 다시 적지 않는다). */
import React from 'react';
import { format } from 'date-fns';
import { UI } from './components';
import { mn } from './mask';
import { SchemaField, isPlainWrapControl } from './schemas/renderers';
import type { FieldSpec } from './schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from './ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';
import { toast } from './ui/sonner';
import { LITIGATION_SCHEMA, RELEASE_SCHEMA } from './litigation_manage_schemas';

const { Button, SaveButton } = UI;

/** 폼 값 — 키는 스키마 field.key, 값은 전부 문자열(SchemaField 값 계약). */
export type LitigationFormValues = Record<string, string>;

/* RowFormModal `Field` 규격 복제(공유 export 가 아니라 로컬 복사 — generic_list_modal.tsx 참조).
   plain=true 면 <label> 대신 <div>(복합 컨트롤·radio 는 암묵 연결이 어긋난다 — 판정 SSOT 는 isPlainWrapControl).
   ⚠ date/month 는 plain 으로 빼지 않는다 — isPlainWrapControl 이 둘 다 false 이고, 폼 모달 <label> 안
     트리거의 2회 토글은 실측 미재현이다(→[[apfs-datepicker]] 2026-09-17 계측 주석 · 형제 2화면 동일 판단). */
const labelStyle: React.CSSProperties = { fontSize: 12, marginBottom: 5 };
function Field({ label, children, errMsg, plain }: { label: string; children: React.ReactNode; errMsg?: string; plain?: boolean }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-3.5">
      <span className="font-semibold text-caption block" style={labelStyle}>{label}</span>
      {children}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}

/* 초기값 시드 — RowFormModal 과 동일 규칙: initial 값 우선, 등록 모드에서 비어 있는 select 는 첫 옵션.
   (옵션형이 ''로 저장되면 그리드 셀이 빈칸으로 렌더된다 — apfs-form-modal 계약4)
   ⚠ `radio`(확정구분)는 시드하지 않는다 — 목업 `openReg()` 가 신규 등록에서 두 라디오를 **모두 미체크**로
     연다(`r&&r.conf==='확정'?' checked':''`). 첫 옵션을 시드하면 원문에 없는 '확정' 기본값이 조용히 생긴다.
     required 검증이 미선택을 잡으므로 빈 값으로 저장될 일은 없다(형제 2화면의 seed 도 select 만 특수처리). */
function seedValues(fields: FieldSpec[], mode: 'create' | 'edit', initial?: Partial<LitigationFormValues>): LitigationFormValues {
  const seed: LitigationFormValues = {};
  for (const f of fields) {
    const from = initial ? String(initial[f.key] ?? '') : '';
    seed[f.key] = (!from && f.control === 'select' && mode === 'create') ? (f.options?.[0] ?? '') : from;
  }
  return seed;
}

const today = () => format(new Date(), 'yyyy-MM-dd');   // 로컬 달력일 — toISOString 은 KST 00~09시에 전날

/* ──────────────────────────────
   ① 소송 등록 / 수정 — 목업 `openReg(idx)`
   ⚠ 목업은 5항목 전부 필수(`*`)다 — 스키마 required 를 그대로 검증한다.
────────────────────────────── */
export function LitigationFormModal({ mode, initial, title, onSave, onClose }: {
  mode: 'create' | 'edit';
  initial?: Partial<LitigationFormValues>;
  /** 제목 오버라이드 — 등록/수정이 같은 폼을 공유한다(목업 openReg 의 title 분기와 동형). */
  title: string;
  onSave: (values: LitigationFormValues) => void;
  onClose: () => void;
}) {
  const [v, setV] = React.useState<LitigationFormValues>(() => seedValues(LITIGATION_SCHEMA.fields, mode, initial));
  const [errKey, setErrKey] = React.useState('');
  const set = (k: string, val: string) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errKey === k) setErrKey('');   // 자기 키의 에러는 입력하는 즉시 지운다
  };

  const submit = () => {
    const miss = LITIGATION_SCHEMA.fields.find((f) => f.required && !String(v[f.key] ?? '').trim());
    if (miss) { setErrKey(miss.key); return; }
    return () => {
      onSave({ ...v });
      toast.success(mode === 'create' ? '등록되었습니다 (목업)' : '수정되었습니다 (목업)');
    };
  };

  const dlgRef = React.useRef<DialogHandle>(null);

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* 바깥 클릭으로는 안 닫힘 — 폼 작성 중 오터치 유실 방지(RowFormModal 동형).
          항목 5개(≤6) → RowFormModal 의 좁은 모달 규격(max-w-[460px] · 1단). */}
      <DialogContent className="max-w-[460px] max-h-[86vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title} 양식</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          {LITIGATION_SCHEMA.fields.map((f) => (
            <Field
              key={f.key}
              label={f.label + (f.required ? ' *' : '')}
              plain={isPlainWrapControl(f.control)}
              errMsg={errKey === f.key ? `${f.label}을(를) 입력하세요.` : undefined}>
              <SchemaField field={f} value={v[f.key] ?? ''} onChange={(x) => set(f.key, x)} invalid={errKey === f.key} />
            </Field>
          ))}
        </div>

        {/* 푸터 — 목업 modal-foot 구성(닫기·저장). 삭제는 목록 selbar 가 소유한다(목업 툴바와 동일) */}
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
   ② 소송 해제등록 — **원문 미정의 → 형제 S2_55 `openRelease()` 규격 차용**
   ⚠ `구분`(등록/해제) 게이트를 두지 않는다 — 목업 `$('release')` 도 이미 '해제'인 행을 막지 않고,
     원문에 그 도메인 규칙이 없으므로 임의로 만들지 않는다(프로토타입이라 그대로 둔다).
────────────────────────────── */
export function LitigationReleaseModal({ count, onSave, onClose }: {
  /** 선택 건수 — 읽기전용 표시값(입력 대상 아님) */
  count: number;
  onSave: (v: { rdate: string }) => void;
  onClose: () => void;
}) {
  /* 해제일자 기본값은 오늘 — 목업 더미의 '2023-06-30' 은 그 시점 값이라 실화면에서 의미가 없다
     (선례: ShareholderReleaseModal · ViolationReleaseModal · subfund_manage 의 applyDate=today()). */
  const [rdate, setRdate] = React.useState(today());
  const [err, setErr] = React.useState(false);
  const setDate = (val: string) => { setRdate(val); if (err) setErr(false); };

  /* 선택 건수는 행 데이터(건수)라 mn() 경유 — 단위('건 선택됨')는 축이라 비마스킹 */
  const targetText = mn(String(count)) + '건 선택됨';

  const submit = () => {
    if (!rdate.trim()) { setErr(true); return; }
    return () => {
      onSave({ rdate });
      toast.success(`${mn(String(count))}건 해제등록 되었습니다`);
    };
  };

  const dlgRef = React.useRef<DialogHandle>(null);

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* 항목 2개(≤6) → 좁은 모달(목업 .modal.sm 과 동급) */}
      <DialogContent className="max-w-[460px] max-h-[86vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>{RELEASE_SCHEMA.title}</DialogTitle>
          <DialogDescription className="sr-only">{RELEASE_SCHEMA.title} 양식</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          {RELEASE_SCHEMA.fields.map((f) => {
            const readonly = f.control === 'readonly';
            const showErr = !readonly && err;
            return (
              <Field
                key={f.key}
                label={f.label + (f.required ? ' *' : '')}
                plain={isPlainWrapControl(f.control)}
                errMsg={showErr ? `${f.label}을(를) 입력하세요.` : undefined}>
                <SchemaField
                  field={f}
                  value={readonly ? targetText : rdate}
                  onChange={(x) => { if (!readonly) setDate(x); }}
                  invalid={showErr}
                />
              </Field>
            );
          })}
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <SaveButton onSubmit={submit} busyLabel="처리 중">해제등록</SaveButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────
   ③ 삭제 확인 — 목업 `openDelete()`(role=alertdialog). 문구도 목업 원문 그대로.
────────────────────────────── */
export function LitigationDeleteDialog({ count, onConfirm, onClose }: {
  count: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>소송 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            선택한 <b className="text-foreground">{mn(String(count))}건</b>을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} style={{ background: 'var(--danger)', color: 'var(--destructive-foreground)' }}>삭제</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
