---
name: apfs-card-view
description: APFS 리스트/그리드 페이지의 "리스트 뷰 ↔ 카드뷰" 토글 규약 — 푸터 SegTabs, 카드 그리드(auto-fill), 카드 클릭=행 선택, 뷰 전환 후에도 선택·툴바 액션 유지(그리드 재마운트 시 복원), 전체보기·페이저 게이팅. 카드뷰·리스트 뷰 토글·카드 형태 목록·뷰 전환 시 선택 유지 작업 시 사용. Use when adding or fixing the list/card view toggle on a GridFrame page, including selection carry-over between views.
---

# apfs-card-view

GridFrame 페이지의 푸터 우측 **`리스트 뷰 | 카드뷰`** 토글과 카드 그리드. 골드: `src/dash/subfund_manage.tsx`(선택 동기화 포함) · `asset_funding.tsx`(조회형, 선택 없음).

## 규약 (CRITICAL)
1. **토글 위치·상태**: `footerRight`의 `SegTabs size="sm" value={view} onChange={setView} options=[{value:'list',label:'리스트 뷰'},{value:'detail',label:'카드뷰'}]`. state는 `const [view, setView] = useState('list')`. 페이저(`footerCenter`)와 `전체보기`(`maximize`)는 **`view==='list'`일 때만** 렌더.
2. **본문 분기**: `view==='list' ? <AgGridReact …/> : <카드 그리드/>`. 같은 `filteredRows`를 공유(필터 술어 재사용, 별도 데이터 금지).
3. **카드 그리드**: `<div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))', padding: 18 }}>`. 카드 = `<button type="button" aria-pressed={selId===r.id}>` `border bg-card rounded 12 p-3.5 text-left`, 선택 시 `borderColor: var(--primary)`. 카드 안: `ColorChip` + 제목(`<MT>`) + 부제(GP·연도) + 단계 `StatusBadge size="lg" dot={false}` + 핵심 금액 3줄(`mn(fmt())`, null→`-`).
   - ⚠ 카드 `<button>`에 `font:'inherit'`(shorthand) 금지 → `fontFamily:'inherit'`(fontSize 리셋 함정, →[[apfs-form-modal]] 계약5). 클릭 피드백은 `motion-safe:active:scale-[.98]`.
4. **카드 클릭 = 행 선택**: `onClick={() => setSelId(r.id)}` — 툴바 selbar(단계 액션)는 `selId`에서 파생되므로 카드뷰에서도 동일하게 뜬다(→[[apfs-stage-workflow]]).
5. **뷰 전환 후 선택 유지**: 리스트로 돌아오면 AG Grid가 **재마운트**되어 내부 선택이 사라진다. `onGridReady`에서 `selIdRef.current`로 `api.getRowNode(id)?.setSelected(true)` 복원(→[[apfs-stage-workflow]] 규약 9). 검증: 카드 클릭 → 리스트 뷰 → `.ag-row-selected` ≥1 + 액션 그대로.
6. **전체보기**: `showAll ? Math.max(rows.length,1) : PAGE_SIZE`를 `paginationPageSize`로(리스트 전용). 푸터 건수 문구 `총 N개 중 M개 항목 표시 중`는 `pageSize` 기준으로 계산.
7. 빈 결과: 카드 그리드에도 `조건에 맞는 … 없습니다` 문구(그리드 `overlayNoRowsTemplate`와 문구 일치).

## 검증 (aside repl)
```js
await page.getByText('카드뷰', { exact: true }).click();          // SegTabs 버튼은 role=radio — getByRole('button') 실패
await page.locator('div.grid > button[aria-pressed]').first().click();   // ⚠ button.bg-card는 KPI 칩 등도 잡힘 → div.grid 자식으로 한정
// → 툴바 액션 노출. 리스트 뷰 클릭 → document.querySelectorAll('.ag-row-selected').length ≥ 1
```

## 참조
프레임·푸터 양식 [[apfs-grid]] · 그리드 본체 [[apfs-aggrid]] · 단계 액션/선택 SSOT [[apfs-stage-workflow]] · 조립 SOP [[apfs-manage-page]] · 색 [[color-tokens]]
