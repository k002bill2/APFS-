import * as React from 'react';
import { ColorChip } from 'apfs-dashboard-offline';

/* ColorChip — 아이콘 타일. icon(문자열 이름) + color(토큰) 만으로 배경을 color-mix 13% 로 깔고
   같은 색 아이콘을 올린다. size/iconSize 로 34~46px 헤더용, 30~32px 표·목록용을 만든다. */

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' };
const cell: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--caption)' };

export function Palette() {
  const items = [
    { icon: 'landmark', color: 'var(--primary)', name: '출자·집행' },
    { icon: 'target', color: 'var(--chart-2)', name: '의무투자' },
    { icon: 'shield-alert', color: 'var(--danger)', name: '조기경보' },
    { icon: 'clock', color: 'var(--warning)', name: '보고 마감' },
    { icon: 'trending', color: 'var(--chart-3)', name: '투자 성과' },
    { icon: 'layers', color: 'var(--accent)', name: '자펀드' },
  ];
  return (
    <div style={row}>
      {items.map((it) => (
        <span key={it.name} style={cell}>
          <ColorChip icon={it.icon} color={it.color} size={40} iconSize={21} />
          {it.name}
        </span>
      ))}
    </div>
  );
}

export function Sizes() {
  return (
    <div style={{ ...row, alignItems: 'flex-end' }}>
      {[
        { size: 30, iconSize: 16 },
        { size: 34, iconSize: 18 },
        { size: 40, iconSize: 21 },
        { size: 46, iconSize: 24 },
      ].map((s) => (
        <span key={s.size} style={cell}>
          <ColorChip icon="landmark" color="var(--primary)" size={s.size} iconSize={s.iconSize} />
          {s.size}px
        </span>
      ))}
    </div>
  );
}

export function CardHeading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)' }}>
      <ColorChip icon="landmark" color="var(--chart-3)" size={34} iconSize={18} />
      <span>
        <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: 'var(--foreground)' }}>출자·집행 현황</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--caption)', marginTop: 1 }}>계획 대비 실적 · 집행률(우축)</span>
      </span>
    </div>
  );
}
