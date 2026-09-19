import * as React from 'react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, Button } from 'apfs-dashboard-offline';

/* SheetTrigger — 드로어를 여는 버튼. 목록 툴바의 「상세조건」 자리에 놓인다.
   ⚠ UI.Button 은 forwardRef 가 없어 asChild 트리거로 쓸 수 없다 — 트리거에 직접 스타일을 준다. */

const btnOutline: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 9, border: '1px solid var(--border-strong)', background: 'var(--card)', color: 'var(--foreground)', font: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' };
const btnPrimary: React.CSSProperties = { ...btnOutline, background: 'var(--primary)', borderColor: 'transparent', color: 'var(--primary-foreground)', fontWeight: 700 };
const label: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6, display: 'block' };
const input: React.CSSProperties = { width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)', fontSize: 13.5, boxSizing: 'border-box' };

export function TriggerOpensDrawer() {
  return (
    <div style={{ padding: 20, background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--foreground)' }}>투자현황 조회</div>
        <Sheet open onOpenChange={() => {}}>
          <SheetTrigger style={btnOutline}>상세조건</SheetTrigger>
          <SheetContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
            <SheetHeader>
              <div>
                <SheetTitle>상세조건</SheetTitle>
                <SheetDescription>목록에 적용할 조회 조건</SheetDescription>
              </div>
            </SheetHeader>
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16, flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
              <div><span style={label}>조회기간</span><input style={input} defaultValue="2026-07-01 ~ 2026-09-30" /></div>
              <div><span style={label}>운용사</span><input style={input} defaultValue="어니스트벤처스(주)" /></div>
              <div><span style={label}>피투자기업</span><input style={input} defaultValue="전체" /></div>
            </div>
            <SheetFooter>
              <Button variant="ghost" size="sm" leadingIcon="refresh" onClick={() => {}}>초기화</Button>
              <Button variant="primary" size="sm" leadingIcon="search" onClick={() => {}}>조건 적용</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
      <div style={{ border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)', padding: 14, fontSize: 13.5, color: 'var(--foreground)' }}>
        조회 결과 128건 · 투자금액 합계 812,400백만원
      </div>
    </div>
  );
}

export function TriggerVariants() {
  return (
    <div style={{ padding: 24, background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <Sheet open={false} onOpenChange={() => {}}>
        <SheetTrigger style={btnOutline}>상세조건</SheetTrigger>
      </Sheet>
      <Sheet open={false} onOpenChange={() => {}}>
        <SheetTrigger style={btnPrimary}>경보 알림 열기</SheetTrigger>
      </Sheet>
    </div>
  );
}
