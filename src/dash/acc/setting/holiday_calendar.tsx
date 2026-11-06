/* 휴일관리(ACC-025) 월 달력(설계서 slide10) + 본문 머리 보기 바(보기 전환).
   - 7열 CSS grid(일~토) — 스타일 규격은 acc/slip/daily_close_calendar 를 따르되 import 하지 않는다(중분류가 달라 slip 전용).
   - 요일색: 일 = --danger-text · 토 = --info-text — 머리글과 칸 안 날짜 숫자(배경 없음, 설계서 표시 규칙 2). 휴일 칸 날짜는 빨강 우선.
   - 등록 휴일 셀: 날짜 빨강 + 연한 빨강 배경(--danger-soft) + 휴일명 + 짧은 구분(법정/대체/임시/기타). 사용자 등록이면 구분 앞 [사용자] TagBadge.
   - 오늘 = 2px --primary 테두리 + '오늘'(daily_close 규격).
   - 휴일 셀 클릭/Enter·Space = 「휴일 수정」 모달(onOpen — 목록 행 더블클릭 E08 과 같은 경로, 사용자 지정 2026-11-06) → 휴일 셀만 <button>.
     휴일 없는 날·빈칸은 <div>(빈 날 클릭 등록은 설계서 '제안 — 확정 필요' 미결이라 미구현). 버튼 스타일은 daily_close_calendar 클릭 셀 규격. */
import type { CSSProperties, ReactNode } from 'react';
import { UI } from '../../components';
import { TYPE_SHORT } from './holiday_data';
import type { HolidayRow } from './holiday_data';
import { DOW, calendarCells, isUserRegistered } from './holiday_model';

const { TagBadge } = UI;

const dowColor = (dow: number) => (dow === 0 ? 'var(--danger-text)' : dow === 6 ? 'var(--info-text)' : 'var(--muted-foreground)');

/** 본문 머리 — 우: 보기 전환(children). 월 이동은 툴바 좌측(일마감 선례 — daily_close_manage 툴바·ViewBar) */
export function HolidayViewBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap" style={{ padding: '10px 18px' }}>
      <div className="ml-auto print:hidden">{children}</div>
    </div>
  );
}

/** 월 달력 — year·month 의 셀(앞뒤 빈칸 포함) + 그 달 휴일 */
export function HolidayCalendar({ year, month, holidays, today, onOpen }: {
  year: number; month: number; holidays: readonly HolidayRow[]; today: string;
  /** 휴일 셀 클릭 → 그 휴일 상세(수정) 모달 — E08 재사용 */
  onOpen: (h: HolidayRow) => void;
}) {
  const byDate = new Map(holidays.map((h) => [h.date, h]));
  const cells = calendarCells(year, month);
  return (
    <div className="overflow-x-auto" style={{ padding: '0 18px 16px' }}>
      <div style={{ minWidth: 720 }} role="group" aria-label={`${String(year)}년 ${String(month)}월 휴일 달력`}>
        <div className="grid grid-cols-7" aria-hidden="true" style={{ borderBottom: '1px solid var(--border)' }}>
          {DOW.map((w, i) => (
            <div key={w} className="font-bold" style={{ padding: '8px 9px', fontSize: 12.5, color: dowColor(i) }}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1" style={{ marginTop: 6 }}>
          {cells.map((date, i) => {
            if (!date) return <div key={'e' + String(i)} className="rounded-card-sm" style={{ minHeight: 88, background: 'var(--muted)', opacity: 0.55 }} aria-hidden="true" />;
            const h = byDate.get(date);
            const dow = i % 7;
            const isToday = date === today;
            const box: CSSProperties = {
              minHeight: 88, padding: '7px 9px',
              background: h ? 'var(--danger-soft)' : 'var(--card)',
              border: isToday ? '2px solid var(--primary)' : '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
            };
            /* 날짜 숫자 = 휴일이면 빨강 우선, 아니면 요일색(일 빨강·토 파랑, 배경 없음 — 설계서 표시 규칙 2) */
            const numColor = h ? 'var(--danger-text)' : dow === 0 || dow === 6 ? dowColor(dow) : 'var(--foreground)';
            const user = h ? isUserRegistered(h) : false;
            const aria = [`${date} (${DOW[dow]})`, h ? `${h.name} ${h.type}${user ? ' 사용자 등록' : ''}` : '', isToday ? '오늘' : ''].filter(Boolean).join(', ');
            const body = (
              <>
                <span className="flex items-baseline gap-1.5 w-full min-w-0" aria-hidden="true">
                  <span className="font-bold tabular-nums" style={{ fontSize: 13.5, color: numColor }}>{Number(date.slice(8))}</span>
                  {isToday && <span className="ml-auto font-semibold" style={{ fontSize: 11, color: 'var(--primary)' }}>오늘</span>}
                </span>
                {h && (
                  <span className="flex flex-col gap-1 w-full min-w-0" aria-hidden="true">
                    <span className="truncate font-semibold" style={{ fontSize: 12, color: 'var(--danger-text)' }}>{h.name}</span>
                    <span className="inline-flex items-center gap-1 flex-wrap">
                      {user && <TagBadge tone="primary" size="sm">사용자</TagBadge>}
                      <span style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>{TYPE_SHORT[h.type]}</span>
                    </span>
                  </span>
                )}
              </>
            );
            /* 휴일 셀 = 버튼(클릭/Enter·Space → 상세(수정) 모달, E08 재사용) · 그 외 = 클릭 동작 없는 div */
            return h ? (
              <button key={date} type="button" onClick={() => onOpen(h)} aria-label={`${aria} 상세 보기`} aria-current={isToday ? 'date' : undefined}
                className="rounded-card-sm min-w-0 text-left cursor-pointer transition-colors duration-tok-fast ease-ds hover:border-[color:var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ ...box, fontFamily: 'inherit' }}>{body}</button>
            ) : (
              <div key={date} className="rounded-card-sm min-w-0" style={box} role="note" aria-label={aria} aria-current={isToday ? 'date' : undefined}>{body}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
