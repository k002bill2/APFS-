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
// filepond 컨트롤은 DocumentsField(기존 첨부 Attachment 표시 + FilePond 신규추가)로 렌더.
const DocumentsField = React.lazy(() => import('../fields/DocumentsField').then((m) => ({ default: m.DocumentsField })));

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
  // 필수 필드는 채움 여부와 무관하게 빨간 테두리로 상시 표식(라벨 '*'와 병행). readonly는 입력 대상이 아니라 제외.
  const requiredMark = !!field.required && field.control !== 'readonly';
  const base: React.CSSProperties = {
    // ⚠️ fontFamily(longhand)로 패밀리만 상속 — `font: 'inherit'`(shorthand)는 font-size까지 리셋해 위의 fontSize:14를 부모값으로 덮어쓴다.
    // ⚠️ 높이 규격 38px — DatePicker 버튼/radio와 일치시킨다. lineHeight:20(=text-sm)로 자연 높이를 20+16(pad)+2(border)=38로 맞추고
    //    minHeight:38은 플로어 가드(DatePicker의 min-h-[38px] 미러). lineHeight 없으면 native input/select가 normal 메트릭으로 34·36px로 어긋난다.
    width: '100%', boxSizing: 'border-box', padding: '8px 11px', fontSize: 14, lineHeight: '20px', minHeight: 38, fontFamily: 'inherit',
    border: `1px solid ${invalid || requiredMark ? 'var(--danger)' : 'var(--border-strong)'}`,
    borderRadius: 9, background: 'var(--card)', color: 'var(--foreground)',
  };
  switch (field.control) {
    case 'textarea': return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} style={{ ...base, resize: 'vertical' }} />;
    case 'select':   return <select value={value} onChange={(e) => onChange(e.target.value)} style={base}>{(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}</select>;
    case 'number':   return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} style={base} />;
    // 일자선택 — shadcn Radix Calendar(Popover). 값은 'YYYY-MM-DD' 문자열 유지(네이티브 input과 동일 계약).
    case 'date':     return <DatePicker value={value} onChange={onChange} invalid={invalid} required={requiredMark} ariaLabel={field.label} />;
    case 'checkbox': return <input type="checkbox" checked={value === 'true'} onChange={(e) => onChange(String(e.target.checked))} style={{ accentColor: 'var(--primary)', width: 16, height: 16 }} />;
    // 라디오 — 옵션 가로 나열(Y/N, Y/N/해당없음 등). 네이티브 input + accentColor 토큰(라이트/다크 양립).
    case 'radio': return (
      <div role="radiogroup" aria-label={field.label} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', minHeight: 38 }}>
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
        <RichTextField value={value} onChange={onChange} label={field.label} required={requiredMark} />
      </React.Suspense>
    );
    // 첨부파일 — 기존 첨부(Attachment 표시) + FilePond 신규추가. lazy 로드.
    case 'filepond': return (
      <React.Suspense fallback={<div style={{ ...base, color: 'var(--muted-foreground)' }}>업로더 불러오는 중…</div>}>
        <DocumentsField value={value} onChange={onChange} required={requiredMark} />
      </React.Suspense>
    );
    case 'readonly': return <div style={{ ...base, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{value || '—'}</div>;
    default:         return <input value={value} onChange={(e) => onChange(e.target.value)} style={base} />;
  }
}
