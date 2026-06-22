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
    // shadcn Radix portal(z-50)을 셸 raw 정수 chrome(모달 71/백드롭 70/FAB 60/헤더 50/플라이아웃 47/드롭다운 41) 위로 띄우는 통일 스케일.
    zIndex: { overlay: '75', modal: '80', popover: '85', tooltip: '90' },
    keyframes: {
      'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
      'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
    },
    animation: {
      'accordion-down': 'accordion-down 0.2s ease-out',
      'accordion-up': 'accordion-up 0.2s ease-out',
    },
  } },
  plugins: [require('tailwindcss-animate')],
};
