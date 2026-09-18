import * as React from 'react';
import { Item, ItemGroup, ItemSeparator, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, Button, StatusBadge } from 'apfs-dashboard-offline';

/* ItemGroup — role=list 세로 스택. Item 사이에 ItemSeparator 를 두면 카드 안 구분선 목록이 된다
   (테두리 없는 variant="default" Item 과 조합해야 이중선이 생기지 않는다). */

const P: Record<string, string[]> = {
  'file-check': ['M14 3v5h5', 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z', 'M9 15l2 2 4-4'],
  'shield-alert': ['M12 3 5 6v6c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6l-7-3Z', 'M12 8.5v4', 'M12 15.5h.01'],
  calendar: ['M7 3v3', 'M17 3v3', 'M4 8h16', 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z', 'M9 13h2', 'M13 13h2', 'M9 17h2'],
  landmark: ['M3 21h18', 'M5 21V10', 'M19 21V10', 'M9 21V10', 'M15 21V10', 'M2.5 10 12 3.5 21.5 10', 'M3 10h18'],
};

function Glyph({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

const ROWS = [
  { icon: 'file-check', title: '투심보고 승인 요청', desc: '상주-어니스트 애그테크 투자조합 · 요청자 김민수', tone: 'info' as const, badge: '검토 대기' },
  { icon: 'shield-alert', title: '조기경보 발생', desc: '△△자산운용 · 관리보수 연체 2기 · 등급 하향', tone: 'danger' as const, badge: '즉시 확인' },
  { icon: 'calendar', title: '회계마감 D-3', desc: '2026년 9월 월별 결산 · 미승인 전표 8건', tone: 'warning' as const, badge: '마감 임박' },
];

export function AlertList() {
  return (
    <div style={{ maxWidth: 560, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 6 }}>
      <ItemGroup aria-label="알림 목록">
        {ROWS.map((r, i) => (
          <React.Fragment key={r.title}>
            {i > 0 && <ItemSeparator />}
            <Item size="sm">
              <ItemMedia variant="icon"><Glyph name={r.icon} /></ItemMedia>
              <ItemContent>
                <ItemTitle>{r.title}</ItemTitle>
                <ItemDescription>{r.desc}</ItemDescription>
              </ItemContent>
              <ItemActions><StatusBadge tone={r.tone} label={r.badge} /></ItemActions>
            </Item>
          </React.Fragment>
        ))}
      </ItemGroup>
    </div>
  );
}

export function SubFundGroup() {
  return (
    <ItemGroup aria-label="자펀드 목록" style={{ gap: 10, maxWidth: 560 }}>
      <Item variant="outline">
        <ItemMedia variant="icon"><Glyph name="landmark" /></ItemMedia>
        <ItemContent>
          <ItemTitle>농식품 벤처투자조합 1호</ItemTitle>
          <ItemDescription>약정 320억 · 소진율 78.0% · 결성 2024-06-10</ItemDescription>
        </ItemContent>
        <ItemActions><Button variant="outline" size="sm">상세</Button></ItemActions>
      </Item>
      <Item variant="outline">
        <ItemMedia variant="icon"><Glyph name="landmark" /></ItemMedia>
        <ItemContent>
          <ItemTitle>스마트농업 성장펀드 2호</ItemTitle>
          <ItemDescription>약정 500억 · 소진율 42.5% · 결성 2026-03-28</ItemDescription>
        </ItemContent>
        <ItemActions><Button variant="outline" size="sm">상세</Button></ItemActions>
      </Item>
    </ItemGroup>
  );
}
