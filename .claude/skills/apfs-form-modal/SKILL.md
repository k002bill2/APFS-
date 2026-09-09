---
name: apfs-form-modal
description: APFS 리스트 페이지의 등록/수정/삭제 CRUD 모달(RowFormModal) 작성 규약 — PageSchema.fields 주도, 항목>6이면 2단 wide 자동 적응, FIELD_CONTROLS(zod SSOT) 컨트롤, 입력 14px·토큰만. 정본 예시는 "투자기업정보(통합)"(schemas/투자기업정보_통합.ts). 섹션형·반복행 모달(subfund_form_modal)과 읽기전용 명세 kv 그리드의 라벨 배열 규약(한글=가로 라벨좌/값우, 영문=세로 적층)도 포함. 등록 폼·수정 모달·폼 모달·RowFormModal·필드 컨트롤·radio/select/textarea 입력·삭제 확인·명세 팝업·kv 라벨 배열 작업 시 사용. Use when building or editing the schema-driven CRUD form modal (register/edit/delete) for list pages.
---

# apfs-form-modal Skill

## 컨텍스트
리스트 페이지의 **신규 등록 / 수정 / 삭제(2단계 확인)** 모달은 손으로 폼을 짜지 않는다. `RowFormModal`이 **`PageSchema.fields`를 받아 폼을 자동 생성**한다(Radix Dialog — focus trap·Escape·aria-modal·포커스 복귀 내장). "필드는 스키마가 정하고, 모달은 렌더만 한다."

- **정본 컴포넌트**: `src/dash/generic_list_modal.tsx`(`RowFormModal`).
- **정본 예시(골드 레퍼런스)**: `src/dash/schemas/투자기업정보_통합.ts` — 21필드(readonly·radio·select·textarea·date·number·checkbox·text 혼합)라 2단 wide로 렌더되는 완성형.
- **지원 SSOT**: `schemas/types.ts`(`FIELD_CONTROLS`+zod), `schemas/renderers.tsx`(`SchemaField` 컨트롤 렌더), `schemas/build_row.ts`(vals→Row 조립).

## 핵심 계약 (CRITICAL)
1. **새 컨트롤은 `FIELD_CONTROLS`(types.ts)에 먼저 추가.** 컨트롤 종류는 `FIELD_CONTROLS` 배열이 **타입+zod enum을 동시 공급(SSOT)**. 배열에 없는 control을 스키마에 쓰면 `PageSchemaZ.parse`가 실패해 **스키마 테스트·빌드가 깨진다**. 추가 순서: ① `FIELD_CONTROLS`에 문자열 추가 → ② `SchemaField`(renderers.tsx)에 `case` 추가 → ③ 스키마에서 사용.
2. **2단 적응은 자동.** `RowFormModal`이 `schema.fields.length > 6`이면 `max-w-[880px]` + `grid grid-cols-1 sm:grid-cols-2`(좁은 화면은 1단 적층)로, 6개 이하면 `max-w-[460px]` 단일 컬럼으로 **자동 렌더**. 호출자가 폭을 지정하지 않는다.
3. **`textarea`/`file`은 전체 폭.** 2단 모드에서 이 컨트롤은 `sm:col-span-2`로 한 줄 전체를 차지한다(긴 입력 잘림 방지) — `RowFormModal`이 자동 처리.
4. **seed 기본값.** 초기값은 `initial`(수정) 또는 빈 문자열(등록). 단 **`select`·`radio`는 첫 옵션**(`f.options?.[0]`)을 기본값으로 시드한다.
5. **입력 폰트 14px.** 폼 컨트롤은 `renderers.tsx`의 `base` 스타일에서 **14px(프로젝트 표준)**. 16px 아님(→[[responsive-ui]]). 색·테두리·배경은 토큰만(→[[color-tokens]]).
   - ⚠️ **단축 속성 `font` 금지 — 패밀리는 `fontFamily`(longhand)로만 상속.** `base`에서 `fontSize: 14` **뒤에** `font: 'inherit'`를 쓰면 안 된다. `font`은 `font-style/variant/weight/`**`size`**`/line-height/family`를 한꺼번에 지정하는 shorthand라, 인라인 스타일이 키 순서대로 적용되며 **뒤에 온 `font:'inherit'`가 앞의 `fontSize:14`를 부모 상속값(모달=16px)으로 되돌린다** → 네이티브 `select/input`이 16px로 렌더(라벨 14px보다 큼). 패밀리(Pretendard)만 상속하려면 **`fontFamily: 'inherit'`**(longhand)를 써서 `fontSize:14`를 보존하라. 검증: 모달 열고 `getComputedStyle(select).fontSize === '14px'`.
6. **필수값·삭제.** 필수는 `field.required`(미입력 시 첫 누락 필드에 인라인 에러). 삭제는 edit 모드에서 ghost→`삭제 확인`(danger) 2단계.
7. **컨트롤 폭 = fit-content(2026-09-08 사용자 확정).** `renderers.tsx` `base`가 `width:'fit-content', minWidth:220, maxWidth:'100%'` — 셀을 꽉 채우지 않는다. **textarea만 `width:'100%'`**(긴 입력), `date`는 `DatePicker` 트리거가 `w-full`이라 같은 규칙의 `fit-content` 래퍼 `<div>`로 감싼다. 실측: input/select/date 220px(최소), file 298px(고유폭), textarea 전체폭.
8. **배열은 라벨 위·컨트롤 아래(세로 적층) 고정.** ⚠ 안티패턴: 라벨 좌·컨트롤 우 inline 배열 — 2026-09-08 시안 후 **사용자 원복**. 다시 제안하지 말 것(폭만 fit-content로 줄이는 것이 결정).

## 컨트롤 종류 (FIELD_CONTROLS — types.ts SSOT)
| control | 렌더(SchemaField) | 비고 |
|---------|-------------------|------|
| `text` | `<input type=text>` | 기본 |
| `number` | `<input type=number>` | 숫자 |
| `date` | shadcn Radix `DatePicker`(달력+Popover) | 네이티브 input 아님 — 값 계약 `'YYYY-MM-DD'`·KST 함정 →[[apfs-datepicker]] |
| `select` | `<select>`+`options` | 첫 옵션 시드 |
| `radio` | 가로 라디오(`accentColor`)+`options` | Y/N, Y/N/해당없음 등. 첫 옵션 시드 |
| `checkbox` | `<input type=checkbox>` | 'true'/'false' 문자열 |
| `textarea` | `<textarea rows=4>` | 2단 시 전체 폭 |
| `file` | `<input type=file>` | 2단 시 전체 폭 |
| `readonly` | muted `<div>` | 운용사·자펀드 등 상위 고정값 |

> ⚠️ **무거운 외부 컨트롤** `richtext`(**Plate/platejs v53**, 2026-07-05 Tiptap에서 교체)·`filepond`(react-filepond): 4단계 배선(`FIELD_CONTROLS`→`src/dash/fields/`→lazy `SchemaField`→`span2`)과 **무음실패 함정**(FilePond 비제어·에디터 툴바 mousedown preventDefault·값=Slate JSON 문자열·빈 문서는 `api.isEmpty()`→`''`로 required false-pass 해소)은 메모리 `[[heavy-form-controls-richtext-filepond]]` + `src/dash/fields/RichTextField.tsx` 참조.

## 스키마 작성 (PageSchema · kind:'form')
```ts
export const schema: PageSchema = {
  route: '투자기업정보(통합)', title: '투자기업정보(통합)', kind: 'form', entity: '투자기업',
  columns: [ /* 리스트 표시 컬럼(type: text|code|amount|date|status|gp …) */ ],
  fields: [  /* 모달 양식 — 캡처 실측 순서대로 */
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
- `columns`(리스트 표시) ≠ `fields`(모달 입력) — 분리. `fields`는 **캡처 실측 순서**를 따른다(→[[apfs-capture-schema]]).
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
- 브라우저: 항목>6 → 880px 2단(400px에서 1단 적층 확인), textarea 전체폭, radio 첫 옵션 기본, 필수 미입력 에러, 삭제 2단계. 라이트/다크(→[[responsive-ui]]).

## 확장: 섹션형·반복행 모달 (flat 스키마를 초과할 때)
`RowFormModal`은 **flat 필드 배열**만 렌더한다. 다음 중 하나라도 있으면 스키마에 억지로 넣지 말고 **전용 섹션형 모달**로 escalate:
섹션 ≥3개 · **반복행 테이블**(행추가/행삭제 — GP·담당자 등) · **고정 슬롯 첨부표**(문서구분×일자×파일) · 필드 40개 내외.

- **골드 레퍼런스**: `src/dash/subfund_form_modal.tsx`(결성조합 수정 — 6섹션·반복행 2종·첨부표 9행).
- 규칙: ① Radix `Dialog` `max-w-[880px] max-h-[88vh]` + `onInteractOutside preventDefault`(RowFormModal과 동일) ② `<fieldset>/<legend>` 섹션, 본문은 `grid grid-cols-1 sm:grid-cols-2 gap-x-5`(wide 규격 동일) ③ **개별 컨트롤은 `SchemaField`(schemas/renderers.tsx) 재사용** — ad-hoc `FieldSpec`을 만들어 넘기면 14px·DatePicker·토큰이 자동(라벨 래퍼도 RowFormModal `Field` 규격 복제) ④ 반복행은 로컬 배열 state + `IconBtn icon="trash"` 행삭제 + `Button leadingIcon="plus"` 행추가 ⑤ 첨부는 hidden `<input type=file>` 1개를 슬롯별로 재사용(파일명만 보관, 백엔드 없음) ⑥ 저장은 `onSave(patch: Partial<Row>)` — 문자열 폼값→`number|null`·`'YYYY-MM-DD'` 변환은 모달이 책임.
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
- 캡처→스키마 동결: [[apfs-capture-schema]]
- 색 토큰: [[color-tokens]] · 반응형: [[responsive-ui]]
