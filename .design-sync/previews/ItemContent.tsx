import * as React from 'react';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, StatusBadge, Button } from 'apfs-dashboard-offline';

/* ItemContent — Item 가운데 본문 열(flex-1 min-w-0 flex-col gap-0.5).
   min-w-0 덕분에 긴 제목/설명이 Media·Actions 를 밀어내지 않고 자기 열 안에서 줄바꿈·말줄임된다. */

const P = ['M3 21h18', 'M5 21V10', 'M19 21V10', 'M9 21V10', 'M15 21V10', 'M2.5 10 12 3.5 21.5 10', 'M3 10h18'];
function Glyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

export function Standard() {
  return (
    <div style={{ maxWidth: 560 }}>
      <Item variant="muted">
        <ItemMedia variant="icon"><Glyph /></ItemMedia>
        <ItemContent>
          <ItemTitle>상주-어니스트 애그테크 투자조합</ItemTitle>
          <ItemDescription>결성 2026-06-10 · 약정 300억 · 운용사 어니스트벤처스(주)</ItemDescription>
        </ItemContent>
        <ItemActions><StatusBadge tone="success" icon="check" label="정상" /></ItemActions>
      </Item>
    </div>
  );
}

export function NarrowTruncation() {
  return (
    <div style={{ width: 380 }}>
      <Item variant="muted">
        <ItemMedia variant="icon"><Glyph /></ItemMedia>
        <ItemContent>
          <ItemTitle>2026년 농림축산식품 창업기술 스케일업 투자조합 3호</ItemTitle>
          <ItemDescription>
            좁은 폭에서도 Media·Actions 를 밀지 않고 본문 열 안에서만 줄바꿈된다. 설명은 2줄까지만 보이고 그 뒤는 말줄임 처리된다.
          </ItemDescription>
        </ItemContent>
        <ItemActions><Button variant="outline" size="sm">상세</Button></ItemActions>
      </Item>
    </div>
  );
}
