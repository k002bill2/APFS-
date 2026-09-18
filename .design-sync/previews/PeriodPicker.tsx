import * as React from 'react';
import { PeriodPicker } from 'apfs-dashboard-offline';

/* PeriodPicker — 기간 단위별 선택기(표준). day 는 DatePicker(달력)에 위임하고 month·quarter·half·year 는
   같은 트리거 + Popover 안 버튼 그리드로 고른다. 값 계약(빈 문자열 = 미선택):
   day 'YYYY-MM-DD' · month 'YYYY-MM' · quarter 'YYYY-Qn' · half 'YYYY-Hn' · year 'YYYY'.
   ⚠ 팝오버 열림이 내부 state 라 외부에서 강제 불가 → 프리뷰는 모드별 트리거(닫힌) 상태와 한글 표시 포맷을 보인다. */

const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: '84px 200px', alignItems: 'center', gap: 12 };
const label: React.CSSProperties = { fontSize: 12, color: 'var(--caption)' };
const hint: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted-foreground)' };

export function AllPeriodModes() {
  const [day, setDay] = React.useState('2026-09-15');
  const [month, setMonth] = React.useState('2026-09');
  const [quarter, setQuarter] = React.useState('2026-Q3');
  const [half, setHalf] = React.useState('2026-H2');
  const [year, setYear] = React.useState('2026');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={row}><span style={label}>기준일자</span><PeriodPicker mode="day" value={day} onChange={setDay} ariaLabel="기준일자" /></div>
      <div style={row}><span style={label}>기준년월</span><PeriodPicker mode="month" value={month} onChange={setMonth} ariaLabel="기준년월" /></div>
      <div style={row}><span style={label}>분기</span><PeriodPicker mode="quarter" value={quarter} onChange={setQuarter} ariaLabel="보고 분기" /></div>
      <div style={row}><span style={label}>반기</span><PeriodPicker mode="half" value={half} onChange={setHalf} ariaLabel="보고 반기" /></div>
      <div style={row}><span style={label}>결산연도</span><PeriodPicker mode="year" value={year} onChange={setYear} ariaLabel="결산연도" /></div>
      <span style={hint}>mode 별 표시 포맷 — 값은 각각 2026-09-15 · 2026-09 · 2026-Q3 · 2026-H2 · 2026</span>
    </div>
  );
}

export function PeriodFieldStates() {
  const [empty, setEmpty] = React.useState('');
  const [req, setReq] = React.useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={row}><span style={label}>기준년월</span><PeriodPicker mode="month" value={empty} onChange={setEmpty} ariaLabel="기준년월" /></div>
      <div style={row}><span style={label}>결산연도 *</span><PeriodPicker mode="year" value={req} onChange={setReq} required ariaLabel="결산연도" /></div>
      <div style={row}><span style={label}>확정분기</span><PeriodPicker mode="quarter" value="2026-Q2" onChange={() => {}} disabled ariaLabel="확정분기" /></div>
      <span style={hint}>미선택 placeholder · 필수 미입력(danger) · 마감 후 disabled</span>
    </div>
  );
}
