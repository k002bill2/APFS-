import * as React from 'react';
import { TextSwap, Card } from 'apfs-dashboard-offline';

/* TextSwap — 제자리 텍스트 교체(transitions.dev 04). text prop 이 바뀌면 옛 글자가 위로 4px+blur 로 빠지고
   새 글자가 아래에서 올라온다. "값만 바뀌는 짧은 캡션"용(선택 개수, 필터 요약 등).
   라이브리전은 소비처가 감싼다 — 앱은 권한 매트릭스 선택 개수에 aria-live="polite" 를 붙여 쓴다. */

const label: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, letterSpacing: '.02em', color: 'var(--caption)' };
const caption: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--caption)' };

export function SelectionCount() {
  return (
    <Card className="flex flex-col gap-2">
      <div style={label}>권한 매트릭스 · 선택 개수</div>
      <span aria-live="polite" style={caption}><TextSwap text="128 / 240 선택" /></span>
      <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>체크를 토글하면 이 캡션만 제자리에서 교체됩니다(레이아웃 이동 없음).</div>
    </Card>
  );
}

export function FilterSummary() {
  const lines = [
    '전체 137건 중 24건 표시',
    '조기경보 · 주의 이상 4개사',
    '2026년 3분기 · 농식품 모태',
  ];
  return (
    <div className="flex flex-col gap-2">
      {lines.map((t) => (
        <div key={t} style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border-strong)', background: 'var(--card)' }}>
          <span aria-live="polite" style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}><TextSwap text={t} /></span>
        </div>
      ))}
    </div>
  );
}

export function InlineValue() {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 13, color: 'var(--foreground)' }}>
      <span style={{ color: 'var(--muted-foreground)' }}>집행률</span>
      <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}><TextSwap text="78.0%" /></span>
      <span style={caption}><TextSwap text="목표 80% 대비 -2.0%p" /></span>
    </div>
  );
}
