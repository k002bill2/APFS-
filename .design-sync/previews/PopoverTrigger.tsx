import * as React from 'react';
import { Popover, PopoverTrigger, PopoverContent } from 'apfs-dashboard-offline';

/* PopoverTrigger — Popover 를 여는 앵커 겸 트리거(data-state 를 받는다). 단독 렌더는
   "must be used within <Popover>" 이므로 부모 조합 전체가 프리뷰다.
   ⚠ DS `Button` 은 forwardRef 가 없어 `asChild` 트리거로 못 쓴다 → 일반 <button> + 폼 컨트롤 스타일. */

const trigger: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  width: 210, height: 34, padding: '0 11px',
  border: '1px solid var(--border-strong)', borderRadius: 9, background: 'var(--card)',
  color: 'var(--foreground)', fontSize: 13.5, textAlign: 'left', cursor: 'pointer',
};
const caret: React.CSSProperties = { fontSize: 10, color: 'var(--muted-foreground)' };
const panel: React.CSSProperties = { padding: 12, display: 'flex', flexDirection: 'column', gap: 8 };
const item: React.CSSProperties = { fontSize: 13, color: 'var(--foreground)', padding: '4px 2px' };
const label: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };

export function TriggerAsChild() {
  return (
    <div>
      <div style={label}>운용사 선택</div>
      <Popover open onOpenChange={() => {}}>
        <PopoverTrigger asChild>
          <button type="button" style={trigger} aria-label="운용사 선택">
            <span>어니스트벤처스(주)</span><span style={caret}>▼</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" style={{ width: 210 }} onOpenAutoFocus={(e) => e.preventDefault()}>
          <div style={panel}>
            <div style={item}>어니스트벤처스(주)</div>
            <div style={item}>농금원파트너스</div>
            <div style={item}>그린애그 인베스트먼트</div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function TriggerStyledDirect() {
  return (
    <div>
      <div style={label}>asChild 없이 트리거에 직접 스타일</div>
      <Popover open onOpenChange={() => {}}>
        <PopoverTrigger style={{ ...trigger, width: 'auto', fontWeight: 600 }} aria-label="기준일자 안내">
          기준일자 2026-09-15
        </PopoverTrigger>
        <PopoverContent align="start" style={{ width: 252 }} onOpenAutoFocus={(e) => e.preventDefault()}>
          <div style={panel}>
            <div style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6 }}>
              회계마감 기준일자입니다. 이 날짜 이후 전표는 다음 분기 보고에 반영됩니다.
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
