/* 적용 칩 → 필터 패널의 그 칸으로 초점(2026-11-02 사용자 요청 "모든 필터의 칩을 누르면 상세필터에 해당 필터 영역으로 이동").

   2026-11-17 상세필터 드로어 폐기("자펀드정보관리를 참고해서 모든 페이지의 상세필터를 페이지 위치로") — 칸은 전 화면
   GridFrame filterPanel(`[data-filter-panel]`, 공용 filter_panel.tsx)에 펼쳐져 있다. 그래서 드로어를 열고 캡션을 찾던 경로
   ([상세필터] 버튼 클릭 → 캡션 정확/앞부분/포함 일치 → rAF 대기)는 걷었고, 패널 안에서 aria-label 로 바로 찾는다.
   - 칸에 보이는 캡션이 없어 aria-label(= placeholder = 칩 label)이 곧 항목명이다 — **정확일치만**(엉뚱한 칸으로 가지 않게).
   - 범위(시작~종료)·코드+명칭처럼 칩 하나가 여러 칸을 대표하면 `role=group aria-label=<항목>` 그룹의 첫 칸.
   - 강조 표시(배경·테두리)는 두지 않는다(2026-11-02 사용자 "배경색까진 필요없어" → "border도 필요없어").
   ⚠ 칩의 '방금 건 필터' 툴팁(flash)은 FilterChipRow 가 이동 전에 끈다(남은 툴팁 레이어가 Esc 를 먹는다). */

const FOCUSABLE = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [role="combobox"], [tabindex]:not([tabindex="-1"])';

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

/** 패널(scope 안 `[data-filter-panel]`)에서 label 칸을 찾아 초점. 못 찾으면 false(아무 일도 안 한다) */
function focusPanelField(scope: ParentNode, label: string): boolean {
  const panel = scope.querySelector('[data-filter-panel]');
  const want = norm(label);
  if (!panel || !want) return false;
  const byLabel = (sel: string) => [...panel.querySelectorAll<HTMLElement>(sel)].find((c) => c.getAttribute('aria-label') === want);
  /* 범위(시작~종료) 칸은 `role=group aria-label=<항목>` 안의 두 칸 — 칩 하나가 그룹을 가리키므로 그룹의 첫 칸으로 간다(filter_panel PanelRange) */
  const el = byLabel(FOCUSABLE) ?? byLabel('[role="group"][aria-label]')?.querySelector<HTMLElement>(FOCUSABLE) ?? null;
  if (!el) return false;
  el.scrollIntoView({ block: 'nearest' });
  /* focusVisible — 칩을 마우스로 누른 뒤 스크립트로 옮긴 초점은 버튼(사업연도 PeriodPicker)에 :focus-visible 이 안 붙어
     초점 링이 안 보였다(select 는 붙는다 — 2026-11-10 사용자 지적, Chrome 실측). 미지원 브라우저는 옵션을 무시한다(종전과 같음) */
  el.focus({ preventScroll: true, focusVisible: true } as FocusOptions);
  return true;
}

/** 칩(from) → 같은 GridFrame 의 필터 패널 label 칸으로 초점. 호출부(FilterChipRow)는 Promise 계약 그대로 */
export async function jumpToFilterField(from: Element | null, label: string): Promise<boolean> {
  return focusPanelField(from?.closest('[data-grid-frame]') ?? document, label);
}
