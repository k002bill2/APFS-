import * as React from 'react';
import { Calendar } from 'apfs-dashboard-offline';

/* Calendar — react-day-picker v10 위 shadcn 스킨. 표면은 부모 Popover(bg-popover)에서 상속하므로
   단독 프리뷰에서는 팝오버 표면을 토큰으로 재현한다. 캡처 결정성 확보:
   - 월은 `defaultMonth`로 고정(오늘에 따라 흔들리지 않게), 선택일은 `selected`로 고정.
   - date-fns `ko` 로케일은 DS 배럴에 없으므로 한국어 표기는 `formatters`로 준다. */

const surface: React.CSSProperties = {
  display: 'inline-block',
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  boxShadow: '0 10px 24px -12px rgba(15,23,42,.22)',
};
const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const koFormatters = {
  formatCaption: (d: Date) => `${d.getFullYear()}년 ${d.getMonth() + 1}월`,
  formatWeekdayName: (d: Date) => WD[d.getDay()],
  formatYearDropdown: (d: Date) => `${d.getFullYear()}년`,
};

const SEP_2026 = new Date(2026, 8, 1);
const TODAY = new Date(2026, 8, 19);   // 오늘(today 모디파이어)도 고정 — 실행일에 따라 캡처가 흔들리지 않게

export function BaseDateCalendar() {
  return (
    <div>
      <div style={cap}>기준일자</div>
      <div style={surface}>
        <Calendar
          mode="single"
          selected={new Date(2026, 8, 15)}
          defaultMonth={SEP_2026}
          today={TODAY}
          formatters={koFormatters}
          onSelect={() => {}}
        />
      </div>
    </div>
  );
}

export function FormationRangeCalendar() {
  return (
    <div>
      <div style={cap}>결성기간(시작–종료)</div>
      <div style={surface}>
        <Calendar
          mode="range"
          selected={{ from: new Date(2026, 8, 8), to: new Date(2026, 8, 19) }}
          defaultMonth={SEP_2026}
          today={TODAY}
          formatters={koFormatters}
          onSelect={() => {}}
        />
      </div>
    </div>
  );
}

export function DropdownCaptionCalendar() {
  return (
    <div>
      <div style={cap}>투심일자 — 연·월 드롭다운 캡션</div>
      <div style={surface}>
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={new Date(2000, 0)}
          endMonth={new Date(2035, 11)}
          selected={new Date(2026, 8, 3)}
          defaultMonth={SEP_2026}
          today={TODAY}
          formatters={koFormatters}
          onSelect={() => {}}
        />
      </div>
    </div>
  );
}
