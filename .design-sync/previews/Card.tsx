import * as React from 'react';
import { Card, StatusBadge, DeltaBadge } from 'apfs-dashboard-offline';

/* Card — 헤더 없는 범용 패널(<section>). rounded-card + border + bg-card + shadow-sm 만 제공하고
   내용 구성은 소비처가 한다. pad 로 내부 여백(기본 18), className 으로 레이아웃 유틸.
   reveal 은 whileInView 라 정적 캡처에서는 숨은 상태로 찍히므로 프리뷰 셀로 두지 않는다(제품에서는 뷰포트 진입 시 페이드+슬라이드). */

const label: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, letterSpacing: '.02em', color: 'var(--caption)' };
const kv: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: 'var(--foreground)' };

export function Basic() {
  return (
    <Card className="flex flex-col gap-3">
      <div style={label}>자펀드 요약</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>농식품 벤처투자조합 1호</div>
      <div style={kv}><span style={{ color: 'var(--muted-foreground)' }}>결성 총액</span><span style={{ fontWeight: 700 }}>320억원</span></div>
      <div style={kv}><span style={{ color: 'var(--muted-foreground)' }}>모태 출자</span><span style={{ fontWeight: 700 }}>160억원 (50%)</span></div>
      <div style={kv}><span style={{ color: 'var(--muted-foreground)' }}>운용사</span><span style={{ fontWeight: 700 }}>○○인베스트먼트</span></div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
        <StatusBadge tone="success" icon="check" label="정상" size="sm" />
        <DeltaBadge value={2.1} label="집행률 전월 대비" />
      </div>
    </Card>
  );
}

export function Padding() {
  return (
    <div className="flex flex-col gap-3">
      <Card pad={12}><div style={label}>pad 12 · 촘촘한 목록 셀</div><div style={{ marginTop: 4, fontSize: 13, color: 'var(--foreground)' }}>수산 스케일업 펀드 · 결성 150억원</div></Card>
      <Card pad={18}><div style={label}>pad 18 (기본)</div><div style={{ marginTop: 4, fontSize: 13, color: 'var(--foreground)' }}>스마트농업 성장펀드 2호 · 결성 240억원</div></Card>
      <Card pad={26}><div style={label}>pad 26 · 여유 있는 안내 패널</div><div style={{ marginTop: 4, fontSize: 13, color: 'var(--foreground)' }}>푸드테크 혁신조합 · 결성 180억원</div></Card>
    </div>
  );
}

export function MetricPanel() {
  const rows = [
    { k: '총 AUM(운용자산)', v: '23,840', u: '억원', c: 'var(--chart-3)' },
    { k: '모태펀드 집행률', v: '78.0', u: '%', c: 'var(--primary)' },
    { k: '순자산 IRR', v: '9.7', u: '%', c: 'var(--chart-2)' },
  ];
  return (
    <Card className="flex flex-col gap-3">
      <div style={label}>주요 지표</div>
      {rows.map((r) => (
        <div key={r.k} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>{r.k}</span>
          <span style={{ fontSize: 19, fontWeight: 800, color: r.c }}>{r.v}<span style={{ fontSize: 12, fontWeight: 600, marginLeft: 3, color: 'var(--muted-foreground)' }}>{r.u}</span></span>
        </div>
      ))}
    </Card>
  );
}
