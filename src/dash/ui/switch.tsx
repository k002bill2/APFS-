/* shadcn/ui Switch — Radix 기반. APFS 규약:
   - 용도: on/off **2지선다 값** 토글 — 폼 모달의 사용여부·제공여부('여'/'부', 'Y'/'N')와 즉시 반영형 설정(테마·알림) 모두.
     · 2026-09-18 오전 namethatui(switch=즉시 반영 / checkbox=Save 대기) 의미 규약으로 폼 값을 체크박스로 바꿨다가,
       같은 날 오후 사용자 결정("스위치는 체크로 하지 말고 원복")으로 **스위치 렌더 원복**. 화면 인터랙션 통일이 의미 규약보다 우선.
     · 독립 복수 선택(사용자 구분·권한 체크 그룹, 권한 매트릭스)은 checkbox, 상호배타 '분류'(개인/법인, Y/N/해당없음)는 radio(ui/radio-group.tsx).
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
