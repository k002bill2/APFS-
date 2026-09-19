import * as React from 'react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from 'apfs-dashboard-offline';

/* HoverCardTrigger — 호버 대상(표 셀 안의 이름·링크). 단독 렌더는 "must be used within <HoverCard>"
   이므로 부모 조합 전체가 프리뷰다. DS `Button` 은 forwardRef 가 없어 asChild 트리거로 쓸 수 없다. */

const link: React.CSSProperties = {
  border: 0, background: 'transparent', padding: 0, cursor: 'pointer',
  color: 'var(--primary)', fontSize: 13.5, fontWeight: 700,
  textDecoration: 'underline', textUnderlineOffset: 2,
};
const cellRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--foreground)',
  padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card)', width: 360,
  boxSizing: 'border-box',
};
const head: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--foreground)' };
const body: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted-foreground)', lineHeight: 1.6 };

export function TriggerInTableCell() {
  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--caption)', marginBottom: 6 }}>포트폴리오 목록의 피투자기업 셀</div>
      <HoverCard open onOpenChange={() => {}}>
        <div style={cellRow}>
          <HoverCardTrigger asChild>
            <button type="button" style={link}>그린팜테크(주)</button>
          </HoverCardTrigger>
          <span style={{ color: 'var(--muted-foreground)', fontSize: 12.5 }}>스마트팜 · 2026-03 투자</span>
        </div>
        <HoverCardContent align="start" sideOffset={6}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={head}>그린팜테크(주)</div>
            <div style={body}>투자금액 1,500 백만원 · 지분 12.4% · 평가배수 1.8x. 최근 후속투자 유치로 밸류에이션 상향.</div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
