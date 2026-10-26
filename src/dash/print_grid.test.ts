// @vitest-environment jsdom
/* 그리드만 인쇄(2026-10-26 사용자 결정 — "인쇄 버튼은 그리드만, 표 전체 컬럼").
   동작: printGrid 가 인쇄 동안만 경로 표식·print 레이아웃·선택열 숨김·폭 맞춤을 켜고, 끝나면 되돌린다.
   소스 가드(진입점·window.print 허용목록)는 print_grid_guard.test.ts — jsdom 에선 test_src 의 import.meta.url 이 깨진다. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Fake = {
  opts: Record<string, unknown>;
  selVisible: boolean;
  cols: number;
  pinned: { left: string[]; right: string[] };
  rowIndex: string;   // 현재 페이지 첫 행 번호(2페이지면 10…)
  lagMs: number;      // >0 이면 본문 셀을 처음엔 1칸만 그리고 lagMs 뒤에 전부 그린다(비동기 렌더 재현)
  lagDone?: boolean;
  setGridOption: ReturnType<typeof vi.fn>;
  setColumnsVisible: ReturnType<typeof vi.fn>;
  setColumnsPinned: ReturnType<typeof vi.fn>;
};
const fakes = new Map<Element, Fake>();
vi.mock('ag-grid-community', () => ({ getGridApi: (el: Element | null) => (el ? apiOf(el) : undefined) }));

/* 가짜 GridApi — domLayout 'print' 로 바뀌면 그 자리에서 전 컬럼 헤더·0행·합계행 셀을 그린다(실제는 비동기).
   실측 재현(2026-10-26 asset_funding): print 레이아웃의 합계(floating bottom)행은 pinned 열 셀을 합치지 않는다
   → 고정 열이 남아 있으면 합계행 셀이 그만큼 모자라다. */
function apiOf(el: Element) {
  const f = fakes.get(el);
  if (!f) return undefined;
  const wrapper = el.querySelector('.ag-root-wrapper')!;
  const displayed = () => f.cols - (f.selVisible ? 0 : 1);
  const render = () => {
    wrapper.innerHTML = '';
    if (f.opts.domLayout !== 'print') return;
    const head = '<div class="ag-header-cell"></div>'.repeat(displayed());
    const lagging = f.lagMs > 0 && !f.lagDone;
    if (lagging) setTimeout(() => { f.lagDone = true; render(); }, f.lagMs);
    const cells = '<div class="ag-cell"></div>'.repeat(lagging ? 1 : displayed());
    const totals = '<div class="ag-cell"></div>'.repeat(displayed() - f.pinned.left.length - f.pinned.right.length);
    wrapper.innerHTML = `<div class="ag-header">${head}</div><div class="ag-center-cols-container"><div class="ag-row" row-index="${f.rowIndex}">${cells}</div></div>`
      + `<div class="ag-floating-bottom-container"><div class="ag-row" row-index="b-0">${totals}</div></div>`;
  };
  const col = (id: string) => ({ getColId: () => id });
  return {
    isDestroyed: () => false,
    getGridOption: (k: string) => f.opts[k],
    setGridOption: f.setGridOption.mockImplementation((k: string, v: unknown) => { f.opts[k] = v; render(); }),
    getColumn: (id: string) => (id === 'ag-Grid-SelectionColumn' ? { isVisible: () => f.selVisible } : null),
    setColumnsVisible: f.setColumnsVisible.mockImplementation((_ids: string[], v: boolean) => { f.selVisible = v; render(); }),
    getAllDisplayedColumns: () => Array.from({ length: displayed() }),
    getDisplayedRowCount: () => 1,
    getDisplayedLeftColumns: () => f.pinned.left.map(col),
    getDisplayedRightColumns: () => f.pinned.right.map(col),
    setColumnsPinned: f.setColumnsPinned.mockImplementation((ids: string[], side: 'left' | 'right' | null) => {
      f.pinned = { left: f.pinned.left.filter((x) => !ids.includes(x)), right: f.pinned.right.filter((x) => !ids.includes(x)) };
      if (side) f.pinned[side] = [...f.pinned[side], ...ids];
      render();
    }),
  };
}

/* 셸 모양 DOM: header(GNB) · nav(LNB) · main > frame > [카드헤더 · 툴바 · area > grid · 푸터] · body 포털(토스트) */
function mountShell({ width = 900 } = {}) {
  document.body.innerHTML = `
    <div id="root"><header id="gnb"></header><div id="layout"><nav id="lnb"></nav>
      <main id="main"><div id="frame"><div id="cardhead"></div><div id="toolbar"></div>
        <div data-print-area="" id="area"><div id="griddiv"><div class="ag-root-wrapper"></div></div></div>
        <div id="footer"></div></div></main></div></div>
    <div id="toast"></div>`;
  const gridDiv = document.getElementById('griddiv')!;
  const f: Fake = {
    opts: { domLayout: 'autoHeight' }, selVisible: true, cols: 5, pinned: { left: ['y'], right: ['z'] }, rowIndex: '0', lagMs: 0,
    setGridOption: vi.fn(), setColumnsVisible: vi.fn(), setColumnsPinned: vi.fn(),
  };
  fakes.set(gridDiv, f);
  const wrapper = gridDiv.querySelector('.ag-root-wrapper') as HTMLElement;
  wrapper.getBoundingClientRect = () => ({ left: 0, right: width, width } as DOMRect);
  return f;
}

/* window.print 대역 — blocking(Chrome)은 인쇄 창이 닫힐 때 print() 안에서 afterprint 를 쏘고 반환한다.
   non-blocking(Safari)은 afterprint 없이 바로 반환하고, 인쇄가 끝나야 afterprint 가 온다. */
const stubPrint = (onPrint: () => void = () => {}, { blocking = true } = {}) =>
  vi.spyOn(window, 'print').mockImplementation(() => {
    onPrint();
    if (blocking) window.dispatchEvent(new Event('afterprint'));
  });

let printGrid: () => Promise<void>;
beforeEach(async () => {
  fakes.clear();
  ({ printGrid } = await import('./print_grid'));
});
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('printGrid — 그리드만 인쇄', () => {
  it('GridFrame 본문(data-print-area)이 없는 화면은 종전대로 페이지 전체를 인쇄한다', async () => {
    document.body.innerHTML = '<div id="root"><p>대시보드</p></div>';
    const print = stubPrint(() => {});
    await printGrid();
    expect(print).toHaveBeenCalledTimes(1);
    expect(document.documentElement.hasAttribute('data-printing')).toBe(false);
  });

  it('인쇄 순간: 조상 경로만 표식, print 레이아웃 + 선택열 숨김 / 끝나면 전부 복원', async () => {
    const f = mountShell();
    let seen: Record<string, unknown> = {};
    stubPrint(() => {
      const ids = Array.from(document.querySelectorAll('[data-print-path]')).map((e) => e.id);
      seen = { printing: document.documentElement.getAttribute('data-printing'), ids, layout: f.opts.domLayout, sel: f.selVisible };
    });
    await printGrid();
    expect(seen).toEqual({ printing: 'grid', ids: ['root', 'layout', 'main', 'frame'], layout: 'print', sel: false });
    // 복원 — 화면에 보이는 상태(레이아웃·선택열)는 반드시 원래대로
    expect(f.opts.domLayout).toBe('autoHeight');
    expect(f.selVisible).toBe(true);
    expect(document.querySelectorAll('[data-print-path]').length).toBe(0);
    expect(document.documentElement.hasAttribute('data-printing')).toBe(false);
  });

  it('복원은 멱등 — afterprint 가 또 와도 두 번 되돌리지 않는다', async () => {
    const f = mountShell();
    stubPrint(() => {});
    await printGrid();
    const calls = f.setGridOption.mock.calls.length;
    window.dispatchEvent(new Event('afterprint'));
    expect(f.setGridOption.mock.calls.length).toBe(calls);
  });

  it('non-blocking print(Safari)는 반환 뒤에도 인쇄 상태를 유지하고 afterprint 에서 복원한다', async () => {
    const f = mountShell();
    stubPrint(() => {}, { blocking: false });
    await printGrid();
    expect(document.documentElement.getAttribute('data-printing')).toBe('grid');   // 아직 인쇄 중
    expect(f.opts.domLayout).toBe('print');
    window.dispatchEvent(new Event('afterprint'));
    expect(document.documentElement.hasAttribute('data-printing')).toBe(false);
    expect(f.opts.domLayout).toBe('autoHeight');
  });

  it('afterprint 가 끝내 안 오면 다음 사용자 입력(pointerdown)에서 복원한다', async () => {
    const f = mountShell();
    stubPrint(() => {}, { blocking: false });
    await printGrid();
    window.dispatchEvent(new Event('pointerdown'));
    expect(f.opts.domLayout).toBe('autoHeight');
    expect(document.documentElement.hasAttribute('data-printing')).toBe(false);
  });

  it('렌더 대기 중 화면을 떠나면(영역 언마운트) 인쇄 창을 열지 않고 표식을 걷는다', async () => {
    mountShell();
    const print = stubPrint(() => {});
    const pending = printGrid();
    document.getElementById('area')!.remove();   // 라우트 이동
    await pending;
    expect(print).not.toHaveBeenCalled();
    expect(document.querySelectorAll('[data-print-path]').length).toBe(0);
    expect(document.documentElement.hasAttribute('data-printing')).toBe(false);
  });

  it('AG Grid 가 아닌 일반 <table> 도 폭을 재서 맞춘다(투자기업정보 등)', async () => {
    mountShell({ width: 0 });
    const area = document.getElementById('area')!;
    area.insertAdjacentHTML('beforeend', '<div class="overflow-x-auto"><table id="native"></table></div>');
    document.getElementById('native')!.getBoundingClientRect = () => ({ left: 0, right: 1400, width: 1400 } as DOMRect);
    let atPrint: string[] = [];
    stubPrint(() => { atPrint = [area.style.getPropertyValue('--print-zoom-portrait'), area.style.getPropertyValue('--print-zoom-landscape')]; });
    await printGrid();
    expect(atPrint).toEqual(['0.5', '0.685']);
  });

  it('2페이지 이후(행 번호가 0이 아님)도 본문 셀이 다 그려질 때까지 기다린다', async () => {
    const f = mountShell();
    f.rowIndex = '10';
    f.lagMs = 120;
    let cells = -1;
    stubPrint(() => { cells = document.querySelectorAll('.ag-center-cols-container .ag-row .ag-cell').length; });
    await printGrid();
    expect(cells).toBe(4);   // 5컬럼 − 선택열
  });

  it('좌우로 놓인 그리드·표는 합친 폭(가장 왼쪽~가장 오른쪽)으로 맞춘다(코드관리 등)', async () => {
    mountShell({ width: 500 });
    const area = document.getElementById('area')!;
    area.insertAdjacentHTML('beforeend', '<table id="side"></table>');
    document.getElementById('side')!.getBoundingClientRect = () => ({ left: 540, right: 1240, width: 700 } as DOMRect);
    let atPrint: string[] = [];
    stubPrint(() => { atPrint = [area.style.getPropertyValue('--print-zoom-portrait'), area.style.getPropertyValue('--print-zoom-landscape')]; });
    await printGrid();
    expect(atPrint).toEqual(['0.564', '0.774']);
  });

  it('겹친 요청(재클릭·⌘P 연타)은 무시한다 — 인쇄 상태를 원래 레이아웃으로 착각하지 않는다', async () => {
    const f = mountShell();
    const print = stubPrint(() => {});
    await Promise.all([printGrid(), printGrid()]);
    expect(print).toHaveBeenCalledTimes(1);
    expect(f.opts.domLayout).toBe('autoHeight');
    await printGrid();   // 복원이 끝나면 다시 인쇄할 수 있다
    expect(print).toHaveBeenCalledTimes(2);
  });

  it('인쇄 동안 고정 열을 풀어 합계행까지 한 줄로 그리고, 끝나면 같은 쪽에 다시 고정한다', async () => {
    const f = mountShell();
    let atPrint: unknown = null;
    stubPrint(() => {
      atPrint = { pinned: f.pinned, totals: document.querySelectorAll('.ag-floating-bottom-container .ag-cell').length };
    });
    await printGrid();
    expect(atPrint).toEqual({ pinned: { left: [], right: [] }, totals: 4 });   // 5컬럼 − 선택열
    expect(f.pinned).toEqual({ left: ['y'], right: ['z'] });
  });

  it('선택열이 원래 없던(숨겨진) 그리드는 인쇄 후에도 다시 켜지 않는다', async () => {
    const f = mountShell();
    f.selVisible = false;
    stubPrint(() => {});
    await printGrid();
    expect(f.setColumnsVisible).not.toHaveBeenCalled();
    expect(f.selVisible).toBe(false);
  });

  /* 방향별 인쇄 폭(세로 700 · 가로 960)에 맞춘 zoom — 인쇄 동안만, 끝나면 제거 */
  const zoomsAtPrint = async (width: number) => {
    mountShell({ width });
    const area = document.getElementById('area')!;
    const read = () => [area.style.getPropertyValue('--print-zoom-portrait'), area.style.getPropertyValue('--print-zoom-landscape')];
    let atPrint: string[] = [];
    stubPrint(() => { atPrint = read(); });
    await printGrid();
    return { atPrint, after: read() };
  };

  it('두 방향 인쇄 폭을 모두 넘는 넓은 표는 방향별 zoom 으로 맞춘다', async () => {
    const { atPrint, after } = await zoomsAtPrint(2800);
    expect(atPrint).toEqual(['0.25', '0.342']);
    expect(after).toEqual(['', '']);
  });

  it('세로 폭만 넘는 표는 세로에만 zoom 을 건다', async () => {
    const { atPrint } = await zoomsAtPrint(800);
    expect(atPrint).toEqual(['0.875', '']);
  });

  it('인쇄 폭 안의 표는 zoom 을 걸지 않는다', async () => {
    const { atPrint } = await zoomsAtPrint(600);
    expect(atPrint).toEqual(['', '']);
  });
});
