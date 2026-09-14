# 투자자산관리 추가 8개 HTML → React 변환 브리프

## 목적
현행 목업 HTML 8개를 APFS Vite + React 관리 화면으로 변환하고 기존 투자자산관리 메뉴의 동일 리프에서 도달하도록 한다.

## 책임·실행 환경
- 책임 역할: Developer
- 실행 환경: Orca managed worktree `fund-admin-pages-batch` + Claude Code

## 대상 입력과 메뉴
1. `S1_14__운용사_출자배분관리.html` → `(운용사)출자배분관리`
2. `S1_15_조합원정보등록.html` → `조합원정보등록`
3. `S1_18_자펀드별조합원관리.html` → `자펀드별조합원관리`
4. `S1_21__농금원_출자배분관리.html` → `(농금원)출자배분관리`
5. `S1_24_투자실적_현황_자펀드_.html` → `투자실적 현황(자펀드)`
6. `S1_25_종합통계.html` → `종합통계`
7. `S1_26_자펀드수탁관리_실물검증_.html` → `자펀드수탁관리(실물검증)`
8. `S1_27_자펀드수탁관리_확정_.html` → `자펀드수탁관리(확정)`

입력 루트: `/Users/younghwankang/Downloads/통합/01_투자자산관리`

## 범위와 병렬화
- `.claude/skills/apfs-manage-page` 및 연결된 UI·접근성 스킬을 적용한다.
- 각 목업에서 검색·그리드·합계·선택/행 액션·모달·워크플로우의 실제 업무 의미를 이식한다.
- 각 페이지 모듈의 분석/구현은 병렬화한다. `src/dash/data.ts`, `src/dash/app.tsx`, 공통 export는 단일 코디네이터가 직렬 통합한다.
- 기존 `report-pages-conversion`의 5개 페이지와 충돌하거나 되돌리지 않는다.

## 제외
- 원본 HTML 및 레거시 번들 변경·삭제
- 백엔드/API·실데이터 연동
- 원격 push/PR/병합

## 결정
- KPI 배지 행: 전 페이지 미포함.

## 수용 기준
- 8개 메뉴가 각각 맞는 React 화면으로 열린다.
- 기존 APFS 셸/토큰/다크모드/접근성 규약을 따른다.
- `npm run build`, `npm test`가 통과한다.
- Aside로 8개 route의 비어 있지 않은 화면과 콘솔/페이지 오류 0건, 라이트/다크 적용을 확인한다.
- 현재 브랜치의 기존 5개 페이지는 회귀시키지 않는다.

## 검증
`npm run build` → `npm test` → 각 route 런타임 확인 → `git status --short --branch`.
