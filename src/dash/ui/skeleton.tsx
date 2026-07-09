/* shadcn/ui Skeleton — 로딩 중 콘텐츠 자리표시자(펄스 애니메이션). APFS 규약 적용:
   - 배경: 정본 `bg-primary/10`(=full-color 토큰에 /NN opacity → 무음 no-op) 대신 매핑 토큰 `bg-muted`.
   - animate-pulse: Tailwind 코어 유틸(기저 opacity 1 → 중간 .5 → 1). 큰 블록 자리표시자에 표준.
     ⚠️ 인라인 텍스트 마스크 바(mask.tsx MT / AG Grid 헤더)는 기저 opacity가 낮아(.28)
        이 코어 펄스를 쓰면 중간에 '밝아져' 튄다 → 그쪽은 tokens.css의 apfs-mask-pulse(어두워지는 범위) 사용.
   - PageSkeleton: 라우트 전환 로딩 시 전 페이지 공용 스켈레톤 화면(app.tsx가 500ms 노출).
     responsive-ui: KPI 행은 flexWrap+flexBasis(고정 grid-cols 금지), 테이블 블록은 카드 overflow:hidden 내부.
   - PageSkeleton 중앙 상단 40% 지점에 GridLoader Spinner를 오버레이(래퍼 div aria-hidden으로 SR 중복 차단).
   - withSpinner(기본 true): false면 스피너 오버레이 생략 — 초기 진입은 boot 스플래시와 중복이라 스켈레톤만.
   사용: <Skeleton className="h-4 w-32" /> · 페이지 로딩: <PageSkeleton /> */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

/* 페이지 로딩 스켈레톤 — PageHeader(브레드크럼+타이틀) · KPI 스탯 행 · 메인 테이블/차트 블록의
   일반형 대시보드 골격을 근사. 셸 <main>이 패딩(22/26/104)을 제공하므로 여기선 세로 스택만. */
function PageSkeleton({ withSpinner = true }: { withSpinner?: boolean }) {
  return (
    <div className="max-w-[1320px] mx-auto" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }} aria-busy="true" aria-live="polite">
      {/* 중앙 상단 40% 오버레이 스피너 — 래퍼 div에 aria-hidden(내부 GridLoader의 role=status 중복 안내 차단) */}
      {withSpinner && (
        <div aria-hidden="true" style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1, pointerEvents: 'none' }}>
          <Spinner size={8} className="text-primary" />
        </div>
      )}
      {/* 브레드크럼 + 타이틀 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton className="h-3" style={{ width: 180 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Skeleton className="h-7" style={{ width: 'min(280px,60%)' }} />
          <Skeleton className="h-6" style={{ width: 92 }} />
        </div>
      </div>

      {/* KPI 스탯 행 — 좁으면 적층(flexWrap + flexBasis) */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-card" style={{ flex: '1 1 200px', minWidth: 0, border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Skeleton className="h-3" style={{ width: '55%' }} />
            <Skeleton className="h-6" style={{ width: '75%' }} />
            <Skeleton className="h-2.5" style={{ width: '40%' }} />
          </div>
        ))}
      </div>

      {/* 메인 테이블/차트 블록 — 카드 내부(overflow:hidden)로 가로 오버플로 격리 */}
      <div className="bg-card" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Skeleton className="h-5" style={{ width: 'min(220px,50%)' }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Skeleton className="h-8" style={{ width: 88 }} />
            <Skeleton className="h-8" style={{ width: 88 }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9" style={{ width: '100%' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export { Skeleton, PageSkeleton };
