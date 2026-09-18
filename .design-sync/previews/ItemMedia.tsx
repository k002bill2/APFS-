import * as React from 'react';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, StatusBadge } from 'apfs-dashboard-offline';
import { Landmark, Wallet, TriangleAlert } from 'lucide-react';

/* ItemMedia — Item 좌측 시각 슬롯. variant:
   default(아이콘만, 20px) · icon(38px 박스 + 테두리/배경, svg 18px) · image(40px 정사각 <img>, object-cover). */

const LOGO = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">' +
  '<rect width="80" height="80" fill="#2D7846"/><path d="M40 16c10 8 16 16 16 26a16 16 0 0 1-32 0c0-10 6-18 16-26z" fill="#7BB93C"/>' +
  '<rect x="36" y="46" width="8" height="20" fill="#0E963B"/></svg>');

const stack: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 };
const cap: React.CSSProperties = { fontSize: 11.5, color: 'var(--caption)', letterSpacing: '.03em' };

export function Variants() {
  return (
    <div style={stack}>
      <span style={cap}>variant="icon" — 테두리 박스 + 18px 아이콘</span>
      <Item variant="outline">
        <ItemMedia variant="icon"><Landmark /></ItemMedia>
        <ItemContent>
          <ItemTitle>농식품 벤처투자조합 1호</ItemTitle>
          <ItemDescription>약정 320억 · 운용사 ○○인베스트먼트</ItemDescription>
        </ItemContent>
        <ItemActions><StatusBadge tone="success" icon="check" label="정상" /></ItemActions>
      </Item>
      <span style={cap}>variant="default" — 아이콘만(20px, muted)</span>
      <Item variant="outline">
        <ItemMedia><Wallet /></ItemMedia>
        <ItemContent>
          <ItemTitle>출자 이행 요청</ItemTitle>
          <ItemDescription>3차 캐피털콜 48억 · 납입기한 2026-09-30</ItemDescription>
        </ItemContent>
      </Item>
      <span style={cap}>variant="image" — 40px 정사각 이미지</span>
      <Item variant="outline">
        <ItemMedia variant="image"><img src={LOGO} alt="운용사 로고" /></ItemMedia>
        <ItemContent>
          <ItemTitle>어니스트벤처스(주)</ItemTitle>
          <ItemDescription>운용 자펀드 4개 · 총 약정 1,180억</ItemDescription>
        </ItemContent>
      </Item>
    </div>
  );
}

export function DangerTone() {
  return (
    <div style={stack}>
      <Item variant="muted">
        <ItemMedia variant="icon" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}><TriangleAlert /></ItemMedia>
        <ItemContent>
          <ItemTitle>조기경보 발생 · △△자산운용</ItemTitle>
          <ItemDescription>관리보수 연체 2기 · 핵심운용인력 이탈 · 등급 하향</ItemDescription>
        </ItemContent>
        <ItemActions><StatusBadge tone="danger" label="즉시 확인" /></ItemActions>
      </Item>
    </div>
  );
}
