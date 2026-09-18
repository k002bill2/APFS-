import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, Button } from 'apfs-dashboard-offline';

/* SheetFooter — 드로어 하단 액션 바(상단 보더, flex justify-end gap-2). 본문에 flex:1 을 주면 바닥에 고정된다.
   필터 드로어는 「초기화 / 조건 적용」 짝이 기본형. */

const label: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6, display: 'block' };
const input: React.CSSProperties = { width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)', fontSize: 13.5, boxSizing: 'border-box' };

export function FooterResetApply() {
  return (
    <Sheet open onOpenChange={() => {}}>
      <SheetContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <div>
            <SheetTitle>보고서 조건</SheetTitle>
            <SheetDescription>산출할 보고서의 기준을 설정합니다</SheetDescription>
          </div>
        </SheetHeader>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16, flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
          <div><span style={label}>보고 기준일</span><input style={input} defaultValue="2026-09-30" /></div>
          <div><span style={label}>보고서 종류</span><input style={input} defaultValue="분기 투자성과 보고서" /></div>
          <div><span style={label}>포함 시트</span><input style={input} defaultValue="요약 · 자펀드별 성과 · 피투자기업" /></div>
        </div>
        <SheetFooter>
          <Button variant="ghost" size="sm" leadingIcon="refresh" onClick={() => {}}>초기화</Button>
          <Button variant="primary" size="sm" leadingIcon="download" onClick={() => {}}>보고서 산출</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function FooterSingleAction() {
  return (
    <Sheet open onOpenChange={() => {}}>
      <SheetContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <div>
            <SheetTitle>변경 이력</SheetTitle>
            <SheetDescription>자펀드 결성정보 · 최근 4건</SheetDescription>
          </div>
        </SheetHeader>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
          {[['2026-09-11', '약정총액 28,000 → 30,000'], ['2026-08-02', '존속기간 7년 → 8년'], ['2026-07-19', '관리보수율 2.0% → 1.8%'], ['2026-06-10', '결성 등록']].map(([d, c]) => (
            <div key={d} style={{ borderLeft: '2px solid var(--border-strong)', paddingLeft: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--caption)' }}>{d}</div>
              <div style={{ fontSize: 13.5, color: 'var(--foreground)', marginTop: 2 }}>{c}</div>
            </div>
          ))}
        </div>
        <SheetFooter>
          <Button variant="outline" size="sm" leadingIcon="download" onClick={() => {}}>이력 내려받기</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
