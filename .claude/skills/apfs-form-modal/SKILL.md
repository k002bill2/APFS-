---
name: apfs-form-modal
description: APFS 리스트 페이지의 등록/수정/삭제 CRUD 모달(RowFormModal) 작성 규약 — PageSchema.fields 주도, 항목>6이면 2단 wide 자동 적응, FIELD_CONTROLS(zod SSOT) 컨트롤, 긴 텍스트(설명·비고·운용사·펀드명)는 long:true 로 전체 폭, '여/부' on/off 값은 control:'switch'(DS Switch), 배타 선택은 radio(DS RadioGroup), 복수 선택·매트릭스는 DS Checkbox, 모달 기본 폰트 13.5px·토큰만. 정본 예시는 "투자기업정보(통합)"(schemas/투자기업정보_통합.ts). 섹션형·반복행 모달(subfund_form_modal)과 읽기전용 명세 kv 그리드의 라벨 배열 규약(한글=가로 라벨좌/값우, 영문=세로 적층)도 포함. 등록 폼·수정 모달·폼 모달·RowFormModal·필드 컨트롤·radio/switch/select/textarea 입력·입력칸이 짧게 나올 때·사용여부 토글·모달 폰트 크기·삭제 확인·명세 팝업·kv 라벨 배열 작업 시 사용. Use when building or editing the schema-driven CRUD form modal (register/edit/delete) for list pages.
---

# apfs-form-modal Skill

## 컨텍스트
리스트 페이지의 **신규 등록 / 수정 / 삭제(2단계 확인)** 모달은 손으로 폼을 짜지 않는다. `RowFormModal`이 **`PageSchema.fields`를 받아 폼을 자동 생성**한다(Radix Dialog — focus trap·Escape·aria-modal·포커스 복귀 내장). "필드는 스키마가 정하고, 모달은 렌더만 한다."

- **정본 컴포넌트**: `src/dash/generic_list_modal.tsx`(`RowFormModal`).
- **정본 예시(골드 레퍼런스)**: `src/dash/schemas/투자기업정보_통합.ts` — 21필드(readonly·radio·select·textarea·date·number·checkbox·text 혼합)라 2단 wide로 렌더되는 완성형.
- **지원 SSOT**: `schemas/types.ts`(`FIELD_CONTROLS`+zod), `schemas/renderers.tsx`(`SchemaField` 컨트롤 렌더), `schemas/build_row.ts`(vals→Row 조립).

## 모달 크롬 공통 규약 (헤더·본문 섹션 헤더) — 전 모달 SSOT
모든 다이얼로그(등록/수정 폼·명세 팝업·알림센터·즐겨찾기·에디터 삽입 등)의 **제목/본문 섹션 제목 타이포는 여기 정본을 따른다.** 소비처마다 크기·굵기를 다시 지정하지 않는다. 골드 레퍼런스는 `subfund_spec_modal.tsx`(자펀드 명세)와 `subfund_form_modal.tsx`(결성조합 수정).

1. **모달 헤더 = `DialogTitle` 공용 기본값(`src/dash/ui/dialog.tsx`).** 기본이 **`text-xl`(20px) `font-bold`** — **2026-09-09 사용자 결정으로 프리미티브 기본값을 `text-base`(16)→`text-xl`로 올려 전 모달을 통일했다. 이전 "소비처에서 `text-xl` override·공용 `ui/dialog.tsx`는 불변" 규칙은 폐기.** 소비처에서 `fontSize`·`font-extrabold` 등으로 **크기·굵기를 재지정하지 말 것**(드리프트 원인). 크기 예외가 정말 필요하면 그 한 곳만 로컬 override(예: 에디터 삽입 다이얼로그).
2. **부제(대상명)가 있으면 제목 옆에 나란히.** `DialogHeader`가 `justify-between`이라 그냥 두면 부제가 우측 끝으로 밀린다 → 제목+부제를 한 래퍼로 묶는다:
   ```tsx
   <DialogHeader className="px-[46px]">
     <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
       <DialogTitle className="shrink-0">자펀드 명세</DialogTitle>
       <DialogDescription className="text-caption truncate min-w-0"><MT>{대상명}</MT></DialogDescription>
     </div>
   </DialogHeader>
   ```
   `pr-8`은 우상단 X 닫기 버튼 공간 확보. 헤더 아이콘은 `size={18}`(20px 제목에 맞춤).
5. **본문 `p-[46px]` 패밀리는 헤더·푸터도 `px-[46px]`로 인셋 정렬(2026-09-11 PR #132).** 본문을 `p-[46px]`로 넓게 인셋하는 모달(`RowFormModal`·`subfund_form_modal`·`subfund_spec_modal`·`FsDetailModal`)은 `DialogHeader`·`DialogFooter`에 `className="px-[46px]"`를 얹어 제목·버튼을 본문 좌우 기준선에 맞춘다(위 예제처럼). `RowFormModal`의 `docErr` 경고 배너도 `px-[18px]`→`px-[46px]`. ⚠ **공용 `ui/dialog.tsx` 기본은 `px-[18px]` 유지** — alert/command/셸 등 좁은 다이얼로그가 46px로 역드리프트하지 않게 한다. `cn`=twMerge라 소비처 className이 기본 패딩을 외과적으로 덮는다. 실측 좌우 기준선 447/1233. 관련 메모리 [[modal-46px-family-header-footer-inset]](이 절이 정본).
3. **본문 섹션 헤더** — 모달 안 구획 제목은 아래 className 고정(밑줄형 헤딩). spec은 `<h3>`(`Section` 헬퍼), form은 `<fieldset>` 안 `<legend>`(폼 그룹 시맨틱 유지) — **태그는 문맥에 맞게, 시각 스타일은 동일**:
   ```
   flex items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mb-3
   ```
   (form의 `<legend>`는 `w-full`을 앞에 붙여 밑줄이 폭 전체를 덮게 한다.)
4. **타이포 위계**: 모달 제목 `text-xl`(20) > 본문 섹션 제목 `text-lg`(18)·`font-bold` > 본문/입력 **13.5**(2026-09-15 하향, 종전 14) > 라벨·부제 12~13. ⚠ `preflight:false`+body base 폰트 없음이라 **bare heading은 UA 기본(h3≈18.7px)으로 튄다** → 인라인 `style={{fontSize}}` magic number 금지, Tailwind `text-*` 유틸로만 고정.
6. **푸터 저장 버튼 = `UI.SaveButton` (2026-09-18).** 디자인시스템 "Button 상태"의 loading(저장 중·스피너·`aria-busy`)을 모달마다 배선하지 않고 **자동 적용**한다. `<Button leadingIcon="check" onClick={submit}>저장</Button>`을 직접 쓰지 말 것. 계약: **`submit`은 검증 실패 시 `return;`(undefined → 스피너 없이 즉시 오류), 성공 시 commit 함수를 반환**한다. commit 안에 `onSave(...)`와 뒤따르는 `toast`를 모두 넣는다.
   ```tsx
   const submit = () => {
     if (!v.name.trim()) { setErrKey('name'); return; }        // 검증 실패 → undefined
     return () => { onSave({ ... }); toast.success('저장되었습니다 (목업)'); };   // 성공 → commit 함수
   };
   <DialogFooter className="px-[46px]">…<SaveButton onSubmit={submit} /></DialogFooter>
   ```
   동작: 클릭 → 검증 → "저장 중"(`SAVE_DEMO_MS`=400ms, `components.tsx` 상수 하나로 조절) → commit. 백엔드가 없어 저장이 동기라 지연은 데모용 흉내다. loading 중 `disabled`를 주지 않는다(포커스 유지 — `UI.Button` 규약). **저장 중에는 다이얼로그 닫기가 잠긴다**(`useDialogLock` — 취소·X·Esc 무시, 본문 `aria-busy`+pointer 차단). 사용자가 누른 저장은 유실되지 않는다. ⚠ 처음 시도한 "닫기 시작 시 commit 폐기"는 exit 애니메이션(≈280ms)과 400ms 지연이 경합해 취소해도 저장되는 실측 결함 + 무음 유실 UX라 폐기했다. ⚠ **submit이 성공 경로에서 closure 반환을 잊으면 무음 no-op**(타입으로 못 잡음) → 검증 항목: 저장 클릭 시 스피너가 떠야 한다. 적용처: 폼 모달 10종(`generic_list_modal`·`user_form_modal`·`user_permission_modal`·`member_info_form_modal`·`custody_verify_memo_modal`·`menu_form_modal`·`program_help_modal`·`subfund_form_modal`·`apfs_contribution_tx_modal`의 Dist/Invest) + 디자인시스템 3-2-1 라이브 데모. 전수 조사는 `grep -rn ">저장</Button>" src/dash`(leadingIcon 유무 무관).

## 핵심 계약 (CRITICAL)
1. **새 컨트롤은 `FIELD_CONTROLS`(types.ts)에 먼저 추가.** 컨트롤 종류는 `FIELD_CONTROLS` 배열이 **타입+zod enum을 동시 공급(SSOT)**. 배열에 없는 control을 스키마에 쓰면 `PageSchemaZ.parse`가 실패해 **스키마 테스트·빌드가 깨진다**. 추가 순서: ① `FIELD_CONTROLS`에 문자열 추가 → ② `SchemaField`(renderers.tsx)에 `case` 추가 → ③ 스키마에서 사용.
2. **2단 적응은 자동.** `RowFormModal`이 `schema.fields.length > 6`이면 `max-w-[880px]` + `grid grid-cols-1 sm:grid-cols-2`(좁은 화면은 1단 적층)로, 6개 이하면 `max-w-[460px]` 단일 컬럼으로 **자동 렌더**. 호출자가 폭을 지정하지 않는다.
3. **`textarea`/`file`, 그리고 `long: true` 필드는 전체 폭.** 2단 모드에서 이 셋은 `sm:col-span-2`로 한 줄 전체를 차지한다(긴 입력 잘림 방지) — `RowFormModal`이 자동 처리.
   - **`long: true` = 긴 텍스트 필드 표식(2026-09-15 사용자 결정).** **설명·비고·운용사(명)·자펀드/조합명/펀드명·기업명/투자기업·주소·제목·사업내용** 류는 `FieldSpec`에 `long: true`를 단다. 그러면 ① `RowFormModal`이 `sm:col-span-2`(한 줄 전체) ② `SchemaField`가 `fill`을 자동 ON(→ `width:100% minWidth:0`)한다.
   - ⚠️ **`span2`만으로는 안 늘어난다 — 컨트롤 폭이 진범.** 셀을 2단으로 넓혀도 `base`의 `width:'fit-content' minWidth:240`(규칙 7)이 입력을 240px에 묶는다. 권한관리 모달 '설명'이 이미 `sm:col-span-2`인데도 짧게 보이던 원인이 이것 → 반드시 **`long`(=fill)** 로 폭까지 함께 푼다.
   - ⚠️ **전용(bespoke) 모달은 `span2` 가 자동이 아니다.** `RowFormModal` 밖에서 `SchemaField` 를 직접 부르는 모달(`user_permission_modal`·`member_info_form_modal` 등)은 `long` 이 폭(`fill`)만 켜준다 — 한 줄 전체를 쓰려면 래퍼 `<Field className="sm:col-span-2">` 를 **직접** 붙인다.
   - 짧은 코드·일자·금액·구분값에는 달지 않는다(`long`을 남발하면 2단 그리드가 1단으로 무너진다).
4. **seed 기본값.** 초기값은 `initial`(수정) 또는 빈 문자열(등록). 단 **`select`·`radio`·`switch`는 첫 옵션**(`f.options?.[0]`)을 기본값으로 시드한다. ⚠ `switch`를 시드 목록에서 빠뜨리면 등록 모드가 `''`를 저장해 그리드 배지가 빈칸으로 렌더된다.
   - ⚠️ **등록 모드에 부분 프리필 `initial` 이 오는 화면 주의(2026-09-15 실측).** 워크플로우형 화면은 `mode="create"` 에도 선택 행에서 온 `initial`(운용사·자펀드만 채워짐)을 넘긴다 — 그러면 나머지 키가 `''` 로 시드되는데 **`switch` 는 off/on 둘로만 그려져 빈 값이 '아니오'로 위장**한다(radio 는 미선택이 눈에 보였다). `RowFormModal` 이 **create 모드에서 값이 비면 옵션형을 첫 옵션으로 되메운다**. edit 모드는 저장된 `''` 를 보존한다(무단 변경 금지) — 그 경우 switch 표시가 실제 값보다 단정적일 수 있음을 감안할 것.
5. **모달 기본 폰트 13.5px(2026-09-15 사용자 결정 — 종전 14px에서 하향).** 두 곳이 짝이다: ① `ui/dialog.tsx` `DialogContent`의 `text-[13.5px]`(모달 본문 상속 기본값) ② `renderers.tsx` `base`의 `fontSize: 13.5`(폼 컨트롤·radio 라벨·switch 상태 텍스트). 16px 아님(→[[responsive-ui]]). 색·테두리·배경은 토큰만(→[[color-tokens]]).
   - 자체 `fontSize`를 가진 자식(모달 제목 `text-xl`·섹션 `text-lg`·라벨 12)은 상속을 이기므로 위계(규칙 4 타이포)는 그대로다.
   - **높이 34px 규격은 `renderers.tsx`의 `CONTROL_BOX` 가 SSOT** — `base`가 이를 스프레드하고, 상세필터 드로어(`drawerInputStyle`)도 같은 상수를 쓴다(2026-09-17 통합). 모달과 드로어 높이를 따로 만지지 말 것: 한 곳만 바꾸면 양쪽이 같이 움직인다(→[[apfs-detail-filter]]).
   - ⚠ **입력 옆 동거 버튼(프로그램 검색·중복확인·해제)은 `UI.Button size="sm"` 자연 높이(실측 29px) 그대로 둔다 — 2026-09-21 사용자 원복 결정.** 34px 컨트롤에 맞추는 `CONTROL_BTN` 공용 스타일을 도입했다가(PR #219) 사용자가 화면을 보고 "버튼을 원복하자"로 되돌렸다(revert PR). 입력과 버튼의 5px 높이 차는 의도된 상태이므로 **다시 맞추자고 제안하지 말 것**(규칙 8 안티패턴과 같은 성격). 기존 선례인 주소 검색(`CONTROL_BOX.height`)·결성조합 파일 선택(`height: 34`)은 원복 대상이 아니라 그대로다.
   - ⚠️ **단축 속성 `font` 금지 — 패밀리는 `fontFamily`(longhand)로만 상속.** `base`에서 `fontSize: 14` **뒤에** `font: 'inherit'`를 쓰면 안 된다. `font`은 `font-style/variant/weight/`**`size`**`/line-height/family`를 한꺼번에 지정하는 shorthand라, 인라인 스타일이 키 순서대로 적용되며 **뒤에 온 `font:'inherit'`가 앞의 `fontSize:14`를 부모 상속값(모달=16px)으로 되돌린다** → 네이티브 `select/input`이 16px로 렌더(라벨 14px보다 큼). 패밀리(Pretendard)만 상속하려면 **`fontFamily: 'inherit'`**(longhand)를 써서 `fontSize:14`를 보존하라. 검증: 모달 열고 `getComputedStyle(select).fontSize === '14px'`.
6. **필수값·삭제.** 필수는 `field.required`(미입력 시 첫 누락 필드에 인라인 에러). 삭제는 edit 모드에서 ghost→`삭제 확인`(danger) 2단계.
7. **컨트롤 폭 = fit-content + 타입별 minWidth(2026-09-09 사용자 확정, 이전 일률 220 폐기).** `renderers.tsx` `base`가 `width:'fit-content', minWidth:minW, maxWidth:'100%'` — 셀을 꽉 채우지 않고, 하한만 타입별로 차등. `minW`는 필드 위에서 `field.control`로 분기: **date 120**(짧은 고정포맷 YYYY-MM-DD) · **select 130**(이름만이면 fit-content로 더 좁아짐) · **number 180**(금액 자리수) · **text/기본 240**(GP명·조합명 등 명칭은 길게). **`textarea` 와 `long:true` 필드만 `width:'100%'`**(긴 입력 — `long` 은 `SchemaField` 안에서 `fill` 을 자동 ON 해 같은 경로를 탄다), `date`는 `DatePicker` 트리거가 `w-full`이라 같은 `minW`(=120) `fit-content` 래퍼 `<div>`로 감싼다. `maxWidth:'100%'`는 전 타입 공통(필드/셀 초과 방지 — 이것만 유지가 사용자 요구). 폭을 다시 일률값으로 되돌리지 말 것.
   - **셀 채움 탈출구 `SchemaField fill` prop(2026-09-11 PR #132).** 반복행 테이블처럼 컨트롤이 **셀(컬럼) 폭을 꽉 채워야** 할 때만 `<SchemaField fill … />`. (스키마 쪽 스위치는 `long:true` — `fill = fillProp || field.long` 으로 합류한다.) 이건 일률값 원복이 아니라 **컨텍스트가 폭을 지배할 때의 opt-in**이다 — `fill`이면 `width:'100%'` **그리고** `minWidth:0`(input·`date` 래퍼 둘 다), `select` 래퍼는 `display:'block' width:'100%'`. ⚠ `width:100%`만 주고 `minWidth`(text 240 등)를 남기면 **240min이 100%를 이겨** 200px 고정 컬럼을 넘쳐 옆 셀 위로 겹친다(Codex P2). 기본(prop 미전달)은 그대로 `fit-content`라 RowFormModal 그리드는 무영향. `date`는 `fill`이면 fit-content 래퍼도 `width:100% minWidth:0`로 같이 분기.
8. **배열은 라벨 위·컨트롤 아래(세로 적층) 고정.** ⚠ 안티패턴: 라벨 좌·컨트롤 우 inline 배열 — 2026-09-08 시안 후 **사용자 원복**. 다시 제안하지 말 것(폭만 fit-content로 줄이는 것이 결정).

## 컨트롤 종류 (FIELD_CONTROLS — types.ts SSOT)
| control | 렌더(SchemaField) | 비고 |
|---------|-------------------|------|
| `text` | `<input type=text>` | 기본 |
| `number` | `<input type=number>` | 숫자 |
| `date` | shadcn Radix `DatePicker`(달력+Popover) | 네이티브 input 아님 — 값 계약 `'YYYY-MM-DD'`·KST 함정 →[[apfs-datepicker]] |
| `year` | `PeriodPicker mode='year'`(연도 그리드+Popover) | **사업연도·회계연도는 `number` 가 아니라 이것**(2026-09-17). 값 계약 `'YYYY'` 문자열, 표시는 `2026년`. 컬럼은 `type:'text'` 그대로 — 저장값이 곧 셀 값이다. →[[apfs-datepicker]] |
| `select` | `<select>`+`options` | 첫 옵션 시드 |
| `radio` | DS **`RadioGroup`/`RadioGroupItem`**(ui/radio-group.tsx, 선택 점 scale-pop)+`options` | **분류형 2지 이상**(개인/법인, 신주/구주, Y/N/해당없음). 첫 옵션 시드. Item 은 `<button role=radio>` — `<label>` 래핑 금지, `htmlFor`/`id` 명시 연결 |
| `switch` | shadcn Radix **`Switch`**(ui/switch.tsx) + 상태 텍스트(켜짐=`options[0]`, 꺼짐=`options[1]`, `htmlFor` 라벨) | **on/off 2지선다**(사용여부·도움말 제공 '여'/'부', 'Y'/'N', '예'/'아니오'). 첫 옵션 시드. 값 계약은 **문자열 그대로** — `checked = value === options[0]`, 토글 시 `options[0] \| options[1]` emit. (2026-09-18 오전 체크박스 렌더로 바꿨다가 같은 날 오후 **스위치로 원복** — 아래 박스) |
| `checkbox` | DS `Checkbox`(ui/checkbox.tsx, 가시 라벨 없음) | 'true'/'false' 문자열. **신규 스키마에서 쓰지 말 것**(사용처 0, 2026-09-18) — 옵션이 없어 클릭 라벨을 못 붙이고 첫옵션 시드도 안 걸린다. on/off 값은 `switch` + `options` 를 쓴다 |
| `textarea` | `<textarea rows=4>` | 2단 시 전체 폭 |
| `file` | **`filepond`과 동일** → `DocumentsField`(통일 드롭존) | 2단 시 전체 폭. 날것 `<input type=file>` 아님 — `renderers`에서 `case 'file'`→`filepond` fall-through(2026-09-09 파일존 통일). 신규 스키마는 `filepond`를 직접 쓸 것 |
| `address` | `AddressField`(우편번호 readonly + 「주소 검색」 + 본문 input) | 카카오(다음) 우편번호 임베드를 **중첩 다이얼로그**로 연다. 값 계약 = **단일 문자열** `'(12345) 서울특별시 …'`, 파싱/직렬화 SSOT `fields/address_value.ts`. lazy 로드 · **복합 컨트롤(plain 래핑 필수)** · 2단 시 전체 폭(`long:true`) |
| `readonly` | muted `<div>` | 운용사·자펀드 등 상위 고정값 |

> **checkbox vs switch vs radio — 무엇을 쓰나(2026-09-18 재개정, 사용자 결정).** 모두 DS 컴포넌트(Radix)이며 표식 이펙트(scale-pop / 엄지 슬라이드)가 한 패밀리다:
> · **switch** = on/off **2지선다 값**('여/부'·'Y/N'·'예/아니오'). 폼 모달 안이든 즉시 반영 설정이든 동일. 옆 텍스트는 현재 상태(여↔부)로 바뀐다.
> · **checkbox** = **독립 복수 선택**(사용자 구분·권한 체크 그룹, 권한 매트릭스 셀/집계). 스키마 토큰 `checkbox`('true'/'false')는 신규 사용 금지.
> · **radio** = 이름으로 묶인 배타 그룹 — 하나를 고르면 나머지가 풀린다(개인/법인, 신주/구주, Y/N/해당없음, 검색 결과 1건 선택). 옵션 3개 이상이면 무조건 radio.
> (연혁: 2026-09-15 2지선다 radio → switch. 2026-09-18 오전 namethatui 의미 규약(switch=즉시 반영 / checkbox=Save 대기)으로 switch → 체크박스 렌더 전환. **같은 날 오후 사용자 지시 "스위치는 체크로 하지 말고 원복"으로 Switch 렌더 복귀** — 화면 인터랙션 통일이 의미 규약보다 우선. 매트릭스·체크 그룹의 DS Checkbox 통일과 radio 의 DS 전환은 유지.)
>
> ⚠️ **값 계약을 boolean 으로 바꾸지 말 것.** `use: v.use === '여'`처럼 **옵션 문자열을 그대로 읽는 소비처·상세필터**가 다수라, `'true'/'false'`를 emit 하면 저장·필터가 **무음으로** 깨진다. radio 와 동일하게 `options[0]`/`options[1]` 문자열을 주고받는다.
> ⚠️ 라벨 래퍼는 `plain`(=`<div>`) — `<label>`로 감싸지 않는다. Radix Checkbox 는 `<button role=checkbox>`라 `<label>` 암묵 연결이 **클릭을 두 번 발화**시킨다. 가시 라벨은 렌더러가 `htmlFor`/`id` 로 **명시** 연결한다. 판정 SSOT 는 `renderers.tsx` **`isPlainWrapControl()`** — 폼 래퍼가 리터럴로 열거하지 말 것.
> ⚠️ **모달 안의 모든 체크는 DS `Checkbox`** — `SchemaField` 밖의 바스포크 체크(복수 선택 그룹 `menu_form_modal` 사용자 구분·`user_form_modal` 권한, 권한 매트릭스 `user_permission_modal`)도 날것 `<input type=checkbox>`(accentColor) 를 쓰지 않는다(2026-09-18, #202 후속). 패턴은 `<span><Checkbox id={`${uid}-…`} aria-label="그룹명 값"/><label htmlFor={…}>값</label></span>` (`uid = React.useId()`). 3상태 집계는 `checked='indeterminate'`(대시 아이콘, SR mixed) — 일부 상태 클릭은 Radix 가 true 로 올린다("전체 켜기").
> ⚠️ switch 옆 텍스트는 **현재 상태**(켜짐=`options[0]`, 꺼짐=`options[1]`)이고 `htmlFor` 로 스위치에 연결된다(클릭 면적). 접근名은 **필드명 고정** `aria-label={field.label}` — 이름은 식별, 상태는 `aria-checked` 가 담당(APG). 상태를 이름에 넣으면 토글마다 이름이 재낭독되고 "사용여부 여, 스위치, 켜짐"처럼 중복된다. 2.5.3 은 `Field` 래퍼의 가시 라벨 "사용여부"가 접근名과 같아 성립한다.

> ⚠️ **`address`(react-daum-postcode) 함정 5종(2026-09-17).** ① 패키지 정식 이름은 **`KakaoPostcodeEmbed`**(`DaumPostcodeEmbed`는 deprecated 별칭), `width`/`height`는 **prop이 아니다**(크기는 `style`로만), `autoClose` 기본값 true면 선택 즉시 wrapper가 통째로 사라진다 → `autoClose={false}`. ② **props는 마운트 시 1회만 반영**(`componentDidUpdate` 없음) → 테마 변경은 언마운트/리마운트로만. ③ 임베드는 `postcode.map.kakao.com` **크로스오리진 iframe**이라 (a) CSS 변수가 넘어가지 않아 `theme`에 **hex만** 넘겨야 하고(`getComputedStyle`로 토큰을 읽어 주입, rgba 토큰은 카드색 위에 합성), (b) `focusInput` 기본값(true)이면 포커스가 iframe 안으로 들어가 **Radix Escape 닫기가 먹통** → `focusInput={false}`. ④ 임베드에는 **`onError` prop이 없다** — CDN 실패는 `errorMessage` 노드로만 드러나므로 수기 입력 안내를 넣고 본문 input은 항상 편집 가능하게 둔다(폐쇄망). ⑤ 필수 검증은 원시 `trim()`이 아니라 **`isAddressEmpty()`** 로 — `'(06236) '`가 trim 후에도 비어 있지 않아 본문 없는 주소가 통과한다(richtext 빈 문서 false-pass와 같은 계열). 재검색 시 상세주소 보존(`detailTail`)은 **토큰 경계**가 필수 — 문자 접두만 보면 "테헤란로 12"가 "테헤란로 123"의 접두라 주소가 조용히 뒤바뀐다.
>
> ⚠️ **`<label>` 래핑 금지 판정은 `renderers.tsx`의 `isPlainWrapControl()` 가 SSOT**(복합 컨트롤 = `COMPLEX_CONTROLS`/`isComplexControl()`, 여기에 radio·switch·checkbox 가 더해진다). 폼 래퍼(`generic_list_modal`·`subfund_form_modal`·`user_permission_modal`·`menu_form_modal`·`program_help_modal`)가 각자 리터럴로 열거하면 컨트롤이 늘 때마다 한 곳씩 빠져 `<label>` 하이재킹이 재발한다.

> ⚠️ **무거운 외부 컨트롤** `richtext`(**Plate/platejs v53**, 2026-07-05 Tiptap에서 교체)·`filepond`(react-filepond): 4단계 배선(`FIELD_CONTROLS`→`src/dash/fields/`→lazy `SchemaField`→`span2`)과 **무음실패 함정**(FilePond 비제어·에디터 툴바 mousedown preventDefault·값=Slate JSON 문자열·빈 문서는 `api.isEmpty()`→`''`로 required false-pass 해소)은 메모리 `[[heavy-form-controls-richtext-filepond]]` + `src/dash/fields/RichTextField.tsx` 참조.

## 스키마 작성 (PageSchema · kind:'form')
```ts
export const schema: PageSchema = {
  route: '투자기업정보(통합)', title: '투자기업정보(통합)', kind: 'form', entity: '투자기업',
  columns: [ /* 리스트 표시 컬럼(type: text|code|amount|date|status|gp …) */ ],
  fields: [  /* 모달 양식 — 출처 실측 순서대로 */
    { key: 'gp',        label: '운용사',  control: 'readonly' },
    { key: 'baseDate',  label: '기준일',  control: 'date', required: true },
    { key: 'overseas',  label: '해외기업', control: 'radio', options: ['Y', 'N'] },
    { key: 'compliance',label: '컴플라이언스의견', control: 'select', options: ['적정','조건부 적정','부적정','해당없음'] },
    { key: 'remark',    label: '비고',    control: 'textarea' },
    /* … */
  ],
  filters: ['투자방식','사업분야','소재지'],
  statusDomain: [{ label: '투자완료', tone: 'success' }, /* … */],
  provenance: { capturedAt: '2026-06-29', sourceSystem: 'FFMS', captureFile: '…png' },
};
```
- `columns`(리스트 표시) ≠ `fields`(모달 입력) — 분리. `fields`는 **출처 실측 순서**를 따른다(목업 HTML의 폼 순서 또는 캡처 순서, →[[apfs-capture-schema]]).
- ⚠️ `kind:'form'`이어도 **`columns`·`provenance`는 `PageSchemaZ` 필수**(optional 아님) — 폼 페이지도 리스트 컬럼과 출처를 선언해야 zod 통과.
- 전용 `email`/`tel` 컨트롤은 **없다** → `control: 'text'`로 두고(형식 검증 필요하면 별도). 없는 control을 발명하면 `PageSchemaZ.parse` 실패.
- `route`/`title`이 라벨로 유일하면 route=라벨로 자동 해결. 새 스키마는 `schemas/index.ts`의 `ALL` 배열에 등록.

## 호출 (리스트에서 모달 열기)
**시그니처(정본 — generic_list_modal.tsx)**: `RowFormModal({ mode: 'create' | 'edit', initial?: Row, schema, onSave: (row: Row) => void, onClose, onDelete? })`. **`open` prop 없음** — 조건부 마운트(`{modal && (…)}`)로 열고 닫는다. `onSave`는 **`buildRow`로 조립된 Row**를 받는다(원시 vals 아님). `onDelete`는 edit에서만 넘긴다.
```tsx
{modal && (
  <RowFormModal
    mode={modal.mode} initial={modal.row} schema={schema}
    onSave={(row) => {
      setRows((prev) => modal.mode === 'edit'
        ? prev.map((r) => (r.id === row.id ? row : r))                 // edit: id로 교체
        : [{ ...row, id: crypto.randomUUID() }, ...prev]);             // create: 새 id 부여(필수)
      setModal(null);
    }}
    onClose={() => setModal(null)}
    onDelete={modal.mode === 'edit' ? () => { setRows((p) => p.filter((r) => r.id !== modal.row!.id)); setModal(null); } : undefined}
  />
)}
```
- ⚠️ **create 시 새 id를 직접 부여**하라 — `buildRow`는 create면 `id: ''`(빈 문자열)을 반환한다(build_row.ts). 안 부여하면 두 번째 신규 등록이 첫 빈-id 행을 덮어쓴다(잠복 버그).
- `buildRow`는 vals를 먼저 전개해 임의 필드 키를 Row에 보존하고, 숫자 변환이 문자열을 이긴다. 리스트 행 **더블클릭**으로 edit 진입하는 패턴은 →[[apfs-aggrid]].

## 검증
- `npm test`(zod 스키마 테스트 — 새 control은 `FIELD_CONTROLS`에 있어야 통과) + `npm run build`(exit 0).
- 브라우저: 항목>6 → 880px 2단(400px에서 1단 적층 확인), textarea/`long` 전체폭, radio·switch 첫 옵션 기본, 필수 미입력 에러, 삭제 2단계. 라이트/다크(→[[responsive-ui]]).
- `long` 검증은 **span 이 아니라 실측 폭**으로: 모달 열고 `getComputedStyle(input).width` 가 셀 폭과 같은지(240px 로 묶여 있지 않은지) 확인.
- `switch` 검증은 **왕복으로**: 등록 → 토글 → 저장 → 그리드 배지가 '여'/'부'로 뜨는지 + 상세필터 '사용여부'가 그 행을 걸러내는지(문자열 계약이 깨지면 여기서 드러난다).
- 체크박스 라벨 검증 2종: ① 라벨 텍스트 클릭이 **정확히 1회** 발화하는지(`addEventListener('click')` 카운터 — 암묵 `<label>` 래핑이면 2가 된다), ② `getByRole('checkbox', { name: '사용여부 여' })` 로 접근名이 **필드명+값** 둘 다 잡히는지.
- 폰트: `getComputedStyle(select).fontSize === '13.5px'`.

## 확장: 섹션형·반복행 모달 (flat 스키마를 초과할 때)
`RowFormModal`은 **flat 필드 배열**만 렌더한다. 다음 중 하나라도 있으면 스키마에 억지로 넣지 말고 **전용 섹션형 모달**로 escalate:
섹션 ≥3개 · **반복행 테이블**(행추가/행삭제 — GP·담당자 등) · **고정 슬롯 첨부표**(문서구분×일자×파일) · 필드 40개 내외.

- **골드 레퍼런스**: `src/dash/subfund_form_modal.tsx`(결성조합 수정 — 6섹션·반복행 2종·첨부표 9행).
- 규칙: ① Radix `Dialog` `max-w-[880px] max-h-[88vh]` + `onInteractOutside preventDefault`(RowFormModal과 동일) ② `<fieldset>/<legend>` 섹션, 본문은 `grid grid-cols-1 sm:grid-cols-2 gap-x-5`(wide 규격 동일) ③ **개별 컨트롤은 `SchemaField`(schemas/renderers.tsx) 재사용** — ad-hoc `FieldSpec`을 만들어 넘기면 14px·DatePicker·토큰이 자동(라벨 래퍼도 RowFormModal `Field` 규격 복제) ④ 반복행은 로컬 배열 state + `IconBtn icon="trash"` 행삭제 + `Button leadingIcon="plus"` 행추가 ⑤ 첨부는 hidden `<input type=file>` 1개를 슬롯별로 재사용(파일명만 보관, 백엔드 없음). **파일이 실린 슬롯 셀은 `ui/attachment.tsx`의 `Attachment` 카드**(확장자 아이콘+파일명+교체/삭제)로 렌더하되 단일 카드도 `AttachmentGroup`(role=list)로 감싼다(고아 listitem 방지 · web-a11y), 빈 슬롯은 `Button leadingIcon="upload"` [파일 선택] — 드롭존(DocumentsField)과 같은 카드 프리미티브를 공유해 파일 표시를 단일화(2026-09-09) ⑥ 저장은 `onSave(patch: Partial<Row>)` — 문자열 폼값→`number|null`·`'YYYY-MM-DD'` 변환은 모달이 책임.
- **반복행 테이블 레이아웃 규약(2026-09-11 PR #132 사용자 결정)** — `subfund_form_modal.tsx`의 GP·담당자·첨부서류 3표 정본:
  - **`tableLayout:'fixed'` 필수** (`<table className="w-full border-collapse" style={{ fontSize:13, minWidth:…, tableLayout:'fixed' }}>`). 이유 2가지(비자명): ⓐ 내용이 컬럼을 못 넓혀서 **nowrap `AttachmentTitle`이 실제 컬럼 폭 기준으로 `…`(ellipsis) 잘림** — auto면 파일명이 `<td>`→컬럼을 밀어 테이블이 넘치고 truncate가 안 걸린다. ⓑ **"width 미지정 컬럼 1개가 나머지 폭을 전부 흡수"가 결정론적**이 된다(auto는 내용 비율로 성명·EMAIL을 반씩 나눔).
  - **컬럼 폭**: 좁은 컬럼만 `<th>`에 고정(구분 160/180 · 성명 200 · 문서구분/규약일자 150 · **삭제 40**), **정확히 하나의 `<th>`만 width 미지정**(기관명·EMAIL·첨부파일 = 나머지 흡수).
  - **셀 스타일**: `thStyle`/`tdStyle`은 **좌 0·우 8**(컬럼 간격), 마지막 컬럼은 `thLast`/`tdLast`(우 0) → 첫/마지막 컬럼이 컨테이너 좌우 끝에 정렬. **헤더 밑줄 없음**(th `borderBottom` 제거) — th 13px bold caption `padding:'6px 0 12px'`, td `padding:'4px 0'`.
  - **행 컨트롤은 전부 `<SchemaField fill … />`**(위 계약7 fill 참조 — 셀 채움+겹침 방지). 삭제 셀 `{...tdLast, textAlign:'center'}` + `IconBtn icon="trash" size={34}`.
  - **섹션 간격**: `Section`의 `<fieldset>`는 `mb-7`(섹션 사이 여백).
  - **첨부 카드 = 1줄·34px**: `Attachment size="sm" className="h-[34px] py-0"` + `AttachmentMedia className="size-6"`(36→24) + `AttachmentTitle`만(설명줄 `AttachmentDescription` 없음) → 날짜 입력 등 폼 컨트롤과 **높이 34px 정합**. 단일 카드도 `AttachmentGroup`(role=list) 유지(위 ⑤).
- `RowFormModal`에 **`title?: string`** prop이 있다(2026-09-08) — 같은 flat 스키마를 단계별 다른 제목으로 열 때 사용(→[[apfs-stage-workflow]]).

## 읽기전용 명세(kv) 그리드 — 라벨 배열 규약 (2026-09-08 사용자 확정)
상세/명세 팝업의 **라벨:값 kv 그리드**(골드: `src/dash/subfund_spec_modal.tsx` `KvGrid`)는 **라벨 언어로 배열이 갈린다**. 검토 이력: 한글에서 세로 적층·테두리 제거안을 시도 후 **가로 배열로 원복**, 영문은 세로 적층 샘플을 채택.

| 라벨 | 배열 | 규격 |
|------|------|------|
| **한글** | **가로** — 라벨 좌 · 값 우 (현재 방식, 기본) | 셀 `grid-template-columns: 150px minmax(0,1fr)`, 라벨 `bg-muted` 12.5px bold `text-muted-foreground` `padding 8px 12px`, 값 13px, 금액 `justify-end tabular font-semibold`, 값 없음 `-`(`text-caption`) |
| **영문** | **세로** — 라벨 위 · 값 아래 | 셀 `flex-col` `padding 8px 12px` `gap 3px`, 라벨 **배경 없음** 11.5px 600 `var(--caption)`, 값 13.5px, 금액 좌측 tabular. 이유: `Scheduled Liquidation Date`류가 150px 칸에서 2줄로 접혀 행 높이가 들쭉날쭉해짐 |

- 두 배열 모두 **공통 유지**: `<dl>` 2열 그리드(`grid-cols-1 sm:grid-cols-2`) + `gap-px bg-border border border-border rounded 8` 테두리 셀, 긴 항목(조합명·관리보수·성과보수·첨부 슬롯)은 `sm:col-span-2` 전체폭, 텍스트 값은 `<MT>`·금액은 `mn()` 마스킹, 첨부는 `PDF` 배지 칩 / `미첨부`.
- **분기 방법**: 호출자가 프롭을 넘기지 말고 라벨에서 결정한다 — `const stacked = !/[가-힣]/.test(items[0].l);` (한글 라벨 하나라도 있으면 가로). 현재 코드는 한글 전용이라 `stacked` 분기가 **아직 없음** — 영문 로케일 도입 시 `KvGrid`에 이 한 줄과 아래 세로 셀 클래스를 추가한다:
  ```tsx
  // stacked(영문): 라벨 위·값 아래. 검증된 스타일(2026-09-08 샘플)
  <div className={`flex flex-col bg-card ${o.full ? 'sm:col-span-2' : ''}`} style={{ padding: '8px 12px', gap: 3 }}>
    <dt className="m-0 font-semibold" style={{ fontSize: 11.5, color: 'var(--caption)', letterSpacing: '.01em' }}>{o.l}</dt>
    <dd className={`m-0 min-w-0 ${isMoney ? 'tabular font-semibold' : ''} ${empty ? 'text-caption' : ''}`} style={{ fontSize: 13.5 }}>…</dd>
  </div>
  ```
- 안티패턴: 한글 kv에 세로 적층(라벨 띠가 두 겹으로 보임·표 밀도 저하), 영문 kv에 150px 가로 라벨(줄바꿈), 테두리 제거(사용자 원복 결정 — 하지 말 것).
- 검증: 모달 열고 `dt/dd getBoundingClientRect()` — 한글은 `dd.left ≥ dt.right`(가로), 영문은 `dd.top ≥ dt.bottom`(세로). 라이트/다크 스크린샷.

## 참조
- 리스트 더블클릭 진입·그리드 본체: [[apfs-aggrid]]
- 조립 SOP(목업→관리 페이지): [[apfs-manage-page]] · 단계 전이: [[apfs-stage-workflow]]
- 페이지 바깥 양식: [[apfs-grid]]
- 출처→스키마 동결: [[apfs-capture-schema]]
- 색 토큰: [[color-tokens]] · 반응형: [[responsive-ui]]
