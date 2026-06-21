# CLAUDE.md

이 파일은 이 저장소에서 작업할 때 Claude Code(claude.ai/code)에게 주는 안내입니다.

## 프로젝트 개요

**APFS** — 농림수산식품모태펀드 투자자산관리시스템(Agriculture·Forestry·Fisheries Food Fund Investment Asset Management System)의 **대시보드 UI 프로토타입**.

**2026-06 Vite + React 18 + TypeScript 빌드로 마이그레이션됨** (이전: no-build CDN React 단일 HTML 번들). 백엔드 없이 더미 데이터로 화면이 완결되는 프론트엔드 SPA입니다.

- 빌드: **Vite** (`npm run dev` / `npm run build` → `dist/`)
- 백엔드/API 없음 — 모든 데이터는 `src/dash/data.ts`의 `APFS_DATA`
- 배포: **Vercel** (`framework=vite`, `dist/` 서빙) — `main` push 시 자동 배포

## 파일 구조

```
APFS/
├── index.html                  # ★ Vite 엔트리 (#root + boot markup + 테마 복원 인라인 스크립트)
├── vite.config.ts              # @vitejs/plugin-react
├── tsconfig.json               # 느슨한 설정 (strict:false — Phase 0 미타입 코드 빌드 허용)
├── tailwind.config.js          # CDN 인라인 config 재현 (preflight:false, CSS변수 컬러, darkMode:class)
├── postcss.config.js           # tailwindcss + autoprefixer
├── package.json                # react, react-dom, vite, tailwindcss, typescript ...
├── vercel.json                 # framework=vite, buildCommand=vite build, outputDirectory=dist
├── src/
│   ├── main.tsx                # 엔트리: tailwind.css + tokens.css + tweaks.css + app + tweaks_app import
│   ├── styles/tailwind.css     # @tailwind base/components/utilities
│   └── dash/                   # 앱 모듈 (ES modules, React.createElement 기반)
│       ├── data.ts                              # APFS_DATA (메뉴/위젯/지표)
│       ├── icons/charts/components/shell/designsystem/main_widgets/main(.tsx)
│       ├── performance/risk/gp_health/accounting/schedule/subfund/report(.tsx)  # PRD 페이지
│       ├── app.tsx                              # 앱 루트 (#root 마운트)
│       ├── tweaks-panel/tweaks_app(.tsx)        # 디자인 토큰 조정 패널
│       └── tokens.css / tweaks.css / assets/logo*.svg
└── 농식품모태펀드 대시보드*.html  # (레거시) 구 오프라인 자가완결 번들 — Vite 전환 전 산출물, 더 이상 정본 아님
```

## 모듈 아키텍처

`src/dash/*.tsx|ts`는 표준 **ES 모듈**입니다. 각 모듈이 컴포넌트/데이터를 `export`하고 다음 모듈이 `import`로 받아 씁니다. (이전 `(function(w){…})(window)` 전역 IIFE 패턴은 2026-06 마이그레이션으로 제거됨.)

**앱 모듈 (역할)**
- `data.ts` → `APFS_DATA` — 메뉴/위젯/지표 등 화면 더미 데이터 소스
- `components.tsx` → `UI` — Button, ColorChip, StatusBadge, SegTabs 등 (Tailwind 유틸 className 기반)
- `icons.tsx` → `Icon` — lucide 스타일 자체 라인 아이콘 (lucide npm도 사용)
- `charts.tsx` → `Charts` — Recharts 동일 스펙의 자체 SVG 차트 프리미티브 (Sparkline/Donut/LineTrend/HBars 등)
- `shell.tsx` → `Shell` — GNB / LNB(3-레벨) / 브레드크럼 / 알림센터 / RBAC 게이팅 / 테마 토글
- `designsystem.tsx` → 컬러 토큰·타이포·공통 컴포넌트 프리뷰
- `main_widgets.tsx` + `main.tsx` → 메인 종합 대시보드 (공유 위젯 + 3개 레이아웃 시안)
- PRD 페이지: `performance` `risk` `gp_health` `accounting` `schedule` `subfund` `report`.tsx (각 `Pages.*` export)
- `app.tsx` → 테마/역할/라우트 상태, `#root`에 마운트
- `tweaks-panel.tsx` + `tweaks_app.tsx` → 디자인 토큰 조정 패널 (data-* 속성 + localStorage 영속화, 효과는 CSS 변수로)

**벤더**: React 18 / ReactDOM (npm), lucide. JSX 변환은 **빌드타임(esbuild)** — 브라우저 Babel은 제거됨.

**RBAC**: `Shell`이 `role` 기반으로 `APFS_DATA.MENU`를 필터링(`m.roles.includes(role)`)하므로 역할에 따라 보이는 메뉴가 달라집니다. 메뉴는 PRD 부록 A의 3-레벨(대분류 9 / 중분류 33 / 리프 137개). 역할 3등급: admin(9) / manager(8) / viewer(5).

## 실행 방법

```bash
npm install
npm run dev       # Vite dev 서버 (HMR) — http://localhost:5273
npm run build     # production 빌드 → dist/
npm run preview   # 빌드 결과 미리보기 — http://localhost:4273
```

- `localStorage`에 테마/역할/Tweaks 설정을 영속화합니다.
- 배포: `main`에 push하면 Vercel이 `vite build` 후 `dist/`를 서빙합니다(자동 배포).

## 편집 시

표준 React/TypeScript 편집입니다 — `src/dash/*.tsx`를 직접 수정하고 `npm run dev`로 확인합니다.

- 현재 코드는 `React.createElement`(별칭 `h`) 기반(**Phase 0**). **JSX 전환(Phase 2)·TypeScript 타입화(Phase 3)는 후속 작업** — 진행 시 점진적으로.
- `tsc --noEmit`은 현재 타입 에러를 다수 보고하지만 빌드(esbuild)는 타입체크를 하지 않아 `vite build`는 green입니다.
- 색/간격/타이포는 하드코딩 대신 CSS 변수 토큰(`tokens.css`)을 사용하세요 — Tweaks 패널이 런타임 조정합니다.
- 새 페이지/메뉴는 역할 가시성(`roles`)을 명시하고, 라이트/다크 모두에서 대비를 확인하세요.
- **데이터 마스크(빈 영역 placeholder)**: `src/dash/mask.tsx`가 화면 데이터를 가립니다(실데이터 연동 전 상태). **상시 ON**(`const _on = true`) — **실데이터 연동 시점에 `_on`을 `false`로 바꾸면 전 화면 마스크가 해제**됩니다. 새 위젯에 데이터를 넣을 때: 숫자/금액/날짜는 `mn(v)`, 텍스트(인명·코드 등)는 `<MT>{...}</MT>`로 감싸세요. 표 헤더·카드 제목·탭·단위·StatusBadge·차트 축·달력 날짜는 가리지 않습니다("축은 두고 데이터는 가린다").
- **레거시**: 루트 `농식품모태펀드 대시보드*.html`(구 오프라인 번들)은 더 이상 정본이 아닙니다. `apfs-bundle` 스킬(번들 gzip+base64 디코드/재인코드)도 이 레거시 파일에만 해당하며, 신규 작업엔 불필요합니다.

## 디자인 토큰 / 브랜드

- 도메인 톤: **숲(forest green)**. 브랜드 블루/시안은 강조·링크·차트 보조.
- 지정 브랜드 색: `#0058A8` `#00AAE5` `#2D7846` `#7BB93C` `#58585B`
- 역할색(라이트): `--primary:#0E963B`, `--secondary/cyan:#1DCDA7`, `--accent/ring:#0158A8`
- 폰트: Pretendard (`--font-sans`)
- 라이트/다크 테마 모두 지원, CSS 변수 토큰 기반.

## 도메인 컨텍스트

농림수산식품모태펀드(모태펀드/펀드오브펀드) 투자자산관리 업무 화면. 운용사(GP) 보고, 조기경보 리스크, 회계·자금 마감, 투자 성과·포트폴리오, 의무투자 컴플라이언스, 일정·알림 등을 다룹니다. 화면 위젯은 "PRD 5.x" 절을 근거로 구성돼 있습니다.

---

# Claude Code 통합 시스템 (Parallel Agents + Skills + Dev Docs)

이 저장소에는 Parallel Agents Safety Protocol **v3.2.0** 기반의 멀티에이전트 작업 환경이 구성돼 있습니다. 전체 프로토콜: `docs/Parallel_Agents_Safety_Protocol_v3_1_0.md`.

## Agent 역할 요약

| Agent | model | 역할 |
|-------|-------|------|
| `primary-coordinator` | opus-4.8 | 태스크 분해·배분·검증·통합, 사용자 소통, 안전 강제 |
| `code-explorer` | sonnet-4.6 | 코드베이스 탐색·분석 (읽기 전용) |
| `code-reviewer` | sonnet-4.6 | 보안·성능·가독성·아키텍처 리뷰, Cross-Agent 검증 |
| `verify-agent` | sonnet-4.6 | Fresh-context 독립 빌드/실행/무결성 검증 |
| `code-architect` | opus-4.8 | 구현 전 설계 검토·의존성/리스크 분석 (읽기 전용) |

## 핵심 안전 원칙 (항상 적용)
- **Data Integrity 우선** — 데이터 손상/유실/노출 금지.
- 서브에이전트는 Primary 승인 없이 공유 파일을 수정하지 않는다.
- 윤리적 우려(민감정보·시스템 손상 위험 등) 발생 시 **즉시 중단** 후 사용자에게 보고.
- 능력 초과 태스크는 즉시 에스컬레이션.
- 파일 생성/편집 전 해당 SKILL을 먼저 참조(UI/디자인은 `dashboard-ui`).

## 멀티에이전트 실행 패턴
- **1순위 — Workflow 도구**: 인라인 JS, `export const meta`로 시작, 전역 `agent()`/`parallel()`/`pipeline()`/`phase()`/`log()`. 동시성 자동 캡 `min(16, cpu-2)`, 격리 `agent(p,{isolation:'worktree'})`.
- **Agent 도구 직접 호출**: `run_in_background`(완료 시 알림), `SendMessage`(실행 중 에이전트에 추가 지시), `isolation:'worktree'`.
- 레거시 수동 Primary/Secondary·파일 Lock은 Workflow 미사용 시 폴백.

## Skills (자동 활성화)
- `UserPromptSubmit` hook(`.claude/hooks/skill-activator.sh`)이 프롬프트를 stdin JSON으로 받아 `.claude/hooks/skill-rules.json`의 키워드와 매칭, 관련 스킬을 컨텍스트로 추천.
- 프로젝트 스킬: `code-reviewer`(리뷰) · `dashboard-ui`(UI/디자인) · `apfs-bundle`(레거시 오프라인 번들 전용 — 현 Vite 구조엔 불필요).
- 새 스킬 추가 시 `skill-rules.json`의 트리거도 함께 갱신.

## Dev Docs 워크플로우
- `/dev-docs <task>` → 구현 → `/update-dev-docs` → `/save-and-compact` → (재시작) → `/resume`.
- `dev/active/<task>/`에 plan·context·tasks 3-파일로 대규모 작업 컨텍스트를 관리.

## 참조 문서
| 문서 | 위치 |
|------|------|
| 전체 안전 프로토콜 | `docs/Parallel_Agents_Safety_Protocol_v3_1_0.md` |
| 셋업 가이드/원문 | `Claude code system setup/` |
