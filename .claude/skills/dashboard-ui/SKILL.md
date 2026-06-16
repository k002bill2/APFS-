---
name: dashboard-ui
description: APFS 농식품모태펀드 대시보드의 UI·디자인 시스템 규약. 위젯/차트/레이아웃/컴포넌트/테마/RBAC 셸 작업, React 컴포넌트·대시보드 화면 작성 시 사용. Use when building dashboard widgets, charts, layouts, or UI components for the APFS dashboard.
---

# Dashboard UI Skill

## 컨텍스트
APFS = 농림수산식품모태펀드 투자자산관리시스템 **대시보드 UI 프로토타입**. 운용사(GP) 보고, 조기경보 리스크, 회계·자금 마감, 투자 성과·포트폴리오, 의무투자 컴플라이언스, 일정·알림 등을 다룬다. 위젯은 "PRD 5.x" 절을 근거로 구성된다.

## 기술 스택 (번들 내장)
| Layer | Stack |
|-------|-------|
| UI | React (development build), `text/babel` JSX (Babel standalone로 변환) |
| 아이콘 | lucide v0.460.0 스타일 (`window.Icon`) |
| 차트 | Recharts 동일 스펙의 **자체 SVG 차트 프리미티브** |
| 스타일 | Tailwind 유틸 className + CSS 변수 토큰, Pretendard 폰트 |
| 상태 | 앱 루트의 테마/역할/라우트 상태 + localStorage 영속화 |

> 빌드 시스템·번들러·백엔드 없음. 모든 데이터는 임베디드 더미(`APFS_DATA`).

## 모듈 패턴
앱 모듈은 `(function(w){ … })(window)` 로 `window`에 컴포넌트를 노출하고 다음 모듈이 `w.Xxx`로 받아 쓴다. 공통 컴포넌트는 `window.UI`(Button, ColorChip, StatusBadge, SegTabs 등), 셸은 `window.Shell`. 새 위젯/페이지는 이 패턴과 기존 `UI`/`Icon`/차트 프리미티브를 **재사용**한다(새 라이브러리 도입 금지 — 오프라인 자가완결 유지).

## 디자인 토큰 / 브랜드
- 도메인 톤: **숲(forest green)**. 브랜드 블루/시안은 강조·링크·차트 보조.
- 지정 브랜드 색: `#0058A8` `#00AAE5` `#2D7846` `#7BB93C` `#58585B`
- 역할색(라이트): `--primary:#0E963B`, `--secondary/cyan:#1DCDA7`, `--accent/ring:#0158A8`
- 폰트: Pretendard (`--font-sans`). 라이트/다크 테마 모두 CSS 변수 토큰 기반.

## 작업 가이드
1. **재사용 우선**: 새 컴포넌트 전 `UI`/`Icon`/차트 프리미티브에 이미 있는지 확인.
2. **토큰 사용**: 색/간격/타이포는 하드코딩 대신 CSS 변수 토큰 사용(Tweaks 패널이 런타임 조정).
3. **RBAC 인지**: `Shell`은 `role` 기반으로 `D.MENU`를 필터링(`m.roles.includes(role)`). 새 메뉴/페이지는 역할 가시성을 명시.
4. **테마 양립**: 라이트/다크 모두에서 대비/가독성 확인.
5. **접근성**: 의미 있는 라벨, 키보드 포커스, 색만으로 정보 전달 금지(상태는 아이콘+텍스트 병행).
6. **라우트 스텁**: risk / gp-health / accounting / performance / schedule + 메인 대시보드 / 디자인 시스템 프리뷰. 새 페이지는 앱 루트 `STUBS` 패턴을 따른다.

## 변경 적용 경로
이 UI는 HTML 번들에 임베드돼 있다. 실제 코드 수정은 번들 내부 자산을 꺼내야 하므로, 편집 절차는 [[apfs-bundle]] 스킬을 따른다. 가능하면 원본(omelette/Artifact 소스)에서 재생성한다.

## 검증
`open "농식품모태펀드 대시보드 (오프라인).html"` 로 브라우저에서 위젯 렌더, 테마 토글, 역할 전환, 콘솔 오류 없음을 수동 확인.
