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
└── src/
    ├── main.ts                 # 엔트리: tailwind.css + tokens.css + app import
    ├── styles/tailwind.css     # @tailwind base/components/utilities
    └── dash/                   # 앱 모듈 (ES modules) — 페이지는 메뉴 도메인 폴더, 공용은 루트
        ├── login/                               # 로그인·발급/초대 온보딩 + auth_model/auth_shared (Shell 없음)
        ├── dashboard/                           # 메인 대시보드(main.tsx)
        ├── ffms/{mfund,asct,report,sfund,ent,gp}/   # 투자자산관리 (모태펀드·조합·사후보고·자펀드·투자기업·운용사)
        ├── risk/{alert,ent,sfund,valuation}/    # 조기경보
        ├── sfund/{ocsrpt,fxtmrpt,verify,file}/  # 자펀드 보고 (수시·정기보고·실물검증·파일)
        ├── brief/{mfund,register}/  trust/{sfund,mfund}/  system/{user,setting,audit}/
        │                                        # 대분류 루트 = 중분류 공용만(ffms/leaf_tabs · brief/brief_data · trust/trust_sub_data · system/admin_*)
        ├── schemas/                             # 스키마 레지스트리(index.ts)·타입·렌더러 — 공용 인프라만
        ├── data.ts / app.tsx / shell / components / icons / charts / grid_frame / generic_list / aggrid_* …  # 2개 이상 도메인이 쓰는 공용
        ├── ui/ fields/ motion/                  # 공용 컴포넌트
        └── tokens.css / assets/logo*.svg
```

## 모듈 아키텍처

`src/dash/*.tsx|ts`는 표준 **ES 모듈**입니다. 각 모듈이 컴포넌트/데이터를 `export`하고 다음 모듈이 `import`로 받아 씁니다. (이전 `(function(w){…})(window)` 전역 IIFE 패턴은 2026-06 마이그레이션으로 제거됨.)

**폴더 배치 규칙(2026-10-13, 정본 `docs/filetree.md`)**: 라우트된 페이지는 메뉴 위치의 `<대분류>/<중분류>/`에 둔다(스키마 페이지 `*.ts` 포함 — `schemas/index.ts` 가 import 해 등록). 페이지 전용 modal·model·data·schemas·test 는 페이지 옆에. 한 대분류 안 여러 중분류가 쓰면 대분류 루트(`trust/`), 여러 대분류가 쓰면 `src/dash/` 루트. 여러 중분류의 화면 설정을 한 파일에 모으지 않는다 — 공용 골격(`risk_tables_page`)을 쓰더라도 설정 파일은 중분류마다 따로 둔다(예: `risk/valuation/valuation_table_pages` · `trust/mfund/trust_mother_table_pages`). 테스트도 같은 규칙으로 검사 대상 옆에 둔다(대상이 여러 중분류면 대분류 루트, 여러 대분류면 `src/dash/` 루트). 공용 인프라가 import 한다는 이유만으로 루트에 두지 않는다 — `generic_list` 의 상세 팝업 레지스트리(`DETAIL_POPUPS`)처럼 슬롯만 공용이고 실제로 띄우는 화면이 한 중분류뿐이면 그 중분류 폴더에 둔다(예: `ffms/gp/mgmt_fee_detail_modal` · `ffms/report/monthly_report_modal`). 메뉴에 없는 앱 라우트(`designsystem`·`editor_page`·`schedule`)는 루트에 둔다. 회계(`account/`)는 페이지가 생길 때 만든다. 테스트에서 소스를 문자열로 읽을 땐 `test_src.ts`의 `readSrc(basename)`/`walkDash()`를 쓴다(고정 경로 금지 — 파일 이동 시 가드가 깨지거나 조용히 0건 통과).

**앱 모듈 (역할)**
- `data.ts` → `APFS_DATA` — 메뉴/위젯/지표 등 화면 더미 데이터 소스
- `components.tsx` → `UI` — Button, ColorChip, StatusBadge, SegTabs 등 (Tailwind 유틸 className 기반)
- `icons.tsx` → `Icon` — lucide 스타일 자체 라인 아이콘 (lucide npm도 사용)
- `charts.tsx` → `Charts` — Recharts 동일 스펙의 자체 SVG 차트 프리미티브 (Sparkline/Donut/LineTrend/HBars 등)
- `shell.tsx` → `Shell` — GNB / LNB(3-레벨) / 브레드크럼 / 알림센터 / 테마 토글
- `designsystem.tsx` → 컬러 토큰·타이포·공통 컴포넌트 프리뷰
- `main_widgets.tsx` + `dashboard/main.tsx` → 메인 종합 대시보드 (공유 위젯 + 3개 레이아웃 시안)
- PRD 페이지: `performance` `risk` `gp_health` `accounting` `schedule` `report`.tsx (각 `Pages.*` export)
- 인증 화면 3종(Shell 없는 독립 라우트, 정본=claude.ai/design 캔버스 `APFS 로그인 프로토타입.dc.html`): `login_demo.tsx`(S0_001) · `onboarding_issue.tsx`(S0_002 발급) · `onboarding_invite.tsx`(S0_003 초대). 판정 로직은 `auth_model.ts`(+테스트), 공용 UI는 `auth_shared.tsx`. 관리자가 초대를 *보내는* `user_invite_manage.tsx`(S0_103)와는 별개 화면이다.
- 자펀드 관리(route `subfund`, 리프 라벨 "자펀드 관리"): `subfund_manage.tsx`(`SubFundManage` export) + `subfund_form_modal`(결성조합 등록/수정) + `subfund_spec_modal`(읽기전용 명세 팝업) + `subfund_manage_schemas.ts`. 구 `subfund.tsx`(bespoke, `SubFund` export)는 2026-09-09 삭제됨. **별개 리프** 조합관리 > `자펀드정보관리`(`asset_fund_info_manage.tsx`)는 `SubFundManage`의 `ext` 확장 슬롯으로 v1.4 + S2_73 투자기준을 합성한 통합 그리드다(2026-09-28).
- `app.tsx` → 테마/라우트 상태, `#root`에 마운트

**벤더**: React 18 / ReactDOM (npm), lucide. JSX 변환은 **빌드타임(esbuild)** — 브라우저 Babel은 제거됨.

**메뉴**: `Shell`이 `APFS_DATA.MENU`를 그대로 렌더하며 모든 사용자에게 전 메뉴를 노출합니다. 메뉴의 정본은 **신규(to-be) 메뉴 구성** — SharePoint 메뉴구조 문서(링크는 팀 내부 공유 — 공개 저장소라 URL 미기재)다(원본 xlsx 는 저장소에 두지 않는다 — 구 v0.2 사본은 git 이력). **현행(as-is) 트리가 아니다.** 3-레벨로 대분류 7(+대시보드) / 중분류 29 / 리프 111개(2026-10-14 실측 — 자펀드 보고는 사용자 지정 4중분류·6리프). 정본은 시트이므로 리프를 임의로 추가·삭제하지 않는다. **route(해시 `#/...`)와 소스 파일명은 영문**이다(2026-10-14 전면 전환) — 리프는 `{ label:"한글 라벨", path:"kebab-route" }`, 스키마 파일은 snake_case, 메뉴 라벨·화면 제목·엑셀 파일명만 한글. 옛 한글 route 는 `src/dash/route_alias.ts`(SSOT)가 해시·`apfs.route`·방문기록·즐겨찾기 모두에서 새 route 로 승격한다. 라벨을 바꿀 땐 path 를 그대로 두고, path 를 바꿀 땐 옛 값을 별칭에 남긴다. 상세 규약·체크리스트·전환 매핑은 `docs/라우트_파일명_가이드.md`. (구 RBAC 데모 — `role` 상태·역할 스위처·`ROLES` 정의는 2026-09-09 제거됨. 백엔드/인증이 없는 프로토타입이라 실제 접근통제가 아닌 데모 토글이었음. MENU item의 `roles:` 필드는 잔존하나 현재 미사용.)

- 추출본 `docs/메뉴구성도_v0.2.md` — 시트 원문(신규 152리프 + 현행 128리프)을 md로 옮기고 화면 참조를 `docs/mockups/` 목업 HTML에 링크한 것. **앱이 구현한 111리프는 이 중 일부**다(관리자(기존) 12·자펀드 보고 대부분 미반영). 로그인 대분류 3리프(로그인·발급온보딩·초대온보딩)는 `MENU` 트리에 없지만 **앱 전용 라우트로 구현돼 있다**(`#/login` · `#/onboarding-issue` · `#/onboarding-invite`) — LNB에는 노출되지 않는다.
- 대조표 `docs/메뉴대조표_xlsx_vs_APFS_DATA.md` — 시트와 `MENU`의 차이. 현재 완전일치 106 / 라벨 불일치 1(xlsx 오타) / 앱 전용 5(대시보드 + 자펀드 보고 4리프).
- 두 문서는 **생성물**이다. 고칠 일이 생기면 md가 아니라 `scripts/menu-doc/`(README 참조)를 고치고 재생성한다.

## 실행 방법

- `localStorage`에 테마(라이트/다크) 설정을 영속화합니다.
- 배포: `main`에 push하면 Vercel이 `vite build` 후 `dist/`를 서빙합니다(자동 배포).

## 브랜치 작업 = 워크트리 (공유 체크아웃은 `main` 고정)

이 저장소는 **멀티세션 동시 작업 환경**이다. 공유 체크아웃(`APFS-`)에서 `git switch` 로 브랜치를
갈아타면, 같은 디렉터리를 보는 다른 세션의 dev 서버(:5273 등)가 조용히 **다른 커밋의 소스**를
서빙한다 → "고쳤는데 되살아났다"는 유령 버그. 실사례(2026-09-15): #170 이전에 분기한 브랜치가
체크아웃돼 있어, 제거한 감사로그·권한 변경이력 행선택이 되살아난 것처럼 보였다.

**규약: 공유 체크아웃은 `main` 에 두고, 브랜치 작업은 워크트리에서 한다.**

| 명령 | 하는 일 |
|------|---------|
| `bash scripts/wt.sh new <branch>` | `.claude/worktrees/<branch>` 생성(base `origin/main`) + `node_modules` CoW 복제 + 포트 고정 배정 |
| `bash scripts/wt.sh dev <branch>` | 배정된 포트로 dev 서버 실행 |
| `bash scripts/wt.sh ls` / `rm <branch>` | 목록(브랜치·포트·dirty) / 제거(미커밋 변경 있으면 거부) |
| `bash scripts/wt.sh setup <dir>` | `EnterWorktree` 도구로 만든 워크트리에 `node_modules`·포트만 배선 |

- 워크트리는 **인덱스·HEAD 를 따로 갖고 `.git` 만 공유**하므로, 다른 세션의 `switch`/`reset`/`add`
  경합에 면역이다(메모리 `multi-session-branch-is-batch-pr` 7·11·12·13번 사고가 원천 차단된다).
- `node_modules` 는 APFS clonefile(`cp -c`) 복제 — 811M 기준 ~15초, **실디스크 증가 ~14MB**.
  심볼릭 링크로 공유하지 않는 이유: `node_modules/.vite` 의존성 캐시가 브랜치 간에 섞인다.
- 포트는 브랜치명 해시로 5300~5389에 **고정 배정**(배정표 `.claude/worktrees/.ports`) — 재생성해도
  같은 포트라 북마크가 안 깨진다. `vite` 는 `strictPort` 라 충돌 시 조용히 옮겨가지 않고 실패한다.
- **커밋/푸시는 세션을 그 워크트리로 옮기고 한다**(`EnterWorktree` 또는 워크트리에서 새 세션).
  그러면 `block-main-write.sh` 가드가 워크트리 브랜치를 보므로 체이닝·서브셸 모두 자유롭다.
- 공유 체크아웃(main)에서 워크트리에 쏠 때는 **메타문자 없는 단일 명령** `git -C <리터럴 경로> …`
  형태만 통과한다. 이 한 가지가 가드의 유일한 예외다 — 변수(`-C "$WT"`)·`-C` 2회·`--git-dir`·
  체이닝(`cd <wt> && …`)은 실행 디렉터리를 정적으로 확정할 수 없어 fail-closed 로 차단된다.
  (임의의 셸 텍스트에서 각 git 쓰기의 실행 디렉터리를 복원하려는 시도는 끝이 없다 —
  Codex 리뷰 8라운드 동안 `-C` 중복·파이프 좌측 cd·백그라운드 `&`·서브셸로 계속 뚫려서,
  좁은 허용목록 + 나머지는 cwd 폴백으로 재설계했다.)
- 보호 ref(main/master) 삭제 push 는 어느 디렉터리에서 쏘든 차단된다.
- 가드를 수정하면 `bash scripts/block-main-write.test.sh` 를 돌린다(픽스처 자체 생성).

## 편집 시

표준 React/TypeScript 편집입니다 — `src/dash/**/*.tsx`를 직접 수정하고 `npm run dev`로 확인합니다.

- **확장자 규칙: JSX 문법이 있으면 `.tsx`, 없으면 `.ts`** — 훅·컨텍스트·스키마·데이터·배럴·테스트는 React 를 import 해도 JSX 가 없으면 `.ts`. 일괄 `.tsx` 통일은 하지 않는다(vitest `include`·가드 테스트의 `.test.ts` 제외 정규식이 확장자를 신호로 쓴다). 가드: `src/dash/file_ext_rule.test.ts`.
- 현재 코드는 `React.createElement`(별칭 `h`) 기반(**Phase 0**). **JSX 전환(Phase 2)·TypeScript 타입화(Phase 3)는 후속 작업** — 진행 시 점진적으로.
- **lint**: `npm run lint`(ESLint 10 + typescript-eslint + react-hooks, 설정 `eslint.config.mjs`). 위반 0건 상태로 켜진 규칙은 전부 error 다(2026-10-14 warning 310건 정리). 끈 것: `any`(strict:false·Phase 3 전), React Compiler 전용 규칙 4종(`immutability`·`refs`·`set-state-in-effect`·`preserve-manual-memoization` — Compiler 미사용, dialog-exit 처럼 의도된 패턴이 걸림. Compiler 도입 시 다시 켠다). 의도된 예외는 줄 단위 `eslint-disable-next-line <규칙> -- <이유>` 로 남긴다(이유 없는 disable 금지, 쓸모없어진 disable 은 error).
- `tsc --noEmit`은 현재 타입 에러를 다수 보고하지만 빌드(esbuild)는 타입체크를 하지 않아 `vite build`는 green입니다.
- 색/간격/타이포는 하드코딩 대신 CSS 변수 토큰(`tokens.css`)을 사용하세요.
- 새 페이지/메뉴는 라이트/다크 모두에서 대비를 확인하세요.
- **UI 신규 작업 규칙: .claude/rules/frontend-design-defaults.md** — 금지 패턴 15개와 대체 토큰·컴포넌트(src/** 작업 시 자동 로드). 기존 화면 위반은 지시 없이 고치지 않는다.
- **데이터 마스크는 없다**(2026-09-24 사용자 결정 — 시안용 `mask.tsx`(`mn`·`MT`·`useMask`)와 CSS 훅을 전부 삭제). 값을 가리는 래퍼를 새로 만들지 않는다. 가드 테스트: `src/dash/no_demo_mask.test.ts`.
- **레거시**: 구 오프라인 번들 `농식품모태펀드 대시보드*.html`은 커밋 5fb2dfa로 저장소에서 삭제됐습니다. `apfs-bundle` 스킬(번들 gzip+base64 디코드/재인코드)은 git 이력에서 옛 번들을 읽을 때만 쓰며, 신규 작업엔 불필요합니다.

## 디자인 토큰 / 브랜드

- 도메인 톤: **인디고**(팔레트 인디고/블루/틸 전환 `0422027`, 정본은 `src/dash/tokens.css`). 옛 숲(forest green) 톤은 폐기됐고 dev 전용 Tweaks 무드 패널도 `fa422ce`로 삭제됐다. 블루/시안은 강조·링크·차트 보조.
- 지정 브랜드 색: `#0058A8` `#00AAE5` `#2D7846` `#7BB93C` `#58585B`
- 역할색(라이트): `--primary:#5A5FE8`, `--secondary/cyan:#32D1AF`, `--accent/ring:#2563EB` (다크는 tokens.css `.dark` 블록)
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
| `primary-coordinator` | opus | 태스크 분해·배분·검증·통합, 사용자 소통, 안전 강제 |
| `code-explorer` | sonnet | 코드베이스 탐색·분석 (읽기 전용) |
| `code-reviewer` | sonnet | 보안·성능·가독성·아키텍처 리뷰, Cross-Agent 검증 |
| `verify-agent` | sonnet | Fresh-context 독립 빌드/실행/무결성 검증 |
| `code-architect` | opus | 구현 전 설계 검토·의존성/리스크 분석 (읽기 전용) |

## 핵심 안전 원칙 (항상 적용)
- **Data Integrity 우선** — 데이터 손상/유실/노출 금지.
- 서브에이전트는 Primary 승인 없이 공유 파일을 수정하지 않는다.
- 윤리적 우려(민감정보·시스템 손상 위험 등) 발생 시 **즉시 중단** 후 사용자에게 보고.
- 능력 초과 태스크는 즉시 에스컬레이션.
- 파일 생성/편집 전 해당 SKILL을 먼저 참조(UI/디자인은 `dashboard-ui`, 화면 반응형은 `responsive-ui`).

## 멀티에이전트 실행 패턴
- **1순위 — Workflow 도구**: 인라인 JS, `export const meta`로 시작, 전역 `agent()`/`parallel()`/`pipeline()`/`phase()`/`log()`. 동시성 자동 캡 `min(16, cpu-2)`, 격리 `agent(p,{isolation:'worktree'})`.
- **Agent 도구 직접 호출**: `run_in_background`(완료 시 알림), `SendMessage`(실행 중 에이전트에 추가 지시), `isolation:'worktree'`.
- 레거시 수동 Primary/Secondary·파일 Lock은 Workflow 미사용 시 폴백.

## Skills (자동 활성화)
- `UserPromptSubmit` hook(`.claude/hooks/skill-activator.sh`)이 프롬프트를 stdin JSON으로 받아 `.claude/hooks/skill-rules.json`의 키워드와 매칭, 관련 스킬을 컨텍스트로 추천.
- `PreCompact` hook(`.claude/hooks/pre-compact-reminder.sh`)이 컨텍스트 컴팩트 직전 dev-docs 저장 등 리마인더를 출력. (두 훅 모두 `settings.json`의 `hooks` 블록에 등록됨.)
- **프로젝트 스킬 목록은 여기에 두지 않는다** — 실물이 정본이다: `.claude/skills/`(디렉토리명 = 스킬명), 트리거 규칙은 `.claude/hooks/skill-rules.json`. 목록을 문서에 열거하면 스킬이 늘 때마다 낡는다(2026-09-12 감사: 4개만 적혀 있어 13개 누락 확인). 현재 어떤 스킬이 있는지는 `ls .claude/skills`로 본다.
- 새 스킬 추가 시 `skill-rules.json`의 트리거도 함께 갱신.

## Dev Docs 워크플로우
- `/dev-docs <task>` → 구현 → `/update-dev-docs` → `/save-and-compact` → (재시작) → `/resume`.
- `dev/active/<task>/`에 plan·context·tasks 3-파일로 대규모 작업 컨텍스트를 관리.

### superpowers plan/spec 문서 관례 (`docs/superpowers/`)
- `specs/` = 설계 스펙(*왜/무엇을*), `plans/` = 구현 계획(*어떻게*, 체크박스 Task). superpowers `writing-plans`/`executing-plans` 산출물.
- **완료(구현·머지)된 plan은 `docs/archive/superpowers/completed/`로 이동**(`git mv`로 rename 보존). `plans/`엔 **진행 중 계획만** 둔다 → `plans/`에 파일이 있으면 "미완료" 신호. spec은 짝 plan이 완료될 때 함께 `docs/archive/superpowers/specs/`로 옮긴다(설계 근거라 삭제하지 않음).
- 2026-10-14: 기존 완료 plan 4·spec 2를 `docs/archive/superpowers/`로 이관 — 지금 `docs/superpowers/`는 비어 있고 새 산출물이 생길 때 다시 만든다.

## 참조 문서
| 문서 | 위치 |
|------|------|
| 전체 안전 프로토콜 | `docs/Parallel_Agents_Safety_Protocol_v3_1_0.md` |

## 하네스 변경 이력

하네스(에이전트·스킬·훅·설정) 변경 이력은 → `docs/HARNESS_CHANGELOG.md` 참조. 구성요소 추가/삭제/수정 시 그 파일에 기록한다.
