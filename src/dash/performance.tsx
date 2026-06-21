/* 투자 성과·포트폴리오 서브페이지 — 첨부 디자인(테이블 + 하단 2카드) 스타일.
   APFS forest-green 토큰 + Tailwind 유틸리티.
   claude.ai/design 프로젝트 dash/performance.js 충실 포팅(행 선택·더보기 메뉴·등록 모달 포함). */
import React from 'react';
import { Icon } from './icons';
import { UI } from './components';
import { Shell } from './shell';
import { APFS_DATA } from './data';
import { mn, MT } from './mask';

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
    <div className="flex items-end gap-[3px] h-[10px]" aria-hidden={true}>
      {bars.map((v, i) => (
        <span
          key={i}
          className="w-[5px] rounded-[2px] inline-block"
          style={{
            height: Math.max(30, (v / max) * 100) + "%",
            background: c,
            opacity: 0.45 + (i / (bars.length - 1)) * 0.55,
          }}
        />
      ))}
    </div>
  );
}

/* 상단 요약 스탯 pill */
function StatPill({ icon, label, value, tone }: { icon?: string; label?: React.ReactNode; value?: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-card border border-border bg-card px-3.5 py-2 shadow-sm">
      <ColorChip icon={icon} color={tone || "var(--primary)"} size={30} iconSize={16} />
      <div className="leading-tight">
        <div className="t-caption text-[11px]"><MT>{label}</MT></div>
        <div className="text-[15px] font-bold tabular" style={tone ? { color: tone } : undefined}>{mn(value)}</div>
      </div>
    </div>
  );
}

/* ===== 우측 슬라이드인: 상세 필터 드로어 (이미지 사양) ===== */
function CheckRow({ label, checked, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full text-left cursor-pointer bg-transparent border-0 py-2">
      <span
        className="inline-flex items-center justify-center shrink-0 transition-all duration-150"
        style={{
          width: 26, height: 26, borderRadius: 7,
          background: checked ? "var(--brand-blue)" : "var(--card)",
          border: checked ? "1px solid var(--brand-blue)" : "1.5px solid var(--border-strong)",
        }}>
        {checked && <Icon name="check" size={17} stroke={3} style={{ color: "#fff" }} />}
      </span>
      <span className="text-[14px] font-semibold" style={{ color: "var(--foreground)" }}>{label}</span>
    </button>
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
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.42)", zIndex: 70,
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .25s var(--ease)",
        }}
      />
      <aside
        aria-label="포트폴리오 상세 필터"
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 408, maxWidth: "92vw", zIndex: 71,
          background: "var(--card)", borderLeft: "1px solid var(--border)", boxShadow: "var(--shadow-lg)",
          transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform .3s var(--ease)",
          display: "flex", flexDirection: "column",
        }}>
        <header className="flex items-center justify-between px-6 border-b border-border" style={{ height: 62, flex: "0 0 auto" }}>
          <h2 className="text-[16px] font-bold tracking-[-.02em]" style={{ color: "var(--foreground)" }}>포트폴리오 상세 필터</h2>
          <IconBtn icon="x" onClick={onClose} label="닫기" size={38} />
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-6" style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div>
            <div className="text-[13px] font-bold mb-2" style={{ color: "var(--muted-foreground)" }}>자산 유형</div>
            <div className="flex flex-col">
              {ASSETS.map((a) => <CheckRow key={a} label={a} checked={!!sel[a]} onClick={() => toggle(a)} />)}
            </div>
          </div>
          <div>
            <div className="text-[13px] font-bold mb-3" style={{ color: "var(--muted-foreground)" }}>리스크 노출도</div>
            <input
              type="range"
              min={0}
              max={100}
              value={risk}
              onChange={(e) => setRisk(+e.target.value)}
              className="apfs-range"
              style={{ width: "100%", accentColor: "var(--brand-blue)" }}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[12.5px] font-semibold" style={{ color: "var(--muted-foreground)" }}>보수적</span>
              <span className="text-[12.5px] font-semibold" style={{ color: "var(--muted-foreground)" }}>공격적</span>
            </div>
          </div>
          <div>
            <div className="text-[13px] font-bold mb-2.5" style={{ color: "var(--muted-foreground)" }}>기간 설정</div>
            <div className="relative">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full text-[14px] font-semibold cursor-pointer appearance-none"
                style={{
                  color: "var(--foreground)", background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "11px 44px 11px 14px", fontFamily: "inherit", outline: "none",
                }}>
                {["당기 회계연도", "전기 회계연도", "최근 1년", "최근 3년", "설정 기간"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <Icon
                name="chevron-down"
                size={20}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }}
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-5 border-t border-border" style={{ flex: "0 0 auto" }}>
          <button
            onClick={() => onApply({ assets: sel, risk, period })}
            className="ui-btn w-full inline-flex items-center justify-center gap-2 cursor-pointer text-[14px] font-bold"
            style={{ background: "#1F1F22", color: "#fff", borderRadius: 12, padding: "14px", border: "none" }}>필터 적용</button>
        </div>
      </aside>
    </>
  );
}

/* ===== 더보기 드롭다운 메뉴 ===== */
function MenuItem({ icon, label, onClick, ph, danger }: { icon: string; label: string; onClick?: () => void; ph?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="nc-row"
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 11px",
        borderRadius: 8, border: "none", background: "transparent", font: "inherit",
        fontSize: 13.5, fontWeight: 600, cursor: "pointer",
        color: danger ? "var(--danger)" : "var(--foreground)", textAlign: "left",
      }}>
      <Icon name={icon} size={17} style={{ color: danger ? "var(--danger)" : "var(--muted-foreground)", flex: "0 0 auto" }} />
      {ph ? <MT>{label}</MT> : label}
    </button>
  );
}

function MoreMenu({ onRegister, onDelete, count }: { onRegister: () => void; onDelete: () => void; count: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <IconBtn icon="more" label="더보기" size={34} active={open} onClick={() => setOpen((o) => !o)} />
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
          <div
            role="menu"
            className="absolute right-0 mt-1.5 z-40"
            style={{
              minWidth: 188, background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: 12, boxShadow: "var(--shadow-lg)", padding: 6, animation: "ncPop .16s var(--ease) both",
            }}>
            <MenuItem icon="plus" label="등록" onClick={() => { setOpen(false); onRegister(); }} />
            <MenuItem icon="trash" label={count > 0 ? "삭제 (" + count + ")" : "삭제"} danger onClick={() => { setOpen(false); onDelete(); }} />
            <div style={{ height: 1, background: "var(--border)", margin: "5px 4px" }} />
            <MenuItem icon="download" label="내보내기" ph onClick={() => setOpen(false)} />
            <MenuItem icon="file" label="인쇄" ph onClick={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}

/* ===== 신규 등록 모달 (내용 placeholder) ===== */
function RegField({ label, span }: { label: string; span?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, gridColumn: span ? "1 / -1" : "auto" }}>
      <div className="t-caption"><MT>{label}</MT></div>
      <div
        style={{
          height: span ? 92 : 44, borderRadius: 10, border: "1px solid var(--border)", background: "var(--muted)",
          display: "flex", alignItems: span ? "flex-start" : "center", padding: span ? "13px 14px" : "0 14px",
        }}>
        <span
          aria-hidden={true}
          style={{ display: "block", height: "0.7em", width: span ? "64%" : "44%", borderRadius: 5, background: "var(--muted-foreground)", opacity: 0.16 }}
        />
      </div>
    </div>
  );
}

function RegisterModal({ open, mode = "create", onClose, onSubmit }: { open: boolean; mode?: string; onClose: () => void; onSubmit?: () => void }) {
  if (!open) return null;
  const edit = mode === "edit";
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 80, animation: "ncFade .16s var(--ease) both" }}
      />
      <div style={{ position: "fixed", inset: 0, zIndex: 81, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, pointerEvents: "none" }}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="신규 등록"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 560, maxWidth: "100%", maxHeight: "86vh", background: "var(--card)",
            borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)",
            display: "flex", flexDirection: "column", overflow: "hidden", pointerEvents: "auto",
            animation: "ncPop .2s var(--ease) both",
          }}>
          <header className="flex items-center justify-between gap-3 px-6 border-b border-border" style={{ height: 62, flex: "0 0 auto" }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <h2 className="text-[16px] font-bold tracking-[-.02em]" style={{ color: "var(--foreground)" }}>{edit ? "수정" : "신규 등록"}</h2>
            </div>
            <IconBtn icon="x" onClick={onClose} label="닫기" size={38} />
          </header>
          <div className="flex-1 overflow-y-auto px-6 py-6" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 16px" }}>
            <RegField label="자산 식별자" span />
            <RegField label="자산명" />
            <RegField label="자산 분류" />
            <RegField label="평가 가치" />
            <RegField label="통화 단위" />
            <RegField label="리스크 등급" />
            <RegField label="담당자" />
            <RegField label="비고" span />
          </div>
          <footer className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border" style={{ flex: "0 0 auto" }}>
            <Button variant="outline" size="md" onClick={onClose}>{edit ? "닫기" : "취소"}</Button>
            <Button variant="primary" size="md" leadingIcon="check" onClick={() => (onSubmit ? onSubmit() : onClose())}>{edit ? "저장" : "등록"}</Button>
          </footer>
        </div>
      </div>
    </>
  );
}

/* ===== 행 선택 체크박스 ===== */
function RowCheck({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <span
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className="inline-flex items-center justify-center shrink-0 cursor-pointer transition-all duration-150 align-middle"
      style={{
        width: 20, height: 20, borderRadius: 6,
        background: checked ? "var(--brand-blue)" : "var(--card)",
        border: checked ? "1px solid var(--brand-blue)" : "1.5px solid var(--border-strong)",
      }}>
      {checked && <Icon name="check" size={13} stroke={3} style={{ color: "#fff" }} />}
    </span>
  );
}

function Performance({ onNav }) {
  const [view, setView] = useState("list");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [modal, setModal] = useState<string | null>(null); // null | "create" | "edit"
  const [applied, setApplied] = useState({ period: "당기 회계연도", assets: { "주식": true, "채권": true }, risk: 50 });
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [rows, setRows] = useState(D.PORTFOLIO);
  const allChecked = rows.length > 0 && rows.every((_, i) => selected[i]);
  const toggleAll = () => setSelected(allChecked ? {} : rows.reduce((o, _, i) => ((o[i] = true), o), {} as Record<number, boolean>));
  const toggleRow = (i) => setSelected((s) => ({ ...s, [i]: !s[i] }));
  const addRow = () => setRows((rs) => [{
    code: "NEW", codeColor: "var(--chart-1)", name: "신규 등록 자산", meta: "신규 · 미분류",
    value: "0", change: 0, risk: "MEDIUM", riskTone: "info", hist: [1, 1, 1, 1, 1],
  }, ...rs]);
  const selCount = rows.filter((_, i) => selected[i]).length;
  const deleteSelected = () => {
    if (!selCount) return;
    setRows((rs) => rs.filter((_, i) => !selected[i]));
    setSelected({});
    setPage(1);
  };

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
    <>
      <div className="max-w-[1320px] mx-auto" style={{ animation: "dashFade .35s var(--ease) both" }}>
        <PageHeader
          crumbs={["홈", "통계조회", "투자 성과·포트폴리오"]}
          actions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav("main")}>메인으로</Button>}
        />

        {/* ===== 카드: 헤더 + 필터 + 테이블 + 푸터 ===== */}
        <section className="rounded-card-lg border border-border bg-card shadow-sm overflow-hidden mb-4">

          {/* 카드 헤더 */}
          <div className="flex items-center justify-between gap-4 flex-wrap px-5 sm:px-6 pt-5 pb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[19px] font-bold tracking-[-.02em]"><MT>투자포트폴리오</MT></h2>
            </div>
            <div className="flex items-center gap-2.5">
              <StatPill icon="trending" label="일일 수익률" value="+12.4%" tone="var(--success)" />
              <StatPill icon="wallet" label="순자산" value="₩42,000억" />
            </div>
          </div>

          {/* 필터 바 */}
          <div className="flex items-center gap-2 flex-wrap px-5 sm:px-6 py-3 border-t border-border">
            <IconBtn icon="filter" label="필터" size={34} />
            {chips.length
              ? chips.map((c) => <FilterChip key={c.key} active={true} onClick={() => removeChip(c.key)}><MT>{c.label}</MT><Icon name="x" size={13} /></FilterChip>)
              : <span className="text-[12.5px]" style={{ color: "var(--caption)" }}>적용된 필터 없음</span>}
            <div className="flex-1" />
            <Button variant="outline" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
            <IconBtn icon="refresh" label="새로고침" size={34} />
            <MoreMenu onRegister={() => setModal("create")} onDelete={deleteSelected} count={selCount} />
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[840px]">
              <thead>
                <tr style={{ background: "color-mix(in srgb,var(--muted) 60%,transparent)" }}>
                  <th className="pl-5 sm:pl-6 pr-2 py-3 text-left" style={{ width: 1 }}>
                    <RowCheck checked={allChecked} onChange={toggleAll} />
                  </th>
                  {[["자산 식별자", "left"], ["가치 (KRW, 백만)", "right"], ["변동폭 (24시)", "right"], ["리스크 등급", "left"], ["성과 이력", "left"], ["관리", "right"]].map((c, i) => (
                    <th
                      key={i}
                      className={cx("t-label font-semibold px-4 py-3 whitespace-nowrap", c[1] === "right" ? "text-right" : "text-left", i === 5 && "pr-5 sm:pr-6")}>
                      <MT>{c[0]}</MT>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className="group border-t border-border transition-colors"
                    style={{ cursor: "pointer" }}
                    onDoubleClick={() => setModal("edit")}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb,var(--muted) 45%,transparent)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    {/* 선택 */}
                    <td className="pl-5 sm:pl-6 pr-2 py-3.5" style={{ width: 1 }}>
                      <RowCheck checked={!!selected[i]} onChange={() => toggleRow(i)} />
                    </td>
                    {/* 자산 식별자 */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-flex items-center justify-center w-9 h-9 rounded-[9px] text-white text-[12px] font-bold shrink-0"
                          style={{ background: r.codeColor }}><MT>{r.code}</MT></span>
                        <div className="min-w-0">
                          <div className="text-[14.5px] font-bold leading-tight" style={{ color: "var(--foreground)" }}><MT>{r.name}</MT></div>
                          <div className="t-caption mt-0.5"><MT>{r.meta}</MT></div>
                        </div>
                      </div>
                    </td>
                    {/* 가치 */}
                    <td className="px-4 py-3.5 text-right tabular text-[14.5px] font-semibold whitespace-nowrap" style={{ color: "var(--foreground)" }}>{mn(r.value)}</td>
                    {/* 변동폭 */}
                    <td className="px-4 py-3.5 text-right tabular text-[14px] font-bold whitespace-nowrap" style={{ color: changeColor(r.change) }}>{mn(fmtChange(r.change))}</td>
                    {/* 리스크 등급 */}
                    <td className="px-4 py-3.5">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-bold tracking-wide"
                        style={{
                          background: `color-mix(in srgb,var(--${r.riskTone}) 14%,transparent)`,
                          color: `var(--${r.riskTone})`,
                        }}><MT w={36}>{r.risk}</MT></span>
                    </td>
                    {/* 성과 이력 */}
                    <td className="px-4 py-3.5"><BarSpark data={r.hist} color={r.codeColor} up={r.change >= 0} /></td>
                    {/* 관리 */}
                    <td className="px-4 pr-5 sm:pr-6 py-3.5 text-right">
                      <button
                        aria-label="편집"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        style={{ border: "none", background: "transparent" }}><Icon name="file" size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-between gap-4 flex-wrap px-5 sm:px-6 py-4 border-t border-border">
            <span className="t-caption">총 {mn("1,208")}개 중 <b style={{ color: "var(--foreground)" }}>{mn(rows.length) + "개"}</b> 항목 표시 중</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-muted-foreground cursor-pointer"
                style={{ border: "1px solid var(--border)", background: "var(--card)" }}><Icon name="chevron-left" size={16} /></button>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={cx("w-8 h-8 inline-flex items-center justify-center rounded-lg text-[13px] font-semibold cursor-pointer tabular transition-colors")}
                  style={page === n
                    ? { background: "color-mix(in srgb,var(--primary) 12%,transparent)", color: "var(--primary)", border: "1px solid color-mix(in srgb,var(--primary) 40%,transparent)" }
                    : { background: "var(--card)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>{n}</button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(3, p + 1))}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-muted-foreground cursor-pointer"
                style={{ border: "1px solid var(--border)", background: "var(--card)" }}><Icon name="chevron-right" size={16} /></button>
            </div>
            <div className="flex items-center gap-3">
              <SegTabs options={[{ value: "list", label: "리스트 뷰" }, { value: "detail", label: "상세 뷰" }]} value={view} onChange={setView} size="sm" />
              <div className="flex items-center gap-0.5">
                {["download", "external", "file", "more"].map((ic, i) => <IconBtn key={i} icon={ic} label={ic} size={34} />)}
              </div>
            </div>
          </div>
        </section>

        {/* ===== 하단 2카드 ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          {/* 분기별 전망 */}
          <div className="rounded-card-lg border border-border p-6" style={{ background: "color-mix(in srgb,var(--muted) 50%,var(--card))" }}>
            <h3 className="text-[17px] font-bold mb-3"><MT>분기별 전망</MT></h3>
            <p className="t-body text-[13.5px] leading-relaxed" style={{ color: "var(--muted-foreground)", maxWidth: 540 }}>
              {["100%", "97%", "58%"].map((wd, i) => (
                <span key={i} aria-hidden={true} style={{ display: "block", height: "0.72em", margin: "0.42em 0", borderRadius: 5, background: "currentColor", opacity: 0.14, width: wd }} />
              ))}
            </p>
            <div className="flex items-end gap-10 mt-6">
              <div>
                <div className="t-caption mb-1"><MT>신뢰 지수</MT></div>
                <div className="text-[30px] font-extrabold tabular" style={{ color: "var(--accent)" }}>{mn("88%")}</div>
              </div>
              <div>
                <div className="t-caption mb-1"><MT>변동성 지수</MT></div>
                <div className="text-[30px] font-extrabold" style={{ color: "var(--success)" }}><MT>낮음</MT></div>
              </div>
            </div>
          </div>

          {/* 자본 준비금 (단색) */}
          <div className="rounded-card-lg p-6 text-white relative overflow-hidden" style={{ background: "#439E00", boxShadow: "var(--shadow-md)" }}>
            <div className="relative">
              <h3 className="text-[17px] font-bold mb-1.5"><MT>자본 준비금</MT></h3>
              <p className="text-[13px] mb-1" style={{ opacity: .85 }}><MT>출자 가능 미집행 자금 현황입니다.</MT></p>
              <div className="text-[34px] font-extrabold tabular mb-5 leading-tight">{mn("₩1,402,990")}</div>
              <button
                className="w-full inline-flex items-center justify-center gap-2 rounded-[10px] py-3 text-[13.5px] font-bold cursor-pointer transition-colors"
                style={{ background: "rgba(255,255,255,.18)", color: "#fff", border: "1px solid rgba(255,255,255,.3)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.28)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.18)")}>
                <Icon name="trending" size={16} /><MT>배분 요청</MT></button>
            </div>
          </div>
        </div>
      </div>

      <FilterDrawer
        open={filterOpen}
        applied={applied}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => { setApplied((f) => ({ ...f, ...next })); setFilterOpen(false); }}
      />
      <RegisterModal
        open={!!modal}
        mode={modal || "create"}
        onClose={() => setModal(null)}
        onSubmit={() => { if (modal === "create") addRow(); setModal(null); }}
      />
    </>
  );
}

export { Performance };
