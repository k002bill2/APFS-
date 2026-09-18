import * as React from 'react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from 'apfs-dashboard-offline';

/* HoverCard — 링크/이름에 호버하면 요약 카드를 미리 보여준다(bg-popover, w-64 p-4, z-popover 85, body 포털).
   프리뷰는 `open`(제어형)으로 열린 상태를 고정한다. */

const link: React.CSSProperties = {
  border: 0, background: 'transparent', padding: 0, cursor: 'pointer',
  color: 'var(--primary)', fontSize: 13.5, fontWeight: 700,
  textDecoration: 'underline', textUnderlineOffset: 2,
};
const head: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--foreground)' };
const body: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted-foreground)', lineHeight: 1.6 };
const rowS: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--muted-foreground)' };
const val: React.CSSProperties = { color: 'var(--foreground)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' };

export function GpHoverCard() {
  return (
    <div style={{ paddingTop: 12 }}>
      <HoverCard open onOpenChange={() => {}} openDelay={120}>
        <HoverCardTrigger asChild>
          <button type="button" style={link}>어니스트벤처스(주)</button>
        </HoverCardTrigger>
        <HoverCardContent align="start" sideOffset={6}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={head}>운용사 요약</div>
            <div style={body}>누적 결성 · 투자 성과 · 조기경보 상태를 호버로 미리 봅니다.</div>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <div style={rowS}><span>운용 조합</span><span style={val}>4개</span></div>
            <div style={rowS}><span>누적 결성액</span><span style={val}>112,000 백만원</span></div>
            <div style={rowS}><span>조기경보</span><span style={{ ...val, color: 'var(--warning)' }}>주의 1건</span></div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
