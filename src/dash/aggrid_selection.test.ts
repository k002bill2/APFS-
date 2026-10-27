/* 숨은 선택 정리(2026-10-27 사용자 결정 — "필터를 바꾸면 선택을 전부 해제"의 데이터 변경 경로).
   선택한 행을 수정·단계 전이해서 필터 조건 밖으로 내보내면, External Filter 는 그 행을 숨기기만 하고 선택은 남긴다
   → 표는 0건인데 "1건 선택됨 · 수정 · 삭제"가 남아 보이지 않는 행에 액션이 걸린다(운용인력 변동관리·자펀드 관리 실측).
   규칙은 필터 변경과 같다: 선택 중 하나라도 화면 결과에서 빠지면 선택을 **전부** 푼다(숨은 것만 푸는 prune 안은 거절됨). */
import { describe, expect, it } from 'vitest';
import type { GridApi } from 'ag-grid-community';
import { dropHiddenSelection, restoreSelection } from './aggrid_selection';

type FakeNode = { id: string; displayed: boolean; selected: boolean };

/* AG Grid 가 쓰는 표면만 흉내 낸다 — `displayed` = rowIndex 가 있다(필터 결과 안), 페이지와는 무관 */
function fakeApi(nodes: FakeNode[]) {
  const calls = { deselectAll: 0 };
  const wrap = (n: FakeNode) => ({
    id: n.id,
    get displayed() { return n.displayed; },
    isSelected: () => n.selected,
    setSelected: (v: boolean) => { n.selected = v; },
  });
  const api = {
    getSelectedNodes: () => nodes.filter((n) => n.selected).map(wrap),
    getRowNode: (id: string) => { const n = nodes.find((x) => x.id === id); return n ? wrap(n) : undefined; },
    deselectAll: () => { calls.deselectAll += 1; nodes.forEach((n) => { n.selected = false; }); },
  };
  return { api: api as unknown as GridApi, calls, selected: () => nodes.filter((n) => n.selected).map((n) => n.id) };
}

describe('dropHiddenSelection — onModelUpdated 에서 숨은 선택을 정리', () => {
  it('선택이 없으면 아무것도 하지 않는다', () => {
    const g = fakeApi([{ id: 'a', displayed: true, selected: false }]);
    dropHiddenSelection({ api: g.api });
    expect(g.calls.deselectAll).toBe(0);
  });

  it('선택한 행이 모두 보이면 그대로 둔다(정렬·다른 행 수정·페이지 이동)', () => {
    const g = fakeApi([{ id: 'a', displayed: true, selected: true }, { id: 'b', displayed: true, selected: true }]);
    dropHiddenSelection({ api: g.api });
    expect(g.calls.deselectAll).toBe(0);
    expect(g.selected()).toEqual(['a', 'b']);
  });

  it('선택한 행 하나라도 필터 결과에서 빠지면 선택을 전부 푼다(보이는 행 포함)', () => {
    const g = fakeApi([{ id: 'a', displayed: false, selected: true }, { id: 'b', displayed: true, selected: true }]);
    dropHiddenSelection({ api: g.api });
    expect(g.calls.deselectAll).toBe(1);
    expect(g.selected()).toEqual([]);
  });
});

describe('restoreSelection — 숨은 행은 되살리지 않는다', () => {
  it('저장된 선택이 모두 보이면 그대로 되살린다(기존 계약)', () => {
    const g = fakeApi([{ id: 'a', displayed: true, selected: false }, { id: 'b', displayed: true, selected: false }]);
    restoreSelection(g.api, ['a', 'b']);
    expect(g.selected()).toEqual(['a', 'b']);
  });

  it('지워진 행(노드 없음)은 조용히 건너뛰고 나머지를 되살린다(기존 계약)', () => {
    const g = fakeApi([{ id: 'b', displayed: true, selected: false }]);
    restoreSelection(g.api, ['a', 'b']);
    expect(g.selected()).toEqual(['b']);
  });

  it('저장된 선택 중 하나라도 필터 밖으로 나갔으면 아무것도 되살리지 않고 전부 푼다', () => {
    /* onModelUpdated 의 deselectAll 직후 같은 틱의 onRowDataUpdated 가 낡은 selIdsRef 로 되살리는 경합 — 자펀드 단계 전이 실측 */
    const g = fakeApi([{ id: 'a', displayed: false, selected: false }, { id: 'b', displayed: true, selected: false }]);
    restoreSelection(g.api, ['a', 'b']);
    expect(g.selected()).toEqual([]);
  });
});
