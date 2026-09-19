import * as React from 'react';
import { FilterChip } from 'apfs-dashboard-offline';

/* FilterChip — 리스트 상단의 토글형 필터 칩. active 면 primary 틴트 배경 + primary 테두리, 아니면 card/border-strong.
   dot 은 좌측 상태 점 색(토큰 문자열), count 는 우측 건수. aria-pressed 로 토글 상태를 알린다. */

const rowWrap: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 };
const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 9, alignItems: 'flex-start' };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--caption)' };

const STATUSES = [
  { name: '정상', dot: 'var(--success)' },
  { name: '주의', dot: 'var(--warning)' },
  { name: '경고', dot: 'var(--danger)' },
];

export function StatusFilters() {
  const [sel, setSel] = React.useState('주의');
  return (
    <div style={field}>
      <span style={label}>운용사 상태</span>
      <div style={rowWrap}>
        {STATUSES.map((s) => (
          <FilterChip key={s.name} active={sel === s.name} dot={s.dot} onClick={() => setSel(s.name)}>{s.name}</FilterChip>
        ))}
      </div>
    </div>
  );
}

export function WithCounts() {
  const [sel, setSel] = React.useState('전체');
  const items = [
    { name: '전체', count: 137 },
    { name: '제출완료', count: 112 },
    { name: '미제출', count: 19 },
    { name: '반송', count: 6 },
  ];
  return (
    <div style={field}>
      <span style={label}>월간보고 제출현황</span>
      <div style={rowWrap}>
        {items.map((it) => (
          <FilterChip key={it.name} active={sel === it.name} count={it.count} onClick={() => setSel(it.name)}>{it.name}</FilterChip>
        ))}
      </div>
    </div>
  );
}

export function ActiveAndIdle() {
  return (
    <div style={rowWrap}>
      <FilterChip active>선택됨 (active)</FilterChip>
      <FilterChip>미선택</FilterChip>
      <FilterChip dot="var(--danger)" count={4}>조기경보 · 점 + 건수</FilterChip>
    </div>
  );
}
