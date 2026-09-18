import * as React from 'react';
import { RadioGroup, RadioGroupItem } from 'apfs-dashboard-offline';

/* RadioGroupItem — RadioGroup 안에서만 쓰이는 낱개 항목이라 프리뷰는 조합 전체를 그린다.
   미선택 = border-strong 원 / 선택 = brand-blue 테두리 + brand-blue 점(체크박스와 같은 역할색). */

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 9 };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--caption)' };
const opt: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: 'var(--foreground)' };
const lab: React.CSSProperties = { cursor: 'pointer', userSelect: 'none' };

export function FormRows() {
  const [share, setShare] = React.useState('new');
  const [duty, setDuty] = React.useState('yes');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={field}>
        <span style={label}>주식종류 *</span>
        <RadioGroup value={share} onValueChange={setShare} aria-label="주식종류">
          <span style={opt}><RadioGroupItem value="new" id="rgi-f-new" /><label htmlFor="rgi-f-new" style={lab}>신주</label></span>
          <span style={opt}><RadioGroupItem value="old" id="rgi-f-old" /><label htmlFor="rgi-f-old" style={lab}>구주</label></span>
        </RadioGroup>
      </div>
      <div style={field}>
        <span style={label}>의무투자 해당여부 *</span>
        <RadioGroup value={duty} onValueChange={setDuty} aria-label="의무투자 해당여부">
          <span style={opt}><RadioGroupItem value="yes" id="rgi-f-y" /><label htmlFor="rgi-f-y" style={lab}>예</label></span>
          <span style={opt}><RadioGroupItem value="no" id="rgi-f-n" /><label htmlFor="rgi-f-n" style={lab}>아니오</label></span>
          <span style={opt}><RadioGroupItem value="na" id="rgi-f-na" /><label htmlFor="rgi-f-na" style={lab}>해당없음</label></span>
        </RadioGroup>
      </div>
    </div>
  );
}

export function ItemStates() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <RadioGroup value="on" aria-label="선택됨">
        <span style={opt}><RadioGroupItem value="on" id="rgi-on" /><label htmlFor="rgi-on" style={lab}>선택됨 (checked)</label></span>
      </RadioGroup>
      <RadioGroup value="other" aria-label="미선택">
        <span style={opt}><RadioGroupItem value="off" id="rgi-off" /><label htmlFor="rgi-off" style={lab}>미선택 (unchecked)</label></span>
      </RadioGroup>
      <RadioGroup value="d" aria-label="비활성 선택">
        <span style={{ ...opt, color: 'var(--muted-foreground)' }}><RadioGroupItem value="d" id="rgi-dis-on" disabled /><label htmlFor="rgi-dis-on">비활성·선택 (disabled)</label></span>
      </RadioGroup>
      <RadioGroup value="x" aria-label="비활성 미선택">
        <span style={{ ...opt, color: 'var(--muted-foreground)' }}><RadioGroupItem value="d2" id="rgi-dis-off" disabled /><label htmlFor="rgi-dis-off">비활성·미선택 (disabled)</label></span>
      </RadioGroup>
    </div>
  );
}

export function PickOne() {
  const [v, setV] = React.useState('gp-2');
  const rows = [
    { id: 'gp-1', name: '어니스트벤처스(주)', biz: '110-81-34567' },
    { id: 'gp-2', name: '농식품파트너스(유)', biz: '214-87-11290' },
    { id: 'gp-3', name: '그린애그리 인베스트먼트', biz: '305-86-77412' },
  ];
  return (
    <div style={field}>
      <span style={label}>운용사 검색결과 — 1건 선택</span>
      <RadioGroup value={v} onValueChange={setV} aria-label="운용사 선택" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
        {rows.map((r) => (
          <span key={r.id} style={{ ...opt, justifyContent: 'flex-start', gap: 10, border: '1px solid var(--border-strong)', borderRadius: 9, padding: '9px 12px', background: 'var(--card)' }}>
            <RadioGroupItem value={r.id} id={`rgi-pick-${r.id}`} />
            <label htmlFor={`rgi-pick-${r.id}`} style={{ ...lab, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span>{r.name}</span>
              <span style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>사업자번호 {r.biz}</span>
            </label>
          </span>
        ))}
      </RadioGroup>
    </div>
  );
}
