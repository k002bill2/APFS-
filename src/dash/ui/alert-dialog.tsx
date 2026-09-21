/* shadcn/ui AlertDialog — Radix 기반. 파괴적 동작 확인용(취소/실행 2버튼, ESC·focus trap).
   APFS 규약: bg-card 표면, z-overlay/z-modal, ring 제거(전역 outline), tailwindcss-animate. */
import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '@/lib/utils';
import { DialogExitProvider, DialogExitStartProvider, DialogLockProvider, useDeferredClose, useExitEnd, useExitStart, makeExitEndHandler, makeExitStartHandler, type DialogHandle } from './dialog-exit';

/* ⚠ 그냥 AlertDialogPrimitive.Root 가 아니다 — Dialog 와 같은 이유로 닫힘 애니메이션을 살리려고
   내부 open 상태를 들고 exit 종료 뒤에 부모 onOpenChange(false) 를 호출한다(dialog-exit.ts 참조).
   AlertDialogAction/Cancel 은 Radix 닫기 버튼이라 이 경로를 그대로 탄다 — 소비처 수정이 필요 없다.
   단, Cancel 에 onClick={() => setModal(null)} 같은 직접 언마운트를 붙이면 애니메이션이 다시 죽는다. */
const AlertDialog = React.forwardRef<DialogHandle, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Root>>(
  ({ open, onOpenChange, children, ...props }, ref) => {
    const { inner, finish, onExitStart, close, rootOpenChange, locked, setLocked } = useDeferredClose(open, onOpenChange);
    const lock = React.useMemo(() => ({ locked, setLocked }), [locked, setLocked]);
    React.useImperativeHandle(ref, () => ({ close }), [close]);
    return (
      <DialogLockProvider value={lock}>
      <DialogExitProvider value={finish}>
      <DialogExitStartProvider value={onExitStart}>
        <AlertDialogPrimitive.Root open={inner} onOpenChange={rootOpenChange} {...props}>
          {children}
        </AlertDialogPrimitive.Root>
      </DialogExitStartProvider>
      </DialogExitProvider>
      </DialogLockProvider>
    );
  },
);
AlertDialog.displayName = 'AlertDialog';
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-overlay bg-black/55 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0', className)}
    {...props}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, onAnimationStart, onAnimationEnd, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        // ⚠ 중앙정렬은 CSS translate 프로퍼티 — animate-dialog-in 의 3D 플립이 transform 을 점유하므로 -translate-x-1/2 금지(Dialog 와 동일 규약).
        'fixed left-1/2 top-1/2 z-modal flex w-full max-w-[420px] [translate:-50%_-50%] flex-col gap-2 rounded-card-lg border border-border bg-card p-[22px] shadow-lg focus:outline-none',
        'data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out',
        className,
      )}
      onAnimationStart={makeExitStartHandler(useExitStart(), onAnimationStart)}
      onAnimationEnd={makeExitEndHandler(useExitEnd(), onAnimationEnd)}
      {...props}
    />
  </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5', className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-4 flex items-center justify-end gap-2', className)} {...props} />;
}

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title ref={ref} className={cn('my-0 text-base font-bold text-foreground', className)} {...props} />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description ref={ref} className={cn('text-[13px] leading-relaxed text-muted-foreground', className)} {...props} />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

const baseBtn = 'inline-flex items-center justify-center gap-1.5 cursor-pointer rounded-[9px] px-[15px] py-2 text-[13.5px] font-semibold whitespace-nowrap transition-colors';

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action ref={ref} className={cn(baseBtn, 'bg-primary text-primary-foreground', className)} {...props} />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel ref={ref} className={cn(baseBtn, 'border border-border-strong bg-card text-foreground', className)} {...props} />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
