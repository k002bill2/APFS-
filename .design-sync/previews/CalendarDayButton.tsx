import * as React from 'react';
import { Calendar, CalendarDayButton } from 'apfs-dashboard-offline';

/* CalendarDayButton — Calendar 의 일자 셀(`components.DayButton`). 단독 렌더는 react-day-picker
   컨텍스트를 요구하므로 부모 Calendar 조합 전체를 프리뷰한다(Calendar 가 기본으로 쓰는 그 파트를
   명시적으로 주입해 보인다 — 모듈 스코프 상수라 정체성이 고정된다). 상태: 선택(primary) · 오늘
   (accent-surface) · 이전/다음달(muted) · 비활성(opacity 50). */

const surface: React.CSSProperties = {
  display: 'inline-block',
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  boxShadow: '0 10px 24px -12px rgba(15,23,42,.22)',
};
const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };
const legend: React.CSSProperties = { marginTop: 8, fontSize: 11.5, color: 'var(--muted-foreground)', maxWidth: 260, lineHeight: 1.6 };

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const koFormatters = {
  formatCaption: (d: Date) => `${d.getFullYear()}년 ${d.getMonth() + 1}월`,
  formatWeekdayName: (d: Date) => WD[d.getDay()],
};
const SEP_2026 = new Date(2026, 8, 1);
const TODAY = new Date(2026, 8, 19);
const DAY_PARTS = { DayButton: CalendarDayButton };
// 주말(영업일 아님)은 선택 불가 — disabled 셀 상태를 함께 보이기 위한 규칙.
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

export function DayCellStates() {
  return (
    <div>
      <div style={cap}>납입일 선택 — 일자 셀 상태</div>
      <div style={surface}>
        <Calendar
          mode="single"
          selected={new Date(2026, 8, 10)}
          defaultMonth={SEP_2026}
          today={TODAY}
          disabled={isWeekend}
          formatters={koFormatters}
          components={DAY_PARTS}
          onSelect={() => {}}
        />
      </div>
      <div style={legend}>10일 = 선택 · 19일 = 오늘 · 주말 = 비활성(영업일 아님) · 흐린 숫자 = 전/다음 달</div>
    </div>
  );
}

export function RangeDayCells() {
  return (
    <div>
      <div style={cap}>투자심의기간 — 범위 셀(시작·중간·종료)</div>
      <div style={surface}>
        <Calendar
          mode="range"
          selected={{ from: new Date(2026, 8, 7), to: new Date(2026, 8, 18) }}
          defaultMonth={SEP_2026}
          today={TODAY}
          formatters={koFormatters}
          components={DAY_PARTS}
          onSelect={() => {}}
        />
      </div>
    </div>
  );
}
