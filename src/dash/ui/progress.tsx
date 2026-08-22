/* 공통 Progress — determinate/indeterminate 겸용 진행 표시 바.
   라이브러리 없이 CSS로 구현. value(0~100) 주면 determinate, 생략(null/undefined)하면 indeterminate.
   색은 토큰(track=bg-muted, fill=bg-primary), width 트랜지션은 모션 토큰(duration-tok/ease-ds).
   indeterminate 슬라이드·저모션 폴백은 tokens.css의 .apfs-progress-indet 규칙이 담당. */
import { cn } from '@/lib/utils';

interface ProgressProps {
  /** 0~100. null/undefined면 indeterminate(불확정) */
  value?: number | null;
  /** 접근名 — 진행 표시의 의미(예: "집행률", "처리 중") */
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

function Progress({ value, label = '진행률', size = 'md', className }: ProgressProps) {
  const indeterminate = value == null;
  const pct = indeterminate ? 0 : Math.max(0, Math.min(100, value));
  const h = size === 'sm' ? 'h-1' : 'h-1.5';
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-valuenow={indeterminate ? undefined : Math.round(pct)}
      className={cn('relative w-full overflow-hidden rounded-full bg-muted', h, className)}>
      {indeterminate ? (
        <div className="apfs-progress-indet absolute inset-y-0 left-0 w-2/5 rounded-full bg-primary" />
      ) : (
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-tok ease-ds"
          style={{ width: pct + '%' }} />
      )}
    </div>
  );
}

export { Progress };
