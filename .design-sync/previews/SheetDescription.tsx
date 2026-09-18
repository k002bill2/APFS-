import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, Button } from 'apfs-dashboard-offline';

/* SheetDescription — 드로어 보조 설명(13px muted, Radix Description = 접근성 설명).
   헤더는 가로 배치라 제목과 함께 div 로 감싸 쌓고, 설명이 군더더기인 드로어에서는 sr-only 로 남긴다. */

const label: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6, display: 'block' };
const input: React.CSSProperties = { width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)', fontSize: 13.5, boxSizing: 'border-box' };

export function DescriptionUnderTitle() {
  return (
    <Sheet open onOpenChange={() => {}}>
      <SheetContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <div>
            <SheetTitle>일괄 알림 발송</SheetTitle>
            <SheetDescription>선택한 운용사 6개사에 동일한 안내를 발송합니다.</SheetDescription>
          </div>
        </SheetHeader>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16, flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
          <div><span style={label}>제목</span><input style={input} defaultValue="3분기 조합재무제표 제출 요청" /></div>
          <div>
            <span style={label}>내용</span>
            <textarea style={{ ...input, height: 110, padding: 10, lineHeight: 1.6, resize: 'none', fontFamily: 'inherit' } as React.CSSProperties} defaultValue={'2026년 3분기 조합재무제표를 10월 15일까지 제출해 주시기 바랍니다.'} />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" size="sm" onClick={() => {}}>임시 저장</Button>
          <Button variant="primary" size="sm" leadingIcon="check" onClick={() => {}}>발송</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function DescriptionAsBodyLead() {
  return (
    <Sheet open onOpenChange={() => {}}>
      <SheetContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>엑셀 내려받기</SheetTitle>
        </SheetHeader>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
          <SheetDescription>
            현재 조회 조건(2026년 3분기 · 운용사 전체)으로 목록 128건을 엑셀로 내려받습니다. 화면에 보이는 열 순서가 그대로 적용됩니다.
          </SheetDescription>
          <div style={{ fontSize: 13.5, color: 'var(--foreground)' }}>파일명: 투자현황_2026Q3.xlsx</div>
        </div>
        <SheetFooter>
          <Button variant="primary" size="sm" leadingIcon="download" onClick={() => {}}>내려받기</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
