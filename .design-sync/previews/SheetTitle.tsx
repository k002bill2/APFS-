import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, Button } from 'apfs-dashboard-offline';

/* SheetTitle — 드로어 제목(text-base bold, Radix Title = 접근성 이름). 드로어마다 하나는 있어야 한다.
   ⚠ preflight off 라 시맨틱 태그의 UA 마진이 남는다 — 이 컴포넌트는 my-0 를 직접 걸어 막았다. */

export function TitleInHeader() {
  return (
    <Sheet open onOpenChange={() => {}}>
      <SheetContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>조기경보 기준 설정</SheetTitle>
        </SheetHeader>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 auto', minHeight: 0, overflow: 'auto', fontSize: 13.5, color: 'var(--foreground)' }}>
          <SheetDescription>기준을 넘어서면 해당 자펀드에 경보가 생성됩니다.</SheetDescription>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>의무투자 비율</span><span>60% 미만</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>보고 지연</span><span>5일 초과</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>피투자기업 부채비율</span><span>300% 초과</span></div>
        </div>
        <SheetFooter>
          <Button variant="primary" size="sm" leadingIcon="check" onClick={() => {}}>기준 저장</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function TitleLongWrap() {
  return (
    <Sheet open onOpenChange={() => {}}>
      <SheetContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <div>
            <SheetTitle>상주-어니스트 애그테크 투자조합 결성정보</SheetTitle>
            <SheetDescription>어니스트벤처스(주) · 2026-06-10 결성</SheetDescription>
          </div>
        </SheetHeader>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 auto', minHeight: 0, overflow: 'auto', fontSize: 13.5, color: 'var(--foreground)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>약정총액</span><span>30,000백만원</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>모태 출자</span><span>18,000백만원 (60.0%)</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>존속기간</span><span>8년</span></div>
        </div>
        <SheetFooter>
          <Button variant="outline" size="sm" onClick={() => {}}>명세 보기</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
