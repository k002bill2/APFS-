/* 일반 리스트 페이지의 CRUD 모달 — 신규 등록 / 수정 / 삭제(2단계 확인).
   네이티브 dialog(alert/confirm) 미사용 — 인라인 오버레이로 구현. */
import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import { UI } from './components';
import type { Tone } from './components';

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
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "8px 11px", fontSize: 16, font: "inherit",
  border: "1px solid var(--border-strong)", borderRadius: 9, background: "var(--card)", color: "var(--foreground)",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

export function RowFormModal({ mode, initial, onSave, onClose, onDelete }: {
  mode: "create" | "edit";
  initial?: Row;
  onSave: (row: Row) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [amount, setAmount] = useState(String(initial?.amount ?? ""));
  const [change, setChange] = useState(String(initial?.change ?? ""));
  const [status, setStatus] = useState(initial?.status ?? STATUS_CHOICES[0].label);
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  const submit = () => {
    if (!name.trim()) { setErr("항목명을 입력하세요."); return; }
    onSave({
      id: initial?.id ?? "",
      icon: initial?.icon ?? "layers",
      color: initial?.color ?? "var(--chart-1)",
      name: name.trim(),
      category: category.trim(),
      amount: Number(amount) || 0,
      change: Number(change) || 0,
      status,
      trend: initial?.trend ?? [4, 6, 5, 8, 7],
    });
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
          <Field label="항목명 *">
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); if (err) setErr(""); }}
              placeholder="항목명을 입력하세요"
              style={{ ...inputStyle, ...(err ? { borderColor: "var(--danger)" } : {}) }} />
            {err && <span style={{ fontSize: 11.5, color: "var(--danger)", marginTop: 4, display: "block" }}>{err}</span>}
          </Field>
          <Field label="구분">
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="분류" style={inputStyle} />
          </Field>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="금액 (백만원)">
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" style={inputStyle} />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="변동률 (%)">
                <input type="number" value={change} onChange={(e) => setChange(e.target.value)} placeholder="0.0" style={inputStyle} />
              </Field>
            </div>
          </div>
          <Field label="상태">
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
              {STATUS_CHOICES.map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}
            </select>
          </Field>
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
