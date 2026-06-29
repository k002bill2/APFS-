# APFS 컬러 토큰 시스템

> 농림수산식품모태펀드 대시보드의 색 토큰 규약. **모든 색은 `src/dash/tokens.css`의 CSS 변수로 정의**되고, 컴포넌트는 `var(--…)`로만 소비한다. hex 하드코딩은 안티패턴이다(테마 추종 불가·Tweaks 무드 비반응).
>
> 작업 시 스킬: `.claude/skills/color-tokens/SKILL.md`

---

## 1. 레이어 구조 (cascade)

색은 `documentElement`에 걸리는 세 레이어로 결정된다 — 뒤가 앞을 이긴다.

| 레이어 | 위치 | 역할 |
|--------|------|------|
| `:root` | `tokens.css` | **라이트 테마 기본값** |
| `.dark` | `tokens.css` | **다크 테마 오버라이드** (`documentElement.classList`에 `dark`) |
| `[data-accent="ocean"\|"harvest"]` | `tweaks.css` | Tweaks 패널 **무드** (사용자 토글) |

- `data-accent="forest"`는 **기본 무드 = 오버라이드 규칙 없음** → `:root`/`.dark` base를 그대로 따른다(현재 인디고). 이름은 레거시(과거 forest-green 팔레트)지만 값은 base.
- **shadcn/ui 별칭**: `--background`/`--card-foreground`/`--popover`/`--destructive`/`--accent-surface` 등은 base 토큰을 `var()`로 간접참조한다 → `.dark`·무드에서 원본이 바뀌면 자동 추종(중복 정의 불필요).

## 2. 토큰 카탈로그

값은 `tokens.css`가 SSOT다(여기 중복 기재하면 drift). 아래는 **이름·용도·다크 동작**.

### 표면 / 텍스트 (테마 적응형 — `.dark`에서 재정의됨)
`--bg` `--bg-deep` `--card` `--card-raised` `--foreground` `--muted` `--muted-foreground` `--caption` `--border` `--border-strong` `--input` `--row-selected`

### 역할 (테마 적응형)
| 토큰 | 짝 전경 | 비고 |
|------|---------|------|
| `--primary` | `--primary-foreground` | ⚠ 라이트 `#6366F1` → **다크 `#818CF8`(밝아짐)**. foreground는 라이트 흰색 → 다크 짙은 네이비로 플립 |
| `--secondary` | `--secondary-foreground` | 틸 |
| `--accent` | `--accent-foreground` | 블루(링크·포커스) |
| `--ring` | — | 포커스 링 |

### 상태 (테마 적응형)
`--success` `--warning` `--danger` `--info` (+ `*-soft`) · shadcn `--destructive`(=`--danger`) / `--destructive-foreground`(**고정 `#FFFFFF`**, `.dark` 미재정의)

### 차트 / 자금원천
`--chart-1`…`--chart-19`(적응형) · `--chart-grid` · `--fs-agri/fish/ops/etc`

### ★ 고정 솔리드 표면 & on-fill 전경 (테마 **고정** — `.dark` 미재정의, 라이트=다크)
| 토큰 | 값 | 용도 |
|------|-----|------|
| `--brand-solid` | `#4F46E5` | 흰 글자 얹는 솔리드 브랜드 표면(FAB·자본준비금 카드) |
| `--on-brand-solid` | `#FFFFFF` | 고정 브랜드/그라디언트 표면 위 흰 글자·아이콘 |
| `--gradient-hero` | indigo→teal→blue | Hero AUM 카드 배경(항상 어두움) |
| `--on-gradient-mint` | `#BFF0EA` | Hero 위 민트 강조(게이지·양수 델타) |
| `--on-gradient-sky` | `#BDEAFF` | Hero 위 스카이 보조선 |
| `--on-gradient-danger` | `#FFD9D6` | Hero 위 음수/위험 델타 |
| `--on-chart-fill` | `#FFFFFF` | **데이터색**(`var(--chart-n)`·`gpColor`) 칠 위 흰 라벨. ⚠값만 고정, **대비 미보장** |

> 브랜드 원색 `--brand-blue/cyan/forest/lime/gray`도 `.dark` 미재정의 = **고정**. 그 위 흰 전경은 `--on-brand-solid`.

## 3. ★ 핵심 규칙 — 적응형 vs 고정 전경 (the adaptive-bg trap)

**다크 모드에서 `--primary`는 밝아진다**(`#6366F1`→`#818CF8`). 그래서 `var(--primary)` 배경 위에 **하드코딩 흰 글자**를 얹으면 다크에서 대비가 깨진다(~2.7:1, 흰 글자 실종).

배경 종류에 따라 전경 토큰을 갈라야 한다:

| 배경 종류 | 예 | 전경 토큰 | 이유 |
|-----------|-----|-----------|------|
| **적응형 역할색** | `var(--primary)`, `var(--accent)` | `var(--primary-foreground)` / `var(--accent-foreground)` | foreground도 함께 플립 → 다크 대비 확보 |
| **고정 솔리드/그라디언트** | `var(--brand-blue)`, `var(--brand-gray)`, `--brand-solid`, `--gradient-hero` | `var(--on-brand-solid)` | 배경이 안 플립하니 흰색 고정이 양 테마 안전(~6:1) |
| **데이터색 칠** | 차트 팔레트, `gpColor`, `_color` | `var(--on-chart-fill)` | 임의 데이터색이라 `-foreground` 페어 없음(대비 미보장) |
| **의미 상태색** | `bg-danger` 등 | `var(--destructive-foreground)` | white-on-danger 의미 페어(고정) |

### ⚠ 트윈 함정
**겉보기 동일한 두 컴포넌트가 반대 토큰을 필요로 할 수 있다.** 예: 체크박스 2종이 똑같이 생겼어도 —
- `performance.tsx` CheckRow: checked 배경 `var(--brand-blue)`(고정) → `--on-brand-solid`
- `generic_list.tsx` DrawerCheckRow: checked 배경 `var(--primary)`(적응형) → `--primary-foreground`

→ **컨테이너 배경을 토큰화할 땐 반드시 그 안의 자식 전경색도 함께 점검**하고, 배경이 적응형인지 고정인지에 따라 전경을 정한다.

## 4. 적용 방법

| 위치 | 형태 |
|------|------|
| 인라인 `style` | `style={{ background: "var(--brand-solid)", color: "var(--on-brand-solid)" }}` |
| Tailwind **named** 유틸(config에 있는 토큰) | `text-destructive-foreground`, `bg-primary`, `text-primary-foreground` |
| Tailwind **arbitrary**(config에 없는 신규 토큰) | `text-[color:var(--on-brand-solid)]`, `bg-[var(--brand-gray)]` |
| SVG 속성 | `fill="var(--on-chart-fill)"`, `stroke="var(--on-gradient-mint)"` |

> 신규 토큰(`--brand-solid`·`--on-brand-solid`·`--on-chart-fill` 등)은 `tailwind.config.js`에 named 유틸이 없으므로 **arbitrary value** `text-[color:var(--…)]`로 쓴다(JIT가 기존 `bg-[var(--brand-gray)]` 등으로 검증됨).

## 5. 안티패턴

- ❌ 컴포넌트에 hex 하드코딩: `color: "#fff"`, `background: "#4F46E5"`, `text-white`, `fill="#fff"`
- ❌ `var(--primary)` 배경 + 하드코딩 흰 글자(다크 깨짐) → 짝 전경 토큰 사용
- ❌ Tailwind opacity 모디파이어 `bg-primary/80`(토큰 색엔 alpha 주입 무음 실패) → `color-mix(in srgb, var(--primary) 80%, transparent)`
- ❌ 통째 팔레트 교체(디자인 프로젝트 미러는 stale일 수 있음) → 색 값만 외과적 이식
- ✅ 정당한 hex 예외: 로고 SVG 코퍼릿 마크, `tweaks.css` 무드 정의, `index.html` 부트/스플래시(FOUC, CSS 변수 이전 실행), 디자인시스템 표시용 hex 라벨, scrim `rgba(0,0,0,.x)`/`rgba(255,255,255,.x)`

## 6. 검증 체크리스트

```bash
# ① 컴포넌트에 raw 색 잔여 점검 (tokens.css/tweaks.css = 토큰 정의는 제외)
grep -rnE '#[0-9A-Fa-f]{3,8}\b|: *"#fff"|text-white|fill: *"#fff"' src/dash --include='*.tsx' \
  | grep -viE 'tokens.css|tweaks'
# ② 빌드 (esbuild는 타입체크 안 함 — 빌드 green ≠ 색 검증)
npm run build
```
- ③ **라이트/다크 양쪽** 렌더 + 대비 확인(Chrome MCP). 빌드 green만으론 부족.
- ④ 토큰화 후 신규 `var(--…)`가 **빈 값으로 안 풀리는지**(투명/실종 방지) computed로 확인:
  ```js
  getComputedStyle(document.documentElement).getPropertyValue('--brand-solid') // 비어있으면 오타/미정의
  ```

## 관련 문서/스킬
- 스킬: `color-tokens`(이 시스템 강제), `dashboard-ui`(UI 전반), `responsive-ui`(반응형)
- 이력: 2026-06-29 팔레트 forest-green→인디고/블루/틸 전환 + 하드코딩 색 전수 토큰화(신규 토큰 7종), PR #29
