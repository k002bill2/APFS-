/* shadcn/ui Dialog — Radix 기반. APFS 규약 적용:
   - 표면: bg-card / border-border (기존 모달과 일치)
   - z-index: z-overlay(75) / z-modal(80) — 셸 raw 정수 chrome(모달 71) 위로
   - 포커스: shadcn ring 유틸 제거 → tokens.css 전역 :focus-visible box-shadow 글로우로 통일
   - 애니메이션: Animate UI(animate-ui.com) Radix Dialog 열림 방식 — 콘텐츠는 from:'top' 3D 플립
     (perspective+rotateX)+blur, 오버레이는 페이드. tailwind.config의 dialog-in/out 키프레임.
     ⚠ 중앙정렬은 CSS translate 프로퍼티가 담당(transform은 플립 전용). Motion 미도입=Radix exit 트랩 회피. */
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortalContainer } from './portal-container';
import { DialogExitProvider, useDeferredClose, useExitEnd, makeExitEndHandler, type DialogHandle } from './dialog-exit';

/* ⚠ 그냥 DialogPrimitive.Root 가 아니다 — 닫힘 애니메이션을 살리려고 내부 open 상태를 들고
   exit 종료 뒤에 부모 onOpenChange(false) 를 호출한다. 근거·전체 맥락은 dialog-exit.ts 주석.
   모달 자체 버튼(취소·저장)으로 닫을 때는 ref.current.close() 를 쓴다(onClose 직접 호출은 애니메이션 없음). */
const Dialog = React.forwardRef<DialogHandle, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>>(
  ({ open, onOpenChange, children, ...props }, ref) => {
    const { inner, finish, close, rootOpenChange } = useDeferredClose(open, onOpenChange);
    React.useImperativeHandle(ref, () => ({ close }), [close]);
    return (
      <DialogExitProvider value={finish}>
        <DialogPrimitive.Root open={inner} onOpenChange={rootOpenChange} {...props}>
          {children}
        </DialogPrimitive.Root>
      </DialogExitProvider>
    );
  },
);
Dialog.displayName = 'Dialog';
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-overlay bg-black/55 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideClose?: boolean }
>(({ className, children, hideClose, onAnimationEnd, ...props }, ref) => (
  <DialogPortal container={usePortalContainer()}>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // text-[13.5px]: 모달 본문 기본 폰트 규격(2026-09-15 사용자 결정) — 앱 기본 14px 보다 한 단계 작다.
        // 상속값이라 자체 fontSize 를 가진 자식(제목 text-xl·라벨 12px·SchemaField 13.5)은 그대로 이긴다.
        'fixed left-1/2 top-1/2 z-modal flex w-full max-w-lg [translate:-50%_-50%] flex-col overflow-hidden rounded-card-lg border border-border bg-card text-[13.5px] shadow-lg focus:outline-none data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out',
        className,
      )}
      onAnimationEnd={makeExitEndHandler(useExitEnd(), onAnimationEnd)}
      {...props}
    >
      {children}
      {!hideClose && (
        <DialogPrimitive.Close
          aria-label="닫기"
          className="absolute right-3.5 top-3.5 inline-flex rounded-card-sm p-1 text-muted-foreground opacity-80 transition-opacity hover:opacity-100 disabled:pointer-events-none"
        >
          <X className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-between gap-3 border-b border-border px-[18px] py-4', className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-wrap items-center justify-between gap-x-2.5 gap-y-2 border-t border-border px-[18px] py-3.5', className)} {...props} />;
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('my-0 text-xl font-bold text-foreground', className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-[13px] text-muted-foreground', className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
export type { DialogHandle };
