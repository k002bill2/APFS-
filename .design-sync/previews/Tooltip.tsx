import * as React from 'react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from 'apfs-dashboard-offline';

/* Tooltip — 반전 표면(bg-foreground / text-bg)에 화살표. 반드시 TooltipProvider 안에서 쓴다.
   프리뷰는 `open`(제어형)으로 열린 상태를 고정한다. 아이콘 버튼의 이름표가 주 용도. */

const iconBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
  border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--card)',
  color: 'var(--foreground)', cursor: 'pointer',
};

function DownloadGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function IconButtonTooltip() {
  return (
    <TooltipProvider delayDuration={300}>
      <div style={{ paddingTop: 48 }}>
        <Tooltip open onOpenChange={() => {}}>
          <TooltipTrigger asChild>
            <button type="button" style={iconBtn} aria-label="엑셀 내보내기"><DownloadGlyph /></button>
          </TooltipTrigger>
          <TooltipContent side="top" align="center">엑셀 내보내기</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export function MetricHelpTooltip() {
  return (
    <TooltipProvider delayDuration={150}>
      <div style={{ paddingTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--caption)' }}>의무투자 비율</span>
        <Tooltip open onOpenChange={() => {}}>
          <TooltipTrigger asChild>
            <button type="button" style={{ ...iconBtn, width: 20, height: 20, borderRadius: 999, fontSize: 11, fontWeight: 700 }} aria-label="의무투자 비율 설명">?</button>
          </TooltipTrigger>
          <TooltipContent side="right" align="center">농식품 분야 의무투자 60% 기준</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
