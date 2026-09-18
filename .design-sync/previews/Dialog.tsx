import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, Button, SaveButton } from 'apfs-dashboard-offline';

/* Dialog — 제어형 Radix Dialog. APFS 규약: `open` 을 넘길 때는 반드시 ref 를 함께(닫힘 애니메이션 완료 후 언마운트),
   모달 내부 버튼으로 닫을 땐 ref.current.close(). 본문 패딩 46px 패밀리(헤더·푸터 px-[46px]). */

const label: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6, display: 'block' };
const input: React.CSSProperties = { width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)', fontSize: 13.5, boxSizing: 'border-box' };

export function FormDialog() {
  const ref = React.useRef<any>(null);
  return (
    <Dialog ref={ref} open onOpenChange={() => {}}>
      <DialogContent className="max-w-[640px]" onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>자펀드 등록</DialogTitle>
          <DialogDescription className="sr-only">자펀드 등록 양식</DialogDescription>
        </DialogHeader>
        <div className="p-[46px]" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px' }}>
          <div><span style={label}>운용사 *</span><input style={input} defaultValue="어니스트벤처스(주)" /></div>
          <div><span style={label}>자펀드명 *</span><input style={input} defaultValue="상주-어니스트 애그테크 투자조합" /></div>
          <div><span style={label}>결성일</span><input style={input} defaultValue="2026-06-10" /></div>
          <div><span style={label}>약정총액(백만원)</span><input style={input} defaultValue="30,000" /></div>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="outline" size="sm" onClick={() => ref.current?.close()}>취소</Button>
            <SaveButton onSubmit={() => {}} />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
