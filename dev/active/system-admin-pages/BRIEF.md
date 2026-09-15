# 시스템·사용자 관리 페이지 3종 HTML → React 변환 브리프

## 목적
사용자가 전달한 AFIT 공통관리 목업 3종을 APFS Vite/React 관리 화면으로 변환하고, 이미지의 `관리자` 메뉴 구조에서 실제 라우트로 진입할 수 있게 한다.

## 입력 원본 (읽기 전용)
- `/Users/younghwankang/.hermes/profiles/jarvis/cache/documents/doc_f9963b4a96c8_S0_102_권한관리.html` — `권한관리`
- `/Users/younghwankang/.hermes/profiles/jarvis/cache/documents/doc_55db2375dc3f_S0_105_메뉴관리.html` — `메뉴관리`
- `/Users/younghwankang/.hermes/profiles/jarvis/cache/documents/doc_679479e69fee_S0_106_코드관리.html` — `코드관리`
- 이미지 메뉴 IA: 시스템 관리 > 공통코드 관리 > 메뉴 관리 / 도움말 관리, 사용자 관리 > 사용자 관리 / 사용자 권한 관리

## 확정 메뉴·라우트 매핑
기존 `src/dash/data.ts`의 리프를 임의 추가·삭제하지 말고, 해당 기존 리프에 `path`만 부여한다.

| 원본 | APFS 리프 라벨 | path |
|---|---|---|
| S0_106 코드관리 | `공통코드 관리` | `code-manage` |
| S0_105 메뉴관리 | `메뉴 관리` | `menu-manage` |
| S0_102 권한관리 | `사용자 권한 관리` | `user-permission-manage` |

`src/dash/app.tsx`에는 각 페이지 import + 명시 route branch + 기존 한글 route 별칭(`코드관리`, `메뉴관리`, `권한관리`)을 추가한다. 세 route가 `GenericListPage` fallback으로 떨어지면 실패다.

## 구현 트랙 및 페이지 요구
세 원본 모두 flat 스키마만으로 보존할 수 없는 상호작용이 있어 `apfs-manage-page`의 **typed 페이지 트랙**으로 구현한다. 기존 `subfund_manage.tsx`, 최근 typed 관리 페이지, `GridFrame`/공통 토큰/AG Grid 패턴을 재사용한다.

### 1. 사용자 권한 관리 (`user_permission_manage.tsx` 등)
- 원본의 권한 목록: 명칭, 사용자 구분, 설명, 최종수정/수정일, 사용여부, 사용자수.
- 선택 행 기반 수정·복사·삭제 액션과 등록/수정 모달.
- 권한 설정은 대메뉴/중메뉴/소메뉴와 프로그램ID별 `조회`, `인쇄/다운로드`, `등록/수정`, `관리자` 권한 매트릭스를 보존한다. 전체/중간/리프 체크 및 indeterminate 상태를 명확히 표현한다.
- 사용자 구분: 농금원, 운용사, 수탁, 부처. 실제 백엔드/RBAC은 만들지 말고 목업 기반 더미 상태만 변경한다.

### 2. 메뉴 관리 (`menu_manage.tsx` 등)
- 원본의 검색 기준·사용자 구분·레벨·사용 여부 필터, 계층형 1~3레벨 메뉴 트리 그리드, 전체 펼치기/접기, 등록·수정·삭제를 구현한다.
- 메뉴ID, 메뉴명, 영문명, 프로그램ID/명, 단축번호, 레벨, 상위메뉴, 정렬, 사용자 구분, 사용여부를 보존한다.
- 하위 메뉴가 있는 경우 삭제 방지, 메뉴ID/단축번호 중복 검증, 정렬 순서 재조정의 목업 워크플로우를 유지한다.

### 3. 공통코드 관리 (`code_manage.tsx` 등)
- 원본의 좌측 코드구분 목록 + 우측 선택 코드구분의 코드상세라는 master-detail 구조를 구현한다.
- 코드구분: 코드구분, 명칭, 상위 코드구분, 비고, 사용여부.
- 코드상세: 코드, 명칭, 영문명, 정렬, 비고, 사용여부.
- 그룹 선택 전 우측 empty state, 그룹/상세별 등록·수정·삭제, 상세가 있는 그룹 삭제 방지, 중복 코드 검증을 구현한다.
- 원본 DATA의 대표 코드구분·상세값을 APFS 더미 데이터로 이식하되, 과도한 원본 전체 덤프는 피하고 화면 밀도를 유지한다.

## 사용자 추가 지시 — 시스템관리 탭 구조 (이미지 기준)
> ⚠️ **철회됨 (2026-09-14 후속 지시: "메뉴를 이렇게 탭으로 할 필요 없어. 원래대로 해줘")** — 아래 탭 요구는 더 이상 유효하지 않다. 탭 바는 제거됐고 관리 화면 이동은 LNB 단일 경로다. 이 절은 이력으로만 남긴다(§구현 메모 3 참조).
- 기존 APFS 전역 Shell/GNB는 유지하되, 이 4개 관리 route의 본문 상단에 이미지와 같은 **관리 컨텍스트 탭 바**를 둔다. 브랜드/전역 헤더를 페이지 내부에서 중복 렌더하지 않는다.
- 1차 탭: `사용자 권한 관리` | `시스템관리`.
  - `user-permission-manage`에서 `사용자 권한 관리`가 활성 상태여야 한다.
  - `program-manage`, `menu-manage`, `code-manage`에서 `시스템관리`가 활성 상태여야 한다.
- 시스템관리 활성 시 2차 탭: `프로그램관리` | `메뉴관리` | `코드관리`.
  - 정확한 시각 언어: 활성 탭은 APFS primary blue 텍스트 + 하단 2px 강조선, 비활성은 muted text. 원본의 라벨 띄어쓰기 없는 표기(`프로그램관리`, `메뉴관리`, `코드관리`)를 2차 탭에서 사용한다.
  - 각 탭 클릭은 `onNav`를 통해 route를 바꾸고, 현재 route와 활성 상태가 동기화되어야 한다.
- 이미지·원본 메뉴 트리 기준으로 LNB의 `관리자 > 시스템 관리` 리프 순서는 `프로그램 관리`, `공통코드 관리`, `메뉴 관리`, `도움말 관리`로 한다.
  - `프로그램 관리` path: `program-manage`
  - `공통코드 관리` path: `code-manage`
  - `메뉴 관리` path: `menu-manage`
- 별도 프로그램관리 HTML은 없지만 이미지에서 활성 첫 탭으로 명시됐으므로, `program-manage`에는 **메뉴관리 원본의 PROGRAMS/프로그램 검색 근거만** 사용한 작고 실제 데이터가 있는 프로그램 목록(프로그램ID, 프로그램명, 연결 메뉴, 사용여부)을 구현한다. 근거 없는 대규모 관리 UI는 만들지 않는다.

## 공통 UX 및 범위
- 카드 헤더 KPI 배지 행: **미포함** (사용자 확정).
- 이미지와 현재 메뉴 정합을 지킨다: `공통코드 관리`, `메뉴 관리`, `사용자 권한 관리` 라벨을 그대로 사용한다.
- 라이트/다크, 키보드 접근성, 명확한 empty/disabled/삭제확인 상태를 포함한다.
- 원본의 GNB/LNB/테마 전환/목업 전용 스캐폴딩은 이식하지 않는다. APFS Shell이 소유한다.
- `src/dash/data.ts`, `src/dash/app.tsx` 충돌 지점은 한 작업자가 통합한다.
- `.agents/skills/**`, `.codex/agents/**`, 레거시 HTML 번들은 수정/커밋하지 않는다.
- 기존 페이지와 최근 main 변경을 되돌리지 않는다.

## 예상 변경 파일
- `src/dash/data.ts`
- `src/dash/app.tsx`
- `src/dash/user_permission_manage.tsx` 및 필요한 권한 설정/폼 모달
- `src/dash/menu_manage.tsx` 및 필요한 폼/데이터 모듈
- `src/dash/code_manage.tsx` 및 필요한 폼/데이터 모듈
- `dev/active/system-admin-pages/**` (작업 근거)

## 완료·검증 기준
1. `npm run build`, `npm test`, `git diff --check` 통과.
2. Aside로 각 route가 명시 페이지를 렌더하고 제목·데이터 그리드/마스터-디테일을 확인한다.
3. 권한 페이지: 권한 행 선택 → 권한 설정 모달/매트릭스 확인.
4. 메뉴 페이지: 계층 메뉴 데이터와 등록 폼 확인.
5. 코드 페이지: 코드구분 선택 → 코드상세 비어 있지 않은 그리드 확인.
6. 라이트/다크에서 콘솔·페이지 오류가 없어야 한다.
7. 현재 브랜치에 범위 내 변경만 Conventional Commit으로 커밋한다. **원격 push/PR/merge는 하지 않는다.**

---

## 구현 메모 (2026-09-14, 인수 세션)

인계 시점 차단 4건과 그 처리:
1. `npm run build` 실패 — `code_manage.tsx` 머리 주석의 `lg-*/rg-*` 안 `*/`가 블록 주석을 조기 종료. 문구를 `lg-·rg- 접두 버튼`으로 바꿔 해결(로직 무변경).
2. ~~`program_manage.tsx` 부재 — 신규.~~ **철회(2026-09-14 사용자 지시 "되돌려")** — 탭 철회로 근거가 사라져 페이지·`programCatalog`/`ProgramEntry`·테스트 4건까지 삭제. 참고 이력: 데이터는 `admin_menu_tree.programCatalog`(LNB 정본 리프 = 목업 S0_105 `PROGRAMS`)만 사용. 목록·검색(프로그램ID·프로그램명 부분일치 = 목업 프로그램 검색 팝업)·사용여부 칩·엑셀·페이지네이션 20. **CRUD 없음**(근거 없음).
3. ~~공용 탭 바 부재 — `admin_tabs_model.ts` + `admin_tabs.tsx`, `GridFrame` `tabs` 슬롯~~ **철회(2026-09-14 사용자 지시 "메뉴를 탭으로 할 필요 없어, 원래대로")** — 탭 모듈 3파일 삭제, 4 페이지 배선·`GridFrame.tabs` 슬롯 원복. 관리 화면 간 이동은 LNB(관리자 > 시스템 관리/사용자 관리) 단일 경로.
4. ~~`data.ts`/`app.tsx` program-manage 누락~~ **철회(2026-09-14)** — 리프·별칭·route 분기 원복. 구조표 정본 리프 141개로 복귀. 참고 이력: 리프 `프로그램 관리`(path `program-manage`)를 `시스템 관리` 첫 항목으로 추가(구조표에 없던 리프 — 이 브리프의 사용자 지시가 근거), 순서 프로그램→공통코드→메뉴→도움말. app.tsx import·route 분기·별칭(`프로그램 관리`·`프로그램관리`).

결정·가정:
- ~~`프로그램 관리` 리프 추가로 프로그램ID 일련이 1 밀렸다. 권한 매트릭스 행 143 = 리프 142 + 1.~~ **철회 후 원복(2026-09-14)** — 리프 141개 기준으로 되돌아갔다(카운트는 `APFS_DATA.ALLMENU`에서 파생이라 테스트 하드코딩 없음).

검증 증거(2026-09-14): `git diff --check` 0 · `vite build` ✓ · `vitest` 12 files / 105 tests 통과 · Aside(포트 5310) 4 route × 라이트/다크: 제목·그리드 행수(program 20/페이지, menu 8 대분류, code 19+14, permission 5)·탭 활성(`aria-current`, primary 텍스트 + 2px 밑줄)·pageerror/console error 0 · 탭 클릭 5회 전이 route/제목 동기 · 권한 수정 모달 매트릭스 143행·indeterminate 135·전체 선택 572/572 · 코드 HOMECD 선택 시 우측 18행.
