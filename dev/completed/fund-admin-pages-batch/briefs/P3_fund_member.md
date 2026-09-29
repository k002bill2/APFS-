# P3 — 자펀드별조합원관리  (S1_18)
출처: `/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_18_자펀드별조합원관리.html`
메뉴 리프 라벨 `자펀드별조합원관리` · path `fund-member` · crumbs `['홈','투자자산관리','자펀드 관리','자펀드별조합원관리']`
산출 파일: `src/dash/fund_member_manage.tsx`(`export function FundMemberManage`), `src/dash/fund_member_manage_schemas.ts`(`CREATE_SCHEMA`, `EDIT_SCHEMA`, `CLS_OPTS`, `TYPE_OPTS`)
트랙: typed 단건 CRUD(report_form_manage 골드) + pinned 합계행 + 상세필터. 단일 헤더 13컬럼.

## 데이터 (목업 FUND + DATA 6행 값 그대로)
```ts
const FUND = { gp:'KB증권(주)', fn:'현대동양농식품사모투자전문회사', acc:'농식품', rd:'2011-04-04', formed:32_000_000_000 };
export interface FundMemberRow { id:string; no:number; gp:string; fn:string; acc:'농식품'|'수산'; rd:string; formed:number;
  mem:string; cls:'GP'|'LP'|'SP'; mtype:string; c1:number; c2:number; memo:string; deal:'Y'|'N'; }
// 6행: 농식품모태펀드 SP 모태펀드 15.7e9/15.7e9 '-' Y · KB증권(주) GP 증권사 8.15e9/8.15e9 '구.현대증권' Y · 유안타인베스트먼트 GP 창투사 3.15e9/3.15e9 '구.동양인베스트먼트' Y
//     · 농협은행 LP 은행 0/2e9 '-' Y · 농협중앙회 LP 은행 2e9/0 '-' Y · 동양생명보험 LP 보험사 3e9/3e9 '-' Y   (정확한 숫자는 목업 DATA에서 옮길 것)
CLS_OPTS=['GP','LP','SP']; TYPE_OPTS=['창투사','신기술사','모태펀드','지자체','은행','보험사','증권사','공공기관','일반법인','개인','유한책임회사','기타금융기관','법인 아닌 단체'];
```
## 컬럼 (목업 순서, 단일 헤더) — `AUTO_SIZE_CONTENT`
No(pinned 68) · 운용사(MT) · 자펀드(MT, maxWidth 300) · 계정구분(center MT) · 등록일(mn) · 결성액(amt) · 조합원(MT, font-semibold) · 조합원구분(center 텍스트) · 조합원유형(StatusBadge: 모태펀드=`primary`, 그 외=회색 칩 `bg-muted text-muted-foreground` 인라인 span 13px bold — 목업 `.tag.n`) · 최초 출자약정액(amt strong) · 최종 출자약정액(amt strong) · 비고('-'는 muted) · 출자배분 거래유무(center).
pinned 합계행(`useMemo`): No `'합 계'`, 최초/최종 출자약정액 합, 나머지 null/빈값(목업 tfoot colspan 9 '합계' + 2합 + '-').

## 검색박스 → 필터 (목업 순서)
1. 모펀드 — noop select
2. 운용사 — `DrawerSelect`(행 파생: KB증권(주)만) + 마커 `note={{ rec:'실 운용사(GP) 목록 연동', dat:"실데이터 'KB증권' 1건만 관측 · 그 외 옵션 예시" }}` — passes(gp). 목업의 IMM/한투 예시 옵션은 **넣지 않는다**(옵션 창작 금지).
3. 자펀드 — 행 파생 — passes(fn)
4. 계정구분 — **툴바 주 필터 FilterChip**(전체·농식품·수산; 드로어 select와 state 공유) — passes(acc). 목업 기본 선택 '농식품'은 적용하지 않음(전체).
검색어 OFF. 적용 칩 운용사·자펀드(MT). 툴바 우측: `단위: 원` · 상세필터 · `RegisterCombo label="조합원 등록"` · 새로고침.

## CRUD (단건 CRUD 규약 — 행 선택 UI 없음)
- 등록 → `RowFormModal mode="create" schema={CREATE_SCHEMA} title="조합원 등록"` initial `{ fn: FUND.fn }`(readonly 시드). 저장: `{ id: crypto.randomUUID(), no: max+1, ...FUND, mem, cls, mtype, c1:Number, c2:c1(최종=최초로 시드 — 주석), memo:''→'-', deal:'N' }` 선두가 아닌 **말미 추가**(목업 no 순), toast `등록되었습니다 (목업)`.
- 수정(더블클릭·셀 Enter·우클릭) → `RowFormModal mode="edit" schema={EDIT_SCHEMA} title="조합원 수정"` initial=행. 저장: mtype·cls·c1·memo 갱신, toast `수정되었습니다 (목업)`.
- 삭제(우클릭 메뉴 / 수정 모달 2단계) → AlertDialog `조합원 삭제` / `<b><MT>{mem}</MT></b> 조합원을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.` → 행 제거(no 재번호 없음), 합계 재계산.
### 스키마 (fund_member_manage_schemas.ts, parsePageSchema, provenance captureFile 'S1_18_자펀드별조합원관리.html')
CREATE_SCHEMA.fields(목업 팝업 순): 자펀드(readonly) · 조합원(**text**, required, `note:{ rec:'조합원 원장(마스터)에서 선택', dat:'옵션 목록 미확인 — 샘플값 생성 안 함' }` — 목업은 옵션 없는 select라 빈 select 금지 규약으로 text 격하, 주석) · 조합원유형(select TYPE_OPTS, required) · 조합원구분(select CLS_OPTS, required) · 최초출자약정액(원)(number, required) · 비고(text).
EDIT_SCHEMA: 조합원만 readonly, 나머지 동일(마커 없음). 6필드 → 460px 1단.

## 엑셀: 13컬럼 단일 헤더 + 합계행, 마스크 게이트.
## ⚠검토필요 마커 2건 전수: 운용사(드로어) · 조합원(등록 모달 라벨, FieldSpec.note)
## 한계 주석: 조합원 마스터 미연동(text 입력) · 최종출자약정액·출자배분거래유무는 팝업 입력 항목 아님(실 캡처) · 계정구분 기본 '농식품' 미적용
