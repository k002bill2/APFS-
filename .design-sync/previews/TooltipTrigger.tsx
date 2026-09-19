import * as React from 'react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from 'apfs-dashboard-offline';

/* TooltipTrigger — 호버·포커스 양쪽에서 툴팁을 띄우는 대상. 단독 렌더는 "must be used within <Tooltip>"
   이므로 Provider + Root 조합 전체가 프리뷰다. DS `Button` 은 forwardRef 가 없어 asChild 트리거로 못 쓴다
   (무음으로 안 열림) → 일반 <button> 에 직접 스타일. */

const iconBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
  border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--card)',
  color: 'var(--foreground)', cursor: 'pointer',
};

function BellGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function TriggerAsChildIconButton() {
  return (
    <TooltipProvider delayDuration={300}>
      <div style={{ paddingTop: 48 }}>
        <div style={{ fontSize: 12, color: 'var(--caption)', marginBottom: 8 }}>asChild — 셸 알림 버튼</div>
        <Tooltip open onOpenChange={() => {}}>
          <TooltipTrigger asChild>
            <button type="button" style={iconBtn} aria-label="알림센터"><BellGlyph /></button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">알림센터 · 미확인 3건</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export function TriggerOnText() {
  return (
    <TooltipProvider delayDuration={150}>
      <div style={{ paddingTop: 48 }}>
        <div style={{ fontSize: 12, color: 'var(--caption)', marginBottom: 8 }}>텍스트(표 헤더 약어)에 직접</div>
        <Tooltip open onOpenChange={() => {}}>
          <TooltipTrigger
            style={{
              border: 0, background: 'transparent', padding: 0, cursor: 'help',
              color: 'var(--foreground)', fontSize: 13, fontWeight: 700,
              textDecoration: 'underline dotted', textUnderlineOffset: 3,
            }}
          >
            IRR
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start">내부수익률 — 현금흐름 기준 연환산 수익률</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
