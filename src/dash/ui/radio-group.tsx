/* shadcn/ui RadioGroup — Radix 기반. APFS 규약(checkbox.tsx 와 한 패밀리):
   - 용도: 이름으로 묶인 **배타 선택**(개인/법인, 신주/구주, Y/N/해당없음, 검색 결과 1건 선택).
     on/off 2지선다('여/부')는 Switch, 독립 복수 선택은 Checkbox — 근거 namethatui.com/web/switch-checkbox-radio.
   - 시각: 미선택 border-strong/bg-card 원, 선택 brand-blue 테두리 + brand-blue 점(체크박스와 같은 역할색).
     선택 점은 Indicator 마운트 시 scale-pop(spring.control) — 체크박스 표식과 같은 이펙트.
     직접 조작한 Item 만 pop 한다(마운트 시 이미 선택된 점은 튀지 않는다).
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
  /* 선택 점 pop 은 이 Item 을 직접 조작했을 때만(마운트 시 이미 선택된 점·프로그램 재선택 등은 pop 없음).
     Radix 는 방향키 선택도 Item.click() 으로 처리하므로 onClick 플래그 하나로 마우스·키보드 모두 덮인다. */
  const self = React.useRef(false);
  React.useEffect(() => { self.current = false; });
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        // p-0: preflight 이 꺼져 있어 <button> UA 패딩(1px 6px)이 살아 있으면 내부 폭이 5px 이 돼 선택 점이 6×10 으로 눌린다(2026-09-18 실측)
        'peer inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-border-strong bg-card p-0 transition-colors',
        'data-[state=checked]:border-brand-blue',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
      onClick={(e) => { self.current = true; props.onClick?.(e); }}
    >
      {/* 선택 점 — scale 은 transform 이라 app.tsx MotionConfig reducedMotion="user" 가 저모션에서 자동으로 끈다. */}
      <RadioGroupPrimitive.Indicator asChild>
        <motion.span
          className="block h-2.5 w-2.5 shrink-0 rounded-full bg-brand-blue"
          initial={self.current ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={spring.control}
        />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
