# P2 — 조합원정보등록  (S1_15)
출처: `/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_15_조합원정보등록.html`
메뉴 리프 라벨 `조합원정보등록` · path `member-info` · crumbs `['홈','투자자산관리','자펀드 관리','조합원정보등록']`
산출 파일: `src/dash/member_info_manage.tsx`(`export function MemberInfoManage`, `export interface MemberRow`), `src/dash/member_info_form_modal.tsx`(`export function MemberInfoFormModal`), `src/dash/member_info_detail_modal.tsx`(`export function MemberInfoDetailModal`)
트랙: typed **단건 CRUD**(report_form_manage 골드 그대로) + 커스텀 등록/수정 모달 + 읽기전용 상세조회 팝업(단위 토글·엑셀).

## 데이터 (목업 1행 그대로)
```ts
export interface MemberRow { id:string; no:number; name:string; biz:string; addr:string; tel:string; memo:string; ptype:'개인'|'법인'; region:'국내'|'해외'; mf:string; }
DEMO = [{ id:'mi-1', no:1, name:'마그나인베스트먼트(주)', biz:'120-87-54252', addr:'서울 강남구 테헤란로98길 15 대치동, 송강빌딩 14층', tel:'', memo:'', ptype:'법인', region:'국내', mf:'농식품모태펀드' }]
```
## 컬럼 (목업 순서) — `FIT_GRID_WIDTH`, 주소가 잉여 흡수(maxWidth 없음)
NO(pinned, 68) · 조합원(MT, 200/max 320) · 사업자번호/주민번호(MT — pii) · 주소(MT, minWidth 280) · 전화번호(빈값→muted '-') · 비고(빈값→'-') · 상세조회(액션 컬럼 `colId:'detail'`, `sortable:false`, `Button outline sm` "상세조회" + sr-only 조합원명 → 상세 팝업).
행 선택 UI 없음(2026-09-12 단건 CRUD 규약): 수정 = 더블클릭·셀 Enter(상세조회 셀 Enter는 상세 팝업)·우클릭 메뉴, 삭제 = 우클릭 메뉴 → AlertDialog(`조합원 삭제` / `<b><MT>{name}</MT></b> 조합원 정보를 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.`) 또는 수정 모달 2단계 삭제. 등록 = `RegisterCombo label="조합원정보 등록"` + ⌘⏎.

## 검색박스 → 드로어: 모펀드 1항목만(`DrawerSelect ['농식품모태펀드','MOAF']`, **noop**). 툴바 좌: `Icon filter` + 캡션 `조합원 {mn(N)}건`(report_form_manage 동형, 주 필터 칩 없음). 검색어 OFF.

## 등록/수정 모달 (커스텀 — `member_info_form_modal.tsx`)  ⚠ RowFormModal로는 중복확인 버튼·자동 하이픈·라벨 전환을 못 해 별도 구현
`MemberInfoFormModal({ mode:'create'|'edit', initial?: MemberRow, onSave:(patch: Omit<MemberRow,'id'|'no'>)=>void, onClose, onDelete? })`. Dialog `max-w-[880px]`(항목 8 > 6 → 2단 `grid grid-cols-1 sm:grid-cols-2 gap-x-5`), 헤더 제목 `조합원정보 등록`/`조합원정보 수정`, 본문 `p-[46px]`, 필드는 `SchemaField`(ad-hoc FieldSpec) + RowFormModal `Field` 규격 복제(라벨 12px caption·`mb-3.5`·radio는 plain div). 순서(목업 row 순):
1. 모펀드 — select `['농식품모태펀드','MOAF']`
2. 조합원명 * — text (required)
3. 개인/법인 — radio `['개인','법인']`
4. 국내/해외 — radio `['국내','해외']`
5. 사업자번호/주민번호 * — **create**: `<input type="text" inputMode="numeric">`(SchemaField `base`와 같은 34px 스타일을 로컬 복제) + 옆에 `Button outline sm` **중복확인**(클릭 → `toast('사용 가능한 번호입니다 (목업)')`), 입력마다 자동 하이픈: 개인=13자리 `000000-0000000`, 법인=10자리 `000-00-00000`(목업 `maskBiz` 로직 그대로, placeholder도 동일), 개인/법인 전환 시 재포맷. **edit**: 라벨이 ptype에 따라 `사업자번호`(법인)/`주민번호`(개인)로 바뀌고(radio 변경 시 즉시), 라벨 옆 `<ReviewMarker rec="수정 시 식별자로 잠금(중복확인은 등록 시)" dat="PK 지정 원문 미확인 — 표준 §2.2 적용" label="사업자번호/주민번호" />`, 컨트롤은 readonly 박스(SchemaField readonly 스타일) + `🔒 수정불가` 캡션(텍스트 `수정불가`, 자물쇠는 `Icon`이 없으면 텍스트만).
6. 주소 — text, `sm:col-span-2`
7. 전화번호 — text
8. 비고 — textarea, `sm:col-span-2`
필수 미입력 시 해당 필드 `errMsg`(RowFormModal 동형) + 저장 차단. 푸터 `px-[46px]`: 좌 삭제(edit·onDelete 있을 때 ghost→`삭제 확인` 2단계), 우 `닫기`(outline)·`저장`(primary). 저장 → `onSave(patch)` + toast `등록되었습니다 (목업)`/`수정되었습니다 (목업)`.

## 상세조회 팝업 (`member_info_detail_modal.tsx`, S1_16 흡수) — 상세조회 버튼 / 상세조회 셀 Enter / 우클릭 메뉴 항목
Dialog `max-w-[1020px] max-h-[88vh]`, 제목 `조합원정보 상세조회` + 대상명 `<MT>{row.name}</MT>`. 본문:
1. Section **조합원 정보** KvGrid(2열): 운용사 `인라이트벤처스(주)` · 자펀드 `인라이트 애그테크클러스터펀드 2호`(full) · 계정구분 `StatusBadge info '농식품'` · 조합원 **`row.name`** · 조합원구분 `StatusBadge(neutral: tone 'info' 대신 muted 텍스트 배지가 없으므로 `tone="primary"` 아님 — `<span>`에 `bg-muted text-muted-foreground` 칩) 'LP'` · 조합원유형 **`row.ptype`** · 조합원약정금액 `money(100_000_000, unit)`. (운용사·자펀드·계정구분·구분·약정금액은 목업 S1_16 실데이터 그대로 — 행과 연결된 값이 아님을 주석으로 명시. 조합원명·유형만 행 값.)
2. Section **거래내역** + 우측 `UnitSeg`(원/백만원/억원, 기본 **원**) — 표(overflow-x-auto, minWidth 1180): 거래구분(StatusBadge info '출자')·상세구분·거래일자(mn)·납입금액·원금배분액·수익배분액·우선손실 충당액·기타배분액(이자 등)·원천징수세액·실 배분액·보유잔액. 행 2개: `출자/설립출자/2022-09-30/50,000,000/-/-/-/-/-/-/50,000,000`, `출자/추가출자/2023-11-17/50,000,000/-…/100,000,000`. tfoot `소계`(bg-muted 약간) 100,000,000 · 나머지 0, `합계` 동일. 금액은 `money(won, unit)`(subfund_spec_modal `money` 복사: 원=fmt, 백만/억=소수 2자리, `mn` 내장, null='-').
푸터 `px-[46px]`: `닫기`(outline) · `엑셀`(outline, download 아이콘) → SheetJS: kv 7행 + 빈 줄 + 거래내역 헤더/2행/소계/합계(원 단위 숫자), **마스크 게이트**, 파일명 `조합원정보_상세조회.xlsx`, toast.

## 엑셀(목록): NO·조합원·사업자번호/주민번호·주소·전화번호·비고 (상세조회 액션 컬럼 제외). 마스크 게이트.
## ⚠검토필요 마커 1건: 수정 모달 식별번호 라벨(위 5번). 목업 검색박스·헤더엔 없음.
## 한계 주석: 상세조회 팝업 데이터는 S1_16 실데이터 재사용(행 연결 아님) · 중복확인은 toast 목업 · 단위 토글은 상세조회 팝업에만(목록은 CRUD라 미적용, 목업 설계메모)
