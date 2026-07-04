/* 공통 래퍼 컴포넌트 — Tailwind 유틸리티 className 기반.
   동적 색(accent/tone 토큰)·계산된 치수는 인라인 유지(Tailwind로 표현 불가), 나머지는 유틸리티. */
import React from 'react';
import { Icon } from './icons';
import { Charts } from './charts';
import { mn, MT, useMask } from './mask';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import * as ToggleGroup from '@radix-ui/react-toggle-group';

const { Sparkline } = Charts;
const cx = (...a: any[]) => a.filter(Boolean).join(" ");

/* 공유 타입 — 다른 모듈은 `import type { Tone, Size } from './components'` */
export type Tone = "primary" | "success" | "warning" | "danger" | "info" | "cyan";
export type Size = "sm" | "md" | "lg";
type ToneLike = Tone | string;

const toneVar = (t?: ToneLike): string[] => ({
  primary: ["var(--primary)", "color-mix(in srgb,var(--primary) 12%,transparent)"],
  success: ["var(--success)", "var(--success-soft)"],
  warning: ["var(--warning)", "var(--warning-soft)"],
  danger:  ["var(--danger)", "var(--danger-soft)"],
  info:    ["var(--info)", "var(--info-soft)"],
  cyan:    ["var(--cyan)", "color-mix(in srgb,var(--cyan) 14%,transparent)"],
}[t] || ["var(--primary)", "color-mix(in srgb,var(--primary) 12%,transparent)"]);

/* ---- ColorChip ---- */
function ColorChip({ icon, color = "var(--primary)", soft, size = 36, iconSize = 20 }: { icon: string; color?: string; soft?: string; size?: number; iconSize?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 rounded-[10px]"
      style={{ width: size, height: size, background: soft || `color-mix(in srgb,${color} 13%,transparent)`, color }}><Icon name={icon} size={iconSize} stroke={2} /></span>
  );
}

/* ---- StatusBadge ---- */
function StatusBadge({ tone = "success", label, icon, size = "md" }: { tone?: ToneLike; label?: React.ReactNode; icon?: string; size?: "sm" | "md" }) {
  const [c, soft] = toneVar(tone);
  return (
    <span
      className={cx("inline-flex items-center gap-[5px] rounded-[7px] font-bold leading-tight whitespace-nowrap",
        size === "sm" ? "px-[7px] py-[2px] text-[11px]" : "px-[9px] py-[3px] text-xs")}
      style={{ background: soft, color: c }}>{icon ? <Icon name={icon} size={13} stroke={2.4} />
           : <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />}{label}</span>
  );
}

/* ---- DeltaBadge ---- */
function DeltaBadge({ value, label, invert }: { value: any; label?: React.ReactNode; invert?: boolean }) {
  useMask();
  const good = invert ? value < 0 : value > 0;
  const c = good ? "var(--success)" : "var(--danger)";
  const up = value > 0;
  return (
    <span
      className="inline-flex items-center gap-1 text-[12.5px] font-bold"
      style={{ color: c }}><Icon name={up ? "trending" : "trending-down"} size={14} stroke={2.5} /><span className="tabular">{(up ? "+" : "") + mn(value)}</span>{label && <span className="text-caption font-medium text-[11.5px]"><MT>{label}</MT></span>}</span>
  );
}

/* ---- StatCard ---- */
function StatCard({ kpi, onClick, emphasis }: { kpi: any; onClick?: () => void; emphasis?: boolean }) {
  useMask();
  const c = kpi.accent;
  return (
    <button
      onClick={onClick}
      className={cx("stat-card relative text-left w-full flex flex-col gap-2.5 overflow-hidden",
        "rounded-card border border-border bg-card px-[18px] py-4 font-[inherit] text-[inherit] transition-shadow duration-200",
        emphasis ? "shadow-md" : "shadow-sm", onClick ? "cursor-pointer" : "cursor-default")}><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-[9px] min-w-0"><ColorChip icon={kpi.icon} color={c} size={32} iconSize={18} /><span className="t-label whitespace-nowrap overflow-hidden text-ellipsis"><MT>{kpi.label}</MT></span></div>{kpi.fr && <span className="t-caption text-[10px] opacity-80 whitespace-nowrap"><MT>{kpi.fr}</MT></span>}</div><div className="flex items-end gap-2"><div className="flex-1 min-w-0"><div className="flex items-baseline gap-1 whitespace-nowrap"><span
              className="t-display tabular"
              style={{ fontSize: emphasis ? 24 : 22, letterSpacing: "-.01em" }}>{mn(kpi.value)}</span><span className="text-[12.5px] font-semibold text-muted-foreground">{kpi.unit}</span></div><div className="mt-[5px]"><DeltaBadge value={kpi.delta} label={kpi.deltaLabel} invert={kpi.invertDelta} /></div></div><div className="w-[78px] shrink-0"><Sparkline data={kpi.trend} color={c} id={kpi.id} height={38} /></div></div>{kpi.progress != null && <div className="h-[5px] rounded-full bg-muted overflow-hidden mt-0.5"><div
          className="h-full rounded-full"
          style={{ width: kpi.progress + "%", background: c }} /></div>}</button>
  );
}

/* ---- Card (generic) ---- */
function Card({ children, accent, pad = 18, className, style, span }: { children?: React.ReactNode; accent?: string; pad?: number; className?: string; style?: React.CSSProperties; span?: number | string }) {
  return (
    <section
      className={cx(span && "dcol-" + span, "rounded-card border border-border bg-card shadow-sm min-w-0", className)}
      style={{ padding: pad, ...style }}>{children}</section>
  );
}

/* ---- ChartCard ---- */
function ChartCard({ title, sub, icon, accent = "var(--primary)", right, children, footer, span, minH }: { title?: React.ReactNode; sub?: React.ReactNode; icon?: string; accent?: string; right?: React.ReactNode; children?: React.ReactNode; footer?: React.ReactNode; span?: number | string; minH?: number }) {
  return (
    <section
      className={cx(span && "dcol-" + span, "flex flex-col rounded-card border border-border bg-card shadow-sm min-w-0 overflow-hidden")}><header
        className="flex items-center justify-between gap-3 px-[18px] py-[14px] border-b border-border"><div className="flex items-center gap-2.5 min-w-0"><ColorChip icon={icon} color={accent} size={34} iconSize={18} /><div className="min-w-0"><div className="t-cardtitle whitespace-nowrap overflow-hidden text-ellipsis"><MT>{title}</MT></div>{sub && <div className="t-caption mt-px"><MT>{sub}</MT></div>}</div></div>{right && <div className="flex items-center gap-1.5 shrink-0">{right}</div>}</header><div className="p-[18px] flex-1" style={{ minHeight: minH }}>{children}</div>{footer && <div
        className="px-[18px] py-2.5 border-t border-border"
        style={{ background: "color-mix(in srgb,var(--muted) 55%,transparent)" }}>{footer}</div>}</section>
  );
}

/* ---- SegTabs ---- */
function SegTabs({ options, value, onChange, size = "md" }: { options: any[]; value?: any; onChange?: (v: any) => void; size?: "sm" | "md" }) {
  const sv = (x: any) => (x == null ? "" : String(x));
  return (
    <ToggleGroup.Root
      type="single"
      value={sv(value)}
      onValueChange={(nv) => {
        if (!nv) return; // 활성 항목 재클릭 시 해제 방지(항상 1개 선택 유지)
        const opt = options.find((o) => sv(o.value ?? o) === nv);
        onChange && onChange(opt != null ? (opt.value ?? opt) : nv);
      }}
      className="inline-flex bg-muted rounded-[9px] p-[3px] gap-0.5">{options.map((o) => {
        const v = o.value ?? o, lab = o.label ?? o;
        const active = v === value;
        return (
          <ToggleGroup.Item
            key={sv(v)}
            value={sv(v)}
            className={cx("cursor-pointer font-[inherit] border-0 rounded-[7px] font-semibold transition-all duration-150",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-[13px] py-[5px] text-[12.5px]",
              active ? "bg-card text-primary shadow-sm" : "bg-transparent text-muted-foreground")}>{lab}</ToggleGroup.Item>
        );
      })}</ToggleGroup.Root>
  );
}

/* ---- FilterChip ---- */
function FilterChip({ active, children, onClick, dot }: { active?: boolean; children?: React.ReactNode; onClick?: () => void; dot?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={!!active}
      className={cx("inline-flex items-center gap-1.5 cursor-pointer font-[inherit] rounded-lg px-[11px] py-[5px] text-[12.5px] font-semibold border transition-all duration-150",
        active ? "text-primary" : "border-border-strong text-muted-foreground bg-card")}
      style={active ? { background: "color-mix(in srgb,var(--primary) 10%,transparent)", borderColor: "color-mix(in srgb,var(--primary) 28%,transparent)" } : undefined}>{dot && <span className="w-[7px] h-[7px] rounded-full" style={{ background: dot }} />}{children}</button>
  );
}

/* ---- Button ---- */
function Button({ variant = "primary", size = "md", leadingIcon, trailingIcon, children, onClick, style }: { variant?: "primary" | "secondary" | "outline" | "ghost" | "accent"; size?: Size; leadingIcon?: string; trailingIcon?: string; children?: React.ReactNode; onClick?: (e?: any) => void; style?: React.CSSProperties }) {
  const sizeCls = size === "sm" ? "px-[11px] py-1.5 text-[12.5px]" : size === "lg" ? "px-5 py-[11px] text-[13.5px]" : "px-[15px] py-2 text-[13.5px]";
  const variantCls = {
    primary: "bg-primary text-primary-foreground",
    secondary: "text-[color:var(--on-brand-solid)] bg-[var(--brand-gray)]",
    outline: "bg-card text-foreground border-border-strong",
    ghost: "bg-transparent text-muted-foreground",
    accent: "bg-accent text-accent-foreground",
  }[variant];
  return (
    <button
      onClick={onClick}
      className={cx("ui-btn ui-" + variant, "inline-flex items-center justify-center gap-[7px] cursor-pointer font-[inherit] font-semibold rounded-[9px] whitespace-nowrap border border-transparent transition-all duration-150", sizeCls, variantCls)}
      style={style}>{leadingIcon && <Icon name={leadingIcon} size={size === "sm" ? 14 : 16} stroke={2.2} />}{children}{trailingIcon && <Icon name={trailingIcon} size={size === "sm" ? 14 : 16} stroke={2.2} />}</button>
  );
}

/* ---- IconBtn ---- */
function IconBtn({ icon, onClick, label, badge, active, size = 38, activeClassName, activeStyle, expanded }: { icon: string; onClick?: () => void; label?: string; badge?: number; active?: boolean; size?: number; activeClassName?: string; activeStyle?: React.CSSProperties; expanded?: boolean }) {
  const btn = (
    <button
      onClick={onClick}
      aria-label={label}
      aria-haspopup={expanded === undefined ? undefined : "menu"}
      aria-expanded={expanded}
      className={cx("relative inline-flex items-center justify-center rounded-[10px] cursor-pointer border transition-all duration-150",
        active ? (activeClassName || "bg-card text-primary border-ring") : "bg-transparent text-muted-foreground border-transparent")}
      style={{ width: size, height: size, ...(active ? activeStyle : undefined) }}><Icon name={icon} size={20} stroke={2} />{badge > 0 && <span
        className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-danger text-[color:var(--destructive-foreground)] text-[10px] font-bold flex items-center justify-center border-2 border-card">{badge > 99 ? "99+" : badge}</span>}</button>
  );
  if (!label) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/* ---- EmptyState ---- */
function EmptyState({ msg = "표시할 데이터가 없습니다", icon = "inbox", height = 160 }: { msg?: string; icon?: string; height?: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 text-caption"
      style={{ height }}><Icon name={icon} size={30} stroke={1.7} /><div className="text-[13px] font-medium">{msg}</div></div>
  );
}

/* ---- CountPill ---- */
function CountPill({ count, urgent }: { count?: number; urgent?: boolean }) {
  if (!count) return null;
  return (
    <span
      className={cx("min-w-[18px] h-[18px] px-[5px] rounded-full text-[10.5px] font-bold inline-flex items-center justify-center", urgent ? "bg-danger text-[color:var(--destructive-foreground)]" : "text-primary")}
      style={urgent ? undefined : { background: "color-mix(in srgb,var(--primary) 15%,transparent)" }}>{count > 99 ? "99+" : count}</span>
  );
}

export const UI = { ColorChip, StatusBadge, DeltaBadge, StatCard, Card, ChartCard, SegTabs, FilterChip, Button, IconBtn, EmptyState, CountPill, toneVar };
