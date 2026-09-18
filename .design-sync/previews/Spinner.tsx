import * as React from 'react';
import { Spinner } from 'apfs-dashboard-offline';

/* Spinner — react-spinners GridLoader 래퍼. 색은 currentColor 상속(color prop 으로 override), size 는 낱개 점 크기(기본 5). */

const cell: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, minWidth: 96 };
const cap: React.CSSProperties = { fontSize: 11.5, color: 'var(--caption)', fontWeight: 600 };

export function Sizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, color: 'var(--foreground)' }}>
      <div style={cell}><Spinner size={4} /><span style={cap}>size 4</span></div>
      <div style={cell}><Spinner size={6} /><span style={cap}>size 6 (기본 5)</span></div>
      <div style={cell}><Spinner size={9} /><span style={cap}>size 9</span></div>
    </div>
  );
}

export function InlineLoading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)', color: 'var(--muted-foreground)' }}>
      <Spinner size={4} />
      <span style={{ fontSize: 13.5 }}>운용사 월간보고 불러오는 중…</span>
    </div>
  );
}

export function OnPrimary() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={cell}><Spinner size={6} color="var(--primary)" /><span style={cap}>primary</span></div>
      <div style={cell}><Spinner size={6} color="var(--brand-blue)" /><span style={cap}>brand blue</span></div>
      <div style={{ ...cell, justifyContent: 'center', background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 12, padding: '16px 18px' }}>
        <Spinner size={6} />
        <span style={{ fontSize: 11.5, fontWeight: 600 }}>반전 표면</span>
      </div>
    </div>
  );
}
