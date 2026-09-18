import * as React from 'react';
import { Popover, PopoverTrigger, PopoverContent } from 'apfs-dashboard-offline';

/* PopoverContent — 떠있는 표면 자체(bg-popover / border-border / rounded-card / shadow-lg, z-popover 85).
   p-0 이므로 패딩은 내용이 소유한다. side / align 으로 배치. 단독 렌더 불가 → 부모 조합 전체가 프리뷰. */

const trigger: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 11px',
  border: '1px solid var(--border-strong)', borderRadius: 9, background: 'var(--card)',
  color: 'var(--foreground)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
};
const panel: React.CSSProperties = { padding: 14, display: 'flex', flexDirection: 'column', gap: 10 };
const head: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, color: 'var(--foreground)' };
const body: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted-foreground)', lineHeight: 1.7 };
const divider: React.CSSProperties = { height: 1, background: 'var(--border)' };
const label: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };

export function ContentSurface() {
  return (
    <div>
      <div style={label}>side=bottom · align=start (기본)</div>
      <Popover open onOpenChange={() => {}}>
        <PopoverTrigger asChild>
          <button type="button" style={trigger}>의무투자 현황</button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} style={{ width: 296 }} onOpenAutoFocus={(e) => e.preventDefault()}>
          <div style={panel}>
            <div style={head}>의무투자 이행 현황</div>
            <div style={divider} />
            <div style={body}>
              농식품 분야 의무투자 비율 60% 기준, 현재 이행률 52.4%입니다. 미달 자펀드는 조기경보
              대상으로 분류되어 정기보고 시 사유서를 제출해야 합니다.
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--caption)' }}>기준일자 2026-09-15 · 대상 24개 조합</div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ContentSideRight() {
  return (
    <div style={{ paddingTop: 12 }}>
      <div style={label}>side=right · align=center</div>
      <div style={{ height: 28 }} />
      <Popover open onOpenChange={() => {}}>
        <PopoverTrigger asChild>
          <button type="button" style={trigger}>수탁 확인</button>
        </PopoverTrigger>
        <PopoverContent side="right" align="center" sideOffset={8} style={{ width: 240 }} onOpenAutoFocus={(e) => e.preventDefault()}>
          <div style={panel}>
            <div style={head}>수탁 확인 대기</div>
            <div style={body}>3건이 수탁은행 확인 대기 상태입니다. 확인 후 자금집행이 가능합니다.</div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
