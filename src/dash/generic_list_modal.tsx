/* 일반 리스트 페이지의 CRUD 모달 — 신규 등록 / 수정 / 삭제(2단계 확인).
   Radix Dialog 기반(focus trap·Escape·aria-modal·포커스 복귀 제공). */
import React from 'react';
import { UI } from './components';
import type { Tone } from './components';
import { SchemaField } from './schemas/renderers';
import type { PageSchema } from './schemas/types';
import { buildRow } from './schemas/build_row';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';

const { useState } = React;
const { Button } = UI;

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

// plain=true면 <label> 대신 <div>로 감싼다.
// ⚠️ richtext(Tiptap)·filepond처럼 내부에 자체 버튼/컨트롤을 품은 복합 컨트롤은 절대 <label>로 감싸면 안 된다:
//    <label>은 라벨 가능한 첫 자손과 암묵 연결되는데, 에디터 본문은 라벨 불가(div[role=textbox])라
//    건너뛰고 툴바의 첫 버튼(B/굵게)과 연결된다 → 본문을 hover하면 B가 hover로 켜지고, 본문을 클릭하면
//    B 버튼이 클릭돼 toggleBold가 발화한다(빈 문단에 bold가 박혀 "B가 켜진 채 안 꺼짐"). 그래서 <div>로 감싼다.
//    (네이티브 단일 컨트롤은 <label> 암묵 연결이 정상·접근성 이점이 있어 그대로 둔다. 에디터는 자체 aria-label 보유.)
function Field({ label, children, errMsg, className, plain }: { label: string; children: React.ReactNode; errMsg?: string; className?: string; plain?: boolean }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className={`block mb-3.5 ${className ?? ''}`}>
      <span className="font-semibold text-caption block" style={labelStyle}>{label}</span>
      {children}
      {errMsg && (
        <span className="text-danger block mt-1" style={{ fontSize: 11.5 }}>
          {errMsg}
        </span>
      )}
    </Wrap>
  );
}

export function RowFormModal({ mode, initial, schema, onSave, onClose, onDelete }: {
  mode: "create" | "edit";
  initial?: Row;
  schema: PageSchema;
  onSave: (row: Row) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const f of schema.fields) seed[f.key] = initial ? String((initial as any)[f.key] ?? '') : ((f.control === 'select' || f.control === 'radio') ? (f.options?.[0] ?? '') : '');
    return seed;
  });
  // 항목 수가 많으면(>6) 2단 wide 레이아웃으로 자동 적응. 적으면 기존 1단(좁은) 모달.
  const wide = schema.fields.length > 6;
  const [errKey, setErrKey] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k: string, v: string) => {
    setVals((p) => ({ ...p, [k]: v }));
    if (errKey === k) setErrKey('');
  };

  const submit = () => {
    const req = schema.fields.find((f) => f.required && !String(vals[f.key] ?? '').trim());
    if (req) { setErrKey(req.key); return; }
    onSave(buildRow(vals, initial, schema));
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={wide ? "max-w-[880px] max-h-[88vh]" : "max-w-[460px] max-h-[86vh]"}>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "신규 등록" : "항목 수정"}</DialogTitle>
          <DialogDescription className="sr-only">
            {mode === "create" ? "신규 항목 등록 양식" : "항목 수정 양식"}
          </DialogDescription>
        </DialogHeader>

        {/* 폼 — wide(항목 多)면 2단 그리드(좁은 화면은 1단으로 적층), textarea/file은 전체 폭 차지 */}
        <div className="overflow-y-auto p-[18px]">
          <div className={wide ? "grid grid-cols-1 sm:grid-cols-2 gap-x-5" : ""}>
            {schema.fields.map((f) => {
              // richtext/filepond = 내부에 자체 버튼/컨트롤을 품은 복합 컨트롤 → <label> 래핑 금지(Field plain).
              const complex = f.control === "richtext" || f.control === "filepond";
              const span2 = wide && (f.control === "textarea" || f.control === "file" || complex);
              return (
                <Field
                  key={f.key}
                  label={f.label + (f.required ? ' *' : '')}
                  className={span2 ? "sm:col-span-2" : undefined}
                  plain={complex}
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

        {/* 푸터 */}
        <DialogFooter>
          <div>
            {mode === "edit" && onDelete && (
              confirmDel
                ? <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: "var(--danger)" }} onClick={onDelete}>삭제 확인</Button>
                : <Button variant="ghost" size="sm" leadingIcon="trash" style={{ color: "var(--danger)" }} onClick={() => setConfirmDel(true)}>삭제</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>취소</Button>
            <Button variant="primary" size="sm" leadingIcon="check" onClick={submit}>저장</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
