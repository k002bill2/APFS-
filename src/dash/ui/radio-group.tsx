/* shadcn/ui RadioGroup — Radix 기반. APFS 규약(checkbox.tsx 와 한 패밀리):
   - 용도: 이름으로 묶인 **배타 선택**(개인/법인, 신주/구주, Y/N/해당없음, 검색 결과 1건 선택).
     on/off 2지선다('여/부')는 Switch, 독립 복수 선택은 Checkbox — 근거 namethatui.com/web/switch-checkbox-radio.
   - 시각: 미선택 border-strong/bg-card 원, 선택 brand-blue 테두리 + brand-blue 점(체크박스와 같은 역할색).
     선택 점은 Indicator 마운트 시 scale-pop(spring.control) — 체크박스 표식과 같은 이펙트.
     마운트 시점에 이미 선택돼 있던 점은 pop 을 건너뛴다(initial=false, 폼이 열릴 때 튀지 않게).
   - 포커스: shadcn ring 미사용 → 전역 outline
   - 키보드: Radix 가 role=radiogroup/radio + 방향키 이동·Space 선택 제공.
   - Item 은 `<button role=radio>` 라 `<label>` 로 **감싸지 말 것**(암묵 연결이 클릭 2회 발화) — 가시 라벨은 `htmlFor`/`id` 명시 연결. */
import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { spring } from '../motion/presets';

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn('flex flex-wrap items-center gap-4', className)} {...props} />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  const mounted = React.useRef(false);
  React.useEffect(() => { mounted.current = true; }, []);
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'peer inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-border-strong bg-card transition-colors',
        'data-[state=checked]:border-brand-blue',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {/* 선택 점 — scale 은 transform 이라 app.tsx MotionConfig reducedMotion="user" 가 저모션에서 자동으로 끈다. */}
      <RadioGroupPrimitive.Indicator asChild>
        <motion.span
          className="block h-2.5 w-2.5 rounded-full bg-brand-blue"
          initial={mounted.current ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={spring.control}
        />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
