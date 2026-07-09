/* 공용 Spinner — react-spinners GridLoader 래퍼.
   색은 currentColor 상속(GridLoader가 color를 dot backgroundColor에 그대로 주입). className으로 색(text-*)·size prop으로 dot 크기 override. */
import { GridLoader } from 'react-spinners';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  className?: string;
  size?: number;
  color?: string;
  [key: string]: unknown;
}

function Spinner({ className, size = 5, color = 'currentColor', ...props }: SpinnerProps) {
  return (
    <GridLoader
      role="status"
      aria-label="로딩 중"
      className={cn('inline-flex', className)}
      size={size}
      color={color}
      {...props}
    />
  );
}

export { Spinner };
