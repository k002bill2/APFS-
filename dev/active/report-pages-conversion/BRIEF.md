# 보고 관리 페이지 5종 HTML → React 변환 브리프

## 목적
`/Users/younghwankang/Downloads/통합/01_투자자산관리`의 현행 목업 HTML 5개를 APFS Vite + React 페이지로 변환하고, 각각 기존 APFS 메뉴의 해당 리프에서 도달 가능하게 만든다.

## 책임·실행 환경
- 책임 역할: Developer
- 실행 환경: Orca managed worktree `report-pages-conversion` + Claude Code

## 대상 입력
1. `S1_06_정기보고.html` → 메뉴 `정기보고`
2. `S1_07_조합원총회.html` → 메뉴 `조합원총회`
3. `S1_08_조합예상자금보고.html` → 메뉴 `조합예상자금보고`
4. `S1_09_보고양식관리.html` → 메뉴 `보고양식관리`
5. `S1_10_보고_업데이트정보.html` → 메뉴 `보고 업데이트정보`

입력 루트: `/Users/younghwankang/Downloads/통합/01_투자자산관리`

## 범위
- `.claude/skills/apfs-manage-page` 및 관련 APFS 스킬을 적용해 각 목업의 검색·그리드·합계·행 액션·팝업 등 실제 화면 의미를 React 정본 `src/`로 이식한다.
- 각 페이지의 메뉴 리프/라우트를 `src/dash/data.ts`, `src/dash/app.tsx`의 기존 라우팅 모델과 일치시킨다.
- 공통 셸·토큰·컴포넌트·접근성 패턴을 재사용한다.
- 각 페이지 작업의 읽기/생성은 병렬화하되, 공유 파일(`data.ts`, `app.tsx`, 공통 export) 통합은 한 명의 코디네이터가 직렬로 수행한다.

## 제외 범위
- 레거시 `농식품모태펀드 대시보드*.html` 직접 수정
- 백엔드/API·실데이터 연동
- 원본 HTML 삭제·수정
- 원격 push/PR/병합

## 결정
- KPI 배지 행: 5개 페이지 모두 **미포함** (사용자 선택).

## 수용 기준
- 5개 메뉴 모두 해당 React 화면으로 도달 가능하다.
- 원본 목업의 업무 구조와 핵심 인터랙션이 APFS 디자인 시스템으로 변환된다.
- light/dark에서 토큰 기반으로 읽히고, 폼·아이콘·키보드 접근성을 지킨다.
- `npm run build`, `npm test`가 통과한다.
- 각 route에 대해 로컬 런타임에서 그리드/핵심 화면이 비어 있지 않고, 콘솔/페이지 오류가 없어야 한다.
- 기존 사용자 변경을 되돌리지 않는다.

## 검증
1. `npm run build`
2. `npm test`
3. `npm run dev` 또는 승인된 런타임에서 5 route를 직접 열어 렌더·핵심 조작·라이트/다크·오류를 확인
4. `git status --short --branch`로 작업 변경과 사전 변경을 분리

## 위험·확인 필요
- 공유 메뉴/라우팅 파일은 5개 페이지가 함께 수정하므로 페이지별 독립 병렬 merge는 충돌 위험이 있다. 페이지 구현을 병렬화한 뒤 코디네이터가 공유 파일을 단일 통합한다.
- 원본 HTML에 별도 `*_spec.json`이 없으면 HTML 하단 script/DATA를 정본으로 삼는다.
