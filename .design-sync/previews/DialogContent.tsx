import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, Button, SaveButton } from 'apfs-dashboard-offline';

/* DialogContent — 모달 표면(bg-card, rounded-card-lg, 기본 max-w-lg, 본문 13.5px, 우상단 X 자동).
   폭은 className 으로 올린다(max-w-[640px] = 2단 폼 규격). 오버레이·포털은 이 컴포넌트가 함께 렌더한다. */

const label: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6, display: 'block' };
const input: React.CSSProperties = { width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)', fontSize: 13.5, boxSizing: 'border-box' };

export function WideFormContent() {
  const ref = React.useRef<any>(null);
  return (
    <Dialog ref={ref} open onOpenChange={() => {}}>
      <DialogContent className="max-w-[640px]" onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>출자약정 등록</DialogTitle>
          <DialogDescription className="sr-only">모태펀드 출자약정 등록 양식</DialogDescription>
        </DialogHeader>
        <div className="p-[46px]" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px' }}>
          <div><span style={label}>계정구분 *</span><input style={input} defaultValue="농식품투자조합 출자계정" /></div>
          <div><span style={label}>자펀드명 *</span><input style={input} defaultValue="푸드테크 혁신 투자조합 1호" /></div>
          <div><span style={label}>약정일</span><input style={input} defaultValue="2026-07-22" /></div>
          <div><span style={label}>약정액(백만원)</span><input style={input} defaultValue="18,000" /></div>
          <div><span style={label}>출자비율(%)</span><input style={input} defaultValue="60.0" /></div>
          <div><span style={label}>담당자</span><input style={input} defaultValue="투자운용부 김서연" /></div>
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

export function DefaultWidthContent() {
  const ref = React.useRef<any>(null);
  return (
    <Dialog ref={ref} open onOpenChange={() => {}}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>메모 추가</DialogTitle>
          <DialogDescription className="sr-only">일정 메모 추가</DialogDescription>
        </DialogHeader>
        <div style={{ padding: 18 }}>
          <span style={label}>내용</span>
          <textarea style={{ ...input, height: 96, padding: 10, lineHeight: 1.6, resize: 'none', fontFamily: 'inherit' } as React.CSSProperties} defaultValue={'운용사 정기보고 미제출 2개사 — 10/8 담당자 통화 예정'} />
        </div>
        <DialogFooter>
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
