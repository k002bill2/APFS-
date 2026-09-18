import * as React from 'react';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription } from 'apfs-dashboard-offline';

/* ItemDescription — 보조 설명(<p>, text-[13px] muted-foreground, **line-clamp-2**).
   preflight:false 환경이라 <p> UA 마진을 my-0 로 직접 눌러 둔 파트다. 3줄 이상 텍스트는 2줄에서 말줄임. */

const P = ['M14 3v5h5', 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z', 'M9 15l2 2 4-4'];
function Glyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

const cap: React.CSSProperties = { fontSize: 11.5, color: 'var(--caption)', letterSpacing: '.03em' };

export function ClampAndShort() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520 }}>
      <span style={cap}>한 줄 메타</span>
      <Item variant="muted">
        <ItemMedia variant="icon"><Glyph /></ItemMedia>
        <ItemContent>
          <ItemTitle>2026년 2분기 정기보고</ItemTitle>
          <ItemDescription>제출 2026-07-15 · 검토 대기 3건</ItemDescription>
        </ItemContent>
      </Item>
      <span style={cap}>2줄 초과 → line-clamp-2 말줄임</span>
      <Item variant="muted">
        <ItemMedia variant="icon"><Glyph /></ItemMedia>
        <ItemContent>
          <ItemTitle>조기경보 조치계획 제출 요청</ItemTitle>
          <ItemDescription>
            △△자산운용은 관리보수 연체 2기 및 핵심운용인력 1인 이탈로 조기경보 지표 2개가 동시에 발생하여 등급이 하향되었습니다.
            규약 제32조에 따라 30일 이내 조치계획서를 제출해야 하며, 미제출 시 신규 출자사업 참여가 제한됩니다.
          </ItemDescription>
        </ItemContent>
      </Item>
    </div>
  );
}
