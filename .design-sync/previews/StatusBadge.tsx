import * as React from 'react';
import { StatusBadge } from 'apfs-dashboard-offline';

/* StatusBadge — tone(success·warning·danger·info·primary·cyan) 이 글자색·soft 배경을 결정한다.
   색만으로 판단하지 않게 icon 을 함께 주는 것이 앱 규약(색+아이콘+텍스트 3중 표기).
   icon 이 없으면 앞에 tone 색 점(dot), dot=false 면 텍스트만(배지가 촘촘히 반복되는 열). */

const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 };
const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };
const cap: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, letterSpacing: '.02em', color: 'var(--caption)' };

export function Tones() {
  return (
    <div style={row}>
      <StatusBadge tone="success" icon="check" label="정상" />
      <StatusBadge tone="warning" icon="alert-triangle" label="주의" />
      <StatusBadge tone="danger" icon="shield-alert" label="경고" />
      <StatusBadge tone="info" icon="clock" label="진행중" />
    </div>
  );
}

export function Sizes() {
  return (
    <div style={col}>
      <div style={row}><span style={cap}>sm</span><StatusBadge tone="success" icon="check" label="검증 완료" size="sm" /><StatusBadge tone="warning" icon="alert-triangle" label="자료 미제출" size="sm" /></div>
      <div style={row}><span style={cap}>md</span><StatusBadge tone="success" icon="check" label="검증 완료" size="md" /><StatusBadge tone="warning" icon="alert-triangle" label="자료 미제출" size="md" /></div>
      <div style={row}><span style={cap}>lg</span><StatusBadge tone="success" icon="check" label="검증 완료" size="lg" /><StatusBadge tone="warning" icon="alert-triangle" label="자료 미제출" size="lg" /></div>
    </div>
  );
}

export function DotOnly() {
  return (
    <div style={col}>
      <div style={row}>
        <StatusBadge tone="info" label="심사중" />
        <StatusBadge tone="primary" label="결성 완료" />
        <StatusBadge tone="cyan" label="청산 진행" />
      </div>
      <div style={row}>
        <StatusBadge tone="info" label="1차 서면심사" dot={false} size="sm" />
        <StatusBadge tone="primary" label="2차 현장실사" dot={false} size="sm" />
        <StatusBadge tone="success" label="선정" dot={false} size="sm" />
      </div>
    </div>
  );
}

export function InTable() {
  const rows = [
    { fund: '농식품 벤처투자조합 1호', tone: 'success', icon: 'check', label: '정상' },
    { fund: '수산 스케일업 펀드', tone: 'warning', icon: 'alert-triangle', label: '주의' },
    { fund: '스마트농업 성장펀드 2호', tone: 'danger', icon: 'shield-alert', label: '경고' },
    { fund: '푸드테크 혁신조합', tone: 'info', icon: 'clock', label: '진행중' },
  ];
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: 'var(--foreground)' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border-strong)', fontSize: 11.5, color: 'var(--caption)' }}>자펀드</th>
          <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border-strong)', fontSize: 11.5, color: 'var(--caption)' }}>조기경보</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.fund}>
            <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)' }}>{r.fund}</td>
            <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)' }}><StatusBadge tone={r.tone} icon={r.icon} label={r.label} size="sm" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
