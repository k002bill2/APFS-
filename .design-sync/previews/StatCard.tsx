import * as React from 'react';
import { StatCard } from 'apfs-dashboard-offline';

/* StatCard — 메인 대시보드 KPI 카드. kpi 객체 한 개가 전부(APFS_DATA.KPI 항목과 같은 형태):
   label·value(문자열, 콤마 포함)·unit·accent(토큰)·icon·delta(+/-)·deltaLabel·trend(숫자 배열)·progress(선택). */

const AUM = { id: 'aum', label: '총 AUM (운용자산)', value: '23,840', unit: '억원', accent: 'var(--chart-3)', icon: 'landmark', delta: 3.2, deltaLabel: '전월 대비', trend: [198, 205, 201, 214, 222, 219, 231, 238] };
const EXEC = { id: 'exec', label: '모태펀드 집행률', value: '78.0', unit: '%', accent: 'var(--primary)', icon: 'target', delta: 1.4, deltaLabel: '목표 80% 대비', trend: [62, 66, 69, 71, 72, 74, 76, 78], progress: 78 };
const RISK = { id: 'risk', label: '조기경보 운용사', value: '4', unit: '개사', accent: 'var(--danger)', icon: 'shield-alert', delta: -1, deltaLabel: '전월 대비', invertDelta: true, trend: [6, 6, 5, 5, 5, 4, 5, 4] };

const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 };

export function KpiRow() {
  return (
    <div style={grid}>
      <StatCard kpi={AUM} emphasis onClick={() => {}} />
      <StatCard kpi={EXEC} onClick={() => {}} />
      <StatCard kpi={RISK} onClick={() => {}} />
    </div>
  );
}
export function Emphasis() { return <div style={{ maxWidth: 300 }}><StatCard kpi={AUM} emphasis /></div>; }
export function WithProgress() { return <div style={{ maxWidth: 300 }}><StatCard kpi={EXEC} /></div>; }
