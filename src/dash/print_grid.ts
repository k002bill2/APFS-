/* 그리드만 인쇄 — 푸터 인쇄(🖨)·⌘P 는 페이지 전체가 아니라 GridFrame 본문(그리드)만 찍는다
   (2026-10-26 사용자 결정 "그리드만 · 표 전체 컬럼"). FooterActions 기본값이자 페이지 ⌘P 바인딩의 SSOT.

   인쇄하는 동안만 켜고, 끝나면 전부 되돌린다:
   1. 표식 — GridFrame 의 `[data-print-area]` 조상 경로에 `data-print-path`, `<html data-printing="grid">`.
      print_grid.css(@media print 전용)가 경로 밖 형제(GNB·LNB·브레드크럼·카드헤더·툴바·푸터·토스트)를 숨긴다.
   2. 전 컬럼 — 영역 안 AG Grid 를 `domLayout:'print'` 로 바꾼다. autoHeight 는 행은 다 그리지만 컬럼 가상화가
      남아 가로 스크롤 밖 컬럼이 DOM 에 없다. print 레이아웃은 전 컬럼을 그린다.
      ⚠ AG Grid React 는 셀을 React state 로 그려 **비동기**다(2026-10-26 실측 37컬럼: 동기 0 · 2프레임 12 · ~500ms 전체).
      그래서 헤더·0행·합계행 셀 수가 표시 컬럼 수에 닿을 때까지 기다린다(시간 대기 금지 — 렌더 속도는 환경마다 다르다).
   3. 선택 체크박스 열 숨김 — 데이터가 아닌 컨트롤 열. CSS 로 숨기면 셀이 absolute 좌표라 44px 구멍이 남아 API 로 끈다.
      고정(pinned) 열도 인쇄 동안 푼다 — print 레이아웃은 본문 행에는 고정 열을 합치지만 **합계(floating)행에는 안 합쳐**
      합계행이 고정 열 폭만큼 왼쪽으로 밀리고 '합계' 라벨이 빠진다(2026-10-26 실측 asset_funding, 3초 대기해도 동일).
   4. 폭 맞춤 — 브라우저 자동 축소는 상한이 있어 넘치면 오른쪽 컬럼이 잘린다(2026-10-26 PDF 실측: 37컬럼 자펀드 관리
      4540px 를 1400px 로 줄여도 A4 세로에서 끝 컬럼 잘림). 그래서 브라우저 축소에 기대지 않고 **인쇄 페이지 실제 폭**에
      직접 맞춘다. JS 는 용지·방향·여백을 모르므로, 인쇄 폭 4px 단위마다 zoom 을 미리 계산한 `min-width` 미디어쿼리
      사다리(<style data-print-zoom>)를 주입하고 브라우저가 실제 페이지 폭으로 단을 고르게 한다 — 인쇄 창에서 용지·방향·
      여백을 바꿔도 미리보기가 다시 맞춰진다. (옛 고정 보수값 세로 700/가로 960 은 A4 가로 1045 에서 오른쪽이 남았다 —
      2026-10-26 사용자 제보.) 줄이기만 하고 확대는 하지 않는다 — 인쇄 폭보다 좁은 표는 그대로.

   복원(멱등)은 afterprint 가 정본이다. Chrome 처럼 print() 가 인쇄 창이 닫힐 때까지 블록하면 afterprint 가 print() 안에서
   와 반환 시점엔 이미 복원돼 있다. Safari 처럼 블록하지 않으면 반환 시점이 곧 인쇄 중이라 **반환으로 복원하면 안 된다**
   (주변 페이지·가상화된 컬럼으로 인쇄됨 — Codex P2). afterprint 미발화 대비로 반환 뒤 첫 사용자 입력(pointerdown·keydown)
   에서도 복원한다 — 인쇄 시트가 떠 있는 동안엔 페이지에 입력이 닿지 않는다. 안 그러면 print 레이아웃이 **화면에** 남는다.
   진행 중 겹친 요청(재클릭·⌘P 연타)은 무시한다 — 두 번째 호출이 print 상태를 '원래 레이아웃'으로 저장하는 것을 막는다(Codex P2). */
import { getGridApi } from 'ag-grid-community';
import type { GridApi } from 'ag-grid-community';
import './print_grid.css';

const SELECTION_COL = 'ag-Grid-SelectionColumn';
/* 폭 맞춤 사다리 — 인쇄 시 `min-width` 는 페이지 실제 폭(여백 제외)으로 판정된다(2026-10-26 CDP printToPDF 실측:
   A4 세로 720 · Letter 가로 980 · A4 가로 1045 · A4 가로 여백 최소 1100). */
const LADDER_MIN = 200;   // 이보다 좁은 인쇄 폭은 없다(A5 세로 ≈ 480)
const LADDER_STEP = 4;    // 그리드 끝 ~ 인쇄 폭 끝 사이 최대 여백(px)
const READY_POLL_MS = 50;
const READY_TIMEOUT_MS = 5000;  // 넘으면 그린 데까지라도 인쇄한다(무한 대기 금지)

type Layout = 'normal' | 'autoHeight' | 'print' | undefined;
type PrintGrid = {
  api: GridApi; wrapper: Element; layout: Layout; hidSelection: boolean;
  pinned: { left: string[]; right: string[] };
};

const ids = (cols: { getColId(): string }[]) => cols.map((c) => c.getColId()).filter((id) => id !== SELECTION_COL);

function collect(wrapper: Element): PrintGrid[] {
  const api = getGridApi(wrapper.parentElement);
  if (!api || api.isDestroyed()) return [];
  return [{
    api, wrapper, layout: api.getGridOption('domLayout'),
    hidSelection: Boolean(api.getColumn(SELECTION_COL)?.isVisible()),
    pinned: { left: ids(api.getDisplayedLeftColumns()), right: ids(api.getDisplayedRightColumns()) },
  }];
}

function enter({ api, hidSelection, pinned }: PrintGrid) {
  if (hidSelection) api.setColumnsVisible([SELECTION_COL], false);
  const all = [...pinned.left, ...pinned.right];
  if (all.length) api.setColumnsPinned(all, null);
  api.setGridOption('domLayout', 'print');
}

function leave({ api, layout, hidSelection, pinned }: PrintGrid) {
  if (api.isDestroyed()) return;   // 인쇄 중 라우트 이동
  api.setGridOption('domLayout', layout);
  if (pinned.left.length) api.setColumnsPinned(pinned.left, 'left');
  if (pinned.right.length) api.setColumnsPinned(pinned.right, 'right');
  if (hidSelection) api.setColumnsVisible([SELECTION_COL], true);
}

/* 렌더 완료 = 헤더 리프 셀, 현재 페이지 첫 본문 행·합계(floating)행 셀(colSpan 반영)이 표시 컬럼 수에 닿음.
   본문 행은 row-index 로 고르지 않는다 — 2페이지면 10부터라 '0행'이 없다(Codex P2). 행이 있어야 하는데(표시 행 >0)
   아직 DOM 에 없으면 대기, 데이터가 0건이면 헤더만 본다. 합계행은 없으면 건너뛴다. */
const spansOf = (row: Element) => Array.from(row.querySelectorAll('.ag-cell')).reduce((n, c) => n + (Number(c.getAttribute('aria-colspan')) || 1), 0);
function rendered({ api, wrapper }: PrintGrid): boolean {
  const want = api.getAllDisplayedColumns().length;
  if (wrapper.querySelectorAll('.ag-header-cell').length < want) return false;
  const body = wrapper.querySelector('.ag-center-cols-container .ag-row');
  if (body ? spansOf(body) < want : api.getDisplayedRowCount() > 0) return false;
  return ['.ag-floating-top-container .ag-row', '.ag-floating-bottom-container .ag-row'].every((sel) => {
    const row = wrapper.querySelector(sel);
    return !row || spansOf(row) >= want;
  });
}

/* 인쇄할 폭 = 영역 안 그리드·표가 차지한 가로 범위(가장 왼쪽~가장 오른쪽). 개별 최대폭이 아니다 — 좌우로 놓인
   그리드(코드관리 440px 트랙 + 간격 + 오른쪽 그리드)는 합친 범위가 넘친다(Codex P2). 일반 <table>(투자기업정보 등)은
   가로 스크롤 래퍼 안에서도 자기 rect 는 전체 폭(min-width)이다.
   ⚠ 한계(2026-10-26 Codex P2, 미반영): 재는 것은 **화면** 배치다. 반응형(`lg:` 등)은 인쇄 페이지 폭으로 다시 판정되므로
   창이 lg 보다 좁아 위아래로 쌓인 좌우 그리드(코드관리)를 **가로** 인쇄하면 인쇄에선 좌우로 펼쳐져 폭이 넘칠 수 있다.
   인쇄 레이아웃은 JS 로 미리 잴 수 없어 일반 해법이 없다 — 그 화면은 창을 넓히거나 세로로 인쇄한다. */
function contentWidth(area: Element, grids: PrintGrid[]): number {
  const rects = [...grids.map((g) => g.wrapper), ...Array.from(area.querySelectorAll('table'))].map((el) => el.getBoundingClientRect());
  if (!rects.length) return 0;
  return Math.max(...rects.map((r) => r.right)) - Math.min(...rects.map((r) => r.left));
}

/* 인쇄 폭 p 마다 zoom = p / 내용폭. **내림**한다 — 1px 이라도 넘치면 브라우저 자동 축소가 페이지 전체에 다시 걸려
   오른쪽이 또 남는다. min-width 오름차순이라 캐스케이드가 '페이지 폭 이하에서 가장 큰 단'을 고른다.
   마지막 단(내용폭 이상) = 1 — 들어가는 표는 확대하지 않는다. 대상은 인쇄 중인 영역 하나(`data-print-target`)뿐이다. */
function zoomLadder(width: number): string {
  const zoom = (page: number) => Math.min(1, Math.floor((page / width) * 10000) / 10000);
  const rule = (page: number, query = ` and (min-width: ${page}px)`) =>
    `@media print${query} { html[data-printing="grid"] [data-print-target] { zoom: ${zoom(page)}; } }`;
  const rungs = [rule(LADDER_MIN, '')];
  for (let p = LADDER_MIN + LADDER_STEP; p < width; p += LADDER_STEP) rungs.push(rule(p));
  rungs.push(rule(Math.ceil(width)));
  return rungs.join('\n');
}

async function waitRendered(grids: PrintGrid[]): Promise<void> {
  const until = Date.now() + READY_TIMEOUT_MS;
  while (!grids.every(rendered) && Date.now() < until) {
    await new Promise((r) => setTimeout(r, READY_POLL_MS));
  }
}

let printing = false;   // 표식~복원 사이 — 겹친 요청 차단

/* 인자를 받지 않는다 — 푸터 onClick·useHotkey 가 이벤트 객체를 첫 인자로 넘기므로, 영역 지정은 printArea 로만 한다.
   첫 [data-print-area] = 페이지 GridFrame(#root 안). 모달이 열려 있어도 body 포털이라 문서 순서상 뒤에 있다. */
export async function printGrid(): Promise<void> {
  const area = document.querySelector<HTMLElement>('[data-print-area]');
  if (!area) { window.print(); return; }   // GridFrame 밖 화면(대시보드 등) = 종전대로 페이지 인쇄
  return printArea(area);
}

/* 지정 영역만 인쇄 — GridFrame 밖(모달 [출력] 등)은 본문을 `data-print-area` 로 감싸고 그 요소를 넘긴다
   (2026-10-26 사용자 결정 "조기경보 재무 팝업 [출력]도 그리드만 — 본문 5섹션"). 그리드 수집·폭 맞춤도 이 영역 안만 본다. */
export async function printArea(area: HTMLElement): Promise<void> {
  if (printing) return;
  printing = true;

  const root = document.documentElement;
  const path: Element[] = [];
  for (let el = area.parentElement; el && el !== document.body; el = el.parentElement) path.push(el);
  /* getGridApi 의 키는 AgGridReact 가 만든 eGridDiv = `.ag-root-wrapper` 의 부모(ag-grid getGridApi 문자열 경로와 동일). */
  const grids = Array.from(area.querySelectorAll('.ag-root-wrapper')).flatMap(collect);

  const ladder = document.createElement('style');
  ladder.setAttribute('data-print-zoom', '');

  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    window.removeEventListener('afterprint', restore);
    window.removeEventListener('pointerdown', restore, true);
    window.removeEventListener('keydown', restore, true);
    grids.forEach(leave);
    path.forEach((el) => el.removeAttribute('data-print-path'));
    ladder.remove();
    area.removeAttribute('data-print-target');
    root.removeAttribute('data-printing');
    printing = false;
  };

  path.forEach((el) => el.setAttribute('data-print-path', ''));
  root.setAttribute('data-printing', 'grid');
  grids.forEach(enter);
  window.addEventListener('afterprint', restore);
  try {
    await waitRendered(grids);
    if (!area.isConnected) { restore(); return; }   // 대기 중 라우트 이동 — 새 화면을 숨긴 채 빈 출력을 내지 않는다(Codex P2)
    const width = contentWidth(area, grids);
    if (width > 0) {
      ladder.textContent = zoomLadder(width);
      document.head.appendChild(ladder);
      area.setAttribute('data-print-target', '');
    }
    window.print();
  } catch (e) {
    restore();
    throw e;
  }
  if (restored) return;   // blocking 브라우저 — afterprint 가 print() 안에서 이미 복원
  window.addEventListener('pointerdown', restore, true);
  window.addEventListener('keydown', restore, true);
}
