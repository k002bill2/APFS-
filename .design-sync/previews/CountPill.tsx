import * as React from 'react';
import { CountPill, ColorChip } from 'apfs-dashboard-offline';

/* CountPill — 제목 옆 건수 배지. count 가 0/undefined 면 아무것도 렌더하지 않는다(null).
   100 이상은 "99+" 로 잘린다. urgent 면 danger 칠(미읽 알림처럼 주의를 끌어야 할 때), 기본은 primary soft. */

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' };
const title: React.CSSProperties = { fontSize: 14.5, fontWeight: 700, color: 'var(--foreground)' };

export function Counts() {
  return (
    <div style={row}>
      {[1, 7, 24, 99, 128].map((n) => (
        <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--caption)' }}>
          <CountPill count={n} />{n}
        </span>
      ))}
    </div>
  );
}

export function Urgent() {
  return (
    <div style={row}>
      <CountPill count={3} urgent />
      <CountPill count={12} urgent />
      <CountPill count={140} urgent />
    </div>
  );
}

export function SectionHeaders() {
  return (
    <div className="flex flex-col gap-3">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)' }}>
        <span style={title}>보고서 목록</span><CountPill count={18} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)' }}>
        <ColorChip icon="clock" color="var(--warning)" size={30} iconSize={16} />
        <span style={title}>다가오는 일정 · 알림</span><CountPill count={9} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)' }}>
        <ColorChip icon="shield-alert" color="var(--danger)" size={30} iconSize={16} />
        <span style={title}>미읽 조기경보 알림</span><CountPill count={4} urgent />
      </div>
    </div>
  );
}
