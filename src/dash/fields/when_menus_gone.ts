/* whenMenusGone — DOM 에 메뉴([role=menu])가 하나도 없을 때 onReady 를 부른다. 메뉴가 남아 있는 동안엔 절대 부르지 않는다.
   쓰는 곳: 수식 블록·인라인 수식을 "+ 삽입" 메뉴로 넣은 직후 편집 모달 자동 열기(RichTextElements useEquationEdit).

   ── 왜 메뉴가 사라질 때까지 기다리나(2026-10-27 실측) ──
   메뉴 항목을 클릭하면 Radix 메뉴는 닫힘 애니메이션(180ms) 동안 DOM 에 남는다. 그 사이 모달이 먼저 열리면,
   애니메이션이 재생되며 메뉴가 마우스 포인터 밑에서 빠질 때 pointerleave → Radix onItemLeave → 메뉴 content.focus()
   로 모달 입력의 포커스를 가져가고, 이어지는 키 입력은 메뉴 typeahead 가 먹는다(첫 글자부터 사라짐).
   애니메이션 시작이 늦는 환경(부하 큰 PC·가려진 창 — 자동화 창에서 1~2초 지연 실측)에서는 예전 600ms 상한을 넘겨
   "메뉴가 남은 채 열기"가 실제로 일어났다 → 상한을 넘기면 열지 않고 포기한다(수식 편집 버튼으로 열 수 있다).
   타이머는 setTimeout(rAF 는 가려진 창에서 throttle 된다), 경과는 Date.now() 기준(백그라운드 타이머 clamp 에도 상한 유지). */

export const MENU_WAIT_INTERVAL_MS = 50;
export const MENU_WAIT_MAX_MS = 5000;

type Options = {
  alive?: () => boolean;      // false 가 되면(컴포넌트 언마운트) 조용히 중단
  hasMenu?: () => boolean;    // 테스트 주입용 — 기본은 DOM 조회
  intervalMs?: number;
  maxWaitMs?: number;
};

const anyMenuInDom = () => !!document.querySelector('[role=menu]');

export function whenMenusGone(
  onReady: () => void,
  { alive = () => true, hasMenu = anyMenuInDom, intervalMs = MENU_WAIT_INTERVAL_MS, maxWaitMs = MENU_WAIT_MAX_MS }: Options = {},
): void {
  const start = Date.now();
  const tick = () => {
    if (!alive()) return;
    if (!hasMenu()) { onReady(); return; }
    if (Date.now() - start >= maxWaitMs) return;   // 끝내 남아 있으면 열지 않는다 — 포커스 탈취보다 수동 열기가 낫다
    setTimeout(tick, intervalMs);
  };
  setTimeout(tick, 0);
}
