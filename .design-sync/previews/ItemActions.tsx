import * as React from 'react';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, Button, IconBtn, StatusBadge, TooltipProvider } from 'apfs-dashboard-offline';

/* ItemActions — Item 오른쪽 액션 슬롯(flex shrink-0 gap-1.5).
   버튼·아이콘버튼·배지 어느 조합이든 본문을 밀지 않고 오른쪽에 고정된다.
   ⚠ label 을 준 IconBtn 은 내부적으로 Tooltip 을 쓰므로 TooltipProvider 안에서 렌더해야 한다(앱은 루트에 하나). */

const P = ['M3 21h18', 'M5 21V10', 'M19 21V10', 'M9 21V10', 'M15 21V10', 'M2.5 10 12 3.5 21.5 10', 'M3 10h18'];
function Glyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

export function ButtonActions() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }}>
      <Item variant="muted">
        <ItemMedia variant="icon"><Glyph /></ItemMedia>
        <ItemContent>
          <ItemTitle>투심보고 승인 요청</ItemTitle>
          <ItemDescription>상주-어니스트 애그테크 투자조합 · 요청자 김민수</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="outline" size="sm">반려</Button>
          <Button variant="primary" size="sm" leadingIcon="check">승인</Button>
        </ItemActions>
      </Item>
      <Item variant="muted">
        <ItemMedia variant="icon"><Glyph /></ItemMedia>
        <ItemContent>
          <ItemTitle>2026년 2분기 정기보고</ItemTitle>
          <ItemDescription>어니스트벤처스(주) · 제출 완료</ItemDescription>
        </ItemContent>
        <ItemActions>
          <StatusBadge tone="success" icon="check" label="완료" />
          <Button variant="outline" size="sm" leadingIcon="download">내려받기</Button>
        </ItemActions>
      </Item>
    </div>
  );
}

export function IconActions() {
  return (
    <TooltipProvider>
    <div style={{ maxWidth: 560 }}>
      <Item variant="muted">
        <ItemMedia variant="icon"><Glyph /></ItemMedia>
        <ItemContent>
          <ItemTitle>농식품 벤처투자조합 1호</ItemTitle>
          <ItemDescription>약정 320억 · 소진율 78.0%</ItemDescription>
        </ItemContent>
        <ItemActions>
          <IconBtn icon="eye" label="명세 보기" size={34} iconSize={15} />
          <IconBtn icon="settings" label="설정" size={34} iconSize={15} />
          <IconBtn icon="more" label="더보기" size={34} iconSize={15} />
        </ItemActions>
      </Item>
    </div>
    </TooltipProvider>
  );
}
