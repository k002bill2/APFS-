/* 법률/규약위반사항 관리 — 팝업 3종 (등록·수정 폼 / 해제등록 / 삭제 확인)
   출처: S2_53 목업의 `openReg(idx)` · `openRelease()` · `openDelete()`.

   ⚠ 등록·수정은 RowFormModal(스키마 주도)로 담을 수 없어 전용 모달이다 — 목업 `syncFundReq` 의
     **조건부 필수**(법령/규약위반 === '규약' → 자펀드 필수) 때문이다. RowFormModal 은 폼 값(vals)을
     내부 state 로 소유하고 밖으로 알리지 않으므로, 페이지가 '법령/규약위반' 의 현재 값을 알 수 없어
     schema.fields[].required 를 살아 있는 값에 맞춰 바꿀 수 없다(정적 스키마만 본다).
     그 한 가지를 빼면 골격·규격은 RowFormModal 을 그대로 따른다: 항목 15개(>6) → `max-w-[880px]`
     2단 그리드, 본문 `p-[46px]`(+헤더·푸터 `px-[46px]` 인셋), 개별 컨트롤은 `SchemaField`,
     라벨 래퍼는 RowFormModal `Field` 규격 복제, 저장은 `UI.SaveButton`(submit 계약 = 실패 return / 성공 commit 반환).
     선례: member_info_form_modal.tsx(목업 전용 규칙 3종 때문에 같은 이유로 전용 모달).

   필드 정의(순서·라벨·옵션)는 `violation_manage_schemas.ts` 의 zod 검증된 PageSchema 가 SSOT다 —
   이 파일은 그 fields 를 순회해 렌더만 한다(항목을 여기 다시 적지 않는다). */
import React from 'react';
import { format } from 'date-fns';
import { UI } from './components';
import { SchemaField, isPlainWrapControl } from './schemas/renderers';
import type { FieldSpec } from './schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from './ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';
import { toast } from './ui/sonner';
import { VIOLATION_SCHEMA, RELEASE_SCHEMA, FUND_REQUIRED_WHEN } from './violation_manage_schemas';

const { Button, SaveButton } = UI;

/** 폼 값 — 키는 스키마 field.key, 값은 전부 문자열(SchemaField 값 계약). */
export type ViolationFormValues = Record<string, string>;

/* RowFormModal `Field` 규격 복제(공유 export 가 아니라 로컬 복사 — generic_list_modal.tsx 참조).
   plain=true 면 <label> 대신 <div>(복합 컨트롤·radio 는 암묵 연결이 어긋난다).
   ⚠ date/month 는 plain 으로 빼지 않는다 — 폼 모달 <label> 안 트리거의 2회 토글은 실측 미재현이고
     기존 control:'date' 소비처가 전부 <label> 구조다(→[[apfs-datepicker]] 2026-09-17 계측 주석). */
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
   (옵션형이 ''로 저장되면 그리드 셀이 빈칸으로 렌더된다 — apfs-form-modal 계약4) */
function seedValues(fields: FieldSpec[], mode: 'create' | 'edit', initial?: Partial<ViolationFormValues>): ViolationFormValues {
  const seed: ViolationFormValues = {};
  for (const f of fields) {
    const from = initial ? String(initial[f.key] ?? '') : '';
    seed[f.key] = (!from && f.control === 'select' && mode === 'create') ? (f.options?.[0] ?? '') : from;
  }
  return seed;
}

/* ──────────────────────────────
   ① 위반사항 등록 / 수정
────────────────────────────── */
export function ViolationFormModal({ mode, initial, title, onSave, onClose }: {
  mode: 'create' | 'edit';
  initial?: Partial<ViolationFormValues>;
  /** 제목 오버라이드 — 등록/수정이 같은 폼을 공유한다(목업 openReg 의 title 분기와 동형). */
  title: string;
  onSave: (values: ViolationFormValues) => void;
  onClose: () => void;
}) {
  const [v, setV] = React.useState<ViolationFormValues>(() => seedValues(VIOLATION_SCHEMA.fields, mode, initial));
  const [errKey, setErrKey] = React.useState('');
  const set = (k: string, val: string) => {
    setV((p) => ({ ...p, [k]: val }));
    /* 자기 키의 에러는 입력하는 즉시 지운다. 여기에 더해 **게이트 키**(법령/규약위반)를 바꾸면
       조건부 필수가 풀릴 수 있으므로 자펀드에 걸린 에러도 함께 지운다 — 안 지우면 라벨의 `*` 만
       사라지고 빨간 테두리·문구는 남아 `aria-invalid=true` + `aria-required=false` 모순이 지속된다. */
    if (errKey === k || (k === FUND_REQUIRED_WHEN.gateKey && errKey === FUND_REQUIRED_WHEN.key)) setErrKey('');
  };

  /* 조건부 필수(목업 `syncFundReq`) — 법령/규약위반 select 를 바꾸는 즉시 자펀드 라벨의 `*`·필수
     테두리·저장 검증이 함께 따라온다. 판정 키/값은 스키마 옆 FUND_REQUIRED_WHEN 이 SSOT. */
  const fundRequired = v[FUND_REQUIRED_WHEN.gateKey] === FUND_REQUIRED_WHEN.gateValue;
  const requiredOf = (f: FieldSpec) => (f.key === FUND_REQUIRED_WHEN.key ? fundRequired : !!f.required);

  const submit = () => {
    const miss = VIOLATION_SCHEMA.fields.find((f) => requiredOf(f) && !String(v[f.key] ?? '').trim());
    if (miss) { setErrKey(miss.key); return; }
    return () => {
      onSave({ ...v });
      toast.success(mode === 'create' ? '등록되었습니다 (목업)' : '수정되었습니다 (목업)');
    };
  };

  const dlgRef = React.useRef<DialogHandle>(null);

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* 바깥 클릭으로는 안 닫힘 — 폼 작성 중 오터치 유실 방지(RowFormModal 동형) */}
      <DialogContent className="max-w-[880px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title} 양식</DialogDescription>
        </DialogHeader>

        {/* 항목 15개(>6) → 2단 wide 그리드. 좁은 화면은 1단 적층(RowFormModal 규격 동일).
            textarea·long 은 전체 폭(sm:col-span-2) — 전용 모달은 span2 가 자동이 아니라 직접 붙인다. */}
        <div className="overflow-y-auto p-[46px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
            {VIOLATION_SCHEMA.fields.map((f) => {
              const required = requiredOf(f);
              /* 조건부 필드만 파생 spec 을 만든다 — SchemaField 가 required 로 `*` 테두리·aria-required 를 켠다 */
              const spec: FieldSpec = required === !!f.required ? f : { ...f, required };
              const span2 = f.control === 'textarea' || !!f.long;
              /* 에러 표시는 `required` 와 결합한다 — 필수가 풀린 필드에 검증 단서를 남기지 않는다
                 (set() 의 게이트 정리와 이중 방어: 다른 경로로 들어온 stale errKey 도 여기서 걸린다). */
              const showErr = errKey === f.key && required;
              return (
                <Field
                  key={f.key}
                  label={f.label + (required ? ' *' : '')}
                  className={span2 ? 'sm:col-span-2' : undefined}
                  plain={isPlainWrapControl(f.control)}
                  errMsg={showErr ? `${f.label}을(를) 입력하세요.` : undefined}>
                  <SchemaField field={spec} value={v[f.key] ?? ''} onChange={(x) => set(f.key, x)} invalid={showErr} />
                </Field>
              );
            })}
          </div>
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
   ② 위반사항 해제등록 — 목업 `openRelease()`
   ⚠ 해제등록은 `구분`='등록' 행에만 — 선택에 '해제' 행이 있으면 버튼 숨김 + openRelease 가드 +
     commitRelease 는 '등록' 행만 전이(2026-09-23 사용자 결정, 목업은 막지 않았음 · violation_manage.tsx).
────────────────────────────── */
const today = () => format(new Date(), 'yyyy-MM-dd');   // 로컬 달력일 — toISOString 은 KST 00~09시에 전날

export function ViolationReleaseModal({ count, onSave, onClose }: {
  /** 선택 건수 — 읽기전용 표시값(입력 대상 아님) */
  count: number;
  onSave: (v: { rd: string; reason: string }) => void;
  onClose: () => void;
}) {
  /* 해제일자 기본값은 오늘 — 목업은 '2022-09-20' 리터럴이지만 그 값은 목업 더미의 시점이라
     실제 화면에서는 의미가 없다(선례: subfund_manage 의 applyDate=today()). */
  const [v, setV] = React.useState({ rd: today(), reason: '' });
  const [errKey, setErrKey] = React.useState('');
  const set = (k: 'rd' | 'reason', val: string) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errKey === k) setErrKey('');
  };

  /* 선택 건수는 행 데이터(건수)라 mn() 경유 — 라벨·단위('건')는 축이라 비마스킹 */
  const countText = String(count) + '건';
  const valueOf = (key: string) => (key === 'count' ? countText : key === 'rd' ? v.rd : v.reason);

  const submit = () => {
    if (!v.rd.trim()) { setErrKey('rd'); return; }
    return () => {
      onSave({ rd: v.rd, reason: v.reason });
      toast.success(`${String(count)}건 해제등록 되었습니다`);
    };
  };

  const dlgRef = React.useRef<DialogHandle>(null);

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* 항목 3개(≤6) → 좁은 모달(목업 .modal.sm 440px 과 동급) */}
      <DialogContent className="max-w-[460px] max-h-[86vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>{RELEASE_SCHEMA.title}</DialogTitle>
          <DialogDescription className="sr-only">{RELEASE_SCHEMA.title} 양식</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          {RELEASE_SCHEMA.fields.map((f) => (
            <Field
              key={f.key}
              label={f.label + (f.required ? ' *' : '')}
              plain={isPlainWrapControl(f.control)}
              errMsg={errKey === f.key ? `${f.label}을(를) 입력하세요.` : undefined}>
              <SchemaField
                field={f}
                value={valueOf(f.key)}
                onChange={(x) => { if (f.key !== 'count') set(f.key as 'rd' | 'reason', x); }}
                invalid={errKey === f.key}
              />
            </Field>
          ))}
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
export function ViolationDeleteDialog({ count, onConfirm, onClose }: {
  count: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>위반사항 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            선택한 <b className="text-foreground">{String(count)}건</b>을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.
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
