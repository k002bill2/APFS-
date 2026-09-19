import * as React from 'react';
import { PopNumber, Card, ColorChip } from 'apfs-dashboard-offline';

/* PopNumber — 숫자 팝인(transitions.dev 02). value 가 바뀌면 자릿수를 분해해 아래에서 튀어오르며
   마지막 두 자리는 70ms 씩 늦게 도착한다. 마운트 시에도 1회 재생 — 캡처는 애니메이션 중간 프레임일 수 있다.
   자릿수 span 은 aria-hidden 이고 전체 문자열은 sr-only 로 한 번 읽힌다. */

const label: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, letterSpacing: '.02em', color: 'var(--caption)' };
const unit: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)' };

export function MiniKpis() {
  const items = [
    { id: 'rep', label: '미제출 보고서', value: '12', u: '건', icon: 'clock', c: 'var(--warning)' },
    { id: 'ver', label: '수탁 검증 완료', value: '286', u: '건', icon: 'check', c: 'var(--success)' },
    { id: 'warn', label: '조기경보 발생', value: '4', u: '개사', icon: 'shield-alert', c: 'var(--danger)' },
  ];
  return (
    <div className="flex flex-col gap-3">
      {items.map((m) => (
        <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 15px', borderRadius: 12, border: '1px solid var(--border-strong)', background: 'var(--card)' }}>
          <div>
            <div style={label}>{m.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
              <span className="tabular" style={{ fontSize: 24, fontWeight: 800, color: 'var(--foreground)' }}><PopNumber value={m.value} /></span>
              <span style={unit}>{m.u}</span>
            </div>
          </div>
          <ColorChip icon={m.icon} color={m.c} size={34} iconSize={18} />
        </div>
      ))}
    </div>
  );
}

export function Single() {
  return (
    <Card className="flex flex-col gap-1">
      <div style={label}>모태펀드 집행 누계</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span className="tabular" style={{ fontSize: 30, fontWeight: 800, color: 'var(--primary)' }}><PopNumber value="18,592" /></span>
        <span style={unit}>억원</span>
      </div>
    </Card>
  );
}

export function GridCells() {
  const cells = [
    { k: '자펀드 수', v: '137', u: '개' },
    { k: '운용사 수', v: '58', u: '개사' },
    { k: '집행률', v: '78.0', u: '%' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
      {cells.map((c) => (
        <div key={c.k} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-strong)', background: 'var(--card)', textAlign: 'right' }}>
          <div style={{ ...label, textAlign: 'left' }}>{c.k}</div>
          <div style={{ marginTop: 4 }}>
            <span className="tabular" style={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground)' }}><PopNumber value={c.v} /></span>
            <span style={{ ...unit, marginLeft: 3 }}>{c.u}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
