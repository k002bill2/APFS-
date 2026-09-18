import * as React from 'react';
import { Switch } from 'apfs-dashboard-offline';

/* Switch — on/off 2지선다('여'/'부', 'Y'/'N') 토글. 폼 모달의 사용여부·제공여부와 즉시 반영형 설정(알림·테마) 모두.
   Radix `<button role=switch>` 라 `<label>` 로 감싸지 말고 htmlFor/id 로 연결한다. off = muted 트랙, on = primary 트랙. */

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--foreground)' };
const lab: React.CSSProperties = { cursor: 'pointer', userSelect: 'none' };

export function UseYn() {
  const [on, setOn] = React.useState(true);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--caption)' }}>사용여부</span>
      <div style={row}>
        <Switch id="sw-use" checked={on} onCheckedChange={setOn} aria-label="사용여부" />
        <label htmlFor="sw-use" style={lab}>{on ? '여' : '부'}</label>
      </div>
    </div>
  );
}

export function States() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      <div style={row}><Switch id="sw-on" defaultChecked aria-label="켜짐" /><label htmlFor="sw-on" style={lab}>켜짐 (checked)</label></div>
      <div style={row}><Switch id="sw-off" aria-label="꺼짐" /><label htmlFor="sw-off" style={lab}>꺼짐 (unchecked)</label></div>
      <div style={{ ...row, color: 'var(--muted-foreground)' }}><Switch id="sw-dis-on" defaultChecked disabled aria-label="비활성 켜짐" /><label htmlFor="sw-dis-on">비활성·켜짐 (disabled)</label></div>
      <div style={{ ...row, color: 'var(--muted-foreground)' }}><Switch id="sw-dis-off" disabled aria-label="비활성 꺼짐" /><label htmlFor="sw-dis-off">비활성·꺼짐 (disabled)</label></div>
    </div>
  );
}

export function NotifySettings() {
  const items = [
    { id: 'gp-report', text: '운용사 보고 마감 알림', on: true },
    { id: 'risk-alert', text: '조기경보 발생 즉시 알림', on: true },
    { id: 'mail-digest', text: '일정 요약 메일 수신', on: false },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)', overflow: 'hidden' }}>
      {items.map((it, i) => (
        <div key={it.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 14px', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
          <label htmlFor={`sw-n-${it.id}`} style={{ ...lab, fontSize: 13.5, color: 'var(--foreground)' }}>{it.text}</label>
          <Switch id={`sw-n-${it.id}`} defaultChecked={it.on} aria-label={it.text} />
        </div>
      ))}
    </div>
  );
}
