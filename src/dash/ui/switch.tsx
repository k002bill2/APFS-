/* shadcn/ui Switch — Radix 기반. APFS 규약:
   - 용도: **바꾸는 즉시 반영되는** 설정 토글(테마·알림 on/off 등)에만 쓴다.
     · 저장 버튼을 기다리는 폼 값(사용여부·제공여부 등 '여'/'부')은 **checkbox** 다 — schemas/renderers.tsx case 'switch' 주석 참조.
       (스키마 토큰 control:'switch' 는 남아 있지만 렌더러가 Checkbox 로 그린다. 2026-09-18)
     · 상호배타 '분류' 선택(개인/법인, 신주/구주, Y/N/해당없음)은 radio.
     근거: switch=즉시 반영 / checkbox=Save 대기 가능 / radio=이름 묶인 배타 그룹
     (namethatui.com/web/switch-checkbox-radio).
   - 시각: off = muted 트랙 + border-strong, on = primary 트랙. 엄지(thumb)는 흰 원.
   - 포커스: shadcn ring 미사용 → 전역 outline(checkbox.tsx 동일 규약)
   - 키보드: Radix 가 role=switch + Space/Enter 토글 제공. 접근名은 소비처(SchemaField)가 aria-label 로 부여. */
import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer items-center rounded-full border-[1.5px] p-[1.5px] transition-colors',
      'border-border-strong bg-muted',
      'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    {/* 엄지 — transform 이동(translate-x). app.tsx MotionConfig reducedMotion="user" 와 무관한 CSS transition 이라
        저모션 사용자에겐 prefers-reduced-motion 전역 규칙이 적용된다. */}
    <SwitchPrimitive.Thumb
      className={cn(
        'pointer-events-none block h-[16px] w-[16px] rounded-full bg-white shadow-sm ring-0 transition-transform',
        'data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-[18px]',
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
