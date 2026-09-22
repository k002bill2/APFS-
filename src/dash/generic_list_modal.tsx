/* 일반 리스트 페이지의 CRUD 모달 — 신규 등록 / 수정 / 삭제(2단계 확인).
   Radix Dialog 기반(focus trap·Escape·aria-modal·포커스 복귀 제공). */
import React from 'react';
import { UI } from './components';
import type { Tone } from './components';
import { SchemaField, isComplexControl, isPlainWrapControl } from './schemas/renderers';
import { isAddressEmpty } from './fields/address_value';
import type { PageSchema } from './schemas/types';
import { buildRow } from './schemas/build_row';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription , type DialogHandle} from './ui/dialog';
import { ReviewMarker } from './review_marker';
import type { ReviewNoteSpec } from './schemas/types';

const { useState } = React;
const { Button, SaveButton } = UI;

export type Row = {
  id: string;
  icon: string;
  color: string;
  name: string;
  category: string;
  amount: number;
  change: number;
  status: string;
  trend: number[];
};

/* 상태 선택지 — 페이지의 StatusBadge tone 매핑과 공유 */
export const STATUS_CHOICES: { label: string; tone: Tone }[] = [
  { label: "정상", tone: "success" },
  { label: "진행중", tone: "warning" },
  { label: "검토중", tone: "info" },
  { label: "보류", tone: "danger" },
  { label: "완료", tone: "primary" },
];

export function statusTone(label: string): Tone {
  return STATUS_CHOICES.find((s) => s.label === label)?.tone ?? "info";
}

const labelStyle: React.CSSProperties = { fontSize: 12, marginBottom: 5 };

// 문서 전체 문자 길이 상한 — 백엔드가 없어 richtext의 base64 인라인 이미지가 저장값에 누적되므로,
// 개별 이미지 캡(1MB)과 별개로 문서 총량을 3M chars로 막는다(다수 이미지 누적 방어).
const DOC_MAX_CHARS = 3 * 1024 * 1024;

// plain=true면 <label> 대신 <div>로 감싼다.
// ⚠️ richtext(Plate)·filepond처럼 내부에 자체 버튼/컨트롤을 품은 복합 컨트롤은 절대 <label>로 감싸면 안 된다:
//    <label>은 라벨 가능한 첫 자손과 암묵 연결되는데, 에디터 본문은 라벨 불가(div[role=textbox])라
//    건너뛰고 툴바의 첫 버튼(B/굵게)과 연결된다 → 본문을 hover하면 B가 hover로 켜지고, 본문을 클릭하면
//    B 버튼이 클릭돼 toggleBold가 발화한다(빈 문단에 bold가 박혀 "B가 켜진 채 안 꺼짐"). 그래서 <div>로 감싼다.
//    (네이티브 단일 컨트롤은 <label> 암묵 연결이 정상·접근성 이점이 있어 그대로 둔다. 에디터는 자체 aria-label 보유.)
/* 배열: 라벨 위·컨트롤 아래(세로 적층, 기존 유지 — 2026-09-08 inline 시안은 사용자 원복). 컨트롤 폭은 renderers.tsx base가 fit-content로 결정. */
// note: FieldSpec.note → 라벨 옆 ⚠검토필요 마커(공용 ReviewMarker). 트리거가 <span role=button>이라 <label> 안에서도
//   암묵 연결을 가로채지 않는다(review_marker.tsx 주석). 접근名은 마커가 `${label} 검토필요 메모 보기`로 만든다.
function Field({ label, children, errMsg, className, plain, note }: { label: string; children: React.ReactNode; errMsg?: string; className?: string; plain?: boolean; note?: ReviewNoteSpec }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className={`block mb-3.5 ${className ?? ''}`}>
      <span className="font-semibold text-caption block" style={labelStyle}>{label}{note && <ReviewMarker {...note} label={label} />}</span>
      {children}
      {errMsg && (
        <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>
          {errMsg}
        </span>
      )}
    </Wrap>
  );
}

export function RowFormModal({ mode, initial, schema, onSave, onClose, onDelete, title }: {
  mode: "create" | "edit";
  initial?: Row;
  schema: PageSchema;
  onSave: (row: Row) => void;
  onClose: () => void;
  onDelete?: () => void;
  /** 모달 제목 오버라이드(선택). 미지정 시 mode별 기본("신규 등록"/"항목 수정").
      워크플로우 화면처럼 같은 스키마를 단계별 다른 제목으로 여는 경우(예: 선정조합 등록/수정)에 사용. */
  title?: string;
}) {
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    // 옵션형 컨트롤(select·radio·switch)은 첫 옵션을 기본값으로 시드한다.
    // ⚠️ 등록 모드에 `initial`(선택 행에서 온 부분 프리필)이 오는 화면이 있어 — 그 키가 없으면 값이 ''가 되는데,
    //    switch 는 off/on 둘 중 하나로만 그려져 **빈 값이 '아니오'로 위장**된다(라디오는 미선택이 보였다).
    //    그래서 create 모드에서 값이 비면 옵션형은 첫 옵션으로 되메운다. edit 모드는 저장된 ''를 보존한다(무단 변경 금지).
    const optionish = (f: any) => f.control === 'select' || f.control === 'radio' || f.control === 'switch';
    for (const f of schema.fields) {
      const seeded = initial ? String((initial as any)[f.key] ?? '') : '';
      seed[f.key] = (!seeded && optionish(f) && (!initial || mode === 'create')) ? (f.options?.[0] ?? '') : seeded;
    }
    return seed;
  });
  // 항목 수가 많으면(>6) 2단 wide 레이아웃으로 자동 적응. 적으면 기존 1단(좁은) 모달.
  const wide = schema.fields.length > 6;
  const [errKey, setErrKey] = useState("");
  const [docErr, setDocErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k: string, v: string) => {
    setVals((p) => ({ ...p, [k]: v }));
    if (errKey === k) setErrKey('');
    if (docErr) setDocErr('');
  };

  const submit = () => {
    // 빈 값 판정은 컨트롤의 **값 계약**을 따른다 — address 는 우편번호만 든 "(06236) " 가
    // 원시 trim 으로는 채워진 것처럼 보여 본문 없는 주소가 통과한다(richtext 빈 문서와 같은 계열).
    const isEmpty = (f: typeof schema.fields[number]) =>
      f.control === 'address' ? isAddressEmpty(vals[f.key]) : !String(vals[f.key] ?? '').trim();
    const req = schema.fields.find((f) => f.required && isEmpty(f));
    if (req) { setErrKey(req.key); return; }
    // 문서 총량 가드 — base64 인라인 이미지 누적으로 저장값이 과대해지는 것 방지.
    const totalChars = Object.values(vals).reduce((s, v) => s + (v?.length || 0), 0);
    if (totalChars > DOC_MAX_CHARS) {
      setDocErr(`문서 용량이 너무 큽니다(약 ${Math.round(totalChars / 1024 / 1024)}MB). 이미지 수를 줄이거나 첨부파일로 올려주세요.`);
      return;
    }
    setDocErr('');
    return () => onSave(buildRow(vals, initial, schema));
  };

  const dlgRef = React.useRef<DialogHandle>(null);

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* 바깥 클릭으로는 안 닫힘 — 폼 작성 중 오터치 유실 방지 + 에디터 드롭다운을 닫으려는 바깥 클릭이
          모달까지 닫는 문제 차단. 닫기는 X·취소·저장·Escape로만. 드롭다운/팝오버는 자체 Radix 레이어라
          바깥 클릭 dismiss가 그대로 동작한다(최상위 레이어부터 닫힘). */}
      <DialogContent className={wide ? "max-w-[880px] max-h-[88vh]" : "max-w-[460px] max-h-[86vh]"}
        onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>{title ?? (mode === "create" ? "신규 등록" : "항목 수정")}</DialogTitle>
          <DialogDescription className="sr-only">
            {title ? `${title} 양식` : (mode === "create" ? "신규 항목 등록 양식" : "항목 수정 양식")}
          </DialogDescription>
        </DialogHeader>

        {/* 폼 — wide(항목 多)면 2단 그리드(좁은 화면은 1단으로 적층), textarea/file/long 은 전체 폭 차지 */}
        <div className="overflow-y-auto p-[46px]">
          <div className={wide ? "grid grid-cols-1 sm:grid-cols-2 gap-x-5" : ""}>
            {schema.fields.map((f) => {
              // richtext/filepond/tags = 내부에 자체 버튼/combobox를 품은 복합 컨트롤 → <label> 래핑 금지(Field plain).
              const complex = isComplexControl(f.control);   // 판정 SSOT = schemas/renderers.tsx COMPLEX_CONTROLS
              // long(설명·비고·운용사명·펀드명 등 긴 텍스트)도 전체 폭 — SchemaField 가 폭 100% 를 함께 켠다(field.long).
              const span2 = wide && (f.control === "textarea" || f.control === "file" || complex || !!f.long);
              return (
                <Field
                  key={f.key}
                  label={f.label + (f.required ? ' *' : '')}
                  className={span2 ? "sm:col-span-2" : undefined}
                  plain={isPlainWrapControl(f)}
                  note={f.note}
                  errMsg={errKey === f.key ? `${f.label}을(를) 입력하세요.` : undefined}>
                  <SchemaField
                    field={f}
                    value={vals[f.key] ?? ''}
                    onChange={(v) => set(f.key, v)}
                    invalid={errKey === f.key}
                  />
                </Field>
              );
            })}
          </div>
        </div>

        {/* 문서 총량 초과 안내 — 필드별 에러(errMsg)와 동일 스타일의 전역 배너 */}
        {docErr && (
          <div role="alert" className="text-danger px-[46px] pb-1" style={{ fontSize: 12 }}>{docErr}</div>
        )}

        {/* 푸터 */}
        <DialogFooter className="px-[46px]">
          <div>
            {mode === "edit" && onDelete && (
              confirmDel
                ? <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: "var(--danger)" }} onClick={onDelete}>삭제 확인</Button>
                : <Button variant="ghost" size="sm" leadingIcon="trash" style={{ color: "var(--danger)" }} onClick={() => setConfirmDel(true)}>삭제</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>취소</Button>
            <SaveButton onSubmit={submit} />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
