/* APFS PeriodPicker — 기간 단위별 선택기(표준). 일별은 기존 DatePicker(달력)에 그대로 위임하고,
   연도·월·분기·반기는 같은 트리거(38px 폼 컨트롤 모사) + Popover 안 버튼 그리드로 고른다.
   값 계약(문자열, 빈 문자열=미선택 — 필터 정확일치·zod·Excel·마스크가 의존):
     day 'YYYY-MM-DD' · month 'YYYY-MM' · quarter 'YYYY-Qn' · half 'YYYY-Hn' · year 'YYYY'
   규약은 apfs-datepicker 스킬 "PeriodPicker" 절. Popover는 DatePicker와 같이 non-modal(모달/드로어 안 2-click 회귀 방지). */
import * as React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './popover';
import { DatePicker } from './date-picker';
import { cn } from '@/lib/utils';

export type PeriodMode = 'day' | 'month' | 'quarter' | 'half' | 'year';

export interface PeriodPickerProps {
  mode: PeriodMode;
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;     // 트리거는 <button>이라 감싸는 <label>로 명명되지 않음 → 소비처가 필드명을 넘긴다
  invalid?: boolean;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  yearRange?: [number, number];   // 연도 선택 범위(기본 2000~2035 — DatePicker와 동일)
}

const PLACEHOLDER: Record<PeriodMode, string> = { day: '날짜 선택', month: '월 선택', quarter: '분기 선택', half: '반기 선택', year: '연도 선택' };

/* 값 → 표시 문자열(한글). 파싱 실패는 원문 그대로 */
export function formatPeriod(mode: PeriodMode, v: string): string {
  if (!v) return '';
  const m = v.match(/^(\d{4})(?:-(?:(\d{2})|Q([1-4])|H([12])))?/);
  if (!m) return v;
  const y = m[1];
  if (mode === 'year') return `${y}년`;
  if (mode === 'month' && m[2]) return `${y}년 ${Number(m[2])}월`;
  if (mode === 'quarter' && m[3]) return `${y}년 ${m[3]}분기`;
  if (mode === 'half' && m[4]) return `${y}년 ${m[4] === '1' ? '상반기' : '하반기'}`;
  return v;
}

/* 값에서 연도 추출(없으면 올해) — 팝오버 초기 페이지 */
function yearOf(v: string): number {
  const y = Number(v.slice(0, 4));
  return Number.isInteger(y) && y > 0 ? y : new Date().getFullYear();
}

const cell =
  'inline-flex items-center justify-center border-0 rounded-[8px] h-9 text-sm font-medium cursor-pointer transition-colors ' +
  'bg-transparent text-foreground hover:bg-accent-surface hover:text-accent-surface-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed';
const cellSelected = 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground';
const navBtn = 'inline-flex items-center justify-center border-0 bg-transparent text-foreground rounded-[8px] h-8 w-8 cursor-pointer hover:bg-accent-surface disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function PeriodPicker(props: PeriodPickerProps) {
  const { mode, value, onChange, ariaLabel, invalid, required, disabled, placeholder, yearRange = [2000, 2035] } = props;
  // 일별 = 기존 DatePicker 그대로(달력·타임존 계약 재사용)
  if (mode === 'day') return <DatePicker value={value} onChange={onChange} ariaLabel={ariaLabel} invalid={invalid} required={required} disabled={disabled} placeholder={placeholder} />;
  return <GridPicker {...props} yearRange={yearRange} />;
}

/* 연도·월·분기·반기 — 버튼 그리드(훅은 day 분기 뒤라 별도 컴포넌트로 분리) */
function GridPicker({ mode, value, onChange, ariaLabel, invalid, required, disabled, placeholder, yearRange }: PeriodPickerProps & { yearRange: [number, number] }) {
  const [open, setOpen] = React.useState(false);
  const [year, setYear] = React.useState(() => yearOf(value));
  React.useEffect(() => { if (open) setYear(yearOf(value)); }, [open, value]);   // 열 때마다 현재 값의 연도 페이지로
  const [minY, maxY] = yearRange;

  // 선택/해제 — 같은 값 재클릭 = 해제(DatePicker와 동일한 유일 clear 수단). 선택·해제 모두 닫는다.
  const pick = (v: string) => { onChange(v === value ? '' : v); setOpen(false); };

  /* 연도 그리드는 12개 단위 페이지(12의 배수로 정렬) */
  const pageStart = Math.floor(year / 12) * 12;
  const years = Array.from({ length: 12 }, (_, i) => pageStart + i);

  const label = formatPeriod(mode, value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          className={cn(
            'flex h-[34px] box-border w-full items-center justify-between gap-2 rounded-[9px] border bg-card px-[11px] py-[7px] text-left text-sm text-foreground transition-colors',
            'focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-60',
            // invalid/required는 focus 중에도 danger 테두리 유지(검증 단서 소실 방지, Codex P2). border-ring는 정상 분기에만.
            invalid || required ? 'border-danger' : 'border-border-strong focus-visible:border-ring',
          )}
        >
          <span className={cn('tabular-nums', !label && 'text-muted-foreground')}>{label || placeholder || PLACEHOLDER[mode]}</span>
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-3" style={{ width: 268 }}>
        {/* 헤더: 연도(월/분기/반기) 또는 12년 범위(연도) 이동 */}
        <div className="flex items-center justify-between mb-2">
          <button type="button" className={navBtn} aria-label={mode === 'year' ? '이전 12년' : '이전 연도'}
            disabled={mode === 'year' ? pageStart - 1 < minY : year - 1 < minY}
            onClick={() => setYear((y) => (mode === 'year' ? y - 12 : y - 1))}>
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <span className="font-semibold text-sm tabular-nums" aria-live="polite">
            {mode === 'year' ? `${years[0]} – ${years[11]}` : `${year}년`}
          </span>
          <button type="button" className={navBtn} aria-label={mode === 'year' ? '다음 12년' : '다음 연도'}
            disabled={mode === 'year' ? pageStart + 12 > maxY : year + 1 > maxY}
            onClick={() => setYear((y) => (mode === 'year' ? y + 12 : y + 1))}>
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {mode === 'year' && (
          <div className="grid grid-cols-3 gap-1" role="listbox" aria-label="연도">
            {years.map((y) => {
              const v = String(y); const sel = v === value;
              return <button key={y} type="button" role="option" aria-selected={sel} disabled={y < minY || y > maxY}
                className={cn(cell, sel && cellSelected)} onClick={() => pick(v)}>{y}</button>;
            })}
          </div>
        )}
        {mode === 'month' && (
          <div className="grid grid-cols-3 gap-1" role="listbox" aria-label="월">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => {
              const v = `${year}-${String(mo).padStart(2, '0')}`; const sel = v === value;
              return <button key={mo} type="button" role="option" aria-selected={sel} className={cn(cell, sel && cellSelected)} onClick={() => pick(v)}>{mo}월</button>;
            })}
          </div>
        )}
        {mode === 'quarter' && (
          <div className="grid grid-cols-2 gap-1" role="listbox" aria-label="분기">
            {[1, 2, 3, 4].map((q) => {
              const v = `${year}-Q${q}`; const sel = v === value;
              return <button key={q} type="button" role="option" aria-selected={sel} className={cn(cell, sel && cellSelected)} onClick={() => pick(v)}>
                {q}분기<span className={cn('ml-1 text-xs', sel ? 'opacity-80' : 'text-muted-foreground')}>{(q - 1) * 3 + 1}–{q * 3}월</span>
              </button>;
            })}
          </div>
        )}
        {mode === 'half' && (
          <div className="grid grid-cols-2 gap-1" role="listbox" aria-label="반기">
            {[1, 2].map((hf) => {
              const v = `${year}-H${hf}`; const sel = v === value;
              return <button key={hf} type="button" role="option" aria-selected={sel} className={cn(cell, sel && cellSelected)} onClick={() => pick(v)}>
                {hf === 1 ? '상반기' : '하반기'}<span className={cn('ml-1 text-xs', sel ? 'opacity-80' : 'text-muted-foreground')}>{hf === 1 ? '1–6월' : '7–12월'}</span>
              </button>;
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
