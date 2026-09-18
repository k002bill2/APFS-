import * as React from 'react';
import { Checkbox } from 'apfs-dashboard-offline';

/* Checkbox — Radix <button role=checkbox>. <label> 로 감싸지 않고 htmlFor/id 로 연결한다(래핑은 클릭 2회 발화). */

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--foreground)' };
const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };

export function States() {
  return (
    <div style={col}>
      <div style={row}><Checkbox id="cb-on" defaultChecked aria-label="의무투자 예" /><label htmlFor="cb-on" style={{ cursor: 'pointer' }}>의무투자 · 예</label></div>
      <div style={row}><Checkbox id="cb-off" aria-label="해외기업 예" /><label htmlFor="cb-off" style={{ cursor: 'pointer' }}>해외기업 · 예</label></div>
      <div style={row}><Checkbox id="cb-mixed" checked="indeterminate" aria-label="일부 선택" /><label htmlFor="cb-mixed" style={{ cursor: 'pointer' }}>일부 선택(indeterminate)</label></div>
      <div style={{ ...row, color: 'var(--muted-foreground)' }}><Checkbox id="cb-dis" disabled defaultChecked aria-label="비활성" /><label htmlFor="cb-dis">비활성(disabled)</label></div>
    </div>
  );
}

export function CheckGroup() {
  const opts = ['농금원', '운용사', '수탁', '부처'];
  return (
    <div role="group" aria-label="사용자 구분" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {opts.map((o, i) => (
        <span key={o} style={row}>
          <Checkbox id={`ug-${i}`} defaultChecked={i < 2} aria-label={`사용자 구분 ${o}`} />
          <label htmlFor={`ug-${i}`} style={{ cursor: 'pointer', userSelect: 'none' }}>{o}</label>
        </span>
      ))}
    </div>
  );
}

export function RememberMe() {
  return (
    <div style={{ ...row, minHeight: 24 }}>
      <Checkbox id="login-remember" defaultChecked aria-label="아이디 저장" />
      <label htmlFor="login-remember" style={{ cursor: 'pointer', userSelect: 'none' }}>아이디 저장</label>
    </div>
  );
}
