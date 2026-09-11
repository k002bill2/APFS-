/* 메뉴 항목 슬라이드 하이라이트 — animate-ui(animate-ui.com) MotionHighlight 이식.
   활성 항목에만 layoutId 공유 motion.span을 렌더 → 포커스/hover가 옮겨가면 배경이 미끄러진다
   (SegTabs 인디케이터와 동일 패턴). 4개 메뉴 표면이 이 한 구현을 공유한다:
     ui/dropdown-menu(더보기 등) · ui/context-menu(에디터 표) · shell HistoryMenu(방문기록) · row_context_menu(행 우클릭).

   규약(왜 이렇게 — 어긋나면 슬라이드가 스냅되거나 이중 배경이 된다):
   - 활성 신호: Radix 메뉴는 포인터 이동도 item.focus()를 부르므로 onFocus 하나면 충분하다.
     bespoke 버튼(HistoryMenu·row_context_menu)은 hover가 focus를 유발하지 않으므로 onMouseEnter·onFocus 둘 다에서 setActive.
   - blur/mouseleave에서 절대 active를 지우지 않는다. 지우면 span이 unmount되고(후속 없음) 다음
     hover가 fresh로 mount → 슬라이드가 아니라 스냅. 잔류 하이라이트는 animate-ui 원본 동작이다.
   - active 리셋은 Provider unmount로만 일어난다 → Provider를 반드시 "열림 조건 안쪽"에 둔다
     (Radix Content는 닫힘 시 unmount / HistoryMenu는 {open && …} / row_context_menu는 createPortal JSX 안).
   - 항목 버튼에 `relative isolate` 필수: -z-10 span이 텍스트 뒤·팝오버 배경 앞에 갇히도록 자체
     쌓임맥락 생성. 구분선은 `relative z-10`으로 올려 슬라이드가 선 아래로 지나가게 한다(깜빡임 방지).
   - 비활성 항목에 `z-[1]` 필수(useMenuHighlight의 active로 게이팅): isolate 형제 맥락은 DOM 순서로
     페인트되므로, 활성(도착) 항목이 아래(DOM 후순위)에 있으면 그 안의 슬라이드 span이 위쪽 항목
     텍스트를 덮어 "아래로 내릴 때 윗 글씨가 깜박"인다. 비활성을 양수 레이어로 올리고 활성은 z-auto로
     두면 span(활성 내부, 레이어 0)이 항상 비활성 텍스트(레이어 1) 아래로 지나가 방향 무관하게 안 덮인다.
   - danger 항목은 span을 danger tint로(색 일관성). danger 아니면 accent-surface. */
import * as React from 'react';
import { motion } from 'motion/react';
import { spring } from '../motion/presets';

type Ctx = { groupId: string; active: string | null; setActive: (id: string) => void };
const HighlightCtx = React.createContext<Ctx | null>(null);

/* groupId(layoutId, 인스턴스 고유)와 현재 활성 항목 id를 공급. 메뉴 콘텐츠와 함께 unmount되며 리셋. */
export function MenuHighlightProvider({ children }: { children: React.ReactNode }) {
  const groupId = React.useId();
  const [active, setActive] = React.useState<string | null>(null);
  const ctx = React.useMemo(() => ({ groupId, active, setActive }), [groupId, active]);
  return <HighlightCtx.Provider value={ctx}>{children}</HighlightCtx.Provider>;
}

/* 항목 컴포넌트가 부른다 — 고유 id와, 자신을 활성으로 표시하는 setActive를 돌려준다.
   ⚠ 훅이라 항목마다 별도 컴포넌트에서 호출해야 한다(.map 콜백 안에서 직접 부르면 훅 규칙 위반). */
export function useMenuHighlight() {
  const id = React.useId();
  const ctx = React.useContext(HighlightCtx);
  const setActive = React.useCallback(() => ctx?.setActive(id), [ctx, id]);
  // active: 이 항목이 현재 활성인가. 소비처가 비활성 항목에 z-[1]을 걸어 슬라이드 span이 형제 텍스트를
  // 덮지 않게 게이팅한다(위 규약 "비활성 항목 z-[1]" 참조).
  return { id, setActive, active: ctx?.active === id };
}

/* 활성 항목 뒤에 깔리는 슬라이드 배경. layoutId 공유라 항목 간 이동 시 spring으로 미끄러진다.
   -z-10 + 부모 isolate로 항목 텍스트 뒤·팝오버 배경 앞에 위치. */
export function ItemHighlight({ id, danger }: { id: string; danger?: boolean }) {
  const ctx = React.useContext(HighlightCtx);
  if (!ctx || ctx.active !== id) return null;
  return (
    <motion.span
      layoutId={ctx.groupId}
      className={
        'absolute inset-0 -z-10 rounded-card-sm ' +
        (danger ? 'bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]' : 'bg-accent-surface')
      }
      transition={spring.highlight}
      aria-hidden
    />
  );
}
