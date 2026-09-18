import * as React from 'react';
import { Item, ItemHeader, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, StatusBadge, Button } from 'apfs-dashboard-offline';

/* ItemHeader — Item 안에서 한 줄을 통째로 차지하는(w-full) 상단 행.
   Item 이 flex-wrap 이라 헤더가 첫 줄을 먹고 Media/Content 는 다음 줄로 내려간다.
   왼쪽 라벨 · 오른쪽 상태/메타의 justify-between 배치. */

const P = ['M3 21h18', 'M5 21V10', 'M19 21V10', 'M9 21V10', 'M15 21V10', 'M2.5 10 12 3.5 21.5 10', 'M3 10h18'];
function Glyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

const meta: React.CSSProperties = { fontSize: 11.5, color: 'var(--caption)', letterSpacing: '.02em' };

export function WithHeader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560 }}>
      <Item variant="muted">
        <ItemHeader>
          <span style={meta}>자펀드 · FUND-2024-017</span>
          <StatusBadge tone="success" icon="check" label="운용 중" />
        </ItemHeader>
        <ItemMedia variant="icon"><Glyph /></ItemMedia>
        <ItemContent>
          <ItemTitle>농식품 벤처투자조합 1호</ItemTitle>
          <ItemDescription>약정 320억 · 소진율 78.0% · 운용사 ○○인베스트먼트</ItemDescription>
        </ItemContent>
        <ItemActions><Button variant="outline" size="sm">상세</Button></ItemActions>
      </Item>
      <Item variant="muted">
        <ItemHeader>
          <span style={meta}>조기경보 · 2026-09-18 접수</span>
          <StatusBadge tone="danger" label="즉시 확인" />
        </ItemHeader>
        <ItemMedia variant="icon"><Glyph /></ItemMedia>
        <ItemContent>
          <ItemTitle>△△자산운용 등급 하향</ItemTitle>
          <ItemDescription>관리보수 연체 2기 · 핵심운용인력 이탈 1인</ItemDescription>
        </ItemContent>
        <ItemActions><Button variant="outline" size="sm">조치</Button></ItemActions>
      </Item>
    </div>
  );
}
