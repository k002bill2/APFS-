import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, Button, StatusBadge } from 'apfs-dashboard-offline';

/* DialogPortal — DialogContent 가 내부적으로 쓰는 포털(기본 목적지 document.body,
   PortalContainerContext 가 주입되면 그 엘리먼트). 부모 카드가 overflow:hidden 이어도
   모달이 그 안에 갇히지 않고 화면 중앙에 뜬다 — 아래 페이지 카드 위로 넘어오는 것이 그 증거다. */

export function PortalEscapesCard() {
  const ref = React.useRef<any>(null);
  return (
    <div style={{ padding: 20, background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)', overflow: 'hidden', height: 220 }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-strong)', fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>조기경보 감지 목록</div>
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['농식품 스마트팜 투자조합 2호', '의무투자 비율 38.4%'], ['해양수산 그로스 투자조합', '분기보고 6일 지연'], ['(주)한들수산', '부채비율 412%']].map(([a, b]) => (
            <div key={a} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--foreground)' }}>
              <span>{a}</span><span style={{ color: 'var(--caption)' }}>{b}</span>
            </div>
          ))}
        </div>
      </div>
      <Dialog ref={ref} open onOpenChange={() => {}}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>경보 상세</DialogTitle>
            <div style={{ marginRight: 26 }}><StatusBadge tone="danger" label="고위험" /></div>
          </DialogHeader>
          <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--foreground)' }}>
            <DialogDescription>농식품 스마트팜 투자조합 2호 · 어니스트벤처스(주)</DialogDescription>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>의무투자 비율</span><span>38.4% (기준 60%)</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>잔여 투자기간</span><span>8개월</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>최초 감지</span><span>2026-08-31</span></div>
          </div>
          <DialogFooter>
            <div />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outline" size="sm" onClick={() => ref.current?.close()}>닫기</Button>
              <Button variant="primary" size="sm" onClick={() => {}}>운용사 소명 요청</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
