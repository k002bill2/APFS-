import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, Button, StatusBadge } from 'apfs-dashboard-offline';

/* SheetHeader — 드로어 머리(하단 보더, flex items-center justify-between). 좌측 제목(+설명), 우측 보조 정보.
   우상단 X 와 겹치지 않게 우측 요소에 여백(약 26px)을 준다. */

export function HeaderWithBadge() {
  return (
    <Sheet open onOpenChange={() => {}}>
      <SheetContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <div>
            <SheetTitle>지급지시 상세</SheetTitle>
            <SheetDescription>지시번호 PAY-2026-1008-03</SheetDescription>
          </div>
          <div style={{ marginRight: 26 }}><StatusBadge tone="warning" label="승인 대기" /></div>
        </SheetHeader>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 auto', minHeight: 0, overflow: 'auto', fontSize: 13.5, color: 'var(--foreground)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>대상 자펀드</span><span>푸드테크 혁신 1호</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>집행액</span><span>4,500백만원</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>집행일</span><span>2026-10-08</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>수탁기관</span><span>농협은행 수탁부</span></div>
        </div>
        <SheetFooter>
          <Button variant="outline" size="sm" onClick={() => {}}>반려</Button>
          <Button variant="primary" size="sm" leadingIcon="check" onClick={() => {}}>승인</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function HeaderTitleOnly() {
  return (
    <Sheet open onOpenChange={() => {}}>
      <SheetContent side="left" onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>메뉴 바로가기</SheetTitle>
          <SheetDescription className="sr-only">주요 화면 바로가기 목록</SheetDescription>
        </SheetHeader>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
          {['자펀드 정보관리', '투자현황 조회', '조기경보 모니터링', '회계마감 관리', '운용사 건전성', '보고서 산출'].map((m) => (
            <div key={m} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-strong)', fontSize: 13.5, color: 'var(--foreground)' }}>{m}</div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
