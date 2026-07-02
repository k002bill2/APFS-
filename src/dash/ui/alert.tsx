/* shadcn/ui Alert — 인라인 콜아웃/경고 배너. APFS 규약 적용:
   - variant 색: 정본의 text-destructive/90(=/NN opacity 무음 드롭) 대신 -soft 배경 토큰 +
     솔리드 전경 토큰 + color-mix 테두리(StatusBadge와 동일 idiom). /NN 모디파이어 미사용.
   - 반경: rounded-card(토큰 --radius 추종). rounded-lg 금지(Tailwind 고정 rem 폴백).
   - 포커스: shadcn ring 유틸 없음(비대화형 배너라 포커스 대상 아님).
   - 정본 대비: 기본 default/destructive에 대시보드용 info/success/warning 3종 확장.
   사용: <Alert variant="warning"><TriangleAlert/><AlertTitle>…</AlertTitle><AlertDescription>…</AlertDescription></Alert> */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-card border px-4 py-3 text-[13px] leading-relaxed [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-3.5 [&>svg]:h-[18px] [&>svg]:w-[18px] [&>svg+div]:pl-7 [&:has(>svg)]:pl-11',
  {
    variants: {
      variant: {
        default: 'bg-card text-foreground border-border [&>svg]:text-muted-foreground',
        info: 'bg-info-soft text-foreground border-[color-mix(in_srgb,var(--info)_30%,transparent)] [&>svg]:text-info',
        success: 'bg-success-soft text-foreground border-[color-mix(in_srgb,var(--success)_30%,transparent)] [&>svg]:text-success',
        warning: 'bg-warning-soft text-foreground border-[color-mix(in_srgb,var(--warning)_38%,transparent)] [&>svg]:text-warning',
        destructive: 'bg-danger-soft text-foreground border-[color-mix(in_srgb,var(--danger)_32%,transparent)] [&>svg]:text-danger',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mb-1 font-semibold leading-snug tracking-tight text-foreground', className)} {...props} />
  ),
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-muted-foreground [&_p]:leading-relaxed', className)} {...props} />
  ),
);
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription, alertVariants };
