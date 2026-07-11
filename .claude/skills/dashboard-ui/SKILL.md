---
name: dashboard-ui
description: APFS 농식품모태펀드 대시보드의 UI·디자인 시스템 규약. 위젯/차트/레이아웃/컴포넌트/테마/RBAC 셸 작업, React 컴포넌트·대시보드 화면 작성 시 사용. Use when building dashboard widgets, charts, layouts, or UI components for the APFS dashboard.
---

# Dashboard UI Skill

## 컨텍스트
APFS = 농림수산식품모태펀드 투자자산관리시스템 **대시보드 UI 프로토타입**. 운용사(GP) 보고, 조기경보 리스크, 회계·자금 마감, 투자 성과·포트폴리오, 의무투자 컴플라이언스, 일정·알림 등을 다룬다. 위젯은 "PRD 5.x" 절을 근거로 구성된다. 백엔드 없이 더미 데이터(`APFS_DATA` — `src/dash/data.ts`)로 화면이 완결된다.

## 기술 스택
| Layer | Stack |
|-------|-------|
| 빌드 | **Vite + React 18 + TypeScript** (strict:false 느슨). JSX는 빌드타임 **esbuild** 변환 — Babel standalone 없음 |
| 아이콘 | `Icon`(icons.tsx — lucide 스타일 자체 라인 아이콘) + lucide npm |
| 차트 | Recharts 동일 스펙의 **자체 SVG 차트 프리미티브** (`src/dash/charts.tsx`) — 외부 차트 라이브러리 금지, 아래 "차트 정책" 참조 |
| 스타일 | Tailwind 유틸 className + CSS 변수 토큰(`tokens.css`), Pretendard 폰트 |
| 상태 | app.tsx의 테마/역할/라우트 상태 + localStorage 영속화 |

실행: `npm run dev`(HMR, :5273) / `npm run build`(→`dist/`) / `npm run preview`(:4273). 배포: `main` push → Vercel 자동.

## 모듈 패턴
표준 **ES modules** — 각 모듈이 `export`, 다음 모듈이 `import`로 받는다(구 `(function(w){…})(window)` IIFE·window 노출은 없음). 공통 원천: `UI`(components.tsx — Button, StatusBadge, SegTabs, Card, ChartCard 등), `Shell`(shell.tsx — AppShell, PageHeader), `Icon`(icons.tsx), `Charts`(charts.tsx). shadcn/Radix 프리미티브는 `src/dash/ui/*`(dialog, popover, calendar, dropdown-menu 등), 폼 필드류는 `src/dash/fields/*`. 새 위젯/페이지는 이 원천을 **재사용**한다. 코드 스타일은 `React.createElement`(별칭 `h`)와 JSX가 파일별로 혼재하니 **수정 대상 파일의 기존 스타일을 따른다**(신규 app.tsx 등은 JSX).

## 차트 정책 (2026-07-11 사용자 확정 — 위반 금지)
- 차트는 `src/dash/charts.tsx`의 자체 SVG 프리미티브(Sparkline/Donut/LineTrend/HBars 등)를 **확장**해서 만든다. 외부 차트 라이브러리를 `npm install` 하지 않는다.
- **일정이 촉박해도, 줌·브러시·캔들스틱 같은 고급 인터랙션 요구여도 동일하다.** "자체 구현은 비현실적/일정상 라이브러리가 빠르다"는 도입 사유가 아니다 — 차트 라이브러리 도입은 에이전트 권한 밖의 **사용자 재승인 사항**이다. charts.tsx 확장으로 요구를 충족할 수 없다고 판단되면, 라이브러리를 계획에 넣지 말고 그 판단 근거와 함께 사용자에게 에스컬레이션하라.
- 향후 도입을 재검토하더라도 후보는 **MIT/Apache 2.0/ISC 라이선스만**(예: Recharts, Apache ECharts). 다음은 라이선스 문제로 **후보에서도 영구 제외**: **Highcharts**(상용 유료), **amCharts**(무료판 워터마크), **AG Charts Enterprise**(AG Grid Community와 동일한 Enterprise 경계 규약), **FusionCharts**(상용 유료).
- 이유: 자체 SVG는 번들 0KB에 CSS 변수 토큰·다크모드 연동이 완비돼 있고 마스킹도 `mn`/`MT` 규약으로 일원화된다(단, ComposedBars·LineTrend·Treemap 툴팁은 현재 마스킹 미적용 — 차트 신규/수정 시 툴팁·라벨에도 `mn`/`MT`를 적용하라). 외부 라이브러리(특히 canvas 렌더)는 CSS 변수를 못 읽고 툴팁이 마스크를 우회하는 등 이 연동을 전부 다시 뚫어야 한다.

## 디자인 토큰 / 브랜드
- 도메인 톤: **숲(forest green)**. 브랜드 블루/시안은 강조·링크·차트 보조.
- 지정 브랜드 색: `#0058A8` `#00AAE5` `#2D7846` `#7BB93C` `#58585B`
- 역할색(라이트): `--primary:#0E963B`, `--secondary/cyan:#1DCDA7`, `--accent/ring:#0158A8`
- 폰트: Pretendard (`--font-sans`). 라이트/다크 테마 모두 CSS 변수 토큰 기반.
- 색 상세 규약(적응형 vs 고정 전경·토큰화)은 [[color-tokens]] 스킬.

## 데이터 마스크
`src/dash/mask.tsx`가 상시 ON으로 화면 데이터를 가린다(실데이터 연동 전). 숫자/금액/날짜는 `mn(v)`, 텍스트(인명·코드 등)는 `<MT>…</MT>`로 감싼다. 표 헤더·카드 제목·탭·단위·StatusBadge·차트 축·달력 날짜는 **가리지 않는다**("축은 두고 데이터는 가린다").

## 작업 가이드
1. **재사용 우선**: 새 컴포넌트 전 `UI`/`Icon`/`Charts` 프리미티브에 이미 있는지 확인.
2. **토큰 사용**: 색/간격/타이포는 하드코딩 대신 CSS 변수 토큰 사용(Tweaks 패널이 런타임 조정).
3. **RBAC 인지**: `Shell`은 `role` 기반으로 `APFS_DATA.MENU`를 필터링(`m.roles.includes(role)`). 역할 3등급(admin/manager/viewer). 새 메뉴/페이지는 역할 가시성(`roles`)을 명시.
4. **테마 양립**: 라이트/다크 모두에서 대비/가독성 확인.
5. **접근성**: 의미 있는 라벨, 키보드 포커스, 색만으로 정보 전달 금지(상태는 아이콘+텍스트 병행). 상세는 [[web-a11y]].
6. **라우팅**: app.tsx가 route 문자열로 분기한다. 바스포크 페이지(main, risk, gp-health, accounting, schedule, subfund, asset, asset-funding, report* 등)는 명시 분기, **그 외 route는 전부 `GenericListPage`(스키마 주도, `src/dash/schemas/`)로 폴백**한다. route는 메뉴 리프의 한글 라벨(NFC)이 원칙이고 `apfs.route` localStorage에 **원시 문자열**로 영속화된다.

## 관련 스킬 (상세는 각 스킬 참조 — 중복 금지)
리스트/그리드 골격=[[apfs-grid]], AG Grid 본체=[[apfs-aggrid]], CRUD 모달=[[apfs-form-modal]], 날짜 선택=[[apfs-datepicker]], 색 토큰=[[color-tokens]], 쌓임맥락=[[z-index]], 반응형=[[responsive-ui]], 접근성=[[web-a11y]].

## 검증
`npm run build`가 green이어야 한다(dev 서버가 떠도 프로덕션 빌드는 실패할 수 있다). 이후 `npm run dev`로 HMR 확인 — 위젯 렌더, 라이트/다크 테마 토글, 역할(admin/manager/viewer) 전환, 브라우저 콘솔 무오류.
