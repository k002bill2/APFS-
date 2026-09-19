import * as React from 'react';
import { Popover, PopoverTrigger, PopoverContent } from 'apfs-dashboard-offline';

/* Popover — Radix 기반 떠있는 표면(bg-popover / border-border / z-popover 85, body 포털).
   프리뷰는 `open`(제어형)으로 열린 상태를 고정한다. PopoverContent 는 p-0(내부가 패딩 소유). */

const trigger: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 11px',
  border: '1px solid var(--border-strong)', borderRadius: 9, background: 'var(--card)',
  color: 'var(--foreground)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
};
const panel: React.CSSProperties = { padding: 14, display: 'flex', flexDirection: 'column', gap: 10 };
const title: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, color: 'var(--foreground)' };
const rowS: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--muted-foreground)' };
const val: React.CSSProperties = { color: 'var(--foreground)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' };
const divider: React.CSSProperties = { height: 1, background: 'var(--border)' };

function Rows() {
  return (
    <>
      <div style={rowS}><span>약정총액</span><span style={val}>30,000 백만원</span></div>
      <div style={rowS}><span>납입총액</span><span style={val}>18,500 백만원</span></div>
      <div style={rowS}><span>투자잔액</span><span style={val}>11,240 백만원</span></div>
    </>
  );
}

export function FundSummaryPopover() {
  return (
    <Popover open onOpenChange={() => {}}>
      <PopoverTrigger asChild>
        <button type="button" style={trigger}>자펀드 요약</button>
      </PopoverTrigger>
      <PopoverContent align="start" style={{ width: 288 }} onOpenAutoFocus={(e) => e.preventDefault()}>
        <div style={panel}>
          <div style={title}>상주-어니스트 애그테크 투자조합</div>
          <div style={divider} />
          <Rows />
          <div style={divider} />
          <div style={{ fontSize: 11.5, color: 'var(--caption)' }}>기준일자 2026-09-15</div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function RiskAlertPopover() {
  return (
    <Popover open onOpenChange={() => {}}>
      <PopoverTrigger asChild>
        <button type="button" style={trigger}>조기경보 3건</button>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" style={{ width: 300 }} onOpenAutoFocus={(e) => e.preventDefault()}>
        <div style={panel}>
          <div style={title}>조기경보 상세</div>
          <div style={divider} />
          <div style={rowS}><span>의무투자 비율 미달</span><span style={{ ...val, color: 'var(--danger)' }}>경고</span></div>
          <div style={rowS}><span>정기보고 지연(2일)</span><span style={{ ...val, color: 'var(--warning)' }}>주의</span></div>
          <div style={rowS}><span>핵심운용인력 변경</span><span style={val}>확인</span></div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
