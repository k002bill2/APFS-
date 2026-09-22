/* 공통 래퍼 컴포넌트 — Tailwind 유틸리티 className 기반.
   동적 색(accent/tone 토큰)·계산된 치수는 인라인 유지(Tailwind로 표현 불가), 나머지는 유틸리티. */
import React from 'react';
import { motion } from 'motion/react';
import { Icon } from './icons';
import { Charts } from './charts';
import { mn, MT, useMask } from './mask';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Progress } from './ui/progress';
import { spring, tween, revealVariants } from './motion/presets';
import { CountUp } from './motion/count-up';
import { useDialogLock } from './ui/dialog-exit';

const { Sparkline } = Charts;
const cx = (...a: any[]) => a.filter(Boolean).join(" ");

/* 공유 타입 — 다른 모듈은 `import type { Tone, Size } from './components'` */
export type Tone = "primary" | "success" | "warning" | "danger" | "info" | "cyan" | "muted";
export type Size = "sm" | "md" | "lg";
type ToneLike = Tone | string;

const toneVar = (t?: ToneLike): string[] => ({
  primary: ["var(--primary)", "color-mix(in srgb,var(--primary) 12%,transparent)"],
  success: ["var(--success-text)", "var(--success-soft)"],
  warning: ["var(--warning-text)", "var(--warning-soft)"],
  danger:  ["var(--danger-text)", "var(--danger-soft)"],
  info:    ["var(--info-text)", "var(--info-soft)"],
  cyan:    ["var(--cyan)", "color-mix(in srgb,var(--cyan) 14%,transparent)"],
  muted:   ["var(--muted-foreground)", "var(--muted)"],   /* 중립(비활성·대상아님·N) — 경보 아님. 라이트 5.0:1 / 다크 6.1:1 (AA) */
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
/* dot=false면 앞 점 없이 텍스트만(심사단계처럼 배지가 촘촘히 반복되는 열). 기본 true — 기존 화면 무변경 */
function StatusBadge({ tone = "success", label, icon, size = "md", dot = true }: { tone?: ToneLike; label?: React.ReactNode; icon?: string; size?: "sm" | "md" | "lg"; dot?: boolean }) {
  const [c, soft] = toneVar(tone);
  return (
    <span
      className={cx("inline-flex items-center gap-[5px] rounded-[7px] font-bold leading-tight whitespace-nowrap",
        size === "sm" ? "px-[7px] py-[2px] text-[11px]" : size === "lg" ? "px-[10px] py-[4px] text-[13px]" : "px-[9px] py-[3px] text-xs")}
      style={{ background: soft, color: c }}>{icon ? <Icon name={icon} size={13} stroke={2.4} />
           : dot ? <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} /> : null}{label}</span>
  );
}

/* ---- DeltaBadge ---- */
function DeltaBadge({ value, label, invert }: { value: any; label?: React.ReactNode; invert?: boolean }) {
  useMask();
  const good = invert ? value < 0 : value > 0;
  const c = good ? "var(--success-text)" : "var(--danger-text)";   /* 델타 숫자=텍스트라 a11y -text 토큰(칠 아님) */
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
              style={{ fontSize: emphasis ? 24 : 22, letterSpacing: "-.01em" }}><CountUp value={kpi.value} /></span><span className="text-[12.5px] font-semibold text-muted-foreground">{kpi.unit}</span></div><div className="mt-[5px]"><DeltaBadge value={kpi.delta} label={kpi.deltaLabel} invert={kpi.invertDelta} /></div></div><div className="w-[78px] shrink-0"><Sparkline data={kpi.trend} color={c} id={kpi.id} height={38} /></div></div>{kpi.progress != null && <div className="h-[5px] rounded-full bg-muted overflow-hidden mt-0.5"><div
          className="h-full rounded-full"
          style={{ width: kpi.progress + "%", background: c }} /></div>}</button>
  );
}

/* ---- 스크롤 reveal props ----
   opt-in reveal 시 root 태그를 motion.section으로 바꾸고 whileInView로 fade+slide.
   래퍼 div를 끼우지 않아 dcol-span(grid 자식 신원)이 보존된다. 저모션은 MotionConfig가 y를 끈다. */
const revealProps = {
  variants: revealVariants,
  initial: "hidden" as const,
  whileInView: "visible" as const,
  viewport: { once: true, margin: "0px 0px -10% 0px" } as const,
  transition: tween.reveal,
};

/* ---- Card (generic) ---- */
function Card({ children, accent, pad = 18, className, style, span, reveal }: { children?: React.ReactNode; accent?: string; pad?: number; className?: string; style?: React.CSSProperties; span?: number | string; reveal?: boolean }) {
  const Root: any = reveal ? motion.section : "section";
  return (
    <Root
      className={cx(span && "dcol-" + span, "rounded-card border border-border bg-card shadow-sm min-w-0", className)}
      style={{ padding: pad, ...style }}
      {...(reveal ? revealProps : {})}>{children}</Root>
  );
}

/* ---- ChartCard ---- */
function ChartCard({ title, sub, icon, accent = "var(--primary)", right, children, footer, span, minH, reveal }: { title?: React.ReactNode; sub?: React.ReactNode; icon?: string; accent?: string; right?: React.ReactNode; children?: React.ReactNode; footer?: React.ReactNode; span?: number | string; minH?: number; reveal?: boolean }) {
  const Root: any = reveal ? motion.section : "section";
  return (
    <Root
      className={cx(span && "dcol-" + span, "flex flex-col rounded-card border border-border bg-card shadow-sm min-w-0 overflow-hidden")}
      {...(reveal ? revealProps : {})}><header
        className="flex items-center justify-between gap-3 px-[18px] py-[14px] border-b border-border"><div className="flex items-center gap-2.5 min-w-0"><ColorChip icon={icon} color={accent} size={34} iconSize={18} /><div className="min-w-0"><div className="t-cardtitle whitespace-nowrap overflow-hidden text-ellipsis"><MT>{title}</MT></div>{sub && <div className="t-caption mt-px"><MT>{sub}</MT></div>}</div></div>{right && <div className="flex items-center gap-1.5 shrink-0">{right}</div>}</header><div className="p-[18px] flex-1" style={{ minHeight: minH }}>{children}</div>{footer && <div
        className="px-[18px] py-2.5 border-t border-border"
        style={{ background: "color-mix(in srgb,var(--muted) 55%,transparent)" }}>{footer}</div>}</Root>
  );
}

/* ---- SegTabs ---- */
function SegTabs({ options, value, onChange, size = "md" }: { options: any[]; value?: any; onChange?: (v: any) => void; size?: "sm" | "md" }) {
  const sv = (x: any) => (x == null ? "" : String(x));
  // 활성 표시자의 layoutId — SegTabs 인스턴스마다 고유(안 그러면 여러 탭 그룹의 표시자가 서로 튐)
  const indicatorId = React.useId();
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
            className={cx("relative cursor-pointer font-[inherit] border-0 rounded-[7px] font-semibold transition-colors duration-150",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-[13px] py-[5px] text-[12.5px]",
              active ? "text-primary" : "bg-transparent text-muted-foreground")}>
            {/* 활성 배경 = Motion layoutId 표시자(탭 전환 시 슬라이드). 저모션 시 MotionConfig가 스냅으로 대체 */}
            {active && (
              <motion.span
                layoutId={indicatorId}
                className="absolute inset-0 rounded-[7px] bg-card shadow-sm"
                transition={spring.control}
              />
            )}
            <span className="relative z-[1]">{lab}</span>
          </ToggleGroup.Item>
        );
      })}</ToggleGroup.Root>
  );
}

/* ---- FilterChip ---- */
function FilterChip({ active, children, onClick, dot, count }: { active?: boolean; children?: React.ReactNode; onClick?: () => void; dot?: string; count?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={!!active}
      className={cx("inline-flex items-center gap-1.5 cursor-pointer font-[inherit] rounded-lg px-[11px] py-[5px] text-[12.5px] font-semibold border transition-all duration-150",
        active ? "text-primary" : "border-border-strong text-muted-foreground bg-card")}
      style={active ? { background: "color-mix(in srgb,var(--primary) 10%,transparent)", borderColor: "color-mix(in srgb,var(--primary) 28%,transparent)" } : undefined}>{dot && <span className="w-[7px] h-[7px] rounded-full" style={{ background: dot }} />}{children}{count != null && <>{' '}<span className="tabular-nums" style={{ fontSize: 11.5, fontWeight: 700 }}>{count}</span></>}</button>
  );
}

/* ---- Button ---- */
function Button({ variant = "primary", size = "md", leadingIcon, trailingIcon, children, onClick, style, loading, disabled }: { variant?: "primary" | "secondary" | "outline" | "ghost" | "accent"; size?: Size; leadingIcon?: string; trailingIcon?: string; children?: React.ReactNode; onClick?: (e?: any) => void; style?: React.CSSProperties; loading?: boolean; disabled?: boolean }) {
  const sizeCls = size === "sm" ? "px-[11px] py-1.5 text-[12.5px]" : size === "lg" ? "px-5 py-[11px] text-[13.5px]" : "px-[15px] py-2 text-[13.5px]";
  const variantCls = {
    // 변형마다 border-color 유틸을 하나만 둔다 — 베이스 border-transparent + 변형 border-border-strong 처럼 둘을 겹치면
    // 컴파일 CSS 순서(.border-transparent 가 .border-border-strong 뒤)에 따라 outline 테두리가 무음으로 사라진다.
    primary: "bg-primary text-primary-foreground border-transparent",
    secondary: "text-[color:var(--on-brand-solid)] bg-[var(--brand-gray)] border-transparent",
    outline: "bg-card text-foreground border-border-strong",
    ghost: "bg-transparent text-muted-foreground border-transparent",
    accent: "bg-accent text-accent-foreground border-transparent",
  }[variant];
  const iconSize = size === "sm" ? 14 : 16;
  return (
    // loading은 disabled 속성을 쓰지 않는다(포커스 유지) — aria-busy + onClick 가드로 차단. disabled prop만 진짜 disabled.
    // hover/press는 Motion spring(원본 Animate UI Button: hoverScale/tapScale). scale은 transform이라
    // MotionConfig reducedMotion="user"가 저모션 시 자동 비활성. 색 전환은 CSS(transition-colors) 유지.
    <motion.button
      onClick={(e) => { if (loading || disabled) return; onClick?.(e); }}
      disabled={disabled}
      aria-busy={loading || undefined}
      whileHover={disabled || loading ? undefined : { scale: 1.03 }}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={spring.control}
      className={cx("ui-btn ui-" + variant, "inline-flex items-center justify-center gap-[7px] cursor-pointer font-[inherit] font-semibold rounded-[9px] whitespace-nowrap border transition-colors duration-tok-fast ease-ds disabled:opacity-60 disabled:cursor-not-allowed", loading && "cursor-wait", sizeCls, variantCls)}
      style={style}>{loading ? <Icon name="loader" size={iconSize} stroke={2.2} className="animate-spin" /> : leadingIcon && <Icon name={leadingIcon} size={iconSize} stroke={2.2} />}{children}{trailingIcon && <Icon name={trailingIcon} size={iconSize} stroke={2.2} />}</motion.button>
  );
}

/* ---- SaveButton ---- */
/* 폼 모달 저장 버튼 — 디자인시스템 "Button 상태"의 loading(저장 중)을 모달마다 배선하지 않고 자동 적용한다(apfs-form-modal).
   계약: onSubmit()은 검증 실패 시 undefined(스피너 없이 즉시 오류 표시), 성공 시 commit 함수를 반환한다.
   클릭 → 검증 → 저장 중(SAVE_DEMO_MS) → commit. 백엔드가 없어 저장이 동기라 지연은 데모용 흉내다 — 상수 하나로 조절.
   loading 중 disabled 는 쓰지 않는다(포커스 유지 — Button 규약). 저장 중에는 다이얼로그 닫기를 잠근다(useDialogLock):
   취소·X·Esc 가 무시되고 본문은 aria-busy+pointer 차단 — 사용자가 누른 저장이 무음으로 유실되는 경로를 없앤다.
   (언마운트 시 폐기 방식은 exit 애니메이션 ≈280ms 와 400ms 지연이 경합해 취소해도 저장되던 실측 결함이 있었다.)
   ⚠ submit 이 성공 경로에서 closure 반환을 잊으면 무음 no-op 이다(타입으로 못 잡음) — 검증 항목: 저장 클릭 시 스피너가 떠야 한다. */
export const SAVE_DEMO_MS = 400;
export type SubmitResult = (() => void) | void;
function SaveButton({ onSubmit, children = '저장', busyLabel = '저장 중', delay = SAVE_DEMO_MS, variant = 'primary', size = 'sm', leadingIcon = 'check', style }: { onSubmit: () => SubmitResult; children?: React.ReactNode; busyLabel?: React.ReactNode; delay?: number; variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent'; size?: Size; leadingIcon?: string; style?: React.CSSProperties }) {
  const [saving, setSaving] = React.useState(false);
  const timer = React.useRef<number | null>(null);
  const lock = useDialogLock();
  const lockRef = React.useRef(lock); lockRef.current = lock;
  React.useEffect(() => () => { if (timer.current != null) window.clearTimeout(timer.current); lockRef.current?.setLocked(false); }, []);
  const click = () => {
    if (saving) return;
    const commit = onSubmit();
    if (typeof commit !== 'function') return;
    setSaving(true);
    lock?.setLocked(true);
    timer.current = window.setTimeout(() => { timer.current = null; setSaving(false); lockRef.current?.setLocked(false); commit(); }, delay);
  };
  return <Button variant={variant} size={size} leadingIcon={leadingIcon} loading={saving} onClick={click} style={style}>{saving ? busyLabel : children}</Button>;
}

/* ---- IconBtn ---- */
function IconBtn({ icon, altIcon, swapped, onClick, label, badge, active, size = 38, iconSize = 16, activeClassName, activeStyle, expanded, pressed }: { icon: string; altIcon?: string; swapped?: boolean; onClick?: () => void; label?: string; badge?: number; active?: boolean; size?: number; iconSize?: number; activeClassName?: string; activeStyle?: React.CSSProperties; expanded?: boolean; pressed?: boolean }) {
  const btn = (
    // hover/press는 Motion spring(색 전환은 CSS 유지). scale은 저모션 시 MotionConfig가 자동 비활성.
    <motion.button
      onClick={onClick}
      aria-label={label && badge && badge > 0 ? `${label} ${badge > 99 ? "99+" : badge}건` : label}
      aria-haspopup={expanded === undefined ? undefined : "menu"}
      aria-expanded={expanded}
      aria-pressed={pressed}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.9 }}
      transition={spring.control}
      className={cx("relative inline-flex items-center justify-center rounded-[10px] cursor-pointer border transition-colors duration-tok-fast ease-ds",
        active ? (activeClassName || "bg-card text-primary border-ring") : "bg-transparent text-muted-foreground border-transparent")}
      style={{ width: size, height: size, ...(active ? activeStyle : undefined) }}>{altIcon
        /* 아이콘 스왑(transitions.dev 09, src/styles/transitions.css .t-icon-swap): 두 아이콘을 같은 슬롯에 두고 swapped 로 교차 페이드. 테마 토글 등 상태 아이콘용. */
        ? <span className="t-icon-swap" data-state={swapped ? "b" : "a"} aria-hidden="true"><span className="t-icon" data-icon="a"><Icon name={icon} size={iconSize} stroke={2} /></span><span className="t-icon" data-icon="b"><Icon name={altIcon} size={iconSize} stroke={2} /></span></span>
        : <Icon name={icon} size={iconSize} stroke={2} />}{badge > 0 && <span
        className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-danger text-[color:var(--destructive-foreground)] text-[10px] font-bold flex items-center justify-center border-2 border-card">{badge > 99 ? "99+" : badge}</span>}</motion.button>
  );
  if (!label) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/* ---- PopNumber ---- */
/* 숫자 팝인(transitions.dev 02 number pop-in, src/styles/transitions.css .t-digit-group).
   value 가 바뀔 때마다 자릿수를 분해해 재진입 애니메이션을 재생한다(마지막 두 자리는 stagger).
   key 를 올려 그룹을 통째로 다시 마운트하므로 원문의 "remove class → reflow → add class" 리플레이 트릭이 필요 없다.
   끝나면 .is-animating 을 내려 will-change(합성 레이어)를 해제한다. 문자열/숫자만 분해하고 그 외 노드는 그대로 렌더. */
function PopNumber({ value, className, style }: { value: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const text = typeof value === "string" || typeof value === "number" ? String(value) : null;
  const [gen, setGen] = React.useState(0);
  const [animating, setAnimating] = React.useState(true);
  const first = React.useRef(true);
  /* useLayoutEffect: 값이 바뀐 커밋이 "새 숫자·애니메이션 없음" 상태로 한 프레임 먼저 페인트된 뒤 리마운트되면
     숫자가 한 번 깜빡인다(비-discrete 갱신 경로). paint 전에 key 를 올려 처음부터 시작 프레임으로 그린다. */
  React.useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    setGen((g) => g + 1); setAnimating(true);
  }, [text]);
  if (text === null) return <>{value}</>;
  const chars = Array.from(text);
  /* 마지막 자릿수(data-stagger="2")가 항상 가장 늦게 끝나므로 그 animationend 에서만 내린다. 빈 문자열은 span 이 없어
     animationend 가 오지 않으니 처음부터 is-animating 을 붙이지 않는다. */
  return (
    <span key={gen} className={cx("t-digit-group", animating && chars.length > 0 && "is-animating", className)} style={style}
      onAnimationEnd={(e) => { if ((e.target as HTMLElement).dataset?.stagger === "2") setAnimating(false); }}>
      {/* 자릿수 span 은 시각 전용 — SR 이 글자를 따로 읽지 않도록 숨기고 전체 문자열을 sr-only 로 한 번에 제공([[web-a11y]]) */}
      {chars.map((ch, i) => <span key={i} className="t-digit" aria-hidden="true" data-stagger={i === chars.length - 2 ? "1" : i === chars.length - 1 ? "2" : undefined}>{ch}</span>)}
      <span className="sr-only">{text}</span>
    </span>
  );
}

/* ---- TextSwap ---- */
/* 제자리 텍스트 교체(transitions.dev 04 text-states-swap, .t-text-swap). 원문 3단계를 React 상태로:
   text 가 바뀌면 exit(위로 4px+blur) → --text-swap-dur 뒤 새 텍스트를 enter-start(아래 4px, transition 없음)로 그리고
   reflow 후 rest 로 전이. 카운트 캡션처럼 "값만 바뀌는 짧은 텍스트"용. 접근성 라이브리전은 소비처의 바깥 span 이 맡는다. */
function TextSwap({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const [shown, setShown] = React.useState(text);
  const [phase, setPhase] = React.useState<"rest" | "exit" | "enter">("rest");
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    /* A→B→A 왕복(exit 타이머가 끝나기 전 원래 값으로 복귀)이면 phase 가 "exit"(opacity 0)에 고착된다 → 정지로 되돌린다. */
    if (text === shown) { setPhase((p) => (p === "rest" ? p : "rest")); return; }
    /* 저모션(prefers-reduced-motion)이면 exit 단계·타이머 없이 즉시 교체한다 — CSS 가드는 transition 만 끄고 .is-exit 의 opacity:0 은
       남아, 그대로 두면 캡션이 --text-swap-dur 동안 사라졌다 나타난다(Codex 사후 리뷰 P2). */
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(text); setPhase("rest"); return; }
    setPhase("exit");
    const dur = parseFloat(ref.current ? getComputedStyle(ref.current).getPropertyValue("--text-swap-dur") : "") || 150;
    const id = window.setTimeout(() => { setShown(text); setPhase("enter"); }, dur);
    return () => window.clearTimeout(id);
  }, [text, shown]);
  React.useLayoutEffect(() => {
    if (phase !== "enter") return;
    void ref.current?.offsetHeight; // enter-start 스타일을 한 번 계산시켜야 다음 클래스 제거가 transition 으로 잡힌다
    setPhase("rest");
  }, [phase]);
  return <span ref={ref} className={cx("t-text-swap", phase === "exit" && "is-exit", phase === "enter" && "is-enter-start", className)} style={style}>{shown}</span>;
}

/* ---- TextsReveal ---- */
/* 순차 등장(transitions.dev 18 texts-reveal, .t-stagger). 자식이 `t-stagger-line t-stagger-line--N`(N=1~4) 클래스를 달면
   마운트 다음 프레임에 is-shown 이 붙어 위→아래로 40ms 간격 리빌. 닫힘은 언마운트. */
function TextsReveal({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); }, []);
  return <div className={cx("t-stagger", shown && "is-shown", className)} style={style}>{children}</div>;
}

/* ---- ClearableInput ---- */
/* × 클리어 입력(transitions.dev 13 input-clear-dissolve, .t-clear). 값이 있으면 우측에 × 가 나타나고, 누르면 옛 값의 미러가
   위로 12px 날아가며 흐려져 사라진다(글로우 레인은 생략 — transitions.css 주석). 제어형: value + onValueChange(string).
   미러는 input 과 같은 style 을 받아 글자 위치를 맞춘다(배경·테두리는 CSS 가 !important 로 투명 처리). */
function ClearableInput({ value, onValueChange, className, style, clearLabel = "입력 지우기", ...rest }:
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { value: string; onValueChange: (v: string) => void; clearLabel?: string }) {
  const [clearing, setClearing] = React.useState<string | null>(null);
  const wrapRef = React.useRef<HTMLSpanElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const timer = React.useRef<number | undefined>(undefined);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);
  const clear = () => {
    if (!value) return;
    setClearing(value);
    onValueChange("");
    const dur = parseFloat(wrapRef.current ? getComputedStyle(wrapRef.current).getPropertyValue("--clear-out-dur") : "") || 280;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setClearing(null), dur);
    inputRef.current?.focus();
  };
  /* 소비처 style 의 폭(width/minWidth/maxWidth — 예: drawerInputStyle 의 fit-content+minWidth 240)은 래퍼가 받고 input 은 래퍼를
     100% 채운다. 인라인 width 가 input 에 남으면 absolute × 버튼이 래퍼 오른쪽 끝(드로어 끝)으로 떨어진다 — DrawerSelect 와 같은 함정. */
  const { width, minWidth, maxWidth, ...innerStyle } = style ?? {};
  return (
    <span ref={wrapRef} className={cx("t-clear", value && "has-value", clearing !== null && "is-clearing", className)} style={{ width, minWidth, maxWidth }}>
      <input ref={inputRef} {...rest} value={value} onChange={(e) => onValueChange(e.target.value)} style={innerStyle} />
      {clearing !== null && <span className="t-clear-mirror" aria-hidden="true" style={innerStyle}>{clearing}</span>}
      <button type="button" className="t-clear-btn" aria-label={clearLabel} tabIndex={value ? 0 : -1} aria-hidden={!value} onClick={clear}><Icon name="x" size={14} stroke={2.2} /></button>
    </span>
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

export const UI = { ColorChip, StatusBadge, DeltaBadge, StatCard, Card, ChartCard, SegTabs, FilterChip, Button, SaveButton, IconBtn, EmptyState, CountPill, Progress, PopNumber, TextSwap, TextsReveal, ClearableInput, toneVar };
