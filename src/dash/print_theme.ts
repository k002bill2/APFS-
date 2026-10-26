/* 인쇄 = 라이트 테마 — 다크모드여도 종이에는 라이트로 찍는다(2026-10-26 사용자 요청 "다크모드에서 인쇄시 라이트모드로").
   다크 출력은 배경 그래픽을 끈 기본 인쇄에서 흰 종이에 밝은 글자가 남아 거의 안 보인다.

   beforeprint/afterprint 전역 리스너라 인쇄 경로를 가리지 않는다 — 푸터 🖨·⌘P(printGrid 의 window.print),
   GridFrame 밖 화면(대시보드)의 브라우저 ⌘P·메뉴 인쇄, 모달 [출력] 버튼 모두.
   - `html.dark` 클래스만 뗐다 붙인다. 색은 전부 tokens.css `:root`/`.dark` 토큰과 Tailwind `dark:`(darkMode:class)라
     클래스 하나로 그리드(apfsTheme 파라미터도 var(--…))까지 라이트가 된다.
   - React `setTheme` 을 거치지 않는다 — app.tsx 가 테마 변경마다 `apfs.theme` 을 저장해 인쇄 한 번에 사용자 설정이 바뀐다.
   - 복원(멱등)은 afterprint 가 정본, 미발화 대비로 인쇄 뒤 첫 입력(pointerdown·keydown)에서도 되돌린다
     (print_grid.ts 와 같은 이유 — 인쇄 시트가 떠 있는 동안엔 페이지에 입력이 닿지 않는다).
   - 이미 인쇄 중인데 beforeprint 가 또 오면 무시한다 — 두 번째가 '라이트'를 원래 상태로 기록하는 것을 막는다. */
const INPUTS = ['pointerdown', 'keydown'] as const;

export function installPrintTheme(): () => void {
  const root = document.documentElement;
  let printing = false;
  let wasDark = false;

  const restore = () => {
    if (!printing) return;   // 이미 복원 — 늦은 afterprint 가 그새 바뀐 테마를 덮어쓰지 않는다
    printing = false;
    for (const t of INPUTS) window.removeEventListener(t, restore, true);
    if (wasDark) root.classList.add('dark');
  };
  const enter = () => {
    if (printing) return;
    printing = true;
    wasDark = root.classList.contains('dark');
    root.classList.remove('dark');
    for (const t of INPUTS) window.addEventListener(t, restore, true);
  };

  window.addEventListener('beforeprint', enter);
  window.addEventListener('afterprint', restore);
  return () => {
    restore();
    window.removeEventListener('beforeprint', enter);
    window.removeEventListener('afterprint', restore);
  };
}
