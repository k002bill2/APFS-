import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, Button } from 'apfs-dashboard-offline';

/* DialogOverlay — 모달 뒤 딤(black/55, z-overlay 75). DialogContent 가 자동으로 하나 렌더한다.
   뒤 페이지가 읽히지 않을 만큼 눌러 모달에 시선을 모으는 역할 — 아래 배경 페이지와 함께 본다. */

function PageBehind() {
  return (
    <div style={{ padding: 20, background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--foreground)', marginBottom: 14 }}>자펀드 투자현황</div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[['결성 자펀드', '34개'], ['약정총액', '1,284,000'], ['투자잔액', '812,400']].map(([k, v]) => (
          <div key={k} style={{ flex: 1, border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)', padding: '12px 14px' }}>
            <div style={{ fontSize: 12, color: 'var(--caption)' }}>{k}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)', marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)', overflow: 'hidden' }}>
        {['농식품 스마트팜 투자조합 2호', '해양수산 그로스 투자조합', '상주-어니스트 애그테크 투자조합', '푸드테크 혁신 투자조합 1호'].map((n, i) => (
          <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 14px', borderTop: i ? '1px solid var(--border-strong)' : 'none', fontSize: 13, color: 'var(--foreground)' }}>
            <span>{n}</span><span style={{ color: 'var(--caption)' }}>운용중</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OverlayScrim() {
  const ref = React.useRef<any>(null);
  return (
    <>
      <PageBehind />
      <Dialog ref={ref} open onOpenChange={() => {}}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>운용사 자료 요청</DialogTitle>
            <DialogDescription className="sr-only">운용사 자료 요청 확인</DialogDescription>
          </DialogHeader>
          <div style={{ padding: 18, fontSize: 13.5, color: 'var(--foreground)', lineHeight: 1.7 }}>
            선택한 자펀드 4건의 운용사에게 3분기 조합재무제표 제출을 요청합니다. 요청 알림은 담당자 메일과 시스템 알림센터로 동시 발송됩니다.
          </div>
          <DialogFooter>
            <span style={{ fontSize: 12, color: 'var(--caption)' }}>제출 기한 2026-10-15</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outline" size="sm" onClick={() => ref.current?.close()}>취소</Button>
              <Button variant="primary" size="sm" leadingIcon="check" onClick={() => {}}>요청 발송</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
