import * as React from 'react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from 'apfs-dashboard-offline';

/* DropdownMenu — Radix 기반 드롭다운. APFS 규약:
   - 트리거에 `Button` 을 asChild 로 넣지 않는다(forwardRef/...rest 없음 → 무음 미개폐).
     트리거 자체에 Button 과 동일한 유틸 className 을 얹는다(investment_review_manage.tsx ResultMenu 패턴).
   - 프리뷰는 `open` 제어 prop 으로 열린 상태를 캡처한다(제품에선 비제어).
   - `onOpenAutoFocus` preventDefault 필수 — Radix 가 Content(role=menu)로 focus 를 옮기면
     tokens.css 의 `[role="menu"]:focus-visible{box-shadow:none}` 이 shadow-lg 엘리베이션까지 지운다. */


const TRIGGER = 'inline-flex items-center justify-center gap-[7px] cursor-pointer font-[inherit] font-semibold rounded-[9px] whitespace-nowrap border border-transparent transition-colors duration-tok-fast ease-ds px-[11px] py-1.5 text-[12.5px] bg-primary text-primary-foreground';
const TRIGGER_OUTLINE = 'inline-flex items-center justify-center gap-[7px] cursor-pointer font-[inherit] font-semibold rounded-[9px] whitespace-nowrap border border-border-strong transition-colors duration-tok-fast ease-ds px-[11px] py-1.5 text-[12.5px] bg-card text-foreground';
/* 모달 드롭다운은 react-remove-scroll 이 body 패딩을 0 으로 재계산하므로 여백은 스토리가 갖는다. */
const stage: React.CSSProperties = { padding: '16px 18px' };
const noAutoFocus = (e: Event) => e.preventDefault();

/* 대표 스토리 — 목록 화면(자펀드 정보관리) 행 액션 메뉴. 라벨·구분선·단축키·삭제(danger) 전부. */
export function RowActionsMenu() {
  return (
    <div style={stage}>
      <DropdownMenu open onOpenChange={() => {}}>
        <DropdownMenuTrigger className={TRIGGER}>선택 행 작업</DropdownMenuTrigger>
        <DropdownMenuContent align="start" style={{ width: 252 }} onOpenAutoFocus={noAutoFocus}>
          <DropdownMenuLabel>상주-어니스트 애그테크 투자조합</DropdownMenuLabel>
          <DropdownMenuItem>상세 보기</DropdownMenuItem>
          <DropdownMenuItem>결성조합 정보 수정</DropdownMenuItem>
          <DropdownMenuItem>즐겨찾기 추가</DropdownMenuItem>
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

/* 금액 단위 선택 — 라디오 항목(단일 선택). 선택 표시는 배경 tint + 체크 아이콘(색 비종속, WCAG 1.4.1). */
export function UnitRadioMenu() {
  return (
    <div style={stage}>
      <DropdownMenu open onOpenChange={() => {}}>
        <DropdownMenuTrigger className={TRIGGER_OUTLINE}>단위: 백만원</DropdownMenuTrigger>
        <DropdownMenuContent align="start" style={{ width: 208 }} onOpenAutoFocus={noAutoFocus}>
          <DropdownMenuLabel>금액 표시 단위</DropdownMenuLabel>
          <DropdownMenuRadioGroup value="백만원">
            <DropdownMenuRadioItem value="원">원</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="천원">천원</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="백만원">백만원</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="억원">억원</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
