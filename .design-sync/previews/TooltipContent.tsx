import * as React from 'react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from 'apfs-dashboard-offline';

/* TooltipContent — 반전 표면(bg-foreground / text-bg, 11.5px semibold) + 같은 색 Arrow.
   overflow-hidden 금지(화살표가 잘린다). side 로 배치. 단독 렌더 불가 → 조합 전체가 프리뷰. */

const chip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 78, height: 30,
  padding: '0 10px', border: '1px solid var(--border-strong)', borderRadius: 8,
  background: 'var(--card)', color: 'var(--foreground)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
};

export function ContentSides() {
  return (
    <TooltipProvider delayDuration={100}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 38, padding: '40px 24px 16px' }}>
        <Tooltip open onOpenChange={() => {}}>
          <TooltipTrigger asChild><button type="button" style={chip}>top</button></TooltipTrigger>
          <TooltipContent side="top">기준일자 2026-09-15</TooltipContent>
        </Tooltip>
        <Tooltip open onOpenChange={() => {}}>
          <TooltipTrigger asChild><button type="button" style={chip}>bottom</button></TooltipTrigger>
          <TooltipContent side="bottom">정기보고 마감 D-3</TooltipContent>
        </Tooltip>
        <Tooltip open onOpenChange={() => {}}>
          <TooltipTrigger asChild><button type="button" style={chip}>right</button></TooltipTrigger>
          <TooltipContent side="right">수탁 확인 대기</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export function ContentLongText() {
  return (
    <TooltipProvider delayDuration={100}>
      <div style={{ paddingTop: 56 }}>
        <Tooltip open onOpenChange={() => {}}>
          <TooltipTrigger asChild><button type="button" style={{ ...chip, minWidth: 120 }}>의무투자 미달</button></TooltipTrigger>
          <TooltipContent side="top" align="start" style={{ maxWidth: 260 }}>
            농식품 의무투자 비율 60% 미달 — 사유서 제출 대상
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
