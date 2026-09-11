---
name: apfs-stage-workflow
description: APFS 리스트 화면의 "행 선택 → 그 행의 단계(심사단계·승인상태 등)에 맞는 컨텍스트 액션 버튼 노출 → 액션이 단계를 전이" 패턴(공고관리/자펀드관리 패턴). 심사단계·상태 전이·워크플로우·승인/취소/확정 버튼·단계별 작업 버튼·생애주기 관리 화면을 만들거나 수정할 때 사용. Use when a list row's stage/status gates which action buttons appear and those actions transition the row's stage.
---

# apfs-stage-workflow

**행(라디오) 선택 → 툴바 좌측에 그 단계의 가능한 작업만 등장 → 작업이 단계를 전이 + 목록·합계 갱신.** 단계 셀은 **상태 표시 전용**(클릭 금지). 목업이 "공고관리 컨텍스트 액션 패턴"이라 부르는 것.

- **골드 레퍼런스**: `src/dash/subfund_manage.tsx` — 심사단계 `신청→선정→결성`, `신청·선정→취소`. 4단계 전부 데모 행 포함.

## 핵심 규약 (CRITICAL)
1. **전이는 오직 컨텍스트 액션으로.** 단계 셀(`StatusBadge` cellRenderer)에 onClick을 달지 않는다. 더블클릭 수정 진입도 단계 전이엔 쓰지 않는다.
2. **단일 선택 + 안정 id.** `rowSelection={{mode:'singleRow',checkboxes:true,enableClickSelection:true}}` + `getRowId={(p)=>p.data.id}`. 전이로 `rowData`가 바뀌어도 선택이 유지돼 **새 단계의 액션이 자동으로 갱신**된다(선택 해제하지 말 것).
3. **액션 맵은 단계별 배열 하나로.** primary는 단계당 **1개**(주 전이), 나머지 outline. 액션 라벨은 업무 동사("선정조합 등록"·"결성 확정"·"신청취소"). 말단 단계(취소)는 빈 배열 — **안내 캡션 없음**(2026-09-08 사용자 결정으로 제거).
4. **툴바 좌 슬롯은 경합한다**: `selected ? <selbar> : <필터칩>`. selbar = 단계 배지(`size="lg" dot={false}`) + 전이 액션 버튼들 + (**opt-in**) 공통 조회(`명세`, 단계 무관) + `선택 해제`. **명세 버튼은 고정이 아니라 opt-in**(2026-09-11 결정) — 명세 팝업을 포함한 페이지만 넣고, 아니면 생략. **대상명(자펀드명)은 넣지 않는다** — 선택 행에서 이미 보임(2026-09-08 결정).
5. **전이 = 불변 patch + toast.** `patchRow(id, {stg, ...부수효과})`. 부수효과는 도메인 정합(예: 취소→조합상태 '-', 결성 확정→결성일=오늘·운영중).
6. **모달을 여는 액션**은 단계에 따라 **제목이 달라진다** → `RowFormModal title={...}` prop. 저장 콜백이 patch + 전이를 함께 수행(`saveSelect(f, target)`).
7. **신규 등록 액션**(헤더 우측 primary)은 첫 단계 행을 **선두 삽입** + `setSelId(newId)` → 다음 액션이 바로 보인다.
8. 합계행이 있으면 `useMemo` 재계산(→[[apfs-aggrid]] 계약4). 색은 단계 tone 맵(`Record<Stage,Tone>`)으로만(→[[color-tokens]]).
9. **선택 SSOT = React `selId`, 그리드는 따라간다** (Codex 리뷰 반영 2026-09-08). 그리드 선택은 두 시점에 되돌린다: ① `onGridReady`(카드뷰→리스트 복귀 등 재마운트) ② `onRowDataUpdated`(신규 등록 선두 삽입 — `rowData` 반영 후 노드가 생기므로 이때만 잡힌다). 둘 다 `selIdRef.current`를 읽어 `api.getRowNode(id)?.setSelected(true, true)`. 이걸 빼면 "툴바는 선택됐는데 라디오는 빈" 불일치. `선택 해제`는 `deselectAll()` → `onSelectionChanged`가 `selId`를 null로.
10. **읽기전용 조회(`명세`)는 액션 맵 밖 · opt-in**: 명세 팝업을 포함할 때만 전 단계 공통 버튼 + 행 더블클릭으로 진입(→[[apfs-spec-popup]]). 명세 미포함 페이지는 버튼·`onRowDoubleClicked` 둘 다 생략. 더블클릭을 수정 진입에 쓰지 않는다.

## 코드 골격 (골드 발췌)
```tsx
export type Stage = '신청' | '선정' | '결성' | '취소';
const STAGE_TONE: Record<Stage, Tone> = { 신청: 'info', 선정: 'primary', 결성: 'success', 취소: 'warning' };

// 단계 셀 — 표시 전용
{ field: 'stg', headerName: '심사단계', pinned: 'left',
  cellRenderer: (p) => p.node.rowPinned ? null : <StatusBadge tone={STAGE_TONE[p.value]} label={p.value} size="sm" /> }

// 선택·전이
const selected = selId ? rows.find((r) => r.id === selId) ?? null : null;
const patchRow = (id, patch) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
const toStage = (ns: Stage, msg: string) => { if (!selected) return; patchRow(selected.id, { stg: ns }); toast.success(msg); };

// 단계별 액션 맵 — primary 1개, 말단은 []
const stageActs = !selected ? [] : ({
  신청: [{ label: '선정조합 등록', primary: true, run: () => setModal({ kind: 'select', target: '선정' }) },
         { label: '신청취소', run: () => toStage('취소', '신청이 취소되었습니다') }],
  선정: [{ label: '결성 확정', primary: true, run: confirmFormation }, { label: '수정', run: () => setModal({ kind: 'select', target: '선정' }) },
         { label: '선정취소', run: () => toStage('취소', '선정이 취소되었습니다') }],
  결성: [{ label: '수정', run: () => setModal({ kind: 'formEdit' }) }],
  취소: [],
} as Record<Stage, Act[]>)[selected.stg];

// 툴바 좌 — 선택 시 selbar, 아니면 필터칩
toolbarLeft={selected
  ? <><StatusBadge tone={STAGE_TONE[selected.stg]} label={selected.stg} size="lg" dot={false} />
      {stageActs.map((a) => <Button key={a.label} variant={a.primary ? 'primary' : 'outline'} size="sm" onClick={a.run}>{a.label}</Button>)}
      <Button variant="outline" size="sm" leadingIcon="file" onClick={() => setModal({ kind: 'spec' })}>명세</Button>   {/* 단계 무관 조회 — 액션 맵 밖 */}
      <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button></>
  : <>{STAGES.map((s) => <FilterChip …>{s}</FilterChip>)}</>}
```

## 안티패턴
- 단계 셀 클릭으로 팝업/전이 → 오터치 전이. 금지.
- 전이 후 `deselectAll()` → 사용자가 다음 액션을 위해 다시 선택해야 함. 유지할 것.
- 액션 버튼을 행마다 셀에 그리기 → 35컬럼 가로스크롤에서 안 보임 + 단계별 분기 중복. 툴바 1곳.
- 단계 문자열을 여러 곳에 하드코딩 → `Stage` 유니온 + 액션 맵 SSOT.
- **드롭다운형 액션 버튼(예: `투심결과 입력 ▾`)을 `<DropdownMenuTrigger asChild><Button>`으로 감싸기** → `UI.Button`은 `...rest`/`forwardRef`가 없어 Radix `onPointerDown`·ref가 유실돼 **메뉴가 안 열린다**(2026-09-11 실측). `DropdownMenuTrigger`에 스타일을 **직접** 얹되, 옆 selbar 버튼과 높이를 맞추려면 **`UI.Button size="sm"`의 유틸 클래스를 그대로 복제**(`ui-btn ui-<variant> inline-flex items-center justify-center gap-[7px] font-[inherit] font-semibold rounded-[9px] whitespace-nowrap border border-transparent transition-colors duration-tok-fast ease-ds px-[11px] py-1.5 text-[12.5px]` + variant 색). **고정 `height` 금지** — 높이는 padding+line-height(sm=29px)에서 나오므로 `height:34`류를 주면 옆 버튼과 어긋난다. 아이콘 `size={14}`.

## 검증 (aside repl)
```js
await page.locator('.ag-pinned-left-cols-container .ag-row').first().locator('.ag-cell').nth(1).click(); // ⚠ .ag-row 클릭은 선택 안 됨
// → document.querySelectorAll('.ag-row-selected').length ≥ 1, 툴바에 그 단계 액션만 노출
await page.getByRole('button', { name: '신청취소' }).click();
// → 첫 행 배지 '취소', [data-sonner-toast] 텍스트, 액션 [] 로 재계산
```
전 단계 경로(신청→선정→결성, 신청/선정→취소)를 각 1회 이상 실행. 합계행 재계산 확인.

## 참조
조립 SOP [[apfs-manage-page]] · 그리드 본체 [[apfs-aggrid]] · 모달 [[apfs-form-modal]] · 골격 [[apfs-grid]] · 색 [[color-tokens]]
