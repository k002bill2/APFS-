import * as React from 'react';
import { DatePicker } from 'apfs-dashboard-offline';

/* DatePicker — 네이티브 <input type="date">를 대체하는 제어 컴포넌트(Popover + Calendar 조합).
   값 계약: value/onChange 는 'YYYY-MM-DD' 문자열, 빈 문자열 = 미선택(필터 정확일치·zod·Excel 이 의존).
   ⚠ 달력 팝오버의 열림은 컴포넌트 내부 state 라 외부에서 강제할 수 없다 → 프리뷰는 트리거(닫힌) 상태.
      열린 달력 표면은 Calendar · Popover 프리뷰에서 본다. */

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, width: 210 };
const label: React.CSSProperties = { fontSize: 12, color: 'var(--caption)' };
const hint: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted-foreground)' };
const danger: React.CSSProperties = { fontSize: 11.5, color: 'var(--danger)' };

export function DateFieldStates() {
  const [asOf, setAsOf] = React.useState('2026-09-15');
  const [closing, setClosing] = React.useState('');
  const [review, setReview] = React.useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={field}>
        <span style={label}>기준일자</span>
        <DatePicker value={asOf} onChange={setAsOf} ariaLabel="기준일자" />
        <span style={hint}>선택됨 — 'YYYY-MM-DD'</span>
      </div>
      <div style={field}>
        <span style={label}>결성일</span>
        <DatePicker value={closing} onChange={setClosing} ariaLabel="결성일" />
        <span style={hint}>미선택 — placeholder</span>
      </div>
      <div style={field}>
        <span style={label}>투심일자 *</span>
        <DatePicker value={review} onChange={setReview} required ariaLabel="투심일자" />
        <span style={danger}>필수 미입력 — danger 테두리(값을 고르면 풀림)</span>
      </div>
      <div style={field}>
        <span style={label}>확정일(마감됨)</span>
        <DatePicker value="2026-06-30" onChange={() => {}} disabled ariaLabel="확정일" />
        <span style={hint}>disabled — 회계마감 후 수정 불가</span>
      </div>
    </div>
  );
}

export function DateRangeFilter() {
  const [from, setFrom] = React.useState('2026-07-01');
  const [to, setTo] = React.useState('2026-09-30');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={label}>기준일자</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 160 }}><DatePicker value={from} onChange={setFrom} ariaLabel="기준일자 시작일" /></div>
        <span style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>~</span>
        <div style={{ width: 160 }}><DatePicker value={to} onChange={setTo} ariaLabel="기준일자 종료일" /></div>
      </div>
      <span style={hint}>목록 필터의 기간 입력 — 시작·종료 두 개를 나란히</span>
    </div>
  );
}
