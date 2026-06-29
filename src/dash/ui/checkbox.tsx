/* shadcn/ui Checkbox — Radix 기반. APFS 규약:
   - 시각: 미체크 border-strong/bg-card, 체크 brand-blue 배경 + 흰 체크(기존 RowCheck와 동일 룩)
   - 포커스: shadcn ring 미사용 → 전역 outline
   - 키보드: Radix가 role=checkbox + Space 토글 제공(기존 손짠 RowCheck의 onKeyDown 누락 버그 해소) */
import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-[6px] border-[1.5px] border-border-strong bg-card transition-colors',
      'data-[state=checked]:border-brand-blue data-[state=checked]:bg-brand-blue data-[state=checked]:text-[color:var(--on-brand-solid)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
