import * as React from 'react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuRadioGroup, DropdownMenuItem, DropdownMenuRadioItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut,
} from 'apfs-dashboard-offline';

/* DropdownMenu 패밀리 — 하위 파트는 단독 렌더가 불가("must be used within")하므로 부모 조합
   전체를 그리고, 파일마다 해당 파트가 두드러지는 구성을 쓴다.
   ⚠ 트리거에 `Button` 을 asChild 로 넣지 않는다(forwardRef/...rest 없음 → 무음 미개폐).
     트리거 자체에 Button 과 동일한 유틸 className 을 얹는다(investment_review_manage.tsx ResultMenu 패턴).
   ⚠ `onOpenAutoFocus` preventDefault: Content(role=menu)가 focus 를 받으면 tokens.css 의
     `[role="menu"]:focus-visible{box-shadow:none}` 이 shadow-lg 엘리베이션까지 지운다.
   ⚠ 프리뷰는 `open` 제어 prop 으로 열린 상태를 캡처한다(제품에선 비제어). */


const TRIGGER = 'inline-flex items-center justify-center gap-[7px] cursor-pointer font-[inherit] font-semibold rounded-[9px] whitespace-nowrap border border-transparent transition-colors duration-tok-fast ease-ds px-[11px] py-1.5 text-[12.5px] bg-primary text-primary-foreground';
const TRIGGER_OUTLINE = 'inline-flex items-center justify-center gap-[7px] cursor-pointer font-[inherit] font-semibold rounded-[9px] whitespace-nowrap border border-border-strong transition-colors duration-tok-fast ease-ds px-[11px] py-1.5 text-[12.5px] bg-card text-foreground';
/* 모달 드롭다운은 react-remove-scroll 이 body 패딩을 0 으로 재계산하므로 여백은 스토리가 갖는다. */
const stage: React.CSSProperties = { padding: '16px 18px' };
const noAutoFocus = (e: Event) => e.preventDefault();

/* 팝오버 표면 — bg-popover / border-border / rounded-card / shadow-lg, z-popover(85). */
export function MenuSurface() {
  return (
    <div style={stage}>
      <DropdownMenu open onOpenChange={() => {}}>
        <DropdownMenuTrigger className={TRIGGER_OUTLINE}>운용사 관리</DropdownMenuTrigger>
        <DropdownMenuContent align="start" style={{ width: 244 }} onOpenAutoFocus={noAutoFocus}>
          <DropdownMenuLabel>어니스트벤처스(주)</DropdownMenuLabel>
          <DropdownMenuItem>운용사 상세</DropdownMenuItem>
          <DropdownMenuItem>건전성 점검 이력</DropdownMenuItem>
          <DropdownMenuItem>정기보고 접수 현황</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>엑셀 내보내기<DropdownMenuShortcut>⌥D</DropdownMenuShortcut></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
