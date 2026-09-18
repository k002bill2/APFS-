import * as React from 'react';
import { ChartCard, StatusBadge, CountPill } from 'apfs-dashboard-offline';

/* ChartCard — 대시보드 위젯의 표준 껍데기. header(ColorChip+title+sub+right) / body(children) / footer.
   accent 가 헤더 아이콘 타일 색이고 icon 은 문자열 이름. minH 로 본문 최소 높이, reveal 로 스크롤 등장.
   (프리뷰 본문은 인라인 SVG·표로 대체 — 실제 화면에서는 Charts 프리미티브가 들어간다.) */

const legend: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--muted-foreground)' };
const swatch = (c: string): React.CSSProperties => ({ width: 10, height: 10, borderRadius: 3, background: c });

function Bars() {
  const data = [
    { q: '1Q', plan: 62, act: 54 },
    { q: '2Q', plan: 74, act: 69 },
    { q: '3Q', plan: 86, act: 78 },
    { q: '4Q', plan: 96, act: 91 },
  ];
  const max = 110;
  return (
    <svg viewBox="0 0 320 150" style={{ width: '100%', height: 150, display: 'block' }} role="img" aria-label="분기별 출자 계획 대비 집행 실적">
      <line x1="10" y1="124" x2="310" y2="124" stroke="var(--border-strong)" strokeWidth="1" />
      {data.map((d, i) => {
        const x = 26 + i * 72;
        const hp = (d.plan / max) * 104;
        const ha = (d.act / max) * 104;
        return (
          <g key={d.q}>
            <rect x={x} y={124 - hp} width="22" height={hp} rx="3" fill="var(--chart-grid)" />
            <rect x={x + 26} y={124 - ha} width="22" height={ha} rx="3" fill="var(--chart-1)" />
            <text x={x + 24} y="140" textAnchor="middle" fontSize="10" fill="var(--caption)">{d.q}</text>
          </g>
        );
      })}
      <polyline fill="none" stroke="var(--chart-3)" strokeWidth="2" points="48,72 120,58 192,44 264,30" />
      {[72, 58, 44, 30].map((y, i) => <circle key={i} cx={48 + i * 72} cy={y} r="3" fill="var(--chart-3)" />)}
    </svg>
  );
}

export function ExecTrend() {
  return (
    <div style={{ maxWidth: 480 }}>
      <ChartCard
        title="출자·집행 추이"
        sub="계획 대비 실적 · 집행률(우축)"
        icon="landmark"
        accent="var(--chart-3)"
        right={<StatusBadge tone="success" icon="check" label="목표 내" size="sm" />}
        footer={<div className="flex items-center gap-4 flex-wrap"><span style={legend}><span style={swatch('var(--chart-grid)')} />계획</span><span style={legend}><span style={swatch('var(--chart-1)')} />실적</span><span style={legend}><span style={{ width: 16, height: 2.5, borderRadius: 2, background: 'var(--chart-3)' }} />집행률 %</span></div>}
      ><Bars /></ChartCard>
    </div>
  );
}

export function RegionTable() {
  const rows = [
    { r: '전북', plan: '1,240', act: '1,102', rate: '88.9%' },
    { r: '경남', plan: '980', act: '812', rate: '82.9%' },
    { r: '충남', plan: '760', act: '588', rate: '77.4%' },
    { r: '강원', plan: '540', act: '369', rate: '68.3%' },
  ];
  const th: React.CSSProperties = { textAlign: 'right', padding: '7px 8px', fontSize: 11.5, color: 'var(--caption)', borderBottom: '1px solid var(--border-strong)' };
  const td: React.CSSProperties = { textAlign: 'right', padding: '8px', fontSize: 12.5, color: 'var(--foreground)', borderBottom: '1px solid var(--border)' };
  return (
    <div style={{ maxWidth: 480 }}>
      <ChartCard
        title="지역별 출자·집행"
        sub="단위 억원 · 2026년 누적"
        icon="target"
        accent="var(--chart-2)"
        right={<CountPill count={4} />}
        minH={150}
        footer={<span style={legend}>출처 · 모태펀드 자금집행 대장(수탁 검증 완료)</span>}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={{ ...th, textAlign: 'left' }}>지역</th><th style={th}>계획</th><th style={th}>집행</th><th style={th}>집행률</th></tr></thead>
          <tbody>{rows.map((x) => <tr key={x.r}><td style={{ ...td, textAlign: 'left' }}>{x.r}</td><td style={td}>{x.plan}</td><td style={td}>{x.act}</td><td style={{ ...td, fontWeight: 700, color: 'var(--primary)' }}>{x.rate}</td></tr>)}</tbody>
        </table>
      </ChartCard>
    </div>
  );
}

export function Minimal() {
  return (
    <div style={{ maxWidth: 480 }}>
      <ChartCard title="조기경보 운용사" sub="관찰 4개사" icon="shield-alert" accent="var(--danger)" minH={96}>
        <div className="flex flex-col gap-2">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, color: 'var(--foreground)' }}><span>△△자산운용</span><StatusBadge tone="danger" icon="shield-alert" label="경고" size="sm" /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, color: 'var(--foreground)' }}><span>□□벤처파트너스</span><StatusBadge tone="warning" icon="alert-triangle" label="주의" size="sm" /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, color: 'var(--foreground)' }}><span>◇◇인베스트</span><StatusBadge tone="warning" icon="alert-triangle" label="주의" size="sm" /></div>
        </div>
      </ChartCard>
    </div>
  );
}
