---
name: apfs-manage-page
description: 현행시스템/KRDS 목업 HTML(+spec.json)을 APFS 관리형 리스트 페이지(검색·2단 헤더 그리드·합계·워크플로우·편집 팝업)로 조립하는 SOP. 목업 변환·관리 화면 생성·구조도 spec 반영·"이 화면 우리 디자인으로" 요청 시 사용. 영역별 규약은 기존 스킬을 참조로 조립하고 새 패턴만 여기 둔다. Use when converting a mockup/spec into an APFS management list page (search + grouped-header grid + totals + stage workflow + edit popups).
---

# apfs-manage-page

목업(KRDS TO-BE HTML + `*_spec.json`) → **APFS 디자인시스템의 관리형 리스트 페이지**. 영역마다 이미 스킬이 있다 — 이 스킬은 **어느 영역을 어느 스킬로 조립하는지**와 **새 패턴 2개**(심사단계 워크플로우·섹션형 모달)만 소유한다. 중복 규약을 만들지 말 것.

- **골드 레퍼런스**: `src/dash/iam/sfund/subfund_manage.tsx`(페이지) · `subfund_manage_schemas.ts`(모달 스키마) · `subfund_form_modal.tsx`(섹션형 모달). 출처 목업: 자펀드관리_목업.html(구조도 v1.4).
- 형제 골드: `asset_funding.tsx`(매트릭스 조회형, 워크플로우 없음).
- **화면설계서 출처 형제 골드(회계, 2026-10-28~30 PR #364~#370)**: `acc/baseinfo/account_code_manage.tsx`(CRUD + 논리삭제·삭제이력) · `acc/baseinfo/closing_form_manage.tsx`(저장형 편집 그리드) · `acc/slip/general_journal_manage.tsx`(목록 + 전체 화면 입력 + 업로드) · `acc/slip/deleted_journal_manage.tsx`(조회 전용 목록 + 상세 재사용, 가장 작음) · `acc/slip/suspense_manage.tsx`(선택 바 처리 4종 + 셀 링크). 각 파일 머리 주석의 "설계서 → 우리 규약" 목록이 매핑 예시다.

## 0. 트랙 분기 (먼저 결정)
| 목업 특성 | 트랙 |
|-----------|------|
| 단일 헤더 + flat 필드 + 단순 CRUD | **스키마 트랙** → [[apfs-capture-schema]] → `GenericListPage`(코드 0) |
| **2단 헤더·합계행·행 선택→단계별 액션·섹션/반복행 모달** 중 하나라도 | **typed 페이지 트랙(이 스킬)** — `PageSchema.FieldSpec`은 flat이라 못 담는다 |
| 셀 안 편집 + [저장] 일괄 반영 · 검색(선택) 팝업 · 전체 화면 입력 · 설계서 업무 규칙(게이트·검증) | **typed 페이지 트랙** — 회계 5화면이 전부 여기다 |

## 0-1. 입력 출처 — 목업 HTML · 화면설계서 · 캡처 (트랙은 출처가 아니라 복잡도로 가른다)
| 출처 | 동작 명세가 있는 곳 | 비고 |
|------|------|------|
| 목업 HTML + `*_spec.json` | 하단 `<script>` 의 DATA·STAGE_ACT·팝업 `row()` | spec.json 이 필드·컬럼 정본 |
| **화면설계서**(PPT/PDF, 화면ID `ACC-001` 식) | 화면·그리드 컬럼·상세필터 슬라이드 + **이벤트 슬라이드(`E00`~`E13`)** | 저장소에 두지 않는다 — 사용자가 경로로 준다. 회계 화면이 이 경로(2026-10-28~) |
| 캡처 이미지 | 화면 자체(비전으로 읽음) | 목업·설계서가 없을 때만 → [[apfs-capture-schema]] |

**화면설계서 트랙 규약**(회계 5화면에서 반복된 판단 — 다음 화면은 다시 고민하지 않는다):
- **파일 머리 주석** = 화면ID + 슬라이드 범위 + "설계서 → 우리 규약" 대응 목록 + "결정·가정" 목록. 핸들러 주석에 이벤트 ID 를 단다(`/* E03 저장 */`) — 리뷰·PM 대조가 이 ID 로 된다.
- **충돌하면**: 설계서의 **업무 규칙**(삭제 가능 조건·전이 조건·검증 문구·계층 무결성)은 프로젝트 기본 동작보다 **우선**한다 — 예: 일반전표 삭제는 조건 밖 건이 하나라도 섞이면 **전체 중단**([[apfs-aggrid]] "관리형 페이지 그리드 규약"의 '다건 삭제는 게이트 필터형'과 반대, `general_journal_model.ts` `deleteGate`). 설계서의 **표현**(정렬·버튼 위치·버튼 개수·툴팁형 검증·KPI 배지)은 **프로젝트 규약이 우선**한다 — 예: 등록·엑셀업로드 독립 2버튼 → 등록 콤보, 처리 버튼 위치 → 선택 바, 코드 가운데 정렬 → 좌측, '전체펼치기' 버튼 → 푸터 전체보기(⌥A), 툴팁 경고 → 필드 에러(빨간 테두리 + 인라인 문구 + 토스트).
- **기록**: 설계서에 없는데 넣은 규칙(계층 무결성 등)과 설계서와 다르게 둔 점은 PR 본문 **"설계서와 다른 점 (PM 확인 필요)"** 절에 목록으로 남긴다. 설계서의 "확인 필요"(미결) 항목은 구현하지 않고 거기 적는다. "권한 보유자만 노출"은 RBAC 데모가 없어(2026-09-09 제거) 항상 노출하고 거기 적는다.
- **업무 규칙은 페이지 옆 순수 함수 모듈 + `*.test.ts`** — 게이트·검증·기간 기본값·상태 전이를 페이지에 인라인으로 쓰지 않는다. 회계 5화면 전부 이 구조다(`account_code_model` · `closing_form_data` · `general_journal_model` · `deleted_journal_model` · `suspense_model`, 페이지는 배선만).

## 1. 영역 → 스킬 매핑 (조립표)
| 목업 영역 | 우리 구현 | 규약 출처 |
|-----------|-----------|-----------|
| 페이지 골격(제목·KPI·툴바·푸터) | `GridFrame` + `KpiBadge`. **타이틀(`cardTitle`·`title`·crumbs 리프)은 `data.ts` 메뉴 리프 라벨과 일치**(임의 "○○ 목록" 금지) | [[apfs-grid]] "관리형 리스트 툴바·타이틀 규약" |
| **KPI 배지 행(옵션·HITL)** | 기본 미포함. SOP(3절) 5단계 HITL로 포함 여부를 물어 "포함" 시에만 3배지(전체 건수 + 도메인별 2지표). typed=`kpis` 직접(미포함=`kpis` 미전달), 스키마=`schema.countKpis`(미포함=`hideKpis:true`). 금액 개념 자체가 없으면 `hideMetrics:true` 병행 | [[apfs-grid]] "KPI 배지 행" |
| 검색박스(인라인 N개 필터) | **주 필터 1개=툴바 `FilterChip`**(예: 심사단계, 전체 칩은 `심사단계: 전체` → [[apfs-grid]]) + 나머지=**상세필터 드로어(Sheet)**, 검색어는 **기본 OFF opt-in**(필요한 페이지만 `searchable`/`SEARCHABLE`로 켜고, 켜질 때만 최상단 — 자동 추가 금지), 컬럼 미연동 필터는 `· 데이터 연동 후 적용` 캡션 | [[apfs-detail-filter]] |
| 필수 조건(미선택 상태 없는 양식구분 등) · 긴 경로형 조건 | 툴바 칩 `filterChips` 에 `required: true`(`전체` 칩 없음) · 적용 칩 `appliedFilters` 에 `wide: true` | [[apfs-grid]] "필터 툴바" |
| 기간 기본값(전월 1일~오늘 등) · [필터 적용] 시 범위 검증 | 기본값 칩(× = 전 기간, [초기화] = 기본값) · 초안(draft) 드로어 | [[apfs-detail-filter]] "typed 페이지 트랙"의 '적용 방식 2가지'·'기본값으로 시작하는 기간' |
| 2단 헤더 그리드 + tfoot 합계 | AG Grid `ColGroupDef`(`marryChildren`) + `pinnedBottomRowData=useMemo([computeTotal(filteredRows)])` | [[apfs-aggrid]] |
| 셀 안 편집 + [저장] 일괄 반영(행추가·행삽입·행삭제 토글·이동) | 저장형 편집 그리드 — 행 상태 I/U/D, 저장 중 `inert` 잠금 | [[apfs-aggrid]] "페이지 편집 그리드 — 저장형 I/U/D" |
| 상세로 들어가는 셀(제목·문서번호·전표번호) | `LinkCell` + `onCellKeyDown` Enter 동치 | [[apfs-aggrid]] "셀 링크" |
| 행 다중선택(기본) | 모듈 상수 `ROW_SELECTION = {mode:'multiRow',checkboxes:true,headerCheckbox:false,selectAll:'filtered',enableClickSelection:false}`(선택은 **체크박스로만** — 행 본문 클릭 선택 없음, 2026-09-22) + `selectionColumnDef={SELECTION_COL}` + `getRowId` 안정 id. **단일 대상 액션은 `selCount===1` 게이트, 삭제는 게이트 필터형 벌크**(2026-09-23 사용자 결정 — 종전 라디오 단일선택은 폐기). ⚠ **선택이 액션(삭제·단계전이·행 편집)을 만들 때만** — 조회 전용이면 `rowSelection` 자체를 두지 않는다. 라디오는 master-detail 좌 그리드 예외뿐 | [[apfs-aggrid]] |
| 심사단계 셀 + 단계별 작업 버튼 + 전이 | **[[apfs-stage-workflow]]** (신규 패턴) | 이 조립표 |
| 편집 팝업(flat ≤ 25필드) | `kind:'form'` PageSchema + `RowFormModal`(단계별 제목은 `title` prop) | [[apfs-form-modal]] |
| 편집 팝업(섹션·반복행·첨부표) | 전용 섹션형 모달 — `SchemaField` 재사용 | [[apfs-form-modal]] "확장: 섹션형·반복행" |
| 다른 엔티티 1건 고르기(입력칸 옆 [검색] — 계정과목·거래처) | 공용 검색 팝업을 **import**(없으면 쓰는 범위의 루트에 신설), 고를 수 있는 범위는 호출부 `selectable` | [[apfs-form-modal]] "확장: 검색(선택) 팝업" |
| 한 화면 분량 입력(헤더 + 분개 그리드 + 첨부) · 같은 상세의 조회/삭제 버전 | 전체 화면 `Dialog` + `mode` 유니온(새 상세 화면을 만들지 않고 모드 추가) | [[apfs-form-modal]] "확장: 전체 화면 입력 다이얼로그" |
| 논리삭제 + 삭제이력 보기 | 삭제 = 목록에서 빼서 삭제이력 state 로 이동(최종수정자 = 삭제 처리자) · 툴바 보조 버튼 [삭제이력](`history` 아이콘, 등록 오른쪽·조회 왼쪽) → 조회 전용 팝업(행 선택 없음 · 엑셀 · 닫기) | 툴바 순서=[[apfs-grid]] "관리형 리스트 툴바·타이틀 규약" · 정본 `acc/baseinfo/account_delete_history_modal.tsx` |
| 사업연도/기준일자 | 드로어·모달 모두 **`PeriodPicker`**(`mode="year"` / `"day"`, `DrawerField plain`) — 연도 `<select>`·네이티브 date 금지 | [[apfs-datepicker]] "PeriodPicker" |
| 적용 필터 칩 | 항목별 개별 칩, **값만**(접두사 없음) + × aria-label에 항목명 | [[apfs-detail-filter]] "typed 페이지 트랙" |
| 신규 등록(1차 액션) | **툴바 독립 버튼** `Button variant="outline" size="sm" leadingIcon="plus"` — `toolbarRight`에서 **상세필터 오른쪽·새로고침 왼쪽**. **kebab 항목으로 넣지 않는다**(2026-09-11 사용자 결정으로 이전 "등록도 kebab 안" 규약을 뒤집음 — 진입 빈도 높은데 2클릭). 라벨은 도메인 액션명 그대로(`제안서접수 등록`), "등록"으로 축약 금지. 단축키 `⌘⏎`(`HOTKEYS.register`)는 유지되나 **화면 힌트는 없다**(Button이 Tooltip asChild 불가) | 툴바 순서=[[apfs-grid]] "관리형 리스트 툴바·타이틀 규약" · 모달=[[apfs-form-modal]] · 단축키=[[apfs-hotkeys]] |
| 서버 실행 버튼(모달 저장·업로드·삭제 확인·모달 내 조회·중복확인 / 선택 바 즉시 전이 `확정`) · 툴바 조회 | 실행 버튼은 **`UI.SaveButton`**(`busyLabel`로 "…중", 아이콘 없으면 `leadingIcon=""` → 텍스트 스왑만) · 툴바 조회는 `IconBtn icon="refresh" label="조회" onClick={refresh}`(클릭 회전 내장) | [[apfs-form-modal]] 6-1 · [[apfs-grid]] 툴바 |
| 파일 업로드(목업 `.uploadbox`·파일명 드롭존·업로드 폼) | 진입은 툴바, 본체는 **공용 `UploadModal`**(`trust_upload.tsx` — 파일명 드롭존 + [닫기]/[확인], `emptyMsg`·`doneMsg`는 원문 토스트 문구). **등록 액션이 있으면 등록 콤보 버튼 `[+ ○○ 등록 | ▾]`** — 본 버튼=등록, ▾ 메뉴 항목 `○○ 업로드`(정본 `trust_upload_forms.tsx` `RegisterCombo` — 계좌정보·입출금 관리. 내부 구현은 공용 `ui/split-button.tsx` `SplitButton` — 등록원부관리 `[등록원부입력 │ ▾ 등록원부업로드]` 도 같은 부품, [[apfs-grid]] 허용 combo ①). **등록 액션이 없으면 툴바 독립 `[업로드]`** 버튼(`variant="outline" size="sm" leadingIcon="upload"` — 실물자료·유가증권관리). **드롭존을 카드 본문(그리드 위 섹션)에 펼쳐 두지 않는다**(2026-09-24 사용자 결정). 모달·콤보를 새로 만들지 말고 재사용(콤보 트리거는 `UI.Button` 불가 — Radix asChild). 가드 테스트 `trust_pages_13.test.ts`. **예외 — 미리보기 그리드·추가 입력(계정구분 등)이 붙는 업로드**는 공용 `UploadModal` 로 못 담아 전용 모달로 만든다(정본 `acc/slip/journal_upload_modal.tsx`: 오류 행 배경 `--danger-soft` + 맨 끝 `오류 사유` 열(오류가 있을 때만) · Σ 합계 · 오류가 있으면 저장 중단). ⛔ **업로드 파일을 `XLSX.read` 로 파싱하지 않는다** — xlsx@0.18.5 파서 CVE(2026-10-28 사용자 결정). [엑셀업로드]는 데모 행으로 채우고 실제 파싱은 백엔드 연동 후로 미룬다. [양식다운로드]는 쓰기라 허용 | 드롭존 본체=[[apfs-form-modal]] `file` 규약(`UploadDropzone`→`DocumentsField`) |
| 엑셀 | SheetJS — 병합/리프 컬럼을 **columnDefs에서 자동 산출**(`flattenForExcel`). **진입=푸터 `FooterActions` 내보내기 아이콘**(툴바 독립 "엑셀" 버튼·kebab 항목 둘 다 금지 — kebab은 2026-09-17 폐기) + 단축키 `⌥D`(`HOTKEYS.export`) | [[apfs-aggrid]] · 툴바/푸터=[[apfs-grid]] · 단축키=[[apfs-hotkeys]] |
| 프레임 외관·푸터 | `--frame-bg`(테두리·그림자 없음), `sub` 미사용, 단위 캡션은 `toolbarRight`, 푸터 골드(건수·페이저·뷰 토글·아이콘) | [[apfs-grid]] "프레임 외관 규약" |
| 리스트 ↔ 카드뷰 | **폐기(2026-09-11 사용자 결정)** — 만들지 않는다. 푸터에 뷰 토글 `SegTabs`를 두지 않고, `view` state·카드 분기도 넣지 않는다(리스트 뷰 단일 표현) | — |
| 읽기전용 명세 팝업 | **opt-in(기본 미포함)** — 목업/사용자가 요구할 때만 포함. 포함 시 진입=`명세` 버튼 + 더블클릭(단위 토글·kv·재무요약). **미포함이면 selbar에 `명세` 버튼·`onRowDoubleClicked` 배선을 넣지 않는다**(자동 고정 금지) | **[[apfs-spec-popup]]** |
| 그리드 세부(폭·선택색·합계행·배지) | `AUTO_SIZE_CONTENT`+`maxWidth`, `wrapperBorder:false`, 합계 `--muted`+1px, 배지 `lg`(텍스트만, 점 없음) | [[apfs-aggrid]] "관리형 페이지 그리드 규약" |
| 색·대비 | 토큰만. 상태 텍스트는 `-text` 토큰(StatusBadge 내장) | [[color-tokens]] |

## 2. 목업에서 **버리는 것** (프로토타입 스캐폴딩 — 셸이 소유)
GNB/LNB 전환 토글(`.opts`) · 상단바/출처시스템 메뉴/서브탭/LNB(`.topbar .sysmenu .subtab .lnb`) · 설계 메모(`.note`). **이식 대상은 검색필드·목록바·그리드·팝업·워크플로우 JS(STAGE_ACT)뿐.**
  2026-09-24: 검토필요 마커(ReviewMarker·note 필드·*_NOTE)는 전부 삭제됐다. 목업의 `.review`/`.rpop` 은 이식하지 않는다(2026-09-12 '이식' 규약 폐기).

## 3. SOP
1. **읽기**: 목업 HTML 전체 + 형제 `*_spec.json`(필드·컬럼·codeRef 정본). 하단 `<script>`의 DATA/STAGE_ACT/팝업 row()가 실제 명세다. 화면설계서면 화면·그리드·상세필터 슬라이드 + 이벤트 슬라이드 전부(0-1절).
2. **분기**(0절). complex면 계속.
3. **파일·라우트**: 기존 페이지를 덮어쓰지 말고 **새 파일**(`<domain>_manage.tsx`, `export function XxxManage`). `app.tsx` route 분기만 교체(구 파일은 미라우팅으로 두고 삭제는 PR에서 사용자 결정). `data.ts` 리프 `path`가 이미 있으면 유지, `favRoute`=그 path.
   - 구현한 route 가 `sys/admin_menu_tree.ts` 의 `DEMO_UNUSED`(메뉴 관리 화면 '사용여부 부' 데모 3건 — 미구현 화면 route 로 채운다)에 있으면 **아직 미구현인 다른 route 로 바꿔** 3건을 유지한다(PR #365: `acct-closing-form` → `acct-depreciation`). 키가 어긋나 0건이 되면 `admin_menu_tree.test.ts` 가 실패한다.
4. **모달 스키마**: `<domain>_manage_schemas.ts`에 `kind:'form'` PageSchema들 + 공통코드 옵션 상수. **`schemas/index.ts ALL`에 등록 금지**(라우트 아님) — 대신 모듈 스코프 `parsePageSchema()`로 import 시점 zod 검증. `columns`·`provenance`는 zod 필수라 대표 컬럼만 선언.
5. **페이지 조립**(1절 표대로). 조립 시작 전 **HITL — KPI 배지 행 포함 여부(필수)**: `AskUserQuestion`으로 카드헤더 KPI 배지 행을 넣을지 묻는다(헤더="KPI 배지", 옵션 = **미포함(Recommended)** / 전체 건수만 / 전체+구분별 2지표, 후보 값은 목업 DATA·spec에서 채움). 답 반영 — typed 트랙: 포함이면 `kpis={<>…KpiBadge…</>}`, **미포함이면 `kpis`를 아예 넘기지 않는다**(GridFrame `{kpis && …}`로 영역째 사라짐). 규약은 [[apfs-grid]] "KPI 배지 행". 이어서 행 타입: **숫자 N/A는 `null`**(문자 `'-'` 금지) → `valueFormatter: p => p.value==null ? '-' : numFmt(p)`(공유 numFmt에 null 가드만, 재구현 금지). 텍스트 N/A는 `'-'`.
6. **새 단축키**(화면 전용 저장·행복사 등)는 `use-hotkey.ts` `HOTKEYS` 에 등록하고 [[apfs-hotkeys]] 레지스트리 표에 행을 더한다(PR #368 ⌥S·⌥K·⌥Z·⌥C). 전역 키(⌥R 조회·⌥A 전체보기)와 겹치면 바인딩하지 않고 PR 에 사유를 적는다.
7. **기능설명서 원고**: `scripts/uiux-doc/screens_data.py` `SCREENS` 에 route 항목(`sid`·`file`·`summary`·`layout`·`features`·`popups`)을 추가하고 `python3 scripts/uiux-doc/gen_doc.py` 로 `docs/UIUX_기능설명서.html` 을 재생성한다(HTML 직접 수정 금지 — CLAUDE.md). 구현된 메뉴 리프에 원고가 없으면 생성기가 `원고 누락: …` 을 찍고 **exit 1** 로 실패한다 — 2026-10-30 실측: PR #364·#368·#369·#370 이 이 단계를 빠뜨려 회계 4화면(`acct-account-code`·`acct-journal`·`acct-deleted-journal`·`acct-suspense`) 원고 누락으로 main 에서 재생성이 실패한다. 형식 예시는 같은 파일의 `acct-closing-form`(PR #365 — 유일하게 원고를 넣은 회계 화면).
8. **검증**: `npm run build` + `npm test` + `npm run lint` + `python3 scripts/uiux-doc/gen_doc.py`(exit 0) + **ego-browser 런타임**(4절). Codex 리뷰 후 커밋.

## 4. 런타임 검증 체크리스트 (빌드 green ≠ 동작)
```js
// ego-browser nodejs — 진입은 해시 URL 로 한다.
// app.tsx hashRoute() 가 localStorage apfs.route 보다 우선이라 setItem('apfs.route')+reload 는
// URL 에 해시가 이미 있으면 무시된다(2026-10-26 실측: #/designsystem 으로 되돌아가 0행)
await page.goto('http://localhost:<port>/#/<path>');
await page.waitForSelector('.ag-center-cols-container .ag-row');
```
- [ ] `.ag-center-cols-container .ag-row` 수 = 더미 행 수(빈 그리드 아님)
- [ ] `.ag-floating-bottom .ag-row` 존재 + `getComputedStyle(...).opacity==='1'`(aggrid_shared.css import 누락 시 0)
- [ ] 2단 헤더: **컬럼 가상화**로 뷰포트 밖 그룹헤더는 DOM에 없다 → `scrollLeft` 후 `.ag-header-group-cell` 재질의
- [ ] 선택: **체크박스로만 on/off**(2026-09-22 결정, [[apfs-aggrid]] "체크박스" 절) — 본문 `.ag-cell` 클릭 → `.ag-row-selected` **0 유지** / 행 체크박스 `.ag-pinned-left-cols-container .ag-row[row-index="0"] button[role="checkbox"]` 클릭 → 1 + 그 단계 툴바 액션 노출(자펀드 관리 '신청' 행 = `선정조합 등록`·`신청취소`·`선택 해제`) → 다시 클릭 → 0. 숨은 내장 `input[type=checkbox]`(0×0)를 겨냥하지 않게 클릭 전 rect>0 확인, 선택 수는 `new Set(row-id)` 로 센다(2026-10-26 실측)
- [ ] 전이 1회 이상 실제 실행(배지·토스트·액션 재계산·합계 재계산)
- [ ] 모달 저장/실행: **필수값을 채운 상태에서** 클릭 → 라벨이 "…중"으로 스왑(`.t-text-swap` 존재, `aria-busy=true`)→ 400ms 후 commit. 빈 폼은 검증에서 막혀 스왑이 없는 게 정상. 버튼 찾기는 `textContent.trim()===라벨`(측정 글자는 `::before`라 섞이지 않음)
- [ ] 툴바 조회 클릭 → 아이콘 `style.transform`이 `rotate(360deg)`로 증가
- [ ] 섹션형 모달 열림 + `getComputedStyle(select).fontSize==='14px'`
- [ ] 라이트/다크 스크린샷(`page.screenshot({ path: '<절대경로>' })` — ego-browser 스크립트는 셸 cwd에서 돌지 않는다) · 콘솔/페이지 에러 0

## 5. 함정 (골드에서 실제로 맞닥뜨린 것)
- `RowFormModal` 제목은 mode 고정 → 단계별 제목은 **`title` prop**(2026-09-08 추가).
- `pinnedBottomRowData`에 인라인 배열 금지 — 전이/등록으로 행이 변하므로 `useMemo([computeTotal(filteredRows)],[filteredRows])`.
- `onPaginationChanged`는 값 비교 가드로 setState(매 호출 새 객체=렌더 루프, →[[aggrid-onpaginationchanged-render-loop]]).
- AG Grid `cellStyle` 상수는 `CellStyle` 타입(React `CSSProperties` 아님 — 인덱스 시그니처 불일치).
- 신규 등록 후 `setSelId(newId)`로 선택을 새 행에 두면 다음 단계 액션이 즉시 보인다 — 단 그리드 라디오는 `onRowDataUpdated`에서 따로 맞춰야 한다(→[[apfs-stage-workflow]] 규약 9).
- selbar에 **대상명(조합명)·취소 안내 캡션을 넣지 않는다**(2026-09-08 제거). 카드헤더 `sub` 설명 캡션도 넣지 않는다.
- 세분화 스킬 색인(2026-09-08): 프레임 외관 [[apfs-grid]] · 그리드 세부 [[apfs-aggrid]] · 칩/드로어 [[apfs-detail-filter]] · 컨트롤 폭 [[apfs-form-modal]] 계약7 · 기간 선택 [[apfs-datepicker]] · 명세 팝업 [[apfs-spec-popup]] · 선택 SSOT [[apfs-stage-workflow]] 규약 9.

## 검증
`npm run build`(exit 0) · `npm test` · 4절 런타임 체크 · [[responsive-ui]] 1280/768/400 · [[web-a11y]](라디오 접근名·다이얼로그 트랩은 AG Grid/Radix 내장).

## 참조
[[apfs-grid]] · [[apfs-aggrid]] · [[apfs-form-modal]] · [[apfs-detail-filter]] · [[apfs-datepicker]] · [[apfs-stage-workflow]] · [[apfs-capture-schema]] · [[color-tokens]] · [[dashboard-ui]]
