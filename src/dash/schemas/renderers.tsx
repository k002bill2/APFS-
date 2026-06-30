import React from 'react';
import { UI } from '../components';
import { mn, MT } from '../mask';
import { DatePicker } from '../ui/date-picker';
import { renderKind } from './dispatch';
import type { ColumnSpec, FieldSpec, StatusDomainEntry } from './types';
import type { Tone } from '../components';

const { StatusBadge, ColorChip, DeltaBadge } = UI;

// 무거운 에디터/업로더는 코드 스플리팅 — 모달이 열려 해당 컨트롤이 렌더될 때만 로드.
const RichTextField = React.lazy(() => import('../fields/RichTextField').then((m) => ({ default: m.RichTextField })));
const FilePondField = React.lazy(() => import('../fields/FilePondField').then((m) => ({ default: m.FilePondField })));

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

export function SchemaField({ field, value, onChange, invalid }: { field: FieldSpec; value: string; onChange: (v: string) => void; invalid?: boolean }) {
  const base: React.CSSProperties = {
    // ⚠️ fontFamily(longhand)로 패밀리만 상속 — `font: 'inherit'`(shorthand)는 font-size까지 리셋해 위의 fontSize:14를 부모값으로 덮어쓴다.
    width: '100%', boxSizing: 'border-box', padding: '8px 11px', fontSize: 14, fontFamily: 'inherit',
    border: `1px solid ${invalid ? 'var(--danger)' : 'var(--border-strong)'}`,
    borderRadius: 9, background: 'var(--card)', color: 'var(--foreground)',
  };
  switch (field.control) {
    case 'textarea': return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} style={{ ...base, resize: 'vertical' }} />;
    case 'select':   return <select value={value} onChange={(e) => onChange(e.target.value)} style={base}>{(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}</select>;
    case 'number':   return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} style={base} />;
    // 일자선택 — shadcn Radix Calendar(Popover). 값은 'YYYY-MM-DD' 문자열 유지(네이티브 input과 동일 계약).
    case 'date':     return <DatePicker value={value} onChange={onChange} invalid={invalid} ariaLabel={field.label} />;
    case 'checkbox': return <input type="checkbox" checked={value === 'true'} onChange={(e) => onChange(String(e.target.checked))} style={{ accentColor: 'var(--primary)', width: 16, height: 16 }} />;
    // 라디오 — 옵션 가로 나열(Y/N, Y/N/해당없음 등). 네이티브 input + accentColor 토큰(라이트/다크 양립).
    case 'radio': return (
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', minHeight: 38 }}>
        {(field.options || ['Y', 'N']).map((o) => (
          <label key={o} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, color: 'var(--foreground)' }}>
            <input type="radio" name={field.key} value={o} checked={value === o} onChange={() => onChange(o)} style={{ accentColor: 'var(--primary)', width: 16, height: 16 }} />
            {o}
          </label>
        ))}
      </div>
    );
    case 'file':     return <input type="file" style={{ ...base, padding: 6 }} />;
    // Tiptap 리치 텍스트 에디터 — lazy 로드. Suspense fallback은 base 톤 placeholder.
    case 'richtext': return (
      <React.Suspense fallback={<div style={{ ...base, color: 'var(--muted-foreground)' }}>에디터 불러오는 중…</div>}>
        <RichTextField value={value} onChange={onChange} label={field.label} />
      </React.Suspense>
    );
    // FilePond 파일 업로더 — lazy 로드.
    case 'filepond': return (
      <React.Suspense fallback={<div style={{ ...base, color: 'var(--muted-foreground)' }}>업로더 불러오는 중…</div>}>
        <FilePondField value={value} onChange={onChange} />
      </React.Suspense>
    );
    case 'readonly': return <div style={{ ...base, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{value || '—'}</div>;
    default:         return <input value={value} onChange={(e) => onChange(e.target.value)} style={base} />;
  }
}
