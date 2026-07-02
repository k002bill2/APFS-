/* APFS DatePicker — shadcn Radix Calendar + Popover 조합의 제어 컴포넌트.
   네이티브 <input type="date">를 전 화면에서 대체한다. ⚠️ 값 계약을 반드시 유지:
   - value/onChange는 'YYYY-MM-DD' 문자열(빈 문자열=미선택). 필터 정확일치·zod·Excel·마스크가 이 포맷에 의존.
   - 🔴 타임존: 로컬 자정 Date ↔ 문자열 변환에 toISOString() 절대 금지(KST에서 하루 빠짐).
     date-fns format(d,'yyyy-MM-dd')(로컬)·parseISO('YYYY-MM-DD')(로컬 자정)로만 변환.
   - 트리거 버튼은 기존 14px 폼 컨트롤(border-strong/bg-card/radius 9/min-h 38)을 시각적으로 그대로 모사. */
import * as React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './popover';
import { Calendar } from './calendar';
import { cn } from '@/lib/utils';

// 'YYYY-MM-DD' → 로컬 자정 Date(파싱 실패/빈값 = undefined). parseISO는 시간 미포함 시 로컬 자정으로 파싱.
function parseValue(v: string): Date | undefined {
  if (!v) return undefined;
  const d = parseISO(v);
  return isValid(d) ? d : undefined;
}

export function DatePicker({ value, onChange, invalid, required, disabled, placeholder = '날짜 선택', ariaLabel }: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  // 필수 필드 상시 표식 — 테두리만 danger로. aria-invalid는 검증 실패(invalid)에만 붙인다.
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  // 트리거는 <button>이라 감싸는 <label>로 명명되지 않음(accname: label은 input류만 명명).
  // 네이티브 input이 받던 필드명을 보존하려면 소비처가 필드 라벨을 넘겨야 함.
  ariaLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = parseValue(value);

  return (
    // 🔴 non-modal로 둔다(`modal` 금지). Dialog(폼 모달)/Sheet(필터 드로어) 안에서 이 Popover는
    // body로 포털되지만, 비-modal이라도 Radix FocusScope 스택이 부모 Dialog/Sheet 트랩을 자동 pause하므로
    // 포털된 캘린더 안 네이티브 년/월 <select>가 포커스를 유지한다(년·월 드롭다운 정상 동작).
    // 예전엔 `modal`로 부모 트랩을 눌렀으나, 진짜 원인은 calendar.tsx의 컴포넌트 정체성 리마운트 폭주였고
    // 그걸 고친 뒤로 `modal`은 불필요해졌다. 오히려 `modal`은 disableOutsidePointerEvents로
    // 캘린더 열린 동안 폼 전체를 inert(pointer-events:none)로 만들어 ① 다른 컨트롤 첫 클릭이 무시되는
    // 2-click 회귀 ② Sheet 본문 스크롤 잠금 ③ 인라인 사용 시 전 페이지 freeze를 유발한다 → 재추가 금지.
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          className={cn(
            'flex min-h-[38px] w-full items-center justify-between gap-2 rounded-[9px] border bg-card px-[11px] py-2 text-left text-sm text-foreground transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-60',
            invalid || required ? 'border-danger' : 'border-border-strong',
          )}
        >
          <span className={cn('tabular-nums', !selected && 'text-muted-foreground')}>
            {selected ? format(selected, 'yyyy-MM-dd') : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown"
          startMonth={new Date(2000, 0)}
          endMonth={new Date(2035, 11)}
          locale={ko}
          autoFocus
          onSelect={(d?: Date) => {
            // mode="single"·required 미지정 → 선택일 재클릭 시 d=undefined(해제)로 들어옴.
            // 빈 문자열=미선택(계약). 선택/해제 모두 팝오버를 닫아 동작을 일관되게(재클릭이 유일한 clear 수단).
            onChange(d ? format(d, 'yyyy-MM-dd') : '');
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
