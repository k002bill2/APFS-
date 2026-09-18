import * as React from 'react';
import { ClearableInput } from 'apfs-dashboard-offline';

/* ClearableInput — 상세필터 드로어의 검색어 입력. 제어형(value + onValueChange)이고, 값이 있을 때만 오른쪽 × 버튼이 나타난다.
   지우면 옛 값이 위로 날아가며 흐려지는 dissolve 모션(transitions.dev 13)이 재생된다.
   소비처 style 의 width/minWidth/maxWidth 는 래퍼가 받고 input 이 100% 를 채운다 — 박스는 드로어 컨트롤 규격(34px). */

const box: React.CSSProperties = {
  width: 280, boxSizing: 'border-box', padding: '7px 11px', fontSize: 13.5, lineHeight: '20px',
  height: 34, minHeight: 34, fontFamily: 'inherit',
  border: '1px solid var(--border-strong)', borderRadius: 9, background: 'var(--card)', color: 'var(--foreground)',
};
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--caption)' };
const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 };

export function SearchFilled() {
  const [v, setV] = React.useState('상주-어니스트 애그테크');
  return (
    <div style={field}>
      <span style={label}>검색어</span>
      <ClearableInput type="text" value={v} onValueChange={setV} placeholder="조합명·GP·단계 등 전 컬럼 검색" clearLabel="검색어 지우기" style={box} />
    </div>
  );
}

export function Empty() {
  const [v, setV] = React.useState('');
  return (
    <div style={field}>
      <span style={label}>검색어 (빈 상태 — × 숨김)</span>
      <ClearableInput type="text" value={v} onValueChange={setV} placeholder="검색기준 항목에서 부분일치" clearLabel="검색어 지우기" style={box} />
    </div>
  );
}

export function FilterRow() {
  const [gp, setGp] = React.useState('농식품파트너스');
  const [mgr, setMgr] = React.useState('');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      <div style={field}>
        <span style={label}>운용사</span>
        <ClearableInput type="text" value={gp} onValueChange={setGp} placeholder="운용사명 입력" clearLabel="운용사 검색어 지우기" style={{ ...box, width: 220 }} />
      </div>
      <div style={field}>
        <span style={label}>담당 심사역</span>
        <ClearableInput type="text" value={mgr} onValueChange={setMgr} placeholder="담당자명 입력" clearLabel="담당자 검색어 지우기" style={{ ...box, width: 180 }} />
      </div>
    </div>
  );
}
