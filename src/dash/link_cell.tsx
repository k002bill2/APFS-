/* 셀 링크 — 그리드 셀 값을 상세(팝업·편집 모달)로 들어가는 버튼으로 그린다. 행 더블클릭과 별개의 진입점이다.
   키보드 동치는 그리드 `onCellKeyDown` 의 Enter(그 colId 면 같은 핸들러) — 호출부 책임이다. 이 부품은 클릭만 받는다.
   ⚠ `title` 엔 동작 힌트만 담는다.
   ⚠ 폰트는 inline `font:'inherit'` — preflight:false 라 button 이 UA 기본(13.3px Arial)으로 튄다.
     longhand(`fontWeight`·`fontVariantNumeric`)는 반드시 그 **뒤**에 둔다 — 앞에 두면 shorthand 가 리셋한다(키 순서 함정).
   외관: primary 색 + font-weight 600, 평상시 밑줄 없음 / hover 에만 밑줄(목업 `.linktxt`).
   `color` 를 주면 `text-primary` 대신 그 색 — 상태색이 곧 정보인 셀(custody_confirm 대사 상태).
   접근名 = 보이는 값 그대로, 동작은 `hint`(title → 접근 설명)와 열 머리글이 전달한다(2026-10-30 사용자 결정 — 전 화면 통일).
   aria-label·sr-only 로 이름에 동작을 덧붙이지 않는다 — title 설명과 겹쳐 두 번 낭독된다. 가드: link_cell.test.ts.
   risk_grid 의 팝업 트리거 셀(`PopupTriggerCell` — span + gridcell ARIA, YieldCell 계열)은 다른 계약이라 여기 없다. */
export function LinkCell({ value, hint, onClick, color, tabular }: {
  value: string | number; hint: string; onClick: () => void;
  color?: string;      // 지정하면 text-primary 대신 이 색(상태색이 곧 정보인 셀 — custody_confirm)
  tabular?: boolean;   // 숫자 번호·일자 셀
}) {
  return (
    <button
      type="button" title={hint} onClick={onClick}
      className={`min-w-0 truncate text-left${color ? '' : ' text-primary'} font-semibold no-underline hover:underline cursor-pointer`}
      style={{
        font: 'inherit', fontWeight: 600,
        ...(tabular ? { fontVariantNumeric: 'tabular-nums' } : {}),
        ...(color ? { color } : {}),
        background: 'transparent', border: 0, padding: 0,
      }}>
      {value}
    </button>
  );
}
