import * as React from 'react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from 'apfs-dashboard-offline';

/* TooltipProvider — 툴팁 지연·스킵 정책을 트리 전체에 공급한다(앱은 app.tsx 루트에서 delayDuration=300).
   Provider 자체는 DOM 을 만들지 않으므로 프리뷰는 "Provider 하나가 툴바의 여러 툴팁을 묶는" 구성을 보인다.
   ⚠ Provider 밖에서 Tooltip 을 쓰면 런타임 에러 — 프로바이더가 계약이다. */

const iconBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
  border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--card)',
  color: 'var(--foreground)', cursor: 'pointer',
};
const svg = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

function RefreshGlyph() {
  return (
    <svg {...svg}><path d="M21 12a9 9 0 1 1-3.1-6.8" /><polyline points="21 3 21 9 15 9" /></svg>
  );
}
function DownloadGlyph() {
  return (
    <svg {...svg}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
  );
}
function SlidersGlyph() {
  return (
    <svg {...svg}><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /><circle cx="9" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="8" cy="18" r="2" /></svg>
  );
}

export function ProviderWithToolbar() {
  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={200}>
      <div style={{ paddingTop: 56 }}>
        <div style={{ fontSize: 12, color: 'var(--caption)', marginBottom: 10 }}>
          Provider 1개 · delayDuration 300 — 목록 툴바의 아이콘 버튼들이 같은 지연 정책을 공유
        </div>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: 8,
            border: '1px solid var(--border)', borderRadius: 10, background: 'var(--card)',
          }}
        >
          <Tooltip open onOpenChange={() => {}}>
            <TooltipTrigger asChild><button type="button" style={iconBtn} aria-label="새로고침"><RefreshGlyph /></button></TooltipTrigger>
            <TooltipContent side="bottom">새로고침</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild><button type="button" style={iconBtn} aria-label="엑셀 내보내기"><DownloadGlyph /></button></TooltipTrigger>
            <TooltipContent side="bottom">엑셀 내보내기</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild><button type="button" style={iconBtn} aria-label="열 설정"><SlidersGlyph /></button></TooltipTrigger>
            <TooltipContent side="bottom">열 설정</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
