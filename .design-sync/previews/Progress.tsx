import * as React from 'react';
import { Progress } from 'apfs-dashboard-offline';

/* Progress — determinate/indeterminate 겸용 진행 바. value(0~100) 주면 determinate, 생략하면 indeterminate.
   props: value · label(접근名) · size('sm' | 'md'). track=bg-muted, fill=bg-primary. */

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16 };
const cap: React.CSSProperties = { fontSize: 11.5, color: 'var(--caption)', fontWeight: 600 };

export function States() {
  return (
    <div style={col}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={cap}>Determinate · 64%</span><Progress value={64} label="집행률" /></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={cap}>Determinate · 100% (마감)</span><Progress value={100} label="정산 진행률" /></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={cap}>sm · 32%</span><Progress size="sm" value={32} label="회수율" /></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={cap}>Indeterminate (불확정 진행)</span><Progress label="처리 중" /></div>
    </div>
  );
}

export function ExecutionRates() {
  const rows = [
    { name: '2026 농식품 창업 1호', pct: 82 },
    { name: '상주-어니스트 애그테크', pct: 64 },
    { name: '스마트팜 성장지원 2호', pct: 41 },
    { name: '수산 혁신투자조합', pct: 18 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--caption)' }}>자펀드별 집행률</span>
      {rows.map((r) => (
        <div key={r.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--foreground)' }}>
            <span>{r.name}</span>
            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.pct}%</span>
          </div>
          <Progress value={r.pct} label={`${r.name} 집행률`} />
        </div>
      ))}
    </div>
  );
}

export function Indeterminate() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={cap}>엑셀 내보내기 준비 중</span>
      <Progress label="내보내기 처리 중" />
    </div>
  );
}
