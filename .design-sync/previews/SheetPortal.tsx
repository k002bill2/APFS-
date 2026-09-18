import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, Button } from 'apfs-dashboard-offline';

/* SheetPortal — SheetContent 가 내부적으로 쓰는 포털(목적지 document.body).
   드로어가 목록 카드 안에 갇히지 않고 화면 오른쪽 끝에 전체 높이로 붙는 것이 그 증거다. */

export function PortalEscapesCard() {
  return (
    <div style={{ padding: 20, background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)', overflow: 'hidden', height: 200 }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-strong)', fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>피투자기업 목록</div>
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['(주)그린팜테크', '스마트농업 · 1,200백만원'], ['(주)한들수산', '수산 · 800백만원'], ['(주)미루식품연구소', '푸드테크 · 600백만원']].map(([a, b]) => (
            <div key={a} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--foreground)' }}>
              <span>{a}</span><span style={{ color: 'var(--caption)' }}>{b}</span>
            </div>
          ))}
        </div>
      </div>
      <Sheet open onOpenChange={() => {}}>
        <SheetContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader>
            <div>
              <SheetTitle>(주)그린팜테크</SheetTitle>
              <SheetDescription>스마트농업 · 2024년 설립</SheetDescription>
            </div>
          </SheetHeader>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 auto', minHeight: 0, overflow: 'auto', fontSize: 13.5, color: 'var(--foreground)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>투자조합</span><span>농식품 스마트팜 2호</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>투자금액</span><span>1,200백만원</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>지분율</span><span>12.4%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>최근 기업가치</span><span>9,700백만원</span></div>
          </div>
          <SheetFooter>
            <Button variant="outline" size="sm" onClick={() => {}}>투자이력</Button>
            <Button variant="primary" size="sm" onClick={() => {}}>기업정보 수정</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
