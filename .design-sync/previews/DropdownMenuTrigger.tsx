import * as React from 'react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuShortcut, Button,
} from 'apfs-dashboard-offline';

/* DropdownMenuTrigger — DropdownMenu 패밀리. 하위 파트는 단독 렌더가 불가("must be used within")
   하므로 부모 조합 전체를 그리고, 이 파일에서는 트리거가 두드러지는 구성(목록 툴바)을 쓴다.
   ⚠ 트리거에 `Button` 을 asChild 로 넣지 않는다(forwardRef/...rest 없음 → Radix 의 onPointerDown·ref
     를 못 받아 무음 미개폐). 트리거 자체에 Button 과 동일한 유틸 className 을 얹는다
     (investment_review_manage.tsx ResultMenu 패턴) — 그래야 옆 버튼들과 높이가 정렬된다.
   ⚠ `onOpenAutoFocus` preventDefault: Content(role=menu)가 focus 를 받으면 tokens.css 의
     `[role="menu"]:focus-visible{box-shadow:none}` 이 shadow-lg 엘리베이션까지 지운다. */


const TRIGGER = 'inline-flex items-center justify-center gap-[7px] cursor-pointer font-[inherit] font-semibold rounded-[9px] whitespace-nowrap border border-transparent transition-colors duration-tok-fast ease-ds px-[11px] py-1.5 text-[12.5px] bg-primary text-primary-foreground';
/* 모달 드롭다운은 react-remove-scroll 이 body 패딩을 0 으로 재계산하므로 여백은 스토리가 갖는다. */
const stage: React.CSSProperties = { padding: '16px 18px' };
const bar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, width: 424,
  padding: '10px 12px', borderRadius: 12,
  border: '1px solid var(--border)', background: 'var(--muted)',
};
const noAutoFocus = (e: Event) => e.preventDefault();

/* 목록 툴바 — 일반 Button 들과 나란히 선 트리거. 열려 있어도(data-[state=open]) 높이·정렬이 흐트러지지 않는다. */
export function ToolbarTrigger() {
  return (
    <div style={stage}>
      <div style={bar}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--muted-foreground)', overflow: 'hidden', whiteSpace: 'nowrap' }}>선택 1건</span>
        <Button variant="outline" size="sm" leadingIcon="refresh">초기화</Button>
        <Button variant="outline" size="sm" leadingIcon="download">엑셀</Button>
        <DropdownMenu open onOpenChange={() => {}}>
          <DropdownMenuTrigger className={TRIGGER}>선택 행 작업</DropdownMenuTrigger>
          <DropdownMenuContent align="start" style={{ width: 236 }} onOpenAutoFocus={noAutoFocus}>
            <DropdownMenuLabel>상주-어니스트 애그테크 투자조합</DropdownMenuLabel>
            <DropdownMenuItem>상세 보기</DropdownMenuItem>
            <DropdownMenuItem>결성조합 정보 수정</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>엑셀 내보내기<DropdownMenuShortcut>⌥D</DropdownMenuShortcut></DropdownMenuItem>
            <DropdownMenuItem danger>삭제</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
