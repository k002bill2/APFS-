import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, SheetClose } from 'apfs-dashboard-offline';

/* SheetClose — 드로어를 닫는 Radix 버튼. SheetContent 는 우상단 X 를 자체 렌더하므로(hideClose 로 끔),
   푸터의 「닫기」처럼 추가 닫기 버튼이 필요할 때 쓴다. asChild 자식은 네이티브 엘리먼트로 둔다. */

const btnOutline: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 9, border: '1px solid var(--border-strong)', background: 'var(--card)', color: 'var(--foreground)', font: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' };
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--foreground)' };

export function CloseInFooter() {
  return (
    <Sheet open onOpenChange={() => {}}>
      <SheetContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <div>
            <SheetTitle>알림 상세</SheetTitle>
            <SheetDescription>2026-09-18 09:12 수신</SheetDescription>
          </div>
        </SheetHeader>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>운용사 분기보고 지연</div>
          <div style={{ fontSize: 13.5, color: 'var(--foreground)', lineHeight: 1.7 }}>
            그린하베스트파트너스가 2026년 3분기 조합재무제표를 제출 기한(2026-09-12)까지 제출하지 않았습니다. 6일 경과.
          </div>
          <div style={row}><span style={{ color: 'var(--caption)' }}>대상 자펀드</span><span>2개</span></div>
          <div style={row}><span style={{ color: 'var(--caption)' }}>담당자</span><span>투자운용부 김서연</span></div>
        </div>
        <SheetFooter>
          <SheetClose style={btnOutline}>닫기</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function CloseAsChildHeader() {
  return (
    <Sheet open onOpenChange={() => {}}>
      <SheetContent hideClose onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <div>
            <SheetTitle>첨부 자료</SheetTitle>
            <SheetDescription>투자심의 결과보고 · 3건</SheetDescription>
          </div>
          <SheetClose asChild>
            <button aria-label="닫기" style={{ ...btnOutline, height: 28, padding: '0 10px', fontSize: 12 }}>닫기</button>
          </SheetClose>
        </SheetHeader>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
          {[['투자심의 결과보고서_2026Q3.pdf', '1.8MB'], ['조합규약_개정본.pdf', '640KB'], ['운용사 확약서.hwp', '210KB']].map(([n, s]) => (
            <div key={n} style={{ border: '1px solid var(--border-strong)', borderRadius: 10, padding: '11px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--foreground)' }}>
              <span>{n}</span><span style={{ color: 'var(--caption)' }}>{s}</span>
            </div>
          ))}
        </div>
        <SheetFooter>
          <SheetClose style={btnOutline}>확인</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
