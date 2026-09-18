import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, Button } from 'apfs-dashboard-offline';

/* DialogTitle — 모달 제목(text-xl bold, Radix Title = 접근성 이름). 모달마다 반드시 하나 있어야 한다.
   ⚠ preflight off 라 시맨틱 태그의 UA 마진이 남는다 — 이 컴포넌트는 my-0 를 직접 걸어 막았다. */

export function TitleInHeader() {
  const ref = React.useRef<any>(null);
  return (
    <Dialog ref={ref} open onOpenChange={() => {}}>
      <DialogContent className="max-w-[640px]" onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>2026년 정시 출자사업 공고</DialogTitle>
          <DialogDescription className="sr-only">출자사업 공고 상세</DialogDescription>
        </DialogHeader>
        <div className="p-[46px]" style={{ display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--foreground)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>접수기간</span><span>2026-10-06 ~ 2026-10-31</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>출자규모</span><span>120,000백만원 (4개 분야)</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>담당부서</span><span>투자운용부</span></div>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={() => ref.current?.close()}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TitleLongWrap() {
  const ref = React.useRef<any>(null);
  return (
    <Dialog ref={ref} open onOpenChange={() => {}}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>해양수산 그로스 투자조합 결성정보 변경 요청</DialogTitle>
          <DialogDescription className="sr-only">결성정보 변경 요청 상세</DialogDescription>
        </DialogHeader>
        <div style={{ padding: 18, fontSize: 13.5, color: 'var(--foreground)', lineHeight: 1.7 }}>
          운용사가 제출한 변경 사항은 존속기간 1년 연장과 관리보수율 0.2%p 인하입니다. 승인 시 조합규약 개정본이 함께 등록됩니다.
        </div>
        <DialogFooter>
          <div />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="outline" size="sm" onClick={() => ref.current?.close()}>반려</Button>
            <Button variant="primary" size="sm" leadingIcon="check" onClick={() => {}}>승인</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
