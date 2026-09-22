/* 운용사 주주변동관리 — 팝업 2종 (주주변동 등록 / 주주변동 해제등록)
   출처: S2_55 목업의 `openReg()` · `openRelease()`(= S2_56 등록화면 팝업 정의 이식). 삭제 확인은 없다
   (목업 툴바에 [삭제]가 없다 — 형제 화면 S2_53 과 다른 지점이다).

   ⚠ 왜 RowFormModal(스키마 주도 공용 모달)이 아니라 전용 모달인가 — 조건부 필수 때문이 아니다
     (이 화면엔 조건부 필수가 없다). **값 계약**이 맞지 않는다:
     ① RowFormModal 의 `onSave` 는 `(row: Row) => void` 이고 내부에서 `buildRow` 를 거친다.
        buildRow 는 generic_list 의 Row 골격(icon·color·name·category·amount·change·status·trend)을
        **덮어써서** 돌려주고 `id` 를 `initial?.id ?? ''` 로 강제한다 → 우리 도메인 행(ShareholderRow)과
        무관한 8개 키가 섞인 객체를 받아 다시 6개만 골라내는 변환층이 필요하다.
     ② `initial?: Row` 도 ShareholderRow 를 캐스팅해 넘겨야 한다 — 형제 화면이 명시적으로 금지한 패턴이다
        ("행을 통째로 캐스팅해 넘기지 않는다 — 스키마에 없는 키가 섞이면 저장 시 조용히 되돌아올 수 있다").
     ③ 해제등록은 어차피 전용이다 — `선택 대상`(readonly)이 **화면 상태에서 주입**되는 값인데
        RowFormModal 은 vals 를 내부에서만 소유하고 시드도 Row 에서만 받는다. 푸터도 목업은 `닫기`+`해제등록`,
        RowFormModal 은 `취소`+`저장` 고정이다.
     그 한 가지를 빼면 골격·규격은 RowFormModal 을 그대로 따른다 — 개별 컨트롤은 `SchemaField`,
     라벨 래퍼는 RowFormModal `Field` 규격 복제, 저장은 `UI.SaveButton`(submit 계약 = 실패 return / 성공 commit 반환).

   ⚠ 모달 폭 — RowFormModal 규격은 `wide = schema.fields.length > 6`. 등록 폼은 **6항목이라 wide 가 아니다**
     → 2단 그리드가 아니라 1단 좁은 모달(`max-w-[460px]`)이다. `long:true` 는 그 안에서 컨트롤 폭 100% 만 켠다.

   필드 정의(순서·라벨·옵션·placeholder)는 `shareholder_manage_schemas.ts` 의 zod 검증된 PageSchema 가
   SSOT다 — 이 파일은 그 fields 를 순회해 렌더만 한다(항목을 여기 다시 적지 않는다). */
import React from 'react';
import { format } from 'date-fns';
import { UI } from './components';
import { mn } from './mask';
import { SchemaField, isPlainWrapControl } from './schemas/renderers';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from './ui/dialog';
import { toast } from './ui/sonner';
import { SHAREHOLDER_SCHEMA, RELEASE_SCHEMA } from './shareholder_manage_schemas';

const { Button, SaveButton } = UI;

/** 폼 값 — 키는 스키마 field.key, 값은 전부 문자열(SchemaField 값 계약). */
export type ShareholderFormValues = Record<string, string>;

/* RowFormModal `Field` 규격 복제(공유 export 가 아니라 로컬 복사 — generic_list_modal.tsx 참조).
   plain=true 면 <label> 대신 <div>(복합 컨트롤·radio 는 암묵 연결이 어긋난다).
   ⚠ date/month 는 plain 으로 빼지 않는다 — isPlainWrapControl 이 둘 다 false 이고, 폼 모달 <label> 안
     트리거의 2회 토글은 실측 미재현이다(→[[apfs-datepicker]] 2026-09-17 계측 주석 · 형제 화면 동일 판단). */
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

const today = () => format(new Date(), 'yyyy-MM-dd');   // 로컬 달력일 — toISOString 은 KST 00~09시에 전날

/* ──────────────────────────────
   ① 주주변동 등록 — 목업 `openReg()`
   ⚠ 목업에 필수(`*`) 표기가 한 항목도 없다 → 저장 검증도 없다(스키마 required 를 그대로 따른다).
────────────────────────────── */
export function ShareholderFormModal({ initial, onSave, onClose }: {
  initial?: Partial<ShareholderFormValues>;
  onSave: (values: ShareholderFormValues) => void;
  onClose: () => void;
}) {
  /* 초기값 시드 — RowFormModal 과 동일 규칙: initial 값 우선, 비어 있는 select 는 첫 옵션
     (옵션형이 ''로 저장되면 그리드 셀이 빈칸으로 렌더된다 — apfs-form-modal 계약4).
     이 모달은 **등록 전용**이라 edit 분기가 없다(목업 툴바에 [수정]이 없다). */
  const [v, setV] = React.useState<ShareholderFormValues>(() => {
    const seed: ShareholderFormValues = {};
    for (const f of SHAREHOLDER_SCHEMA.fields) {
      const from = initial ? String(initial[f.key] ?? '') : '';
      seed[f.key] = (!from && f.control === 'select') ? (f.options?.[0] ?? '') : from;
    }
    return seed;
  });
  const [errKey, setErrKey] = React.useState('');
  const set = (k: string, val: string) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errKey === k) setErrKey('');   // 자기 키의 에러는 입력하는 즉시 지운다
  };

  /* 스키마에 required 가 하나도 없어 현재는 항상 통과한다 — 그래도 검증 골격을 남겨 둔다
     (원문에 필수가 생기면 스키마 한 줄로 살아나고, 에러 표시 경로가 형제 화면과 같아진다). */
  const submit = () => {
    const miss = SHAREHOLDER_SCHEMA.fields.find((f) => f.required && !String(v[f.key] ?? '').trim());
    if (miss) { setErrKey(miss.key); return; }
    return () => {
      onSave({ ...v });
      toast.success('저장되었습니다 (목업)');
    };
  };

  const dlgRef = React.useRef<DialogHandle>(null);

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* 바깥 클릭으로는 안 닫힘 — 폼 작성 중 오터치 유실 방지(RowFormModal 동형).
          항목 6개(≤6) → RowFormModal 의 좁은 모달 규격(max-w-[460px] · 1단). */}
      <DialogContent className="max-w-[460px] max-h-[86vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>{SHAREHOLDER_SCHEMA.title}</DialogTitle>
          <DialogDescription className="sr-only">{SHAREHOLDER_SCHEMA.title} 양식</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          {SHAREHOLDER_SCHEMA.fields.map((f) => (
            <Field
              key={f.key}
              label={f.label + (f.required ? ' *' : '')}
              plain={isPlainWrapControl(f)}
              errMsg={errKey === f.key ? `${f.label}을(를) 입력하세요.` : undefined}>
              <SchemaField field={f} value={v[f.key] ?? ''} onChange={(x) => set(f.key, x)} invalid={errKey === f.key} />
            </Field>
          ))}
        </div>

        {/* 푸터 — 목업 modal-foot 구성(닫기·저장) */}
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
   ② 주주변동 해제등록 — 목업 `openRelease()`
   ⚠ 목업에 `구분`(등록/해제) 게이트가 없다 — 이미 해제된 행을 골라도 막지 않는다.
     원문에 그 도메인 규칙이 없으므로 임의로 만들지 않는다(프로토타입이라 그대로 둔다).
   ⚠ 해제사유 입력은 원문에 없다 — 만들지 않는다.
────────────────────────────── */
export function ShareholderReleaseModal({ count, onSave, onClose }: {
  /** 선택 건수 — 읽기전용 표시값(입력 대상 아님) */
  count: number;
  onSave: (v: { rd: string }) => void;
  onClose: () => void;
}) {
  /* 해제일자 기본값은 오늘 — 목업은 '2025-03-31' 리터럴이지만 그 값은 목업 더미의 시점이라
     실제 화면에서는 의미가 없다(선례: 형제 화면 ViolationReleaseModal · subfund_manage 의 applyDate=today()). */
  const [rd, setRd] = React.useState(today());
  const [err, setErr] = React.useState(false);
  const setDate = (val: string) => { setRd(val); if (err) setErr(false); };

  /* 선택 건수는 행 데이터(건수)라 mn() 경유 — 단위('건 선택됨')는 축이라 비마스킹 */
  const targetText = mn(String(count)) + '건 선택됨';

  const submit = () => {
    if (!rd.trim()) { setErr(true); return; }
    return () => {
      onSave({ rd });
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
                plain={isPlainWrapControl(f)}
                errMsg={showErr ? `${f.label}을(를) 입력하세요.` : undefined}>
                <SchemaField
                  field={f}
                  value={readonly ? targetText : rd}
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
