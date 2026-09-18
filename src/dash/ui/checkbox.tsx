/* shadcn/ui Checkbox — Radix 기반. APFS 규약:
   - 시각: 미체크 border-strong/bg-card, 체크 brand-blue 배경 + 흰 체크(기존 RowCheck와 동일 룩)
   - 3상태: `checked='indeterminate'`(Radix 계약) → 같은 brand-blue 배경에 **대시(Minus)**. SR 에는 aria-checked=mixed.
     권한 매트릭스의 집계 체크(전체/열/대·중메뉴)가 쓴다. 일부 상태 클릭은 Radix 가 true 로 올린다(= "전체 켜기", 목업 동일).
   - 포커스: shadcn ring 미사용 → 전역 outline
   - 키보드: Radix가 role=checkbox + Space 토글 제공(기존 손짠 RowCheck의 onKeyDown 누락 버그 해소)
   - `<label>` 로 **감싸지 말 것** — Root 는 `<button>` 이라 암묵 연결이 클릭을 두 번 발화시킨다. 가시 라벨은 `htmlFor`/`id` 명시 연결. */
import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { spring } from '../motion/presets';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, checked, ...props }, ref) => {
  /* 마운트 시점에 이미 켜져 있던 표식은 scale-pop 을 건너뛴다(initial=false).
     권한 매트릭스처럼 체크 수백 개가 한 번에 열리면 전부 동시에 튀어 글리치로 읽힌다 — 사용자 토글로 켜질 때만 pop. */
  const mounted = React.useRef(false);
  React.useEffect(() => { mounted.current = true; }, []);
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      checked={checked}
      className={cn(
        'peer inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-[6px] border-[1.5px] border-border-strong bg-card transition-colors',
        'data-[state=checked]:border-brand-blue data-[state=checked]:bg-brand-blue data-[state=checked]:text-[color:var(--on-brand-solid)]',
        'data-[state=indeterminate]:border-brand-blue data-[state=indeterminate]:bg-brand-blue data-[state=indeterminate]:text-[color:var(--on-brand-solid)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {/* 체크/일부 시 Indicator 마운트 → scale-pop enter(spring.control). 해제 시 Radix 즉시 언마운트(현행 동일, exit 애니 없음 = §4 회귀 회피).
          checked↔indeterminate 전환은 Indicator 가 유지된 채 아이콘만 바뀐다(리마운트 없음).
          scale는 transform이라 app.tsx의 MotionConfig reducedMotion="user"가 저모션에서 자동으로 끈다. */}
      <CheckboxPrimitive.Indicator asChild>
        <motion.span
          className="flex items-center justify-center text-current"
          initial={mounted.current ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={spring.control}>
          {checked === 'indeterminate'
            ? <Minus className="h-3.5 w-3.5" strokeWidth={3} />
            : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </motion.span>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
