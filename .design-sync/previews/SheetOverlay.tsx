import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, Button } from 'apfs-dashboard-offline';

/* SheetOverlay — 드로어 뒤 딤(black/55, z-overlay 75). SheetContent 가 자동으로 하나 렌더한다.
   목록 위에서 드로어를 여는 흐름이라 뒤 페이지와 함께 봐야 딤의 세기가 판단된다. */

function PageBehind() {
  return (
    <div style={{ padding: 20, background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--foreground)', marginBottom: 14 }}>운용사 건전성 점검</div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[['점검 대상', '18개사'], ['주의', '3개사'], ['위험', '1개사']].map(([k, v]) => (
          <div key={k} style={{ flex: 1, border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)', padding: '12px 14px' }}>
            <div style={{ fontSize: 12, color: 'var(--caption)' }}>{k}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)', marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)', overflow: 'hidden' }}>
        {[['어니스트벤처스(주)', '양호'], ['그린하베스트파트너스', '주의'], ['블루오션인베스트먼트', '양호'], ['미루캐피탈파트너스', '위험']].map(([n, s], i) => (
          <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 14px', borderTop: i ? '1px solid var(--border-strong)' : 'none', fontSize: 13, color: 'var(--foreground)' }}>
            <span>{n}</span><span style={{ color: 'var(--caption)' }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OverlayScrim() {
  return (
    <>
      <PageBehind />
      <Sheet open onOpenChange={() => {}}>
        <SheetContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader>
            <div>
              <SheetTitle>그린하베스트파트너스</SheetTitle>
              <SheetDescription>등록번호 AF-GP-0142 · 주의</SheetDescription>
            </div>
          </SheetHeader>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 auto', minHeight: 0, overflow: 'auto', fontSize: 13.5, color: 'var(--foreground)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>운용 자펀드</span><span>4개</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>자기자본</span><span>3,120백만원</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>전문인력</span><span>5명 (기준 3명)</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>지적사항</span><span style={{ color: 'var(--danger-text)' }}>2건</span></div>
          </div>
          <SheetFooter>
            <Button variant="outline" size="sm" onClick={() => {}}>점검이력</Button>
            <Button variant="primary" size="sm" onClick={() => {}}>소명 요청</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
