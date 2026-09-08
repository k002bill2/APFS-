---
name: color-tokens
description: APFS 대시보드 컬러 토큰 규약 — 색은 tokens.css의 CSS 변수로만 쓰고(hex 하드코딩 금지), 적응형(var(--primary)) vs 고정(var(--brand-solid)) 표면에 따라 전경 토큰을 갈라 라이트/다크 대비를 보존한다. 색·팔레트·테마·대비·하드코딩 hex·다크모드 전경색 작업 시 사용. Use when adding/changing any color, palette, theme, or contrast in the dashboard, or replacing hardcoded hex with tokens.
---

# Color Tokens Skill

APFS 대시보드의 색 토큰 규약. 전체 카탈로그·근거는 **`docs/COLOR_TOKENS.md`**. 이 스킬은 색을 만지는 모든 작업의 **체크리스트**다.

## 절대 규칙
1. **색은 `var(--…)`로만.** `src/dash/tokens.css`가 SSOT. 컴포넌트에 hex(`#fff`, `#4F46E5`), `text-white`, `fill="#fff"` 하드코딩 금지.
2. **흰 글자 표면은 배경의 다크 동작에 따라 전경 토큰을 가른다**(아래 ★).
3. 색/간격/타이포는 토큰 — Tweaks 패널이 런타임 조정한다.

## ★ adaptive-bg 함정 (가장 중요)
다크에서 `--primary`는 **밝아진다**(`#6366F1`→`#818CF8`). `var(--primary)` 배경 위 하드코딩 흰 글자는 다크에서 깨진다(~2.7:1). 배경 종류로 전경을 정하라:

| 배경 | 전경 토큰 |
|------|-----------|
| 적응형 역할색 `var(--primary)`/`var(--accent)` | `var(--primary-foreground)`/`var(--accent-foreground)` (함께 플립) |
| 고정 솔리드/그라디언트 `var(--brand-blue\|gray)`·`--brand-solid`·`--gradient-hero` | `var(--on-brand-solid)` (고정 흰색) |
| 데이터색 칠(차트·`gpColor`) | `var(--on-chart-fill)` (대비 미보장) |
| 의미 상태 `bg-danger` | `var(--destructive-foreground)` |

**트윈 함정**: 겉보기 같은 컴포넌트도 배경이 적응형이냐 고정이냐로 전경이 반대가 된다. 컨테이너 배경을 토큰화하면 **자식 전경색도 반드시 함께** 점검.

## ★ 상태색은 "칠"과 "텍스트"를 토큰으로 가른다 (WCAG AA)
`--warning`(앰버)·`--success`(민트)는 **밝은 색**이라 라이트에서 텍스트로 쓰면 대비가 무너진다(앰버 1.8:1·민트 1.9:1, soft 배지 위 1.6~2.4:1). 한 토큰으로 "선명한 점/막대"와 "4.5:1 텍스트"를 동시에 만족 못 한다 → **역할별 토큰 분리**:

| 용도 | 토큰 | 비고 |
|------|------|------|
| **칠**(점·막대·차트마크·아이콘·progress) | `--warning`·`--success`·`--danger`·`--info` | 밝게 유지(선명함) |
| **텍스트**(라벨·델타 숫자·달력 요일·배지 글자·soft 위 텍스트) | `--warning-text`·`--success-text`·`--danger-text`·`--info-text` | 라이트=어둡게(≥4.5:1), `.dark`=베이스와 동일(다크는 이미 통과) |

- `.dark`에서 **-text 4개 반드시 재정의**(생략 시 라이트용 어두운 값이 다크 카드로 새어 배지 깨짐).
- StatusBadge/DeltaBadge(components.tsx)는 이미 -text 사용 — 새 상태색 텍스트도 이 규약 준수.
- 애매하면 자문: 이 색이 **글자/작은 마크**인가(→-text) **면적 있는 칠**인가(→베이스)?

## 신규 토큰 (테마 고정, `.dark` 미재정의)
`--brand-solid`(#4F46E5) · `--on-brand-solid`(#fff) · `--gradient-hero` · `--on-gradient-{mint,sky,danger}` · `--on-chart-fill`. config에 named 유틸 없으니 Tailwind는 **arbitrary value** `text-[color:var(--on-brand-solid)]`로.

## 정당한 hex 예외 (토큰화 안 함)
로고 SVG 마크 · `tweaks.css` 무드 정의 · `index.html` 부트/스플래시(FOUC) · designsystem 표시용 hex 라벨 · scrim `rgba(0,0,0,.x)`/`rgba(255,255,255,.x)`.

## 안티패턴
- `var(--primary)` 배경 + 하드코딩 흰 글자(다크 깨짐).
- Tailwind opacity 모디파이어 `bg-primary/80`(토큰 색에 alpha 무음 실패) → `color-mix(in srgb,var(--primary) 80%,transparent)`. [[tailwind-opacity-modifier-broken]]
- 디자인 프로젝트 미러를 통째 교체(stale 가능) → 색 값만 외과적 이식.

## 검증 (필수, 빌드 green ≠ 색 검증)
```bash
grep -rnE '#[0-9A-Fa-f]{3,8}\b|: *"#fff"|text-white|fill: *"#fff"' src/dash --include='*.tsx' | grep -viE 'tokens.css|tweaks'
npm run build
```
- 라이트/다크 **양쪽** 렌더·대비 확인(Chrome MCP). 토큰화 후 신규 `var(--…)`가 빈 값으로 안 풀리는지 computed 확인(투명/실종 방지).

## 관련
`docs/COLOR_TOKENS.md` · [[dashboard-ui]] · [[responsive-ui]]
