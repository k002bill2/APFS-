import * as React from 'react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from 'apfs-dashboard-offline';

/* HoverCardContent — 떠있는 표면(bg-popover / border-border / rounded-card / shadow-md, 기본 w-64 p-4).
   패딩·폭이 이미 있으므로 내용만 넣는다. 단독 렌더 불가 → 부모 HoverCard 조합 전체가 프리뷰. */

const link: React.CSSProperties = {
  border: 0, background: 'transparent', padding: 0, cursor: 'pointer',
  color: 'var(--primary)', fontSize: 13.5, fontWeight: 700,
  textDecoration: 'underline', textUnderlineOffset: 2,
};
const head: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--foreground)' };
const body: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted-foreground)', lineHeight: 1.6 };
const rowS: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--muted-foreground)' };
const val: React.CSSProperties = { color: 'var(--foreground)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' };
const label: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };

export function ContentSurface() {
  return (
    <div style={{ paddingTop: 12 }}>
      <div style={label}>기본 폭(w-64) · align=start</div>
      <HoverCard open onOpenChange={() => {}}>
        <HoverCardTrigger asChild>
          <button type="button" style={link}>정기보고 현황</button>
        </HoverCardTrigger>
        <HoverCardContent align="start" sideOffset={6}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={head}>2026년 3분기 정기보고</div>
            <div style={rowS}><span>제출 완료</span><span style={val}>21 / 24</span></div>
            <div style={rowS}><span>지연</span><span style={{ ...val, color: 'var(--danger)' }}>2건</span></div>
            <div style={rowS}><span>마감</span><span style={val}>2026-10-15</span></div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}

export function ContentWide() {
  return (
    <div style={{ paddingTop: 12 }}>
      <div style={label}>폭 확장(inline width 로 w-64 override)</div>
      <HoverCard open onOpenChange={() => {}}>
        <HoverCardTrigger asChild>
          <button type="button" style={link}>자금집행 계획</button>
        </HoverCardTrigger>
        <HoverCardContent align="start" sideOffset={6} style={{ width: 320 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={head}>10월 자금집행 계획</div>
            <div style={body}>
              출자요청 6건(12,400 백만원)과 회수 배분 2건이 예정돼 있습니다. 수탁 확인 이후
              집행일자가 확정됩니다.
            </div>
            <div style={rowS}><span>예정 집행액</span><span style={val}>12,400 백만원</span></div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
