/* shadcn/ui Input Group — 정본은 Tailwind v4(data-slot CSS·container query) 기반이라
   여기서는 public API(InputGroup/Input/Addon/Text/Button/Textarea, align/size prop)를 유지하고
   내부만 Tailwind 3.4 + APFS 토큰으로 적응했다. APFS 규약:
   - 컨트롤 높이 38px(폼 표준), 입력 14px. 테두리는 컨테이너가 소유(내부 input은 border-0).
   - 포커스: 컨테이너 focus-within 시 border/ring 색 강조(전역 outline과 별개의 그룹 표시).
   - opacity 모디파이어 미사용, rounded-card 토큰. */
import * as React from 'react';
import { cn } from '@/lib/utils';

type Align = 'inline-start' | 'inline-end' | 'block-start' | 'block-end';

function InputGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="group"
      data-slot="input-group"
      className={cn(
        'relative flex min-w-0 flex-wrap items-center rounded-card border border-input bg-card text-sm transition-colors',
        'focus-within:border-ring focus-within:ring-1 focus-within:ring-ring',
        'has-[textarea]:flex-col has-[textarea]:items-stretch',
        className,
      )}
      {...props}
    />
  );
}

const InputGroupInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      data-slot="input-group-control"
      className={cn(
        'order-2 h-[38px] min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-caption disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
InputGroupInput.displayName = 'InputGroupInput';

const InputGroupTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      data-slot="input-group-control"
      className={cn(
        'order-2 min-h-16 w-full flex-1 resize-none border-0 bg-transparent p-3 text-sm text-foreground outline-none placeholder:text-caption disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
InputGroupTextarea.displayName = 'InputGroupTextarea';

function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { align?: Align }) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(
        'flex items-center gap-1.5 text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0',
        align === 'inline-start' && 'order-1 pl-3',
        align === 'inline-end' && 'order-3 pr-3',
        align === 'block-start' && 'order-1 w-full border-b border-border px-3 py-2',
        align === 'block-end' && 'order-4 w-full border-t border-border px-3 py-2',
        className,
      )}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

const btnSizes: Record<string, string> = {
  xs: 'h-6 gap-1 rounded-card-sm px-2 text-[12px]',
  sm: 'h-7 gap-1.5 rounded-card-sm px-2.5 text-[13px]',
  'icon-xs': 'size-6 rounded-card-sm',
  'icon-sm': 'size-7 rounded-card-sm',
};
const btnVariants: Record<string, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  outline: 'border border-border-strong bg-card text-foreground hover:bg-muted',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
};

const InputGroupButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: keyof typeof btnSizes; variant?: keyof typeof btnVariants }
>(({ className, size = 'xs', variant = 'ghost', type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      'inline-flex shrink-0 items-center justify-center font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
      btnSizes[size],
      btnVariants[variant],
      className,
    )}
    {...props}
  />
));
InputGroupButton.displayName = 'InputGroupButton';

export {
  InputGroup,
  InputGroupInput,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupText,
  InputGroupButton,
};
