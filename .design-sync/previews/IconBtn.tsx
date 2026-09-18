import * as React from 'react';
import { IconBtn, TooltipProvider } from 'apfs-dashboard-offline';

/* IconBtn — GNB/툴바의 아이콘 전용 버튼. label 을 주면 Tooltip 으로 감싸므로 TooltipProvider 안에서 렌더해야 한다(앱은 루트에 하나).
   badge(>0) 는 우상단 danger 배지(99 초과는 99+), active 는 card 표면 + primary 아이콘 + ring 테두리.
   altIcon + swapped 는 같은 슬롯의 두 아이콘을 교차 페이드(테마 토글 등). size = 버튼 한 변, iconSize = 아이콘 크기. */

const rowWrap: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 };
const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--caption)' };

export function Toolbar() {
  return (
    <TooltipProvider delayDuration={300}>
      <div style={field}>
        <span style={label}>GNB 우측 아이콘 버튼</span>
        <div style={{ ...rowWrap, padding: '6px 8px', border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)' }}>
          <IconBtn icon="search" label="통합 검색" />
          <IconBtn icon="bell" label="알림" badge={7} />
          <IconBtn icon="settings" label="설정" />
          <IconBtn icon="more" label="더보기" />
        </div>
      </div>
    </TooltipProvider>
  );
}

export function WithBadge() {
  return (
    <TooltipProvider delayDuration={300}>
      <div style={field}>
        <span style={label}>배지 — 건수 / 99+ 절삭</span>
        <div style={{ ...rowWrap, gap: 20 }}>
          <IconBtn icon="bell" label="알림" badge={3} />
          <IconBtn icon="bell" label="알림" badge={42} />
          <IconBtn icon="bell" label="알림" badge={128} />
        </div>
      </div>
    </TooltipProvider>
  );
}

export function ActiveState() {
  return (
    <TooltipProvider delayDuration={300}>
      <div style={field}>
        <span style={label}>active(선택됨) · size 축</span>
        <div style={{ ...rowWrap, alignItems: 'flex-end' }}>
          <IconBtn icon="filter" label="상세 필터" active pressed />
          <IconBtn icon="filter" label="상세 필터" />
          <IconBtn icon="download" label="엑셀 다운로드" size={32} iconSize={14} />
          <IconBtn icon="refresh" label="새로고침" size={44} iconSize={20} />
        </div>
      </div>
    </TooltipProvider>
  );
}
