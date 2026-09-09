---
name: apfs-spec-popup
description: APFS 읽기전용 "명세" 팝업 규약(자펀드 명세·운용사 명세 등 KRDS 공통 팝업) — 진입(툴바 명세 버튼+행 더블클릭), 금액 단위 토글(원/백만원/억원), 개요 kv 그리드, 2단 헤더 재무요약 표, 중첩 상세 팝업(재무제표), 엑셀. 명세 팝업·상세 팝업·읽기전용 상세·단위 토글·중첩 다이얼로그·재무제표 팝업 작업 시 사용. Use when building a read-only detail/spec popup opened from a list row, with unit toggle, kv overview, financial summary table, and a nested detail dialog.
---

# apfs-spec-popup

리스트 행의 **읽기전용 명세 팝업**. 골드: `src/dash/subfund_spec_modal.tsx`(`SubFundSpecModal` + 중첩 `FsDetailModal`), 출처 `S1_03_자펀드_명세.html`. 편집 모달과 다르다 — 입력 컨트롤 없음, 저장 없음.

## 진입 (CRITICAL)
- **툴바 selbar의 `명세` 버튼**(전 단계 공통, 전이 액션 맵 **밖**) + **행 더블클릭**(`onRowDoubleClicked` → `setSelId(id)` + `setModal({kind:'spec'})`, `rowPinned` 제외). 워크플로우 페이지에서 더블클릭은 **수정이 아니라 명세**다(→[[apfs-stage-workflow]] 규약 10).
- 모달 상태 유니온에 `{ kind: 'spec' }` 추가, 렌더는 `modal?.kind==='spec' && selected && <SubFundSpecModal row={selected} onClose=…/>`.

## 구성 규약
1. **골격**: Radix `Dialog` `max-w-[880px] max-h-[88vh]`, 헤더 = 제목 + `DialogDescription`에 대상명(`<MT>`), 본문 `overflow-y-auto p-[18px]`, 푸터 = `재무제표 상세`(primary) · `엑셀`(outline) · `닫기`. 섹션은 `<section><h3>제목<span 단위주석/></h3>` (`Section` 헬퍼).
2. **금액 단위 토글**: 본문 최상단 우측 `SegTabs 원|백만원|억원`. 값 변환은 `money(won, unit)` 한 곳(원=`fmt`, 백만/억=소수 2자리, `mn()` 마스킹 내장, null→`-`). 중첩 팝업은 부모의 unit을 초기값으로 받되 자체 토글 보유.
3. **개요 kv 그리드**: `buildOverview(row)`가 `{l, v|won, full}` 배열 생성 — **행에 있는 값은 행에서**, 없는 항목(보수·담당자·고유번호 등)은 출처 데모값, **미결성 행은 `null`(`-`)**. 라벨 배열은 [[apfs-form-modal]] "읽기전용 명세(kv) 그리드 — 라벨 배열 규약"(한글=가로 라벨좌/값우 150px·테두리 셀, 영문=세로 적층)을 따른다 — 여기서 중복 정의하지 않는다. 문서 슬롯은 `PDF` 배지 칩 / `미첨부`.
4. **재무요약 2단 헤더 표**: `<table>` `thead` 2행(`rowSpan=2` 기준년월 + `colSpan` 대차대조표 9·손익계산서 5), `overflow-x-auto` 래퍼 + `minWidth`. 음수는 `var(--danger-text)`. 미결성 행은 전부 0.
5. **중첩 팝업(재무제표 상세)**: 별도 `Dialog` 컴포넌트를 부모 안에서 조건부 마운트. 부모 `DialogContent`에 `onInteractOutside={(e)=>{ if (childOpen) e.preventDefault(); }}` — 자식 스크림 클릭이 부모까지 닫는 것 방지. Esc는 한 겹씩 닫힌다(Radix 스택). 표는 항목/금액 2열, 그룹행(`g`)·들여쓰기(`lv`×16px)·굵게(`b`)·합계(`t`, `bg-muted`).
6. **엑셀**: SheetJS `aoa_to_sheet` — **개요 kv(`ov`) → 문서슬롯(`FILES`) → 빈 줄 → 재무 값**(`기준년월` + `FIN_BS`+`FIN_IS`, 단위 무관 **원 단위 원값**) 순서로 직렬화. 문서슬롯 값은 첨부 PDF명, 없으면 `미첨부`. 파일명 `자펀드명세_<조합명>.xlsx`. `toast.success`.
   - ⚠ **화면=엑셀 불변식**: 팝업이 렌더하는 데이터 소스가 여러 배열이면(개요 `ov` + 문서슬롯 `FILES`), export도 **전부** 직렬화한다. 주(main) 배열만 `.map`하고 보조 배열을 빠뜨리면 "화면엔 보이는데 엑셀엔 없는" 누락 버그가 난다(실제 사례: 문서 3슬롯 사업계획서/조합규약서/결성총회의사록이 export에서 누락 → `FILES.forEach`로 추가해 수정, 2026-09-09). export 행 순서 = 화면 렌더 순서. 새 export/화면 리뷰 시 "렌더 소스 배열 개수 == export 직렬화 배열 개수" 체크.
7. **출처 충실**: 출처 명세의 수치가 내부 모순이어도(예: 영업이익≠수익−비용) **값은 그대로 두고 주석으로 표기** — 실데이터 연동 시 계산식 확인 항목. 고쳐 쓰지 말 것.

## 검증 (aside repl)
```js
await page.locator('.ag-pinned-left-cols-container .ag-row').nth(2).locator('.ag-cell').nth(1).dblclick();
// → [role=dialog] h2 '자펀드 명세', dt 개수 = 개요 항목+문서 슬롯(골드 41)
await page.getByRole('radio', { name: '억원' }).click();        // SegTabs = radio
// → 조합약정총액 dd '300' (30,000,000,000 → 억원)
// 재무제표 상세 클릭 → [role=dialog] 2개, Esc → 1개, Esc → 0개
```
라이트/다크 스크린샷. 취소/신청 행에서도 열려야 함(재무 0·보수/담당자 `-`).

## 참조
kv 라벨 배열 [[apfs-form-modal]] · 진입 규약 [[apfs-stage-workflow]] · 조립 SOP [[apfs-manage-page]] · 쌓임맥락 [[z-index]] · 색 [[color-tokens]]
