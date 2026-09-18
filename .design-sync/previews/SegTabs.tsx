import * as React from 'react';
import { SegTabs } from 'apfs-dashboard-offline';

/* SegTabs — 세그먼트 컨트롤(항상 1개 선택 유지). options 는 문자열 배열 또는 {value,label} 배열, value/onChange 제어형.
   활성 배경은 Motion layoutId 표시자라 탭을 바꾸면 슬라이드한다. size: 'md'(기본) | 'sm'. */

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 9, alignItems: 'flex-start' };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--caption)' };

export function Periods() {
  const [v, setV] = React.useState('분기');
  return (
    <div style={field}>
      <span style={label}>조회 주기</span>
      <SegTabs options={['일', '월', '분기', '연']} value={v} onChange={setV} />
    </div>
  );
}

export function Small() {
  const [v, setV] = React.useState('월');
  return (
    <div style={field}>
      <span style={label}>size sm — 차트 카드 우상단</span>
      <SegTabs options={['월', '분기', '연']} value={v} onChange={setV} size="sm" />
    </div>
  );
}

export function ValueLabelOptions() {
  const [v, setV] = React.useState('commit');
  return (
    <div style={field}>
      <span style={label}>금액 기준 ({'{ value, label }'} 옵션)</span>
      <SegTabs
        options={[{ value: 'commit', label: '약정' }, { value: 'paid', label: '납입' }, { value: 'exec', label: '집행' }, { value: 'recover', label: '회수' }]}
        value={v}
        onChange={setV}
      />
    </div>
  );
}
