/* 인증 화면 3종(로그인·발급 온보딩·초대 온보딩)이 공유하는 UI 조각.
   정본은 claude.ai/design 캔버스 `APFS 로그인 프로토타입.dc.html`. 캔버스의 DS 토큰은 APFS 로컬 토큰으로 치환했다:
     --label-normal/-alternative → --foreground/--muted-foreground · --line-normal/-strong → --border/--border-strong
     --fill-normal → --muted · --surface-elevated → --card · #00BF40/#00A538 → --success-text · #D62B2B → --danger-text
   캔버스가 브랜드 파랑 위에 흰 글자를 얹는 자리(초대 헤더)는 적응형 --primary 가 아니라 고정 --brand-solid 를 쓴다
   — 다크에서 --primary 는 밝은 인디고라 흰 글자 대비가 깨진다. */
import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip';
import logoUrl from './assets/logo.svg';
import logoWhiteUrl from './assets/logo_white.svg';
import { OTP_PERIOD, type RailStep } from './auth_model';

/* 캔버스 타이포 스케일(apfs-title2/3, body2/3, caption1)을 px 로 고정.
   preflight:false 라 h1~h6·p 는 UA 기본 마진이 살아 있다 → 시맨틱 태그에는 margin:0 을 반드시 함께 준다. */
export const T = {
  title2: { font: '700 22px/30px var(--font-sans)', letterSpacing: '-0.01em', margin: 0 },
  title3: { font: '700 20px/28px var(--font-sans)', letterSpacing: '-0.01em', margin: 0 },
  body2: { font: '400 15px/24px var(--font-sans)', letterSpacing: '0.006em', margin: 0 },
  body3: { font: '400 14px/22px var(--font-sans)', letterSpacing: '0.006em', margin: 0 },
  caption1: { font: '500 13px/18px var(--font-sans)', margin: 0 },
} satisfies Record<string, React.CSSProperties>;

/* 캔버스의 진입 모션. 저모션 선호 시 tokens.css 의 전역 규칙이 지속시간을 0 으로 만든다. */
export const FADE_UP = 'apfsFadeUp .28s cubic-bezier(0.4,0,0.2,1)';
export const FADE_UP_CARD = 'apfsFadeUp .3s cubic-bezier(0.4,0,0.2,1)';

export const CARD_MAX = 840;

const RING = 'color-mix(in srgb, var(--primary) 18%, transparent)';
const DONE_LINE = 'color-mix(in srgb, var(--success-text) 35%, transparent)';

/* ---------- 데모 OTP(OTP_PERIOD 주기 회전) ---------- */

/** OTP_PERIOD 초마다 갱신되는 6자리 데모 코드. 실제 TOTP 계산이 아니라 화면 흐름을 보여주기 위한 난수다. */
export function useDemoOtp() {
  const gen = () => String(Math.floor(100000 + Math.random() * 900000));
  // 코드와 잔여초를 한 상태로 묶는다 — 갱신 함수 안에서 다른 setState 를 부르면 갱신 함수가 불순해진다.
  // prev 는 직전 창의 코드 — 입력 도중 회전해도 받아 주기 위해 보존한다(허용창 ±1).
  const [otp, setOtp] = useState<{ code: string; prev?: string; secs: number }>(() => ({ code: gen(), secs: OTP_PERIOD }));
  useEffect(() => {
    const t = setInterval(() => {
      setOtp((o) => (o.secs > 1 ? { ...o, secs: o.secs - 1 } : { code: gen(), prev: o.code, secs: OTP_PERIOD }));
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return { code: otp.code, prevCode: otp.prev, secs: otp.secs, display: `${otp.code.slice(0, 3)} ${otp.code.slice(3)}` };
}

/* ---------- 토스트 ---------- */

export type ToastState = { msg: string; error: boolean } | null;

/** 2.6초 뒤 자동으로 사라지는 안내. 언마운트·연속 호출 시 이전 타이머를 정리한다. */
export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const pop = (msg: string, error = false) => {
    clearTimeout(timer.current);
    setToast({ msg, error });
    timer.current = setTimeout(() => setToast(null), 2600);
  };
  return { toast, pop };
}

/* 필드 오류가 role="alert" 로 이미 알려지므로 토스트는 polite — 한 번의 제출에 두 번 읽히지 않게 한다. */
export function Toast({ toast }: { toast: ToastState }) {
  return (
    <div aria-live="polite" aria-atomic="true">
      {toast && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 34, transform: 'translateX(-50%)', zIndex: 50,
          background: toast.error ? 'var(--danger-text)' : 'var(--foreground)',
          color: 'var(--bg)', font: '500 14px var(--font-sans)', padding: '12px 22px',
          borderRadius: 24, boxShadow: 'var(--shadow-lg)', maxWidth: 'calc(100vw - 32px)', textAlign: 'center',
          animation: 'apfsToastIn .24s cubic-bezier(0.4,0,0.2,1)',
        }}>{toast.msg}</div>
      )}
    </div>
  );
}

/** 인증 화면 바깥 껍데기 — Shell(GNB/LNB) 없이 단독으로 뜬다. */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center box-border px-4 pt-6 pb-10 md:px-6 md:py-10"
      style={{ background: 'var(--bg)', color: 'var(--foreground)' }}>
      {children}
    </main>
  );
}

/** 카드 아래 화면 이동 링크. 목업 3종의 `.authfoot` — 로그인 ↔ 발급 온보딩 ↔ 초대 온보딩을 서로 잇는다.
    (LNB 없는 단독 라우트라 이 링크가 사라지면 온보딩 화면에 들어갈 UI 경로가 없다.) */
export function AuthFoot({ links, onNav }: { links: { label: string; route: string }[]; onNav?: (r: string) => void }) {
  return (
    <nav aria-label="인증 화면 이동" className="flex items-center justify-center flex-wrap gap-x-2.5"
      style={{ marginTop: 20, maxWidth: CARD_MAX, width: '100%' }}>
      {links.map((l, i) => (
        <React.Fragment key={l.route}>
          {i > 0 && <span aria-hidden="true" style={{ ...T.caption1, color: 'var(--muted-foreground)' }}>·</span>}
          <button type="button" onClick={() => onNav?.(l.route)}
            className="border-0 bg-transparent p-0 cursor-pointer underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring"
            style={{ ...T.caption1, minHeight: 24, color: 'var(--accent)' }}>{l.label}</button>
        </React.Fragment>
      ))}
    </nav>
  );
}

/* ---------- 카드 ---------- */

/** 로고. `white`는 고정 브랜드 표면(초대 헤더) 위라 테마와 무관하게 흰 로고를 쓴다. */
export function Logo({ white }: { white?: boolean }) {
  if (white) return <img src={logoWhiteUrl} alt="APFS 농업정책보험금융원" style={{ height: 26, width: 'auto' }} />;
  // 셸 밖이라 theme prop 이 없다 — 두 장을 겹쳐 두고 .dark 에서 교체한다.
  return (
    <span className="inline-flex items-center" style={{ height: 28 }}>
      <img src={logoUrl} alt="APFS 농업정책보험금융원" className="dark:hidden" style={{ height: 26, width: 'auto' }} />
      <img src={logoWhiteUrl} alt="APFS 농업정책보험금융원" className="hidden dark:inline" style={{ height: 26, width: 'auto' }} />
    </span>
  );
}

/** 좌측 단계 레일 + 우측 본문의 920px 카드. 768px 미만에서는 세로로 쌓는다. */
export function SplitCard({ railHead, steps, railFoot, children }: {
  railHead: React.ReactNode; steps: RailStep[]; railFoot?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="w-full flex flex-col md:flex-row overflow-hidden"
      style={{ maxWidth: CARD_MAX, background: 'var(--card)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-md)', animation: FADE_UP_CARD }}>
      <div className="box-border flex flex-col shrink-0 border-b md:border-b-0 md:border-r md:basis-[300px]"
        style={{ padding: 'clamp(18px,4.5vw,36px) clamp(18px,4.5vw,32px)', background: 'var(--muted)', borderColor: 'var(--border)' }}>
        {railHead}
        <StepRail steps={steps} />
        {railFoot != null && <div style={{ ...T.caption1, marginTop: 'auto', paddingTop: 8, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>{railFoot}</div>}
      </div>
      <div className="flex-1 box-border flex flex-col" style={{ padding: 'clamp(26px,5vw,44px) clamp(20px,4.5vw,32px) clamp(24px,4.5vw,36px)', minHeight: 560 }}>{children}</div>
    </div>
  );
}

function StepRail({ steps }: { steps: RailStep[] }) {
  return (
    /* 모바일은 가로 스텝퍼(세로 공간을 4단계분 잡아먹지 않게), md 이상은 기존 세로 레일. */
    <ol className="flex flex-row md:flex-col list-none m-0 p-0" aria-label="진행 단계">
      {steps.map((s) => (
        <li key={s.num} className="flex flex-1 md:flex-none flex-col md:flex-row gap-1 md:gap-3.5 min-w-0"
          aria-current={s.status === 'current' ? 'step' : undefined}>
          {/* 마커 축 — 모바일: 원 오른쪽으로 선이 뻗어 다음 단계와 이어진다 / md: 원 아래로 */}
          <div className="flex w-full md:w-auto flex-row md:flex-col items-center">
            <span aria-hidden="true" className="flex items-center justify-center shrink-0" style={{
              width: 28, height: 28, borderRadius: '50%', font: '600 13px var(--font-sans)',
              ...(s.status === 'done'
                ? { background: 'var(--success-soft)', color: 'var(--success-text)' }
                : s.status === 'current'
                  ? { background: 'var(--primary)', color: 'var(--primary-foreground)', boxShadow: `0 0 0 4px ${RING}` }
                  : { background: 'var(--muted)', border: '1px solid var(--border-strong)', color: 'var(--muted-foreground)' }),
            }}>{s.done ? <Icon name="check" size={16} stroke={2.6} /> : s.num}</span>
            {s.notLast && <span aria-hidden="true" className="flex-1 h-0.5 mx-1.5 md:mx-0 md:h-auto md:w-0.5 md:min-h-[26px]"
              style={{ background: s.done ? DONE_LINE : 'var(--border-strong)' }} />}
          </div>
          <div className="min-w-0 pb-2 md:pb-[22px]">
            {/* 크기는 className 으로 — 인라인 font 단축속성을 쓰면 반응형 크기를 덮어쓴다. */}
            <p className="text-[12.5px] leading-[17px] md:text-[15px] md:leading-6"
              style={{
                margin: 0, letterSpacing: '0.006em', fontFamily: 'var(--font-sans)', fontWeight: 400,
                ...(s.status === 'done' ? { fontWeight: 600, color: 'var(--foreground)' }
                  : s.status === 'current' ? { fontWeight: 700, color: 'var(--primary)' }
                    : { color: 'var(--muted-foreground)' }),
              }}>
              <span className="sr-only">{s.num}단계 — {s.status === 'done' ? '완료' : s.status === 'current' ? '진행 중' : '예정'}: </span>
              {s.title}
            </p>
            {/* 모바일에서는 캡션을 눈에서만 감춘다 — display:none 으로 지우면 스크린리더에서도 사라진다. */}
            {s.cap && <p className="sr-only md:not-sr-only"
              style={{ ...T.caption1, marginTop: 2, color: s.done ? 'var(--success-text)' : 'var(--muted-foreground)' }}>{s.cap}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------- 폼 ---------- */

type FieldProps = {
  id: string; label: string; value: string; onChange: (v: string) => void;
  type?: string; icon?: string; placeholder?: string; error?: string | null; help?: string;
  disabled?: boolean; autoComplete?: string; inputMode?: 'numeric'; maxLength?: number;
  inputRef?: React.Ref<HTMLInputElement>;
  /** 필수 입력. 라벨에 * 를 붙이고 aria-required 로도 알린다(목업 S0_001 의 label.req 규약). */
  required?: boolean;
  /** 라벨 오른쪽에 붙는 보조 요소(도움말 팝오버 트리거 등). <label> 밖에 둔다 —
      안에 넣으면 버튼 클릭이 입력 포커스로도 전달돼 팝오버를 열자마자 캐럿이 옮겨간다. */
  labelExtra?: React.ReactNode;
};

/** 라벨·선행 아이콘·오류/도움말이 한 벌로 묶인 입력. 오류는 aria-invalid + role="alert" 로 알린다. */
export function Field(p: FieldProps) {
  const describedBy = p.error ? `${p.id}-error` : p.help ? `${p.id}-help` : undefined;
  // 비밀번호 표시 토글. 필드마다 독립 상태라 한 칸을 열어도 다른 칸은 가려진 채로 둔다.
  const isPw = (p.type ?? 'text') === 'password';
  const [reveal, setReveal] = useState(false);
  return (
    <div>
      <div className="flex items-center gap-1.5" style={{ marginBottom: 6 }}>
        <label htmlFor={p.id} style={{ ...T.caption1, fontWeight: 600, margin: 0, color: 'var(--foreground)' }}>
          {p.label}
          {/* 별표는 장식 — 스크린리더에는 aria-required 로 전달되므로 라벨에서 숨긴다("아이디 별표"로 읽히지 않게). */}
          {p.required && <span aria-hidden="true" style={{ color: 'var(--danger-text)' }}> *</span>}
        </label>
        {p.labelExtra}
      </div>
      <div className="relative">
        {p.icon && <Icon name={p.icon} size={17} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />}
        <input id={p.id} type={isPw && reveal ? 'text' : (p.type ?? 'text')} value={p.value} disabled={p.disabled}
          placeholder={p.placeholder} autoComplete={p.autoComplete} inputMode={p.inputMode} maxLength={p.maxLength}
          aria-invalid={p.error ? true : undefined} aria-describedby={describedBy}
          aria-required={p.required || undefined}
          onChange={(e) => p.onChange(e.target.value)}
          ref={p.inputRef}
          className="w-full box-border outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          style={{
            height: 48, padding: `0 ${isPw ? 44 : 14}px 0 ${p.icon ? 38 : 14}px`,
            borderRadius: 'var(--radius)', border: `1px solid ${p.error ? 'var(--danger-text)' : 'var(--input)'}`,
            background: 'var(--bg)', color: 'var(--foreground)', font: '400 14px var(--font-sans)',
          }} />
        {isPw && (
          /* 라벨을 상태에 따라 바꾼다 — aria-pressed 를 같이 주면 "숨기기, 눌림"처럼 이중으로 읽힌다. */
          <button type="button" disabled={p.disabled} onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? `${p.label} 숨기기` : `${p.label} 표시`}
            className="absolute flex items-center justify-center border-0 bg-transparent cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ring"
            style={{ right: 5, top: '50%', transform: 'translateY(-50%)', width: 38, height: 38, borderRadius: 'var(--radius)', color: 'var(--muted-foreground)', padding: 0 }}>
            <Icon name={reveal ? 'eye-off' : 'eye'} size={18} />
          </button>
        )}
      </div>
      {p.error
        ? <p id={`${p.id}-error`} role="alert" style={{ ...T.caption1, marginTop: 6, color: 'var(--danger-text)' }}>{p.error}</p>
        : p.help ? <p id={`${p.id}-help`} style={{ ...T.caption1, marginTop: 6, color: 'var(--muted-foreground)' }}>{p.help}</p> : null}
    </div>
  );
}

/** 라벨 옆 info 아이콘 + 마우스 오버 도움말 툴팁. Field 의 labelExtra 로 넣는다.
    - TooltipProvider 를 여기서 감싼다 — app.tsx 의 Provider 는 Shell 분기 안이라 인증 3화면은 그 밖이다.
    - Radix TooltipTrigger 는 type 을 붙이지 않는다 → <form> 안에서 submit 되지 않게 type="button" 을 명시한다.
    - 마우스는 호버, 키보드는 포커스로 열린다. 터치는 둘 다 없으므로 pointerdown 토글을 따로 둔다
      (Codex P2: onClick 토글은 무효 — Radix 트리거의 onClick→onClose 가 뒤에 실행돼 항상 닫힌 상태로 끝난다.
       preventDefault 를 걸면 Radix 의 composeEventHandlers 가 자기 핸들러를 건너뛰어 토글이 살아남는다). */
export function InfoHint({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger type="button" aria-label={label}
          onPointerDown={(e) => { if (e.pointerType !== 'mouse') { e.preventDefault(); setOpen((o) => !o); } }}
          className="inline-flex items-center justify-center border-0 bg-transparent p-0 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-ring"
          style={{ width: 20, height: 20, color: 'var(--muted-foreground)' }}>
          <Icon name="info" size={15} />
        </TooltipTrigger>
        {/* 반전 표면(bg-foreground/text-bg)이라 색은 툴팁 기본값을 그대로 쓴다.
            side="right" — top 이면 한 줄 박스(≈295px)가 카드 왼쪽으로 삐져나오고 위쪽 OTP 코드 행을 덮는다.
            오른쪽은 라벨 줄의 빈 공간이라 아무것도 가리지 않는다(좁은 화면에선 Radix 가 알아서 뒤집는다).
            nowrap 은 sm 이상에서만 — 320px 급에서는 충돌 회피가 위치만 바꾸고 폭은 못 줄여 화면 밖으로 나간다(Codex P2).
            아이콘은 items-start + mt 3px 로 고정한다: 한 줄일 땐 광학적 중앙, 줄이 갈라져도 첫 줄에 맞는다. */}
        <TooltipContent side="right" align="center" collisionPadding={12}
          className="text-[12px] leading-5 font-medium px-3 py-2 max-w-[min(295px,calc(100vw-32px))] sm:whitespace-nowrap sm:max-w-none">
          <span className="flex items-start gap-1.5">
            <Icon name="info" size={13} style={{ marginTop: 3, flexShrink: 0 }} />
            <span>{children}</span>
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** 특정 입력이 아니라 폼 전체에 붙는 오류. 필드 오류(Field)는 각 입력 아래에 따로 그린다. */
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" style={{
      ...T.caption1, lineHeight: 1.6, padding: '11px 14px', fontWeight: 600,
      background: 'var(--danger-soft)', border: '1px solid color-mix(in srgb, var(--danger-text) 35%, transparent)',
      borderRadius: 'var(--radius)', color: 'var(--danger-text)',
    }}>{children}</p>
  );
}

type BtnProps = { children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; full?: boolean; style?: React.CSSProperties };

export function PrimaryBtn({ children, onClick, type = 'button', disabled, full, style }: BtnProps) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`cursor-pointer border-0 disabled:cursor-not-allowed disabled:opacity-55 ${full ? 'w-full' : ''}`}
      style={{ minHeight: 52, padding: '0 22px', borderRadius: 'var(--radius)', background: 'var(--primary)', color: 'var(--primary-foreground)', font: '700 15px var(--font-sans)', ...style }}>{children}</button>
  );
}

export function SecondaryBtn({ children, onClick, type = 'button', disabled, full, style }: BtnProps) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 ${full ? 'w-full' : ''}`}
      style={{ minHeight: 52, padding: '0 22px', borderRadius: 'var(--radius)', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border-strong)', font: '700 15px var(--font-sans)', ...style }}>{children}</button>
  );
}

/* ---------- 표시 조각 ---------- */

export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 items-start" style={{
      background: 'var(--info-soft)', border: '1px solid color-mix(in srgb, var(--info-text) 28%, transparent)',
      borderRadius: 'var(--radius-lg)', padding: '13px 16px',
    }}>
      <Icon name="shield-check" size={17} style={{ color: 'var(--info-text)', flex: 'none', marginTop: 1 }} />
      <p style={{ ...T.caption1, lineHeight: 1.65, color: 'var(--foreground)' }}>{children}</p>
    </div>
  );
}

export type KvRow = { k: string; v: React.ReactNode; strong?: boolean };

/** 계정 요약 등 라벨-값 2열. 한글 라벨이라 가로(라벨 좌 / 값 우) 배열을 쓴다. */
export function KvGrid({ rows, labelWidth = 110, style }: { rows: KvRow[]; labelWidth?: number; style?: React.CSSProperties }) {
  return (
    <dl className="grid m-0" style={{
      gridTemplateColumns: `${labelWidth}px 1fr`, gap: '11px 14px',
      border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', ...style,
    }}>
      {rows.map((r) => (
        <React.Fragment key={r.k}>
          <dt style={{ ...T.body3, color: 'var(--muted-foreground)' }}>{r.k}</dt>
          <dd style={{ ...T.body3, marginInlineStart: 0, fontWeight: r.strong ? 600 : 400 }}>{r.v}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export function Pill({ tone, children }: { tone: 'success' | 'warning' | 'info'; children: React.ReactNode }) {
  const map = {
    success: { color: 'var(--success-text)', background: 'var(--success-soft)' },
    warning: { color: 'var(--warning-text)', background: 'var(--warning-soft)' },
    info: { color: 'var(--info-text)', background: 'var(--info-soft)' },
  } as const;
  return <span style={{ font: '600 12px var(--font-sans)', padding: '3px 10px', borderRadius: 20, ...map[tone] }}>{children}</span>;
}

/** 완료 화면 — 큰 체크 + 제목 + 요약 + 액션. */
export function DonePanel({ title, desc, rows, actions, compact, titleAs: H = 'h1' }: {
  title: string; desc: React.ReactNode; rows: KvRow[]; actions: React.ReactNode; compact?: boolean;
  /* 카드가 이미 h1(초대 헤더 인사말)을 갖고 있으면 'h2' 로 낮춘다 — 페이지에 h1 은 하나여야 한다. */
  titleAs?: 'h1' | 'h2';
}) {
  const size = compact ? 56 : 64;
  return (
    <div className="flex flex-col items-center text-center flex-1 justify-center" style={{ minHeight: compact ? undefined : 440, padding: compact ? '8px 0' : undefined, animation: FADE_UP }}>
      <span aria-hidden="true" className="flex items-center justify-center" style={{ width: size, height: size, borderRadius: '50%', background: 'var(--success-soft)', marginBottom: compact ? 16 : 20 }}>
        <Icon name="check" size={compact ? 26 : 30} stroke={2.6} style={{ color: 'var(--success-text)' }} />
      </span>
      <H style={compact ? T.title3 : T.title2}>{title}</H>
      <p style={{ ...T.body3, color: 'var(--muted-foreground)', margin: compact ? '6px 0 20px' : '8px 0 26px' }}>{desc}</p>
      <KvGrid rows={rows} labelWidth={compact ? 90 : 110} style={{ width: '100%', maxWidth: compact ? undefined : 380, textAlign: 'left', marginBottom: compact ? 22 : 26 }} />
      <div className="flex flex-wrap justify-center gap-2.5">{actions}</div>
    </div>
  );
}

/** 인증앱 등록 블록 — QR 자리 + 시드 + 현재 코드. 데모 스캐폴딩임을 캡션으로 밝힌다. */
export function OtpRegisterBlock({ seed, display, secs }: { seed: string; display: string; secs: number }) {
  return (
    <div className="flex flex-wrap gap-3.5 items-start" style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
      <div aria-hidden="true" className="flex items-center justify-center shrink-0" style={{ width: 84, height: 84, border: '1.5px dashed var(--border-strong)', borderRadius: 'var(--radius)', background: 'var(--card)', ...T.caption1, color: 'var(--muted-foreground)' }}>QR 코드</div>
      {/* QR(84px) 높이만큼 늘린 세로 컬럼 — 코드 줄만 marginTop:auto 로 바닥에 붙여
          시드 들여쓰기는 그대로 둔 채 세로 위치만 QR 박스 하단선에 맞춘다. */}
      <div className="self-stretch flex flex-col" style={{ ...T.caption1, flex: '1 1 220px', color: 'var(--muted-foreground)', lineHeight: 1.7 }}>
        <div>인증앱으로 QR을 스캔하거나 설정 키를 수동 입력</div>
        <div><code style={{ fontSize: 13, background: 'var(--card)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: 4 }}>{seed}</code></div>
        <div style={{ marginTop: 'auto' }}>현재 앱 코드: <OtpCode display={display} secs={secs} inline /></div>
      </div>
    </div>
  );
}

/** 회전하는 데모 코드. 1초마다 바뀌는 잔여 시간을 라이브리전에 넣지 않는다(스크린리더 폭주 방지). */
export function OtpCode({ display, secs, inline }: { display: string; secs: number; inline?: boolean }) {
  // 남은 시간이 주기의 1/10 밑으로 떨어지면 경고색 — 주기를 바꿔도 비율로 따라온다.
  const urgent = secs <= Math.max(5, Math.round(OTP_PERIOD / 10));
  return (
    <>
      {/* inline 은 caption(13px) 문단 안에 섞이므로 코드만 키워 눈에 띄게 한다 — 상속 크기로는 읽기 어렵다. */}
      <b style={{ fontFamily: 'ui-monospace,Menlo,monospace', color: 'var(--foreground)', ...(inline ? { fontSize: 17, letterSpacing: '.1em' } : { font: '700 24px/1 ui-monospace,Menlo,monospace', letterSpacing: '.18em' }) }}>{display}</b>
      {inline ? ' · ' : null}
      <span style={{ ...T.caption1, display: inline ? 'inline' : undefined, color: urgent ? 'var(--danger-text)' : 'var(--muted-foreground)', fontWeight: urgent ? 600 : 500 }}>{secs}초 후 갱신</span>
    </>
  );
}

