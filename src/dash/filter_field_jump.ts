/* 적용 칩 → 상세필터 드로어의 그 항목으로 이동(2026-11-02 사용자 요청 "모든 필터의 칩을 누르면 상세필터에 해당 필터 영역으로 이동").

   드로어·DrawerField 는 화면마다 로컬 사본(41화면)이라 공용 prop 배선 대신 **DOM 다리** 하나로 처리한다:
   1. 칩이 속한 GridFrame(`[data-grid-frame]`) 안에서 텍스트가 `상세필터` 인 버튼을 누른다(전 화면 공통 라벨 — 가드 applied_filters.test.ts).
   2. 드로어(`[role=dialog][data-state=open]`)가 뜨면 칩 항목명과 같은 캡션을 찾는다 — 정확일치 → 유일한 앞부분 일치 → 유일한 포함 일치.
      못 찾으면 드로어만 연다(오류 없음 — 칩 항목명과 드로어 라벨이 다른 화면의 안전한 폴백).
   3. 그 항목을 드로어 가운데로 스크롤하고 첫 컨트롤에 초점. 강조 표시(배경·테두리)는 두지 않는다(2026-11-02 사용자 "배경색까진 필요없어" → "border도 필요없어").
   초점은 Radix 의 열림 자동 초점(마운트 직후) 뒤에 줘야 이긴다 → open 관측 후 rAF 2번.
   ⚠ 칩의 '방금 건 필터' 툴팁(flash)을 먼저 꺼야 한다 — 남은 툴팁 레이어가 드로어의 첫 Esc 를 가져간다(FilterChipRow 가 끈다).
   예외 — [상세필터] 버튼이 없고 칸을 펼쳐 둔 화면(GridFrame filterPanel)은 드로어를 열지 않고 패널의 같은 이름 칸에 바로 초점(focusPanelField). */

export const FILTER_TRIGGER_TEXT = '상세필터';
const OPEN_DIALOG = '[role="dialog"][data-state="open"]';
const WAIT_MS = 1500;
const FOCUSABLE = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [role="combobox"], [tabindex]:not([tabindex="-1"])';
/* 캡션 후보 — 요소 **자신의** 텍스트(자식 요소 글자 제외). `<span>계정구분<span>· 데이터 연동 후 적용</span></span>` 처럼
   캡션 안에 보조 표기가 섞인 드로어(스키마 트랙 no-op 캡션)도 잡는다. 컨트롤 안(선택값·버튼 글자)은 캡션이 아니다 */
const CAPTION_TAGS = 'span, label, legend, p, div, h3, h4, h5';
const IN_CONTROL = 'button, select, option, [role="combobox"], [role="option"], [role="listbox"]';

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

/** 캡션 고르기(순수) — 정확일치 우선, 없으면 '앞부분 일치'가 하나뿐일 때, 그것도 없으면 '포함'이 하나뿐일 때. 여럿이면 고르지 않는다(엉뚱한 칸으로 가지 않게) */
export function pickCaption<T extends { text: string }>(cands: readonly T[], label: string): T | null {
  const want = norm(label);
  if (!want) return null;
  const exact = cands.find((c) => c.text === want);
  if (exact) return exact;
  const one = (xs: T[]) => (xs.length === 1 ? xs[0] : null);
  return one(cands.filter((c) => c.text.startsWith(want))) ?? one(cands.filter((c) => c.text.includes(want)));
}

const ownText = (el: Element) => [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join('');

/* 드로어 설명 문구(aria-describedby — Radix SheetDescription)는 캡션이 아니다. "조회 대상 투자기업을 고르는 상세 필터" 가
   칩 '조회 대상'에 앞부분 일치해 초점이 [닫기]로 갔다(2026-11-03 전수 점검, investee-profile) */
function isDescription(el: Element, root: Element): boolean {
  const ids = (root.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  return ids.some((id) => root.ownerDocument.getElementById(id)?.contains(el) ?? false);
}

function captions(root: Element): { el: HTMLElement; text: string }[] {
  return [...root.querySelectorAll<HTMLElement>(CAPTION_TAGS)]
    .filter((el) => !el.closest(IN_CONTROL) && !el.closest('[role="heading"], h2') && !isDescription(el, root))
    .map((el) => ({ el, text: norm(ownText(el)) }))
    .filter((c) => c.text);
}

/** 캡션에서 위로 올라가며 컨트롤을 품은 가장 가까운 칸(대화상자 안에서만) */
function fieldOf(caption: HTMLElement, dialog: Element): { box: HTMLElement; control: HTMLElement | null } {
  for (let el: HTMLElement | null = caption.parentElement; el && el !== dialog; el = el.parentElement) {
    const control = el.querySelector<HTMLElement>(FOCUSABLE);
    if (control) return { box: el, control };
  }
  return { box: caption, control: null };
}

/** 캡션이 없을 때의 대체 경로 — 정확일치만(부분일치 없음).
    ① 태그형(체크 토글)처럼 캡션이 버튼 글자 자체 ② 캡션 없이 aria-label 만 있는 입력칸
    (프로그램관리 '검색기준' 칸 안의 `input[aria-label=검색어]` — 2026-11-03 전수 점검) */
function controlByText(dialog: Element, label: string): HTMLElement | null {
  const want = norm(label);
  return [...dialog.querySelectorAll<HTMLElement>('button, [role="checkbox"], input, select, textarea, [role="combobox"]')]
    .find((b) => b.getAttribute('aria-label') === want || (b.matches('button, [role="checkbox"]') && norm(b.textContent) === want)) ?? null;
}

function focusField(dialog: Element, label: string): boolean {
  const cap = pickCaption(captions(dialog), label);
  const { box, control } = cap ? fieldOf(cap.el, dialog) : { box: null, control: controlByText(dialog, label) };
  const target = control ?? box;
  if (!target) return false;
  (box ?? target).scrollIntoView({ block: 'center' });
  control?.focus({ preventScroll: true });
  return true;
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** 드로어 없이 칸을 펼쳐 둔 화면(GridFrame filterPanel → `[data-filter-panel]`, 자펀드정보관리 2026-11-09) —
    패널 안에서 aria-label 이 **정확히** 같은 칸에 초점. 칸에 보이는 캡션이 없어 aria-label 이 곧 항목명이다 */
function focusPanelField(scope: ParentNode, label: string): boolean {
  const panel = scope.querySelector('[data-filter-panel]');
  const want = norm(label);
  const el = panel ? [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].find((c) => c.getAttribute('aria-label') === want) : undefined;
  if (!el) return false;
  el.scrollIntoView({ block: 'nearest' });
  /* focusVisible — 칩을 마우스로 누른 뒤 스크립트로 옮긴 초점은 버튼(사업연도 PeriodPicker)에 :focus-visible 이 안 붙어
     초점 링이 안 보였다(select 는 붙는다 — 2026-11-10 사용자 지적, Chrome 실측). 미지원 브라우저는 옵션을 무시한다(종전과 같음) */
  el.focus({ preventScroll: true, focusVisible: true } as FocusOptions);
  return true;
}

/** 칩(from) → 같은 GridFrame 의 상세필터를 열고 label 항목으로 이동. 트리거가 없으면 인라인 패널 칸으로, 그것도 없으면 false(아무 일도 안 한다) */
export async function jumpToFilterField(from: Element | null, label: string): Promise<boolean> {
  const scope = from?.closest('[data-grid-frame]') ?? document;
  const trigger = [...scope.querySelectorAll<HTMLButtonElement>('button')].find((b) => norm(b.textContent) === FILTER_TRIGGER_TEXT);
  if (!trigger) return focusPanelField(scope, label);
  trigger.click();
  const t0 = performance.now();
  let dialog: Element | null = null;
  while (performance.now() - t0 < WAIT_MS) {
    await nextFrame();
    dialog = document.querySelector(OPEN_DIALOG);
    if (dialog) break;
  }
  if (!dialog) return false;
  await nextFrame(); await nextFrame();   // Radix 열림 자동 초점 뒤
  return focusField(dialog, label);
}
