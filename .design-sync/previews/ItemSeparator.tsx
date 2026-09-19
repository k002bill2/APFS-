import * as React from 'react';
import { Item, ItemGroup, ItemSeparator, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, StatusBadge } from 'apfs-dashboard-offline';

/* ItemSeparator — ItemGroup 안 행 사이 1px 구분선(role=separator, h-px bg-border).
   테두리 없는 variant="default" Item 사이에 넣어 카드 하나에 목록을 담을 때 쓴다. */

const P: Record<string, string[]> = {
  'file-check': ['M14 3v5h5', 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z', 'M9 15l2 2 4-4'],
  'shield-alert': ['M12 3 5 6v6c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6l-7-3Z', 'M12 8.5v4', 'M12 15.5h.01'],
  calendar: ['M7 3v3', 'M17 3v3', 'M4 8h16', 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z', 'M9 13h2', 'M13 13h2', 'M9 17h2'],
  wallet: ['M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v0', 'M3 7v10a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-3', 'M21 10h-5a2 2 0 0 0 0 4h5a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1Z'],
};

function Glyph({ name }: { name: string }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

const ROWS = [
  { icon: 'file-check', t: '투심보고 승인 요청', d: '상주-어니스트 애그테크 투자조합 · 요청자 김민수', tone: 'info' as const, b: '검토 대기' },
  { icon: 'shield-alert', t: '조기경보 발생', d: '△△자산운용 · 관리보수 연체 2기', tone: 'danger' as const, b: '즉시 확인' },
  { icon: 'calendar', t: '회계마감 D-3', d: '2026년 9월 월별 결산 · 미승인 전표 8건', tone: 'warning' as const, b: '마감 임박' },
  { icon: 'wallet', t: '캐피털콜 통지', d: '스마트농업 성장펀드 2호 · 3차 48억', tone: 'info' as const, b: '납입 예정' },
];

export function DividedList() {
  return (
    <div style={{ maxWidth: 560, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 6 }}>
      <ItemGroup aria-label="오늘의 처리 목록">
        {ROWS.map((r, i) => (
          <React.Fragment key={r.t}>
            {i > 0 && <ItemSeparator />}
            <Item size="sm">
              <ItemMedia variant="icon"><Glyph name={r.icon} /></ItemMedia>
              <ItemContent>
                <ItemTitle>{r.t}</ItemTitle>
                <ItemDescription>{r.d}</ItemDescription>
              </ItemContent>
              <ItemActions><StatusBadge tone={r.tone} size="sm" label={r.b} /></ItemActions>
            </Item>
          </React.Fragment>
        ))}
      </ItemGroup>
    </div>
  );
}

export function SectionSplit() {
  return (
    <div style={{ maxWidth: 560, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 6 }}>
      <ItemGroup aria-label="구분된 섹션">
        <div style={{ padding: '8px 12px 4px', fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', color: 'var(--caption)' }}>오늘</div>
        <Item size="xs"><ItemContent><ItemTitle>2026년 2분기 정기보고 접수 완료</ItemTitle></ItemContent></Item>
        <Item size="xs"><ItemContent><ItemTitle>자펀드 결성총회 자료 업로드</ItemTitle></ItemContent></Item>
        <ItemSeparator />
        <div style={{ padding: '8px 12px 4px', fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', color: 'var(--caption)' }}>어제</div>
        <Item size="xs"><ItemContent><ItemTitle>수탁은행 잔액 대조 — 차이 0원</ItemTitle></ItemContent></Item>
        <Item size="xs"><ItemContent><ItemTitle>운용사 평가 결과 확정 3건</ItemTitle></ItemContent></Item>
      </ItemGroup>
    </div>
  );
}
