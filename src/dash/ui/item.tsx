/* shadcn/ui Item — 범용 리스트/셀렉션 아이템 프리미티브. 정본 API 유지:
   Item(variant/size/asChild) · ItemGroup · ItemSeparator · ItemHeader · ItemMedia(variant)
   · ItemContent · ItemTitle · ItemDescription · ItemActions · ItemFooter.
   APFS 규약: rounded-card 토큰, bg/border 토큰, opacity 모디파이어 미사용, shadcn ring 없음. */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

function ItemGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="list" data-slot="item-group" className={cn('flex flex-col', className)} {...props} />;
}

function ItemSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="separator" className={cn('my-0 h-px w-full bg-border', className)} {...props} />;
}

const itemVariants = cva(
  'group/item flex flex-wrap items-center gap-3 rounded-card border border-transparent text-sm transition-colors [a&]:cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline: 'border-border',
        muted: 'bg-muted',
      },
      size: {
        default: 'p-4',
        sm: 'px-4 py-3',
        xs: 'gap-2.5 px-3 py-2',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

const Item = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof itemVariants> & { asChild?: boolean }
>(({ className, variant, size, asChild, ...props }, ref) => {
  const Comp: any = asChild ? Slot : 'div';
  return <Comp ref={ref} data-slot="item" className={cn(itemVariants({ variant, size }), className)} {...props} />;
});
Item.displayName = 'Item';

function ItemHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex w-full items-center justify-between gap-2', className)} {...props} />;
}

function ItemFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex w-full items-center justify-between gap-2', className)} {...props} />;
}

const mediaVariants = cva('flex shrink-0 items-center justify-center', {
  variants: {
    variant: {
      default: 'text-muted-foreground [&_svg]:size-5',
      icon: 'size-9 rounded-card border border-border bg-muted text-muted-foreground [&_svg]:size-[18px]',
      image: 'size-10 overflow-hidden rounded-card [&_img]:h-full [&_img]:w-full [&_img]:object-cover',
    },
  },
  defaultVariants: { variant: 'default' },
});

function ItemMedia({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof mediaVariants>) {
  return <div data-slot="item-media" className={cn(mediaVariants({ variant }), className)} {...props} />;
}

function ItemContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="item-content" className={cn('flex min-w-0 flex-1 flex-col gap-0.5', className)} {...props} />;
}

function ItemTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-2 text-sm font-semibold leading-snug text-foreground', className)} {...props} />;
}

function ItemDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('line-clamp-2 text-[13px] font-normal leading-normal text-muted-foreground', className)} {...props} />;
}

function ItemActions({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex shrink-0 items-center gap-1.5', className)} {...props} />;
}

export {
  Item,
  ItemGroup,
  ItemSeparator,
  ItemHeader,
  ItemFooter,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
};
