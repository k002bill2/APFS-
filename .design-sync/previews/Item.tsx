import * as React from 'react';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, Button, StatusBadge } from 'apfs-dashboard-offline';

/* Item — 범용 리스트/셀렉션 아이템. variant(default·outline·muted) × size(default·sm·xs).
   하위 파트(Media/Content/Title/Description/Actions)와 조합해 한 행을 구성한다.
   `asChild` 로 <a>·<button> 위에 얹으면 [a&]:cursor-pointer 가 붙는다. */

const P: Record<string, string[]> = {
  landmark: ['M3 21h18', 'M5 21V10', 'M19 21V10', 'M9 21V10', 'M15 21V10', 'M2.5 10 12 3.5 21.5 10', 'M3 10h18'],
  wallet: ['M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v0', 'M3 7v10a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-3', 'M21 10h-5a2 2 0 0 0 0 4h5a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1Z'],
  'file-check': ['M14 3v5h5', 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z', 'M9 15l2 2 4-4'],
  'chevron-right': ['M9 5l7 7-7 7'],
};

function Glyph({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

const stack: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 };
const cap: React.CSSProperties = { fontSize: 11.5, color: 'var(--caption)', letterSpacing: '.03em' };

export function Variants() {
  return (
    <div style={stack}>
      <span style={cap}>variant="outline"</span>
      <Item variant="outline">
        <ItemMedia variant="icon"><Glyph name="landmark" /></ItemMedia>
        <ItemContent>
          <ItemTitle>농식품 벤처투자조합 1호</ItemTitle>
          <ItemDescription>결성 320억 · 운용사 ○○인베스트먼트 · 존속 8년</ItemDescription>
        </ItemContent>
        <ItemActions><StatusBadge tone="success" icon="check" label="정상" /></ItemActions>
      </Item>
      <span style={cap}>variant="muted"</span>
      <Item variant="muted">
        <ItemMedia variant="icon"><Glyph name="wallet" /></ItemMedia>
        <ItemContent>
          <ItemTitle>수산 스케일업 펀드</ItemTitle>
          <ItemDescription>결성 150억 · 운용사 △△자산운용 · 조기경보 관찰</ItemDescription>
        </ItemContent>
        <ItemActions><StatusBadge tone="warning" icon="alert-triangle" label="주의" /></ItemActions>
      </Item>
      <span style={cap}>variant="default" (배경 없음)</span>
      <Item>
        <ItemMedia variant="icon"><Glyph name="file-check" /></ItemMedia>
        <ItemContent>
          <ItemTitle>2026년 2분기 정기보고</ItemTitle>
          <ItemDescription>제출 완료 · 검토 대기 3건</ItemDescription>
        </ItemContent>
        <ItemActions><Button variant="outline" size="sm">보고서 열기</Button></ItemActions>
      </Item>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={stack}>
      {([['default', '기본 p-4'], ['sm', 'px-4 py-3'], ['xs', 'px-3 py-2']] as const).map(([s, desc]) => (
        <Item key={s} variant="outline" size={s}>
          <ItemMedia variant="icon"><Glyph name="landmark" /></ItemMedia>
          <ItemContent>
            <ItemTitle>size="{s}"</ItemTitle>
            <ItemDescription>{desc} · 자펀드 목록 밀도 조절</ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </div>
  );
}

export function AsLink() {
  return (
    <div style={stack}>
      <Item asChild variant="outline">
        <a href="#/subfund" style={{ textDecoration: 'none', color: 'inherit' }}>
          <ItemMedia variant="icon"><Glyph name="wallet" /></ItemMedia>
          <ItemContent>
            <ItemTitle>자펀드 정보관리</ItemTitle>
            <ItemDescription>결성조합 137건 · 최근 변경 2026-09-12</ItemDescription>
          </ItemContent>
          <ItemActions><Glyph name="chevron-right" size={16} /></ItemActions>
        </a>
      </Item>
    </div>
  );
}
