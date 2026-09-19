import * as React from 'react';
import { Item, ItemHeader, ItemFooter, ItemMedia, ItemContent, ItemTitle, ItemDescription, StatusBadge, Button } from 'apfs-dashboard-offline';

/* ItemFooter — Item 마지막 줄(w-full, justify-between). 갱신 메타 · 보조 액션을 본문 아래로 내린다.
   ItemHeader 와 같은 클래스 세트이며 배치 위치(맨 아래)로 구분한다. */

const P = ['M14 3v5h5', 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z', 'M9 15l2 2 4-4'];
function Glyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

const meta: React.CSSProperties = { fontSize: 11.5, color: 'var(--caption)' };
const divider: React.CSSProperties = { borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 2 };

export function WithFooter() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560 }}>
      <Item variant="muted">
        <ItemMedia variant="icon"><Glyph /></ItemMedia>
        <ItemContent>
          <ItemTitle>2026년 2분기 정기보고</ItemTitle>
          <ItemDescription>어니스트벤처스(주) · 제출 완료, 검토 대기 3건</ItemDescription>
        </ItemContent>
        <ItemFooter style={divider}>
          <span style={meta}>최종 수정 2026-09-12 · 담당 김민수</span>
          <Button variant="outline" size="sm">보고서 열기</Button>
        </ItemFooter>
      </Item>
    </div>
  );
}

export function HeaderAndFooter() {
  return (
    <div style={{ maxWidth: 560 }}>
      <Item variant="muted">
        <ItemHeader>
          <span style={meta}>출자 이행 · CALL-2026-03</span>
          <StatusBadge tone="warning" label="납입 예정" />
        </ItemHeader>
        <ItemMedia variant="icon"><Glyph /></ItemMedia>
        <ItemContent>
          <ItemTitle>스마트농업 성장펀드 2호 3차 캐피털콜</ItemTitle>
          <ItemDescription>요청 48억원 · 모태펀드 지분 40% · 납입기한 2026-09-30</ItemDescription>
        </ItemContent>
        <ItemFooter style={divider}>
          <span style={meta}>통지 발송 2026-09-16</span>
          <Button variant="outline" size="sm">납입 등록</Button>
        </ItemFooter>
      </Item>
    </div>
  );
}
