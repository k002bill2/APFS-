import * as React from 'react';
import { DeltaBadge } from 'apfs-dashboard-offline';

/* DeltaBadge — 전기 대비 증감. value>0 이면 상승 화살표와 `+` 부호, invert 면 "감소가 좋은 지표"
   (조기경보 운용사 수 등)라 음수를 success 색으로 칠한다. 색은 칠이 아니라 텍스트라 -text 토큰. */

const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18 };
const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };

export function Deltas() {
  return (
    <div style={row}>
      <DeltaBadge value={3.2} label="전월 대비" />
      <DeltaBadge value={-2.4} label="전월 대비" />
      <DeltaBadge value={-1} label="전월 대비" invert />
      <DeltaBadge value={0.8} label="목표 대비" />
    </div>
  );
}

export function WithoutLabel() {
  return (
    <div style={row}>
      <DeltaBadge value={12.5} />
      <DeltaBadge value={-6} />
      <DeltaBadge value={-3} invert />
    </div>
  );
}

export function KpiLines() {
  const items = [
    { k: '총 AUM(운용자산)', v: '23,840억원', d: 3.2, l: '전월 대비', inv: false },
    { k: '모태펀드 집행률', v: '78.0%', d: 1.4, l: '목표 80% 대비', inv: false },
    { k: '조기경보 운용사', v: '4개사', d: -1, l: '전월 대비', inv: true },
    { k: '순자산 IRR', v: '9.7%', d: -0.6, l: '전분기 대비', inv: false },
  ];
  return (
    <div style={col}>
      {items.map((it) => (
        <div key={it.k} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '10px 14px', border: '1px solid var(--border-strong)', borderRadius: 10, background: 'var(--card)' }}>
          <span style={{ fontSize: 12, color: 'var(--caption)', width: 132 }}>{it.k}</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--foreground)', width: 104 }}>{it.v}</span>
          <DeltaBadge value={it.d} label={it.l} invert={it.inv} />
        </div>
      ))}
    </div>
  );
}
