/* 인증 화면 3종(로그인·발급 온보딩·초대 온보딩)이 공유하는 UI 조각.
   정본은 claude.ai/design 캔버스 `APFS 로그인 프로토타입.dc.html`. 캔버스의 DS 토큰은 APFS 로컬 토큰으로 치환했다:
     --label-normal/-alternative → --foreground/--muted-foreground · --line-normal/-strong → --border/--border-strong
     --fill-normal → --muted · --surface-elevated → --card · #00BF40/#00A538 → --success-text · #D62B2B → --danger-text
   캔버스가 브랜드 파랑 위에 흰 글자를 얹는 자리(초대 헤더)는 적응형 --primary 가 아니라 고정 --brand-solid 를 쓴다
   — 다크에서 --primary 는 밝은 인디고라 흰 글자 대비가 깨진다. */
import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';
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

const RING = 'color-mix(in srgb, var(--primary) 18%, transparent)';
const DONE_LINE = 'color-mix(in srgb, var(--success-text) 35%, transparent)';

/* ---------- 데모 OTP(30초 회전) ---------- */

/** 30초마다 갱신되는 6자리 데모 코드. 실제 TOTP 계산이 아니라 화면 흐름을 보여주기 위한 난수다. */
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

/* ---------- 플로우 전환 ---------- */

export const AUTH_ROUTES = [
  { label: '로그인', route: 'login' },
  { label: '발급 온보딩(수탁)', route: 'onboarding-issue' },
  { label: '초대 온보딩(운용사)', route: 'onboarding-invite' },
] as const;

/** 3개 화면을 오가는 세그먼트 컨트롤. 로컬 상태가 아니라 라우트를 바꾼다(해시·localStorage 가 화면과 일치하도록). */
export function FlowSwitch({ route, onNav }: { route: string; onNav?: (r: string) => void }) {
  return (
    /* 모바일에서는 흐름 안(카드 위)에 둔다 — 고정 배치면 3줄로 접히며 카드 상단을 덮는다(400px 실측). */
    <div className="mb-5 md:mb-0 md:fixed md:top-4 md:left-1/2 md:-translate-x-1/2 md:z-40" style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, boxShadow: 'var(--shadow-md)', padding: 6, maxWidth: 'calc(100vw - 24px)',
    }}>
      <nav aria-label="인증 화면 전환" className="flex flex-wrap justify-center gap-1">
        {AUTH_ROUTES.map((r) => {
          const on = r.route === route;
          return (
            <button key={r.route} type="button" aria-current={on ? 'page' : undefined}
              onClick={() => onNav?.(r.route)}
              className="cursor-pointer rounded-[10px] border-0 whitespace-nowrap"
              style={{
                padding: '7px 14px', minHeight: 32, font: `${on ? 700 : 500} 13px var(--font-sans)`,
                background: on ? 'var(--primary)' : 'transparent',
                color: on ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              }}>{r.label}</button>
          );
        })}
      </nav>
    </div>
  );
}

/** 인증 화면 바깥 껍데기 — Shell(GNB/LNB) 없이 단독으로 뜬다. */
export function AuthLayout({ route, onNav, children }: { route: string; onNav?: (r: string) => void; children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center box-border px-4 pt-6 pb-10 md:px-6 md:pt-[84px]"
      style={{ background: 'var(--bg)', color: 'var(--foreground)' }}>
      <FlowSwitch route={route} onNav={onNav} />
      {children}
    </main>
  );
}

/* ---------- 카드 ---------- */

/** 로고. `white`는 고정 브랜드 표면(초대 헤더) 위라 테마와 무관하게 흰 로고를 쓴다. */
export function Logo({ white }: { white?: boolean }) {
  if (white) return <img src={logoWhiteUrl} alt="에이핏(AFIT)" style={{ height: 26, width: 'auto' }} />;
  // 셸 밖이라 theme prop 이 없다 — 두 장을 겹쳐 두고 .dark 에서 교체한다.
  return (
    <span className="inline-flex items-center" style={{ height: 28 }}>
      <img src={logoUrl} alt="에이핏(AFIT)" className="dark:hidden" style={{ height: 26, width: 'auto' }} />
      <img src={logoWhiteUrl} alt="에이핏(AFIT)" className="hidden dark:inline" style={{ height: 26, width: 'auto' }} />
    </span>
  );
}

/** 좌측 단계 레일 + 우측 본문의 920px 카드. 768px 미만에서는 세로로 쌓는다. */
export function SplitCard({ railHead, steps, railFoot, children }: {
  railHead: React.ReactNode; steps: RailStep[]; railFoot: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="w-full flex flex-col md:flex-row overflow-hidden"
      style={{ maxWidth: 920, background: 'var(--card)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-md)', animation: FADE_UP_CARD }}>
      <div className="box-border flex flex-col shrink-0 border-b md:border-b-0 md:border-r md:basis-[300px]"
        style={{ padding: '36px 32px', background: 'var(--muted)', borderColor: 'var(--border)' }}>
        {railHead}
        <StepRail steps={steps} />
        <div style={{ ...T.caption1, marginTop: 'auto', paddingTop: 8, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>{railFoot}</div>
      </div>
      <div className="flex-1 box-border flex flex-col" style={{ padding: '44px 32px 36px', minHeight: 560 }}>{children}</div>
    </div>
  );
}

function StepRail({ steps }: { steps: RailStep[] }) {
  return (
    <ol className="flex flex-col list-none m-0 p-0" aria-label="진행 단계">
      {steps.map((s) => (
        <li key={s.num} className="flex gap-3.5" aria-current={s.status === 'current' ? 'step' : undefined}>
          <div className="flex flex-col items-center">
            <span aria-hidden="true" className="flex items-center justify-center shrink-0" style={{
              width: 28, height: 28, borderRadius: '50%', font: '600 13px var(--font-sans)',
              ...(s.status === 'done'
                ? { background: 'var(--success-soft)', color: 'var(--success-text)' }
                : s.status === 'current'
                  ? { background: 'var(--primary)', color: 'var(--primary-foreground)', boxShadow: `0 0 0 4px ${RING}` }
                  : { background: 'var(--muted)', border: '1px solid var(--border-strong)', color: 'var(--muted-foreground)' }),
            }}>{s.done ? <Icon name="check" size={16} stroke={2.6} /> : s.num}</span>
            {s.notLast && <span aria-hidden="true" style={{ width: 2, flex: 1, minHeight: 26, background: s.done ? DONE_LINE : 'var(--border-strong)' }} />}
          </div>
          <div style={{ paddingBottom: 22 }}>
            <p style={{
              ...T.body2,
              ...(s.status === 'done' ? { fontWeight: 600, color: 'var(--foreground)' }
                : s.status === 'current' ? { fontWeight: 700, color: 'var(--primary)' }
                  : { color: 'var(--muted-foreground)' }),
            }}>
              <span className="sr-only">{s.num}단계 — {s.status === 'done' ? '완료' : s.status === 'current' ? '진행 중' : '예정'}: </span>
              {s.title}
            </p>
            {s.cap && <p style={{ ...T.caption1, marginTop: 2, color: s.done ? 'var(--success-text)' : 'var(--muted-foreground)' }}>{s.cap}</p>}
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
};

/** 라벨·선행 아이콘·오류/도움말이 한 벌로 묶인 입력. 오류는 aria-invalid + role="alert" 로 알린다. */
export function Field(p: FieldProps) {
  const describedBy = p.error ? `${p.id}-error` : p.help ? `${p.id}-help` : undefined;
  return (
    <div>
      <label htmlFor={p.id} className="block" style={{ ...T.caption1, fontWeight: 600, marginBottom: 6, color: 'var(--foreground)' }}>{p.label}</label>
      <div className="relative">
        {p.icon && <Icon name={p.icon} size={17} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />}
        <input id={p.id} type={p.type ?? 'text'} value={p.value} disabled={p.disabled}
          placeholder={p.placeholder} autoComplete={p.autoComplete} inputMode={p.inputMode} maxLength={p.maxLength}
          aria-invalid={p.error ? true : undefined} aria-describedby={describedBy}
          onChange={(e) => p.onChange(e.target.value)}
          ref={p.inputRef}
          className="w-full box-border outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          style={{
            height: 48, padding: p.icon ? '0 14px 0 38px' : '0 14px',
            borderRadius: 'var(--radius)', border: `1px solid ${p.error ? 'var(--danger-text)' : 'var(--input)'}`,
            background: 'var(--bg)', color: 'var(--foreground)', font: '400 14px var(--font-sans)',
          }} />
      </div>
      {p.error
        ? <p id={`${p.id}-error`} role="alert" style={{ ...T.caption1, marginTop: 6, color: 'var(--danger-text)' }}>{p.error}</p>
        : p.help ? <p id={`${p.id}-help`} style={{ ...T.caption1, marginTop: 6, color: 'var(--muted-foreground)' }}>{p.help}</p> : null}
    </div>
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
      <div style={{ ...T.caption1, flex: '1 1 220px', color: 'var(--muted-foreground)', lineHeight: 1.7 }}>
        인증앱으로 QR을 스캔하거나 시드(Base32)를 수동 입력<br />
        <code style={{ fontSize: 11, background: 'var(--card)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: 4 }}>{seed}</code><br />
        현재 앱 코드: <OtpCode display={display} secs={secs} inline />
      </div>
    </div>
  );
}

/** 회전하는 데모 코드. 1초마다 바뀌는 잔여 시간을 라이브리전에 넣지 않는다(스크린리더 폭주 방지). */
export function OtpCode({ display, secs, inline }: { display: string; secs: number; inline?: boolean }) {
  const urgent = secs <= 5;
  return (
    <>
      <b style={{ fontFamily: 'ui-monospace,Menlo,monospace', color: 'var(--foreground)', ...(inline ? {} : { font: '700 24px/1 ui-monospace,Menlo,monospace', letterSpacing: '.18em' }) }}>{display}</b>
      {inline ? ' · ' : null}
      <span style={{ ...T.caption1, display: inline ? 'inline' : undefined, color: urgent ? 'var(--danger-text)' : 'var(--muted-foreground)', fontWeight: urgent ? 600 : 500 }}>{secs}초 후 갱신</span>
    </>
  );
}

/** 데모 스캐폴딩 표식 — 화면에 정답(코드·계정)이 보이는 이유를 밝힌다. */
export function DemoNote({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ ...T.caption1, marginTop: 14, background: 'var(--muted)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
      <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>시연용 안내 · </span>{children}
    </p>
  );
}
