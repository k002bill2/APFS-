import * as React from 'react';
import { Skeleton } from 'apfs-dashboard-offline';

/* Skeleton — 로딩 자리표시자(animate-pulse + rounded-md + bg-muted).
   APFS 규약: **로딩 = Skeleton/PageSkeleton, 상시 데이터 마스크 = apfs-mask-pulse 바**(기저 opacity 가 낮아
   코어 animate-pulse 를 쓰면 중간에 밝아져 튄다). 치수는 className(h-4 w-32) 또는 인라인 style 로 준다. */

const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 };

export function KpiCards() {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', maxWidth: 720 }}>
      {['총 AUM', '집행률', '조기경보', '마감 임박'].map((k) => (
        <div key={k} style={{ ...card, flex: '1 1 150px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton style={{ height: 12, width: '55%' }} />
          <Skeleton style={{ height: 24, width: '75%' }} />
          <Skeleton style={{ height: 10, width: '40%' }} />
        </div>
      ))}
    </div>
  );
}

export function TableRows() {
  return (
    <div style={{ ...card, maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Skeleton style={{ height: 20, width: 200 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton style={{ height: 32, width: 84 }} />
          <Skeleton style={{ height: 32, width: 84 }} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} style={{ height: 34, width: '100%' }} />)}
      </div>
    </div>
  );
}

export function ListItems() {
  return (
    <div style={{ ...card, maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skeleton style={{ height: 36, width: 36, borderRadius: 10 }} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <Skeleton style={{ height: 13, width: '62%' }} />
            <Skeleton style={{ height: 11, width: '86%' }} />
          </div>
          <Skeleton style={{ height: 22, width: 56, borderRadius: 7 }} />
        </div>
      ))}
    </div>
  );
}
