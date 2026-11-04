/* 일마감(ACC-007) 월간 캘린더(10p) · 주간 보드(11p) · 범례.
   기존 월간 캘린더 재사용 검토 결과(브리프 지시):
   - frt/schedule/schedule.tsx CalendarView — export 없음 · 2026년 6월·오늘(16일) 하드코딩 · 셀 = 일자 + 점 3개뿐이라
     상태 배지·전표 건수·휴일명·클릭 분기를 담을 수 없다.
   - ui/calendar.tsx — react-day-picker 기반 **일자 선택기**(DatePicker 내부)라 데이터 보드가 아니다.
   → 이 화면 전용 7열 CSS grid 로 새로 만든다. 표 정렬 규약: 건수만 우측, 나머지 좌측(요일 머리글도 좌측 — 칸 안 일자(좌상단, 좌우 9px)와 같은 선).
   클릭 가능한 셀(미마감·진행중·마감)은 <button>, 예정 셀은 <div>(클릭 불가).
   주간 보드 '클릭 동작' 행은 버튼 있는 날만 [마감 처리]/[상세/취소] — 버튼 없는 날(예정)은 빈칸(문구 없음). */
import type { CSSProperties, ReactNode } from 'react';
import { UI } from '../../components';
import { DOW, STATUS_ICON, STATUS_TONE, DAY_STATUSES, isClickable } from './daily_close_model';
import type { DayInfo, DayStatus } from './daily_close_model';

const { StatusBadge, Button } = UI;

const dowColor = (dow: number) => (dow === 0 ? 'var(--danger-text)' : dow === 6 ? 'var(--info-text)' : 'var(--muted-foreground)');

export function StatusTag({ status, size = 'sm' }: { status: DayStatus; size?: 'sm' | 'md' | 'lg' }) {
  return <StatusBadge tone={STATUS_TONE[status]} label={status} icon={STATUS_ICON[status] || undefined} size={size} />;
}

/** 보기 바 — 범례(월간·주간) + 우측 뷰 전환(children). 뷰 전환은 GridFrame 툴바가 한 줄이라 768px 대에서 조회 조건이 잘려
    여기(본문 머리)로 옮겼다. 인쇄에는 범례만 남긴다(print:hidden). */
export function ViewBar({ legend, children }: { legend: boolean; children: ReactNode }) {
  const note: Record<DayStatus, string> = { 마감: '', 미마감: '', 진행중: '(당일)', 예정: '(미래 일자)' };
  return (
    <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap" style={{ padding: '10px 18px', fontSize: 12.5 }}>
      {legend && <>
        <span className="font-semibold text-muted-foreground">범례</span>
        {DAY_STATUSES.map((s) => (
          <span key={s} className="inline-flex items-center gap-1"><StatusTag status={s} />{note[s] && <span className="text-caption">{note[s]}</span>}</span>
        ))}
        <span className="text-caption">빨간 날짜·휴일명 = 휴일(표시 전용, 휴일도 마감 대상)</span>
      </>}
      <div className="ml-auto print:hidden">{children}</div>
    </div>
  );
}

/** 전표 건수 — 전표 0건·예정 일자는 미표시, 미승인 1건 이상 빨강 */
function Counts({ d }: { d: DayInfo }) {
  if (d.status === '예정' || d.approved + d.unapproved === 0) return null;
  return (
    <span className="tabular-nums" style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
      승인 {d.approved} · <span style={d.unapproved > 0 ? { color: 'var(--danger-text)', fontWeight: 700 } : undefined}>미승인 {d.unapproved}</span>
    </span>
  );
}

const cellAria = (d: DayInfo, today: string) => {
  const parts = [`${d.date} (${DOW[d.dow]})`, d.holiday ? d.holidayName : '', d.status];
  if (d.status !== '예정' && d.approved + d.unapproved > 0) parts.push(`승인 ${String(d.approved)}건 미승인 ${String(d.unapproved)}건`);
  if (d.date === today) parts.push('오늘');
  parts.push(d.status === '마감' ? '상세/취소 열기' : '마감 처리 열기');
  return parts.filter(Boolean).join(', ');
};

/** 월간 캘린더 — 7열(일~토) × 주 단위. 당월 외 칸은 음영 빈 셀 */
export function MonthCalendar({ grid, days, today, onOpen }: {
  grid: (string | null)[][];
  days: Record<string, DayInfo>;
  today: string;
  onOpen: (d: DayInfo) => void;
}) {
  return (
    <div className="overflow-x-auto" style={{ padding: '0 18px 16px' }}>
      <div style={{ minWidth: 720 }}>
        <div className="grid grid-cols-7" aria-hidden="true" style={{ borderBottom: '1px solid var(--border)' }}>
          {DOW.map((w, i) => (
            <div key={w} className="font-bold" style={{ padding: '8px 9px', fontSize: 12.5, color: dowColor(i) }}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1" style={{ marginTop: 6 }}>
          {grid.flat().map((date, i) => {
            if (!date) return <div key={'e' + String(i)} className="rounded-card-sm" style={{ minHeight: 88, background: 'var(--muted)', opacity: 0.55 }} aria-hidden="true" />;
            const d = days[date];
            const isToday = date === today;
            const box: CSSProperties = {
              minHeight: 88, padding: '7px 9px', textAlign: 'left', fontFamily: 'inherit',
              background: 'var(--card)', border: isToday ? '2px solid var(--primary)' : '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5,
            };
            const body = (
              <>
                <span className="flex items-baseline gap-1.5 w-full min-w-0">
                  <span className="font-bold tabular-nums" style={{ fontSize: 13.5, color: d.holiday ? 'var(--danger-text)' : 'var(--foreground)' }}>{Number(date.slice(8))}</span>
                  {d.holiday && <span className="truncate min-w-0" style={{ fontSize: 11.5, color: 'var(--danger-text)' }}>{d.holidayName}</span>}
                  {isToday && <span className="ml-auto font-semibold" style={{ fontSize: 11, color: 'var(--primary)' }}>오늘</span>}
                </span>
                {d.status !== '예정' && <StatusTag status={d.status} />}
                <Counts d={d} />
              </>
            );
            return isClickable(d) ? (
              <button key={date} type="button" onClick={() => onOpen(d)} aria-label={cellAria(d, today)} aria-current={isToday ? 'date' : undefined}
                className="rounded-card-sm cursor-pointer transition-colors duration-tok-fast ease-ds hover:border-[color:var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={box}>{body}</button>
            ) : (
              <div key={date} className="rounded-card-sm" style={{ ...box, background: 'transparent' }} aria-label={`${date} 예정`} role="note">{body}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const ROW_LABEL: CSSProperties = { padding: '8px 12px', fontSize: 12.5, fontWeight: 600, color: 'var(--muted-foreground)', background: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
const CELL: CSSProperties = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)' };
const NUM: CSSProperties = { ...CELL, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

/** 주간 보드 — 7열(일~토) × 항목 행. 열 배경은 오늘 열만 블루(--info-soft) — 상태는 상태 행 배지로만 구분(2026-11-03 사용자 지시: 상태별 배경색 제거).
    회기 밖 일자(연도 경계 주)는 회색·조작 없음 */
export function WeekBoard({ dates, days, inTermDate, today, onOpen }: {
  dates: string[];
  days: Record<string, DayInfo>;
  inTermDate: (date: string) => boolean;
  today: string;
  onOpen: (d: DayInfo) => void;
}) {
  const cols = dates.map((date) => ({ date, d: days[date], live: inTermDate(date) }));
  const bg = (c: (typeof cols)[number]) => (!c.live ? 'var(--muted)' : c.date === today ? 'var(--info-soft)' : 'transparent');
  const num = (c: (typeof cols)[number], v: number, warn = false) => {
    if (!c.live || c.d.status === '예정') return <td key={c.date} style={{ ...NUM, background: bg(c) }}>—</td>;
    return <td key={c.date} style={{ ...NUM, background: bg(c), ...(warn && v > 0 ? { color: 'var(--danger-text)', fontWeight: 700 } : null) }}>{v}</td>;
  };
  return (
    <div className="overflow-x-auto" style={{ padding: '0 18px 16px' }}>
      <table className="w-full border-collapse" style={{ minWidth: 820, tableLayout: 'fixed', border: '1px solid var(--border)' }}>
        <colgroup><col style={{ width: 104 }} />{cols.map((c) => <col key={c.date} />)}</colgroup>
        <thead>
          <tr>
            <th scope="col" style={{ ...ROW_LABEL }}><span className="sr-only">항목</span></th>
            {cols.map((c) => (
              <th key={c.date} scope="col" aria-current={c.date === today ? 'date' : undefined}
                style={{ ...CELL, background: bg(c), fontWeight: 700, color: c.d.holiday ? 'var(--danger-text)' : 'var(--foreground)', boxShadow: c.date === today ? 'inset 0 -2px 0 var(--primary)' : undefined }}>
                <span className="tabular-nums">{Number(c.date.slice(8))} ({DOW[c.d.dow]})</span>
                {c.d.holiday && <span className="block font-medium" style={{ fontSize: 11.5 }}>{c.d.holidayName}</span>}
                {c.date === today && <span className="block font-semibold" style={{ fontSize: 11, color: 'var(--primary)' }}>오늘</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr><th scope="row" style={ROW_LABEL}>상태</th>{cols.map((c) => <td key={c.date} style={{ ...CELL, background: bg(c) }}>{c.live ? <StatusTag status={c.d.status} /> : <span className="text-caption">회기 외</span>}</td>)}</tr>
          <tr><th scope="row" style={ROW_LABEL}>승인 전표</th>{cols.map((c) => num(c, c.d.approved))}</tr>
          <tr><th scope="row" style={ROW_LABEL}>미승인 전표</th>{cols.map((c) => num(c, c.d.unapproved, true))}</tr>
          <tr><th scope="row" style={ROW_LABEL}>삭제 전표</th>{cols.map((c) => num(c, c.d.deleted))}</tr>
          <tr><th scope="row" style={ROW_LABEL}>마감자</th>{cols.map((c) => <td key={c.date} style={{ ...CELL, background: bg(c) }}>{c.live && c.d.closing ? c.d.closing.closedBy : ''}</td>)}</tr>
          <tr><th scope="row" style={ROW_LABEL}>마감일시</th>{cols.map((c) => <td key={c.date} className="tabular-nums" style={{ ...CELL, background: bg(c), whiteSpace: 'nowrap' }}>{c.live && c.d.closing ? c.d.closing.closedAt.slice(5, 16) : ''}</td>)}</tr>
          <tr>
            <th scope="row" style={ROW_LABEL}>클릭 동작</th>
            {cols.map((c) => (
              <td key={c.date} style={{ ...CELL, background: bg(c) }}>
                {c.live && isClickable(c.d)
                  ? <Button variant="outline" size="sm" onClick={() => onOpen(c.d)}>{c.d.status === '마감' ? '상세/취소' : '마감 처리'}<span className="sr-only"> {c.date}</span></Button>
                  : null}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
