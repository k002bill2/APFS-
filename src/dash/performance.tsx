/* 투자 성과·포트폴리오 서브페이지 — 첨부 디자인(테이블 + 하단 2카드) 스타일.
   APFS forest-green 토큰 + Tailwind 유틸리티. */
import React from 'react';
import { Icon } from './icons';
import { UI } from './components';
import { Shell } from './shell';
import { APFS_DATA } from './data';

const { useState, useEffect } = React;
const { Button, StatusBadge, FilterChip, SegTabs, IconBtn, ColorChip } = UI;
const { PageHeader } = Shell;
const D = APFS_DATA;
const cx = (...a) => a.filter(Boolean).join(" ");

/* 막대형 스파크라인 (성과 이력) — 최근 5칸, 낮은 높이 */
function BarSpark({ data, color = "var(--chart-1)", up = true }) {
  const bars = data.slice(-5);
  const max = Math.max(...bars);
  const c = up ? color : "var(--muted-foreground)";
  return (
    <div className="flex items-end gap-[3px] h-[10px]" aria-hidden={true}>{bars.map((v, i) => <span
        key={i}
        className="w-[5px] rounded-[2px] inline-block"
        style={{
          height: Math.max(30, (v / max) * 100) + "%",
          background: c,
          opacity: 0.45 + (i / (bars.length - 1)) * 0.55,
        }} />)}</div>
  );
}

/* 상단 요약 스탯 pill */
function StatPill({ icon, label, value, tone }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-card border border-border bg-card px-3.5 py-2 shadow-sm"><ColorChip icon={icon} color={tone || "var(--primary)"} size={30} iconSize={16} /><div className="leading-tight"><div className="t-caption text-[11px]">{label}</div><div
          className="text-[15px] font-bold tabular"
          style={tone ? { color: tone } : undefined}>{value}</div></div></div>
  );
}

/* ===== 우측 슬라이드인: 상세 필터 드로어 (이미지 사양) ===== */
function CheckRow({ label, checked, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full text-left cursor-pointer bg-transparent border-0 py-2"><span
        className="inline-flex items-center justify-center shrink-0 transition-all duration-150"
        style={{
          width: 26, height: 26, borderRadius: 7,
          background: checked ? "var(--brand-blue)" : "var(--card)",
          border: checked ? "1px solid var(--brand-blue)" : "1.5px solid var(--border-strong)",
        }}>{checked && <Icon name="check" size={17} stroke={3} style={{ color: "#fff" }} />}</span><span
        className="text-[14px] font-semibold"
        style={{ color: "var(--foreground)" }}>{label}</span></button>
  );
}

function FilterDrawer({ open, onClose, onApply, applied }) {
  const ASSETS = ["주식", "채권", "실물 자산", "사모 펀드"];
  const [sel, setSel] = useState(applied.assets);
  const [risk, setRisk] = useState(applied.risk == null ? 50 : applied.risk);
  const [period, setPeriod] = useState(applied.period || "당기 회계연도");
  const toggle = (a) => setSel((s) => ({ ...s, [a]: !s[a] }));
  // 드로어가 열릴 때마다 현재 적용된 필터로 초기화 (칩 제거 등 외부 변경 반영)
  useEffect(() => {
    if (open) {
      setSel(applied.assets);
      setRisk(applied.risk == null ? 50 : applied.risk);
      setPeriod(applied.period || "당기 회계연도");
    }
  }, [open]);

  return (
    <><div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.42)", zIndex: 70,
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .25s var(--ease)",
        }} /><aside
        aria-label="포트폴리오 상세 필터"
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 408, maxWidth: "92vw", zIndex: 71,
          background: "var(--card)", borderLeft: "1px solid var(--border)", boxShadow: "var(--shadow-lg)",
          transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform .3s var(--ease)",
          display: "flex", flexDirection: "column",
        }}><header
          className="flex items-center justify-between px-6 border-b border-border"
          style={{ height: 62, flex: "0 0 auto" }}><h2
            className="text-[16px] font-bold tracking-[-.02em]"
            style={{ color: "var(--foreground)" }}>포트폴리오 상세 필터</h2><IconBtn icon="x" onClick={onClose} label="닫기" size={38} /></header><div
          className="flex-1 overflow-y-auto px-6 py-6"
          style={{ display: "flex", flexDirection: "column", gap: 26 }}><div><div
              className="text-[13px] font-bold mb-2"
              style={{ color: "var(--muted-foreground)" }}>자산 유형</div><div className="flex flex-col">{ASSETS.map((a) => <CheckRow key={a} label={a} checked={!!sel[a]} onClick={() => toggle(a)} />)}</div></div><div><div
              className="text-[13px] font-bold mb-3"
              style={{ color: "var(--muted-foreground)" }}>리스크 노출도</div><input
              type="range"
              min={0}
              max={100}
              value={risk}
              onChange={(e) => setRisk(+e.target.value)}
              className="apfs-range"
              style={{ width: "100%", accentColor: "var(--brand-blue)" }} /><div className="flex items-center justify-between mt-2"><span
                className="text-[12.5px] font-semibold"
                style={{ color: "var(--muted-foreground)" }}>보수적</span><span
                className="text-[12.5px] font-semibold"
                style={{ color: "var(--muted-foreground)" }}>공격적</span></div></div><div><div
              className="text-[13px] font-bold mb-2.5"
              style={{ color: "var(--muted-foreground)" }}>기간 설정</div><div className="relative"><select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full text-[14px] font-semibold cursor-pointer appearance-none"
                style={{
                  color: "var(--foreground)", background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "11px 44px 11px 14px", fontFamily: "inherit", outline: "none",
                }}>{["당기 회계연도", "전기 회계연도", "최근 1년", "최근 3년", "설정 기간"].map((o) => <option key={o} value={o}>{o}</option>)}</select><Icon
                name="chevron-down"
                size={20}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} /></div></div></div><div className="px-6 py-5 border-t border-border" style={{ flex: "0 0 auto" }}><button
            onClick={() => onApply({ assets: sel, risk, period })}
            className="ui-btn w-full inline-flex items-center justify-center gap-2 cursor-pointer text-[14px] font-bold"
            style={{ background: "#1F1F22", color: "#fff", borderRadius: 12, padding: "14px", border: "none" }}>필터 적용</button></div></aside></>
  );
}

function Performance({ onNav }) {
  const [view, setView] = useState("list");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [applied, setApplied] = useState({ period: "당기 회계연도", assets: { "주식": true, "채권": true }, risk: 50 });
  const rows = D.PORTFOLIO;

  const riskLabel = (r) => (r == null ? null : r < 33 ? "리스크 보수적" : r < 66 ? "리스크 중립" : "리스크 공격적");
  // 적용된 필터 → 칩 목록 (드로어와 연동)
  const chips = [];
  if (applied.period) chips.push({ key: "period", label: applied.period });
  Object.keys(applied.assets || {}).filter((a) => applied.assets[a]).forEach((a) => chips.push({ key: "asset:" + a, label: a }));
  if (riskLabel(applied.risk)) chips.push({ key: "risk", label: riskLabel(applied.risk) });
  const removeChip = (key) => setApplied((f) => {
    if (key === "period") return { ...f, period: null };
    if (key === "risk") return { ...f, risk: null };
    if (key.startsWith("asset:")) { const a = key.slice(6); return { ...f, assets: { ...f.assets, [a]: false } }; }
    return f;
  });

  const changeColor = (v) => (v > 0 ? "var(--success)" : v < 0 ? "var(--danger)" : "var(--muted-foreground)");
  const fmtChange = (v) => (v > 0 ? "+" : "") + v.toFixed(2) + "%";

  return (
    <><div
        className="max-w-[1320px] mx-auto"
        style={{ animation: "dashFade .35s var(--ease) both" }}><PageHeader
          crumbs={["홈", "통계조회", "투자 성과·포트폴리오"]}
          title="투자 포트폴리오"
          sub="자펀드·투자자산 전반의 가치·변동·리스크 현황 — 2026-06-15 기준"
          actions={<><Button
              variant="outline"
              size="sm"
              leadingIcon="chevron-left"
              onClick={() => onNav("main")}>메인으로</Button><Button variant="primary" size="sm" leadingIcon="download">리포트</Button></>} /><section
          className="rounded-card-lg border border-border bg-card shadow-sm overflow-hidden mb-4"><div
            className="flex items-center justify-between gap-4 flex-wrap px-5 sm:px-6 pt-5 pb-4"><div className="flex items-center gap-2.5"><h2 className="text-[19px] font-bold tracking-[-.02em]">투자포트폴리오</h2><span
                className="inline-flex items-center gap-1 text-caption text-[12.5px] font-semibold"><Icon name="check-circle" size={14} style={{ color: "var(--warning)" }} />120</span></div><div className="flex items-center gap-2.5"><StatPill icon="trending" label="일일 수익률" value="+12.4%" tone="var(--success)" /><StatPill icon="wallet" label="순자산" value="₩4.2조" /></div></div><div
            className="flex items-center gap-2 flex-wrap px-5 sm:px-6 py-3 border-t border-border"><IconBtn icon="filter" label="필터" size={34} />{chips.length
              ? chips.map((c) => <FilterChip key={c.key} active={true} onClick={() => removeChip(c.key)}><span>{c.label}</span><Icon name="x" size={13} /></FilterChip>)
              : <span className="text-[12.5px]" style={{ color: "var(--caption)" }}>적용된 필터 없음</span>}<div className="flex-1" /><Button
              variant="outline"
              size="sm"
              leadingIcon="panel-left"
              onClick={() => setFilterOpen(true)}>상세필터</Button><IconBtn icon="refresh" label="새로고침" size={34} /><IconBtn icon="more" label="더보기" size={34} /></div><div className="overflow-x-auto"><table className="w-full border-collapse min-w-[840px]"><thead><tr style={{ background: "color-mix(in srgb,var(--muted) 60%,transparent)" }}>{[["자산 식별자", "left"], ["가치 (KRW, 백만)", "right"], ["변동폭 (24시)", "right"], ["리스크 등급", "left"], ["성과 이력", "left"], ["관리", "right"]].map((c, i) =>
                    <th
                      key={i}
                      className={cx("t-label font-semibold px-4 py-3 whitespace-nowrap", c[1] === "right" ? "text-right" : "text-left",
                        i === 0 && "pl-5 sm:pl-6", i === 5 && "pr-5 sm:pr-6")}>{c[0]}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr
                  key={i}
                  className="group border-t border-border transition-colors"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb,var(--muted) 45%,transparent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}><td className="px-4 pl-5 sm:pl-6 py-3.5"><div className="flex items-center gap-3"><span
                        className="inline-flex items-center justify-center w-9 h-9 rounded-[9px] text-white text-[12px] font-bold shrink-0"
                        style={{ background: r.codeColor }}>{r.code}</span><div className="min-w-0"><div
                          className="text-[14.5px] font-bold leading-tight"
                          style={{ color: "var(--foreground)" }}>{r.name}</div><div className="t-caption mt-0.5">{r.meta}</div></div></div></td><td
                    className="px-4 py-3.5 text-right tabular text-[14.5px] font-semibold whitespace-nowrap"
                    style={{ color: "var(--foreground)" }}>{r.value}</td><td
                    className="px-4 py-3.5 text-right tabular text-[14px] font-bold whitespace-nowrap"
                    style={{ color: changeColor(r.change) }}>{fmtChange(r.change)}</td><td className="px-4 py-3.5"><span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-bold tracking-wide"
                      style={{
                        background: `color-mix(in srgb,var(--${r.riskTone}) 14%,transparent)`,
                        color: `var(--${r.riskTone})`,
                      }}>{r.risk}</span></td><td className="px-4 py-3.5"><BarSpark data={r.hist} color={r.codeColor} up={r.change >= 0} /></td><td className="px-4 pr-5 sm:pr-6 py-3.5 text-right"><button
                      aria-label="편집"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      style={{ border: "none", background: "transparent" }}><Icon name="file" size={18} /></button></td></tr>)}</tbody></table></div><div
            className="flex items-center justify-between gap-4 flex-wrap px-5 sm:px-6 py-4 border-t border-border"><span className="t-caption">총 1,208개 중 <b style={{ color: "var(--foreground)" }}>{rows.length + "개"}</b>{" "}항목 표시 중</span><div className="flex items-center gap-2"><button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-muted-foreground cursor-pointer"
                style={{ border: "1px solid var(--border)", background: "var(--card)" }}><Icon name="chevron-left" size={16} /></button>{[1, 2, 3].map((n) => <button
                key={n}
                onClick={() => setPage(n)}
                className={cx("w-8 h-8 inline-flex items-center justify-center rounded-lg text-[13px] font-semibold cursor-pointer tabular transition-colors")}
                style={page === n
                  ? { background: "color-mix(in srgb,var(--primary) 12%,transparent)", color: "var(--primary)", border: "1px solid color-mix(in srgb,var(--primary) 40%,transparent)" }
                  : { background: "var(--card)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>{n}</button>)}<button
                onClick={() => setPage((p) => Math.min(3, p + 1))}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-muted-foreground cursor-pointer"
                style={{ border: "1px solid var(--border)", background: "var(--card)" }}><Icon name="chevron-right" size={16} /></button></div><div className="flex items-center gap-3"><SegTabs
                options={[{ value: "list", label: "리스트 뷰" }, { value: "detail", label: "상세 뷰" }]}
                value={view}
                onChange={setView}
                size="sm" /><div className="flex items-center gap-0.5">{["download", "external", "file", "more"].map((ic, i) => <IconBtn key={i} icon={ic} label={ic} size={34} />)}</div></div></div></section><div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4"><div
            className="rounded-card-lg border border-border p-6"
            style={{ background: "color-mix(in srgb,var(--muted) 50%,var(--card))" }}><h3 className="text-[17px] font-bold mb-3">분기별 전망</h3><p
              className="t-body text-[13.5px] leading-relaxed"
              style={{ color: "var(--muted-foreground)", maxWidth: 540 }}>재무 모델링에 따르면 농식품 정책펀드 포트폴리오는 강세 추세를 보일 것으로 예측됩니다. 다음 회계연도에는 스마트팜·푸드테크 등 신성장 분야로의 다변화를 권장합니다.</p><div className="flex items-end gap-10 mt-6"><div><div className="t-caption mb-1">신뢰 지수</div><div
                  className="text-[30px] font-extrabold tabular"
                  style={{ color: "var(--accent)" }}>88%</div></div><div><div className="t-caption mb-1">변동성 지수</div><div
                  className="text-[30px] font-extrabold"
                  style={{ color: "var(--success)" }}>낮음</div></div></div></div><div
            className="rounded-card-lg p-6 text-white relative overflow-hidden"
            style={{ background: "#439E00", boxShadow: "var(--shadow-md)" }}><div className="relative"><h3 className="text-[17px] font-bold mb-1.5">자본 준비금</h3><p className="text-[13px] mb-1" style={{ opacity: .85 }}>출자 가능 미집행 자금 현황입니다.</p><div className="text-[34px] font-extrabold tabular mb-5 leading-tight">₩1,402,990<span className="text-[16px] font-semibold ml-1" style={{ opacity: .8 }}>백만</span></div><button
                className="w-full inline-flex items-center justify-center gap-2 rounded-[10px] py-3 text-[13.5px] font-bold cursor-pointer transition-colors"
                style={{ background: "rgba(255,255,255,.18)", color: "#fff", border: "1px solid rgba(255,255,255,.3)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.28)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.18)")}><Icon name="trending" size={16} />배분 요청</button></div></div></div></div><FilterDrawer
        open={filterOpen}
        applied={applied}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => { setApplied((f) => ({ ...f, ...next })); setFilterOpen(false); }} /></>
  );
}

export { Performance };
