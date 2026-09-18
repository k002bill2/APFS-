import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose, StatusBadge } from 'apfs-dashboard-offline';

/* DialogClose — 모달을 닫는 Radix 버튼. DialogContent 는 우상단 X 를 자체 렌더하므로(hideClose 로 끔),
   푸터의 「닫기」처럼 추가 닫기 버튼이 필요할 때 이 파트를 쓴다.
   ⚠ asChild 자식은 forwardRef 가 있는 네이티브 엘리먼트로 — UI.Button 은 쓸 수 없다. */

const btnOutline: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 9, border: '1px solid var(--border-strong)', background: 'var(--card)', color: 'var(--foreground)', font: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' };
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--foreground)' };

export function CloseInFooter() {
  const ref = React.useRef<any>(null);
  return (
    <Dialog ref={ref} open onOpenChange={() => {}}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>자펀드 명세</DialogTitle>
          <div style={{ marginRight: 34 }}><StatusBadge tone="info" label="읽기 전용" /></div>
        </DialogHeader>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <DialogDescription>상주-어니스트 애그테크 투자조합 · 어니스트벤처스(주)</DialogDescription>
          <div style={row}><span style={{ color: 'var(--caption)' }}>결성일</span><span>2026-06-10</span></div>
          <div style={row}><span style={{ color: 'var(--caption)' }}>약정총액</span><span>30,000백만원</span></div>
          <div style={row}><span style={{ color: 'var(--caption)' }}>모태 출자비율</span><span>60.0%</span></div>
          <div style={row}><span style={{ color: 'var(--caption)' }}>존속기간</span><span>8년 (2034-06-09)</span></div>
        </div>
        <DialogFooter>
          <span style={{ fontSize: 12, color: 'var(--caption)' }}>수정은 자펀드 정보관리에서 진행합니다.</span>
          <DialogClose style={btnOutline}>닫기</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CloseAsChild() {
  const ref = React.useRef<any>(null);
  return (
    <Dialog ref={ref} open onOpenChange={() => {}}>
      <DialogContent hideClose onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>제출 완료</DialogTitle>
          <DialogClose asChild>
            <button aria-label="닫기" style={{ ...btnOutline, height: 28, padding: '0 10px', fontSize: 12 }}>닫기</button>
          </DialogClose>
        </DialogHeader>
        <div style={{ padding: 18, fontSize: 13.5, color: 'var(--foreground)', lineHeight: 1.7 }}>
          2026년 3분기 조합재무제표가 접수되었습니다. 검토 결과는 회계마감 일정에 따라 알림센터로 안내됩니다.
          <DialogDescription style={{ marginTop: 10 }}>접수번호 AF-2026-Q3-0184 · 접수일시 2026-10-02 14:20</DialogDescription>
        </div>
        <DialogFooter>
          <div />
          <DialogClose style={btnOutline}>확인</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
