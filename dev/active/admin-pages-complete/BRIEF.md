# AFIT 관리자 전체 페이지 전환·보강

## 책임/실행 환경
- 책임 역할: Developer
- 실행 환경: Orca-managed worktree + Claude Code
- 대상: `/Users/younghwankang/orca/workspaces/APFS/admin-pages-complete`
- 기준 커밋: `75796ad` (`main`의 현재 uncommitted 변경은 이 worktree에 포함하지 않았음)

## 목적
사용자가 전달한 AFIT HTML 목업 `S0_001`, `S0_101`~`S0_108`을 APFS Vite/React 화면으로 전환한다. 이미 구현된 권한·프로그램·메뉴·코드 관리 화면은 최신 원본 HTML 기준으로 보강한다. 메뉴 IA는 반드시 사용자 이미지의 구조와 순서를 따른다.

## 원본 문서
원본은 읽기 전용이다. `~/.hermes/profiles/jarvis/cache/documents/` 아래에서 아래 해시 접두사로 찾아 전체 HTML(특히 마지막 script의 데이터·컬럼·상호작용)을 분석한다. 유니코드 파일명 해석이 불안정하면 해시 prefix로 locate하되 원본을 수정하지 않는다.

- `doc_cf59df4fb8d6_` — `S0_001_로그인.html`
- `doc_577335029a46_` — `S0_101_사용자관리.html`
- `doc_0e2fda134acf_` — `S0_102_권한관리.html`
- `doc_e12c319ce5f3_` — `S0_103_사용자초대_운용사.html`
- `doc_ace2b69457e5_` — `S0_104_감사로그.html`
- `doc_c7bbf1673e61_` — `S0_105_메뉴관리.html`
- `doc_bdaa6bbdb870_` — `S0_106_코드관리.html`
- `doc_c97b248ef1d8_` — `S0_107_권한변경이력.html`
- `doc_217a576e2a30_` — `S0_108_프로그램관리.html`

## 필수 메뉴 IA — 사용자 이미지 정본
`관리자` 아래에 아래 세 중분류와 리프를 **표시 순서 그대로** 구성하고, 각 리프는 명시 route로 렌더한다. 기존 이미지와 다른 과거 AdminTabs(페이지 내부 탭 바)는 사용하지 않는다. Shell/LNB가 유일한 전역 내비게이션이다.

1. `사용자·권한 관리`
   - `권한관리` → `user-permission-manage` (기존 typed page 보강)
   - `사용자관리` → `user-manage` (신규)
   - `사용자 초대(운용사)` → `user-invite-gp` (신규)
2. `시스템 관리`
   - `프로그램관리` → `program-manage` (기존 typed page를 S0_108 실제 기능으로 보강)
   - `메뉴관리` → `menu-manage` (기존 typed page 보강)
   - `코드관리` → `code-manage` (기존 typed page 보강)
3. `감사·기록`
   - `권한 변경이력` → `permission-history` (신규)
   - `감사로그` → `audit-log` (신규)

`S0_001 로그인`은 메뉴 리프가 아니다. Shell 밖 독립 인증 UI route `login`으로 구현하되, 기본 진입 route를 변경하지 말고 localStorage route로 접근 가능하게 한다.

## 구현 원칙
- `CLAUDE.md`, `.agents/skills/apfs-dashboard-workflow/SKILL.md`, `.agents/skills/apfs-manage-page/SKILL.md` 및 관련 `dashboard-ui`, `responsive-ui`, `web-a11y`, `aggrid`, `form-modal`, `detail-filter` 스킬을 먼저 읽는다.
- Vite/React source만 변경한다. 레거시 HTML·원본 cache 문서는 수정하지 않는다.
- 신규/보강 route는 `src/dash/data.ts` 메뉴 트리와 `src/dash/app.tsx` 명시 import/route 분기를 함께 변경한다. 위 8개 메뉴 리프는 `GenericListPage` fallback으로 보내지 않는다.
- 기존 `admin_tabs.tsx` / `admin_tabs_model.ts` 패턴은 사용하거나 재도입하지 않는다. 이 worktree base에 존재한다면, 리프에서 import/render를 제거하고 더 이상 필요 없는 파일은 자연스럽게 정리하되 unrelated source는 건드리지 않는다.
- 원본의 GNB/LNB/theme switcher/mock note는 이식하지 않는다. APFS Shell·토큰·공통 GridFrame/Button/AgGrid 패턴을 사용한다. 본문에서 전역 헤더를 중복 렌더하지 않는다.
- KPI 배지 행은 **미포함** (사용자 기존 확정).
- 데이터는 원본 구조를 근거로 한 현지 더미 상태만 사용한다. CRUD·필터·선택·모달·엑셀은 UI prototype 수준으로 구현한다.
- 개인정보/권한/감사/로그인은 **실제 인증·RBAC·권한변경·외부 이메일 발송·접근 로그 수집·TOTP/비밀번호 검증을 구현하지 않는다.** S0_001은 UI 흐름 시연만이며 raw mock credential, TOTP seed/code, 실명/개인정보를 화면·커밋·보고에 노출하지 않는다. 관련 액션은 명확히 `(목업)` 처리한다.
- 마스킹 규약 유지: 동적 텍스트 `MT`, 수치 `mn`을 사용한다. 라이트/다크 모두 토큰 기반.

## 기능별 수용 기준
### 기존 페이지 보강
- 권한관리: 원본의 권한 그룹/사용자 유형/메뉴별 권한 매트릭스와 선택·등록/수정 UI를 현재 typed page에 보강한다. 실제 권한 적용 금지.
- 프로그램관리: S0_108의 프로그램 목록·구분/사용/도움말 필터, 연결 메뉴, 도움말 문서 편집 UI 흐름을 반영한다. 메뉴 파생 항목과 임시 항목의 삭제 제한을 UI로 표현한다.
- 메뉴관리: 원본의 계층 구조, 프로그램 연결, 정렬·사용 여부·등록/수정 모달 흐름을 반영한다.
- 코드관리: 코드구분 ↔ 코드상세 master-detail, 상세 필터/등록/수정/삭제(목업), 다열 상세 grid의 내부 가로 스크롤을 보존한다.

### 신규 페이지
- 사용자관리: 사용자 상태(활성/잠금/온보딩대기/비활성), 유형/소속/역할/최근접속을 밀도 높은 grid로 제공하고, 행 선택 기반 등록·수정·상태변경 UI prototype을 구현한다.
- 사용자 초대(운용사): 운용사/초대 대상/초대 상태를 목록화하고 초대 생성·재발송·취소 UI prototype을 구현한다. 실제 메일 전송 금지.
- 권한 변경이력: 기간/대상/변경유형 필터, 변경 전후 비교와 상세 modal의 audit-read-only 흐름을 구현한다.
- 감사로그: 기간/결과/행위자/키워드 필터, 접속·권한변경·비정상 접근 행과 결과 배지, 행 상세를 구현한다. 실제 보안 이벤트나 정책을 단정하지 않는다.
- 로그인: APFS Shell 없이 독립된 반응형 로그인 UI 및 안전한 시연 상태(입력 검증, 목업 성공/실패 안내, 비밀번호 재설정 안내 modal)만 구현한다. 실제 로그인/세션/OTP/계정잠금·비밀번호 정책 enforcement는 하지 않는다. 성공 시 `main`으로 onNav 이동할 수 있다.

## 예상 파일
- 수정: `src/dash/data.ts`, `src/dash/app.tsx`, 공통 grid/frame 또는 기존 4개 typed admin 페이지(필요 최소 범위)
- 신규: user/manage, invitation, permission history, audit log, login 관련 typed React 모듈 및 필요한 작은 data/model/modal/test 모듈
- 작업 브리프: 이 파일
- `.agents/skills/**`, `.codex/**`, 원본 HTML, 레거시 번들은 커밋 금지

## 검증 및 완료
1. `git diff --check`
2. `npm run build`
3. `npm test`
4. Aside runtime QA:
   - 9개 route(`login` + 메뉴 8개) 모두 제목과 의미 있는 본문/grid 또는 login form
   - 메뉴 클릭으로 8개 리프 접근
   - 기존 4개 및 신규 4개 핵심 플로우 1개씩 (권한 매트릭스 modal, 도움말/메뉴/코드 master-detail, 사용자 상태/초대 UI, 이력·감사 상세, login demo flow)
   - light/dark, 1280/768/400 responsive, 콘솔/page error 0
5. `git status --short --branch`로 범위 확인 후 scoped conventional commit을 만든다. **push/PR/merge 하지 않는다.**

## 현재 외부 변경 격리
기본 `main` worktree에는 현재 별도의 Orca terminal들이 수행한 미커밋 관리자 화면 변경이 있다. 이 worktree에서 그것을 되돌리거나 수정하지 않는다. 이 branch는 `75796ad` clean HEAD에서 시작했으며, 이후 통합 시 별도 rebase/충돌 검증이 필요하다.
