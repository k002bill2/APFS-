/* 일반 리스트 페이지의 CRUD 모달 — 신규 등록 / 수정 / 삭제(2단계 확인).
   네이티브 dialog(alert/confirm) 미사용 — 인라인 오버레이로 구현. */
import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import { UI } from './components';
import type { Tone } from './components';
import { SchemaField } from './schemas/renderers';
import type { PageSchema } from './schemas/types';
import { buildRow } from './schemas/build_row';

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

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--caption)", marginBottom: 5, display: "block" };

function Field({ label, children, errMsg }: { label: string; children: React.ReactNode; errMsg?: string }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={labelStyle}>{label}</span>
      {children}
      {errMsg && (
        <span style={{ fontSize: 11.5, color: "var(--danger)", display: "block", marginTop: 4 }}>
          {errMsg}
        </span>
      )}
    </label>
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
    for (const f of schema.fields) seed[f.key] = initial ? String((initial as any)[f.key] ?? '') : (f.control === 'select' ? (f.options?.[0] ?? '') : '');
    return seed;
  });
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

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "flex-start", justifyContent: "center",
        background: "color-mix(in srgb, #000 42%, transparent)", padding: "6vh 20px 40px", overflowY: "auto",
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 460, background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 16, boxShadow: "var(--shadow-lg)", overflow: "hidden", maxHeight: "86vh", display: "flex", flexDirection: "column",
          animation: "dashFade .18s var(--ease) both",
        }}>
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{mode === "create" ? "신규 등록" : "항목 수정"}</span>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{ display: "inline-flex", border: 0, background: "transparent", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}>
            <Icon name="x" size={18} stroke={2.2} />
          </button>
        </div>

        {/* 폼 */}
        <div style={{ padding: 18, overflowY: "auto" }}>
          {schema.fields.map((f) => (
            <Field key={f.key} label={f.label + (f.required ? ' *' : '')} errMsg={errKey === f.key ? `${f.label}을(를) 입력하세요.` : undefined}>
              <SchemaField
                field={f}
                value={vals[f.key] ?? ''}
                onChange={(v) => set(f.key, v)}
                invalid={errKey === f.key}
              />
            </Field>
          ))}
        </div>

        {/* 푸터 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, rowGap: 8, flexWrap: "wrap", padding: "14px 18px", borderTop: "1px solid var(--border)" }}>
          <div>
            {mode === "edit" && onDelete && (
              confirmDel
                ? <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: "var(--danger)" }} onClick={onDelete}>삭제 확인</Button>
                : <Button variant="ghost" size="sm" leadingIcon="trash" style={{ color: "var(--danger)" }} onClick={() => setConfirmDel(true)}>삭제</Button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="outline" size="sm" onClick={onClose}>취소</Button>
            <Button variant="primary" size="sm" leadingIcon="check" onClick={submit}>저장</Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
