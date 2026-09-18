import * as React from 'react';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, StatusBadge } from 'apfs-dashboard-offline';

/* ItemTitle — 제목 줄(text-sm font-semibold, flex gap-2).
   자체가 flex 라 제목 옆에 배지·코드 같은 인라인 요소를 나란히 놓을 수 있다. */

const P = ['M3 21h18', 'M5 21V10', 'M19 21V10', 'M9 21V10', 'M15 21V10', 'M2.5 10 12 3.5 21.5 10', 'M3 10h18'];
function Glyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

const code: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '.03em', padding: '1px 6px', borderRadius: 6,
  background: 'var(--muted)', color: 'var(--muted-foreground)',
};

export function TitleCompositions() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }}>
      <Item variant="muted">
        <ItemMedia variant="icon"><Glyph /></ItemMedia>
        <ItemContent>
          <ItemTitle>농식품 벤처투자조합 1호<span style={code}>FUND-2024-017</span></ItemTitle>
          <ItemDescription>제목 옆 코드 칩 — ItemTitle 이 flex gap-2 라 인라인 배치된다</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="muted">
        <ItemMedia variant="icon"><Glyph /></ItemMedia>
        <ItemContent>
          <ItemTitle>스마트농업 성장펀드 2호<StatusBadge tone="warning" size="sm" label="관찰" /></ItemTitle>
          <ItemDescription>제목 옆 상태 배지 — 행 오른쪽 Actions 와 역할을 나눠 쓴다</ItemDescription>
        </ItemContent>
        <ItemActions><StatusBadge tone="info" size="sm" label="2분기" /></ItemActions>
      </Item>
      <Item variant="muted">
        <ItemMedia variant="icon"><Glyph /></ItemMedia>
        <ItemContent>
          <ItemTitle>설명 없이 제목만 쓰는 밀집 행</ItemTitle>
        </ItemContent>
      </Item>
    </div>
  );
}
