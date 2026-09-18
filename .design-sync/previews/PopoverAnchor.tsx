import * as React from 'react';
import { Popover, PopoverTrigger, PopoverAnchor, PopoverContent } from 'apfs-dashboard-offline';

/* PopoverAnchor — 트리거와 위치 기준을 분리한다(작은 아이콘 버튼으로 열지만 팝오버는 필드 전체 폭에 맞춰 뜬다).
   단독 렌더 불가 → 부모 Popover 조합 전체가 프리뷰. */

const fieldRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  width: 300, height: 34, padding: '0 6px 0 11px',
  border: '1px solid var(--border-strong)', borderRadius: 9, background: 'var(--card)',
  color: 'var(--foreground)', fontSize: 13.5, boxSizing: 'border-box',
};
const iconBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 24, padding: '0 8px',
  border: '1px solid var(--border)', borderRadius: 6, background: 'var(--muted)', color: 'var(--foreground)',
  fontSize: 11.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
};
const panel: React.CSSProperties = { padding: 12, display: 'flex', flexDirection: 'column', gap: 8 };
const rowS: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--muted-foreground)' };
const val: React.CSSProperties = { color: 'var(--foreground)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' };
const label: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };

export function AnchoredToField() {
  return (
    <div>
      <div style={label}>자펀드명 — 팝오버는 아이콘이 아니라 필드 폭에 정렬</div>
      <Popover open onOpenChange={() => {}}>
        <PopoverAnchor asChild>
          <div style={fieldRow}>
            <span>상주-어니스트 애그테크 투자조합</span>
            <PopoverTrigger asChild>
              <button type="button" style={iconBtn} aria-label="자펀드 명세 보기">명세</button>
            </PopoverTrigger>
          </div>
        </PopoverAnchor>
        <PopoverContent align="start" sideOffset={6} style={{ width: 300 }} onOpenAutoFocus={(e) => e.preventDefault()}>
          <div style={panel}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--foreground)' }}>자펀드 명세</div>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <div style={rowS}><span>결성일</span><span style={val}>2026-06-10</span></div>
            <div style={rowS}><span>존속기간</span><span style={val}>8년</span></div>
            <div style={rowS}><span>모태 출자비율</span><span style={val}>40.0%</span></div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
