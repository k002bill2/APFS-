module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  darkMode: 'class',
  corePlugins: { preflight: false },
  theme: { extend: {
    colors: {
      bg: 'var(--bg)', 'bg-deep': 'var(--bg-deep)',
      card: 'var(--card)', 'card-raised': 'var(--card-raised)',
      'card-foreground': 'var(--card-foreground)',
      foreground: 'var(--foreground)', muted: 'var(--muted)',
      'muted-foreground': 'var(--muted-foreground)', caption: 'var(--caption)',
      border: 'var(--border)', 'border-strong': 'var(--border-strong)',
      input: 'var(--input)',
      primary: 'var(--primary)', 'primary-hover': 'var(--primary-hover)',
      'primary-foreground': 'var(--primary-foreground)',
      secondary: 'var(--secondary)', 'secondary-foreground': 'var(--secondary-foreground)',
      // accent = navy 링크 강조색(기존 의미 유지). shadcn 메뉴 hover 표면은 accent-surface로 분리.
      accent: 'var(--accent)', 'accent-foreground': 'var(--accent-foreground)',
      'accent-surface': 'var(--accent-surface)', 'accent-surface-foreground': 'var(--accent-surface-foreground)',
      cyan: 'var(--cyan)', ring: 'var(--ring)',
      success: 'var(--success)', 'success-soft': 'var(--success-soft)',
      warning: 'var(--warning)', 'warning-soft': 'var(--warning-soft)',
      danger: 'var(--danger)', 'danger-soft': 'var(--danger-soft)',
      // shadcn 표준 토큰(별칭): background=bg, destructive=danger, popover=card-raised
      background: 'var(--background)',
      destructive: 'var(--destructive)', 'destructive-foreground': 'var(--destructive-foreground)',
      popover: 'var(--popover)', 'popover-foreground': 'var(--popover-foreground)',
      info: 'var(--info)', 'info-soft': 'var(--info-soft)',
      'brand-blue': 'var(--brand-blue)', 'brand-cyan': 'var(--brand-cyan)',
    },
    borderRadius: { card: 'var(--radius)', 'card-lg': 'var(--radius-lg)', 'card-sm': 'var(--radius-sm)' },
    boxShadow: { sm: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)' },
    fontFamily: { sans: 'var(--font-sans)' },
    transitionTimingFunction: { ds: 'cubic-bezier(.4,0,.2,1)' },
    // 모션 duration 토큰 — tokens.css의 --dur*를 소비. 컴포넌트는 duration-tok-fast/duration-tok로 통일(리터럴 duration-150 분산 방지).
    transitionDuration: { 'tok-fast': 'var(--dur-fast)', tok: 'var(--dur)', 'tok-slow': 'var(--dur-slow)' },
    // shadcn Radix portal(z-50)을 셸 raw 정수 chrome(모달 71/백드롭 70/FAB 60/헤더 50/플라이아웃 47/드롭다운 41) 위로 띄우는 통일 스케일.
    zIndex: { overlay: '75', modal: '80', popover: '85', tooltip: '90' },
    keyframes: {
      'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
      'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      // Animate UI(animate-ui.com) Radix Dialog 열림 방식 — from:'top' 3D 플립(perspective+rotateX)+blur.
      // 원본 spring(150/25)은 임계감쇠(ζ≈1.02, 오버슈트 0)라 ease-out 커브로 등가 재현.
      // ⚠ 중앙정렬은 CSS translate 프로퍼티([translate:-50%_-50%])가 담당 → transform은 플립 전용으로 비운다.
      'dialog-in': {
        from: { opacity: '0', filter: 'blur(4px)', transform: 'perspective(500px) rotateX(-20deg) scale(0.8)' },
        to: { opacity: '1', filter: 'none', transform: 'perspective(500px) rotateX(0deg) scale(1)' },
      },
      'dialog-out': {
        from: { opacity: '1', filter: 'blur(0px)', transform: 'perspective(500px) rotateX(0deg) scale(1)' },
        to: { opacity: '0', filter: 'blur(4px)', transform: 'perspective(500px) rotateX(-20deg) scale(0.8)' },
      },
    },
    animation: {
      'accordion-down': 'accordion-down 0.2s ease-out',
      'accordion-up': 'accordion-up 0.2s ease-out',
      // 열림은 차분한 감속(--dur-slow), 닫힘은 빠르게(--dur). Tweaks --dur* 노브·저모션 규칙이 그대로 적용됨.
      // ⚠ 열림엔 forwards 금지 — 끝 프레임(filter/3D transform)이 영구 고정되면 모달이 GPU 레이어로 남아 텍스트가 흐려짐(2026-09-08 실측).
      'dialog-in': 'dialog-in var(--dur-slow) cubic-bezier(0.22,1,0.36,1)',
      'dialog-out': 'dialog-out var(--dur) cubic-bezier(0.4,0,1,1) forwards',
    },
  } },
  plugins: [require('tailwindcss-animate')],
};
