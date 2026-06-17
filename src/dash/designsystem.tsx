/* 디자인 시스템 미리보기 — 컬러 토큰 · 타이포 · 공통 컴포넌트 (라이트/다크 공용) */
import React from 'react';
import { Icon } from './icons';
import { UI } from './components';
import { Charts } from './charts';
import { APFS_DATA } from './data';

const { ColorChip, StatusBadge, StatCard, ChartCard, Button, FilterChip, SegTabs, DeltaBadge, Card } = UI;
const { Sparkline, Donut, LineTrend } = Charts;
const D = APFS_DATA;
const { useState } = React;

function Swatch({ name, varName, hex }: { name?: React.ReactNode; varName?: string; hex?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span
        style={{ width: 38, height: 38, borderRadius: 9, background: `var(${varName})`, border: "1px solid var(--border)", flex: "0 0 auto", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }} /><div style={{ minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 700 }}>{name}</div><div className="t-caption tabular" style={{ fontSize: 10.5 }}>{hex || varName}</div></div></div>
  );
}

function Group({ title, children, cols = 2 }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}><div className="t-label" style={{ textTransform: "none" }}>{title}</div><div
        style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 13 }}>{children}</div></Card>
  );
}

function Section({ title, desc, children }: { title?: React.ReactNode; desc?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 26 }}><div style={{ marginBottom: 12 }}><h2 className="t-h2" style={{ margin: 0 }}>{title}</h2>{desc && <p
          className="t-body"
          style={{ margin: "3px 0 0", color: "var(--muted-foreground)", fontSize: 13 }}>{desc}</p>}</div>{children}</section>
  );
}

function DesignSystem() {
  const [chip, setChip] = useState("정상");
  const [seg, setSeg] = useState("월");
  return (
    <div style={{ maxWidth: 1180, animation: "dashFade .4s var(--ease) both" }}><div
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 22px", marginBottom: 24, borderRadius: 16, background: "linear-gradient(110deg,color-mix(in srgb,var(--primary) 14%,var(--card)),color-mix(in srgb,var(--brand-cyan) 10%,var(--card)))", border: "1px solid var(--border)" }}><ColorChip icon="layers" color="var(--primary)" size={46} iconSize={24} /><div><div className="t-h2" style={{ fontSize: 17 }}>디자인 시스템 미리보기</div><p
            className="t-body"
            style={{ margin: "2px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>숲(forest green) 도메인 톤 · 브랜드 블루/시안 강조 · Pretendard · 4px 그리드. 우상단 <strong>달/해 아이콘</strong>으로 라이트·다크를 전환해 보세요.</p></div><div style={{ marginLeft: "auto" }}><StatusBadge tone="success" icon="check" label="Production Ready" /></div></div><Section title="1. 컬러 토큰" desc="모든 색은 CSS 변수를 경유. 다크 모드에서 자동 반영됩니다."><div
          style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}><Group title="브랜드 (첨부 로고 기준)"><Swatch name="Brand Blue" varName="--brand-blue" hex="#0058A8" /><Swatch name="Brand Cyan" varName="--brand-cyan" hex="#00AAE5" /><Swatch name="Forest" varName="--brand-forest" hex="#2D7846" /><Swatch name="Lime" varName="--brand-lime" hex="#7BB93C" /><Swatch name="Neutral" varName="--brand-gray" hex="#58585B" /><Swatch name="Primary" varName="--primary" hex="forest green" /></Group><Group title="역할 · 상태"><Swatch name="Primary" varName="--primary" hex="주요 액션" /><Swatch name="Accent" varName="--accent" hex="링크·포커스" /><Swatch name="Success" varName="--success" hex="정상" /><Swatch name="Warning" varName="--warning" hex="주의" /><Swatch name="Danger" varName="--danger" hex="경고" /><Swatch name="Muted" varName="--muted-foreground" hex="캡션" /></Group><Group title="차트 팔레트 (chart-1 → 19)" cols={1}><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{Array.from({ length: 19 }, (_, i) => i + 1).map((n) =>
                <span
                  key={n}
                  title={"--chart-" + n}
                  style={{ width: 30, height: 30, borderRadius: 7, background: `var(--chart-${n})`, border: "1px solid var(--border)" }} />)}</div></Group><Group title="자금 원천 4종 고정색" cols={2}><Swatch name="농식품 모태" varName="--fs-agri" /><Swatch name="수산 모태" varName="--fs-fish" /><Swatch name="운영비" varName="--fs-ops" /><Swatch name="기타 사업" varName="--fs-etc" /></Group></div></Section><Section
        title="2. 타이포그래피"
        desc="Pretendard · 정량값은 tabular-nums · 한글 word-break:keep-all"><Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>{[["Display / 34", "t-display", "2조 3,840억원"], ["H1 / 23", "t-h1", "메인 종합 대시보드"], ["H2 / 18", "t-h2", "출자·집행 현황"], ["CardTitle / 15", "t-cardtitle", "상태 분포"], ["Body / 14", "t-body", "흩어진 핵심 지표를 단일 화면에서 파악합니다."], ["Label / 12.5", "t-label", "전월 대비"], ["Caption / 11.5", "t-caption", "2026-06-15 14:32:05 기준"]].map((r, i) =>
            <div
              key={i}
              style={{ display: "flex", alignItems: "baseline", gap: 18, paddingBottom: 12, borderBottom: i < 6 ? "1px solid var(--border)" : "none" }}><span
                style={{ width: 120, flex: "0 0 auto", fontSize: 11.5, fontWeight: 600, color: "var(--caption)" }}>{r[0]}</span><span className={r[1]}>{r[2]}</span></div>)}</Card></Section><Section title="3. 공통 컴포넌트"><div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}><div style={{ display: "flex", flexDirection: "column", gap: 10 }}><div className="t-label" style={{ textTransform: "none" }}>StatCard</div><StatCard kpi={D.KPI[0]} emphasis={true} /><StatCard kpi={D.KPI[1]} /></div><div style={{ display: "flex", flexDirection: "column", gap: 12 }}><Card style={{ display: "flex", flexDirection: "column", gap: 12 }}><div className="t-label" style={{ textTransform: "none" }}>StatusBadge (색 + 아이콘 + 텍스트 3중 표기)</div><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><StatusBadge tone="success" icon="check" label="정상" /><StatusBadge tone="warning" icon="alert-triangle" label="주의" /><StatusBadge tone="danger" icon="shield-alert" label="경고" /><StatusBadge tone="info" icon="clock" label="진행중" /></div><div className="t-label" style={{ textTransform: "none", marginTop: 4 }}>DeltaBadge</div><div style={{ display: "flex", gap: 16 }}><DeltaBadge value={3.2} label="전월 대비" /><DeltaBadge value={-2} label="전주 대비" invert={true} /></div></Card><Card style={{ display: "flex", flexDirection: "column", gap: 12 }}><div className="t-label" style={{ textTransform: "none" }}>Button</div><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><Button variant="primary" leadingIcon="plus">새 등록</Button><Button variant="accent">강조</Button><Button variant="secondary">보조</Button><Button variant="outline" leadingIcon="download">엑셀 다운로드</Button><Button variant="ghost" leadingIcon="refresh">새로고침</Button></div><div className="t-label" style={{ textTransform: "none", marginTop: 4 }}>FilterChip · SegmentedControl</div><div
                style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>{["정상", "주의", "경고"].map((s) => <FilterChip
                  key={s}
                  active={chip === s}
                  onClick={() => setChip(s)}
                  dot={s === "정상" ? "var(--success)" : s === "주의" ? "var(--warning)" : "var(--danger)"}>{s}</FilterChip>)}<SegTabs options={["월", "분기", "연"]} value={seg} onChange={setSeg} /></div></Card></div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}><ChartCard
            title="출자·집행 추이"
            sub="ChartCard — 컬러칩 + 제목 + 기간 필터"
            icon="landmark"
            accent="var(--chart-3)"
            right={<SegTabs options={["월", "분기", "연"]} value={seg} onChange={setSeg} size="sm" />}
            minH={180}><LineTrend
              data={D.RISK_TREND}
              threshold={D.RISK_THRESHOLD}
              height={170}
              color="var(--chart-3)" /></ChartCard><ChartCard
            title="상태 분포"
            sub="Donut — 중앙 총건수, 조각 hover"
            icon="shield-check"
            accent="var(--primary)"
            minH={180}><Donut data={D.STATUS_DONUT} height={180} centerLabel="총 자펀드" /></ChartCard></div></Section></div>
  );
}

export { DesignSystem };
