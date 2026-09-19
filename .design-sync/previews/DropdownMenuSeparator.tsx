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

/* 구분선 — 항목 묶음 사이 1px(bg-border). relative z-10 이라 슬라이드 하이라이트가 선 아래로 지나간다. */
export function SeparatedActionGroups() {
  return (
    <div style={stage}>
      <DropdownMenu open onOpenChange={() => {}}>
        <DropdownMenuTrigger className={TRIGGER_OUTLINE}>더보기</DropdownMenuTrigger>
        <DropdownMenuContent align="start" style={{ width: 236 }} onOpenAutoFocus={noAutoFocus}>
          <DropdownMenuItem>상세 보기</DropdownMenuItem>
          <DropdownMenuItem>결성조합 정보 수정</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>엑셀 내보내기<DropdownMenuShortcut>⌥D</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuItem>인쇄<DropdownMenuShortcut>⌘P</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem danger>삭제</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
