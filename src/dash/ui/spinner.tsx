/* shadcn/ui Spinner — lucide LoaderIcon + animate-spin(정본 그대로).
   기본 색은 currentColor 상속. 필요 시 className으로 크기/색 override. */
import * as React from 'react';
import { LoaderIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return <LoaderIcon role="status" aria-label="로딩 중" className={cn('size-4 animate-spin', className)} {...props} />;
}

export { Spinner };
