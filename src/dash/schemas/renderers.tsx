import React from 'react';
import { UI } from '../components';
import { mn, MT } from '../mask';
import { renderKind } from './dispatch';
import type { ColumnSpec, FieldSpec, StatusDomainEntry } from './types';
import type { Tone } from '../components';

const { StatusBadge, ColorChip, DeltaBadge } = UI;

// status tone을 스키마의 statusDomain에서 해결(모달 의존 제거 → 순환 차단).
function toneFor(label: string, domain?: StatusDomainEntry[]): Tone {
  return domain?.find((d) => d.label === label)?.tone ?? 'info';
}

export function Cell({ col, value, color, statusDomain }: { col: ColumnSpec; value: any; color?: string; statusDomain?: StatusDomainEntry[] }) {
  switch (renderKind(col.type)) {
    case 'status':     return <StatusBadge tone={toneFor(String(value), statusDomain)} label={String(value)} size="sm" />;
    case 'rate':       return <DeltaBadge value={Number(value)} />;
    case 'gp':         return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><ColorChip icon="building" color={color || 'var(--chart-1)'} size={26} iconSize={14} /><MT>{String(value)}</MT></span>;
    case 'numeric':    return <span className="tabular">{mn(typeof value === 'number' ? value.toLocaleString() : String(value))}</span>;
    // maskedText (text/code/pii) + 미지 타입 → 항상 MT (평문 누출 차단)
    default:           return <MT>{String(value)}</MT>;
  }
}

export function SchemaField({ field, value, onChange }: { field: FieldSpec; value: string; onChange: (v: string) => void }) {
  const base: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 11px', fontSize: 13.5, font: 'inherit', border: '1px solid var(--border-strong)', borderRadius: 9, background: 'var(--card)', color: 'var(--foreground)' };
  switch (field.control) {
    case 'textarea': return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} style={{ ...base, resize: 'vertical' }} />;
    case 'select':   return <select value={value} onChange={(e) => onChange(e.target.value)} style={base}>{(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}</select>;
    case 'number':   return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} style={base} />;
    case 'date':     return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} style={base} />;
    case 'checkbox': return <input type="checkbox" checked={value === 'true'} onChange={(e) => onChange(String(e.target.checked))} style={{ accentColor: 'var(--primary)', width: 16, height: 16 }} />;
    case 'file':     return <input type="file" style={{ ...base, padding: 6 }} />;
    case 'readonly': return <div style={{ ...base, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{value || '—'}</div>;
    default:         return <input value={value} onChange={(e) => onChange(e.target.value)} style={base} />;
  }
}
