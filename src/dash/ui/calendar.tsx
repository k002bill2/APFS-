/* shadcn Calendar (Radix variant) — react-day-picker v10 위 Tailwind 스킨.
   원본(ui.shadcn.com/docs/components/radix/calendar)을 APFS에 이식하며 바꾼 점:
   - Tailwind 3.4 문법: v4의 `h-[--cell-size]`(bare custom prop)·`**:`·`rtl:`·`has-focus:`를
     `h-[var(--cell-size)]`·`has-[:focus]:`로 변환하고 RTL/data-slot 줄 제거.
   - 토큰 매핑: shadcn `Button`/`buttonVariants`(cva·이 프로젝트 미보유) → 인라인 ghost 클래스.
     `today: bg-accent`(이 프로젝트의 accent는 navy 링크색) → `bg-accent-surface`(muted)로 교정.
   - opacity 모디파이어 무음실패(문서화된 토큰 버그) 회피: `ring-ring/50` → solid `ring-ring`.
   - 한국어 로케일(date-fns ko)·전 표면 토큰화로 라이트/다크 양립. 표면은 부모 Popover의 bg-popover 상속(투명). */
import * as React from 'react';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker';
import { cn } from '@/lib/utils';

// ghost 톤 내비/일자 버튼 공통 베이스 — preflight:false 환경에서 네이티브 버튼 배경/테두리를 명시적으로 덮는다.
const ghostBtn =
  'inline-flex items-center justify-center border-0 bg-transparent text-foreground transition-colors ' +
  'hover:bg-accent-surface hover:text-accent-surface-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'disabled:pointer-events-none aria-disabled:opacity-50';

// RDP 기본 클래스맵은 호출마다 새 객체를 생성한다 — 모듈 1회 호이스팅(셀(~42개)마다 재할당 방지).
const DEFAULT_CN = getDefaultClassNames();

// 🔴 components.* 는 react-day-picker에 "컴포넌트 타입"으로 전달된다 — 렌더마다 새 함수 정체성이면
// React가 매 렌더 rdp-root를 언마운트→리마운트(전체 DOM 교체)한다. 트랩된 FocusScope(modal Popover/Dialog)
// 안에서 네이티브 <select>를 열면, 이 리마운트의 removedNodes를 Radix FocusScope MutationObserver가
// "focus 이탈"로 오판해 컨테이너로 focus를 되당겨 OS 드롭다운을 닫는 재렌더 폭주가 생긴다.
// → Calendar props를 클로저로 잡지 않는 세 컴포넌트를 모듈 스코프로 호이스팅해 정체성을 영구 고정한다.
function CalendarRoot({ className, rootRef, ...props }: any) {
  return <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />;
}

function CalendarChevron({ className, orientation, ...props }: any) {
  if (orientation === 'left') return <ChevronLeftIcon className={cn('size-4', className)} {...props} />;
  if (orientation === 'right') return <ChevronRightIcon className={cn('size-4', className)} {...props} />;
  return <ChevronDownIcon className={cn('size-4', className)} {...props} />;
}

function CalendarWeekNumber({ children, ...props }: any) {
  return (
    <td {...props}>
      <div className="flex size-[var(--cell-size)] items-center justify-center text-center">{children}</div>
    </td>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = DEFAULT_CN;

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('group/calendar p-3 [--cell-size:2rem]', className)}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString('ko', { month: 'long' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn('relative flex flex-col gap-4 md:flex-row', defaultClassNames.months),
        month: cn('flex w-full flex-col gap-4', defaultClassNames.month),
        nav: cn('absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1', defaultClassNames.nav),
        button_previous: cn(ghostBtn, 'h-[var(--cell-size)] w-[var(--cell-size)] select-none rounded-card-sm p-0 aria-disabled:opacity-50', defaultClassNames.button_previous),
        button_next: cn(ghostBtn, 'h-[var(--cell-size)] w-[var(--cell-size)] select-none rounded-card-sm p-0 aria-disabled:opacity-50', defaultClassNames.button_next),
        month_caption: cn('flex h-[var(--cell-size)] w-full items-center justify-center px-[var(--cell-size)]', defaultClassNames.month_caption),
        dropdowns: cn('flex h-[var(--cell-size)] w-full items-center justify-center gap-1.5 text-sm font-medium', defaultClassNames.dropdowns),
        dropdown_root: cn('relative rounded-card-sm border border-input shadow-sm has-[:focus]:border-ring has-[:focus]:ring-2 has-[:focus]:ring-ring', defaultClassNames.dropdown_root),
        dropdown: cn('absolute inset-0 bg-popover opacity-0', defaultClassNames.dropdown),
        caption_label: cn(
          'select-none font-medium',
          captionLayout === 'label'
            ? 'text-sm'
            : 'flex h-8 items-center gap-1 rounded-card-sm pl-2 pr-1 text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground',
          defaultClassNames.caption_label,
        ),
        month_grid: cn('w-full border-collapse', defaultClassNames.month_grid),
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn('flex-1 select-none rounded-card-sm text-[0.8rem] font-normal text-muted-foreground', defaultClassNames.weekday),
        week: cn('mt-2 flex w-full', defaultClassNames.week),
        week_number_header: cn('w-[var(--cell-size)] select-none', defaultClassNames.week_number_header),
        week_number: cn('select-none text-[0.8rem] text-muted-foreground', defaultClassNames.week_number),
        day: cn('group/day relative aspect-square h-full w-full select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md', defaultClassNames.day),
        range_start: cn('rounded-l-md bg-accent-surface', defaultClassNames.range_start),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_end: cn('rounded-r-md bg-accent-surface', defaultClassNames.range_end),
        today: cn('rounded-card-sm bg-accent-surface text-accent-surface-foreground font-semibold data-[selected=true]:rounded-none', defaultClassNames.today),
        outside: cn('text-muted-foreground aria-selected:text-muted-foreground', defaultClassNames.outside),
        disabled: cn('text-muted-foreground opacity-50', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: CalendarRoot,
        Chevron: CalendarChevron,
        DayButton: CalendarDayButton,
        WeekNumber: CalendarWeekNumber,
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = DEFAULT_CN;
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle}
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        ghostBtn,
        'flex aspect-square h-auto w-full min-w-[var(--cell-size)] flex-col gap-1 rounded-card-sm font-normal leading-none',
        'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground',
        'data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground',
        'data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground',
        'data-[range-middle=true]:bg-accent-surface data-[range-middle=true]:text-accent-surface-foreground',
        'group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-2 group-data-[focused=true]/day:ring-ring',
        '[&>span]:text-xs [&>span]:opacity-70',
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
