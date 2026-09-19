import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, Button, SaveButton, StatusBadge } from 'apfs-dashboard-offline';

/* DialogFooter — 모달 액션 바(상단 보더 + flex justify-between). 좌측은 보조/파괴 동작·상태 메모,
   우측은 취소·저장 묶음. 본문 46px 패밀리 모달에서는 푸터도 px-[46px] 로 정렬을 맞춘다. */

const label: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6, display: 'block' };
const input: React.CSSProperties = { width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)', fontSize: 13.5, boxSizing: 'border-box' };

export function FooterActions() {
  const ref = React.useRef<any>(null);
  return (
    <Dialog ref={ref} open onOpenChange={() => {}}>
      <DialogContent className="max-w-[640px]" onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>투자심의 결과 등록</DialogTitle>
          <DialogDescription className="sr-only">투자심의 결과 등록 양식</DialogDescription>
        </DialogHeader>
        <div className="p-[46px]" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px' }}>
          <div><span style={label}>자펀드명</span><input style={input} defaultValue="농식품 스마트팜 투자조합 2호" /></div>
          <div><span style={label}>운용사</span><input style={input} defaultValue="그린하베스트파트너스" /></div>
          <div><span style={label}>심의일</span><input style={input} defaultValue="2026-09-14" /></div>
          <div><span style={label}>의결금액(백만원)</span><input style={input} defaultValue="12,500" /></div>
        </div>
        <DialogFooter className="px-[46px]">
          <Button variant="ghost" size="sm" leadingIcon="trash" onClick={() => {}}>심의안 삭제</Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button variant="outline" size="sm" onClick={() => ref.current?.close()}>취소</Button>
            <SaveButton onSubmit={() => {}}>결과 저장</SaveButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FooterWithNote() {
  const ref = React.useRef<any>(null);
  return (
    <Dialog ref={ref} open onOpenChange={() => {}}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>9월 회계마감 확정</DialogTitle>
          <DialogDescription className="sr-only">회계마감 확정 확인</DialogDescription>
        </DialogHeader>
        <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--foreground)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>마감 대상 자펀드</span><span>34개</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>미제출 운용사</span><span style={{ color: 'var(--danger-text)' }}>2개사</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>조정 분개</span><span>7건</span></div>
        </div>
        <DialogFooter>
          <span style={{ fontSize: 12, color: 'var(--caption)' }}>확정 후에는 분개 수정이 불가합니다.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge tone="warning" label="검증 대기" />
            <Button variant="outline" size="sm" onClick={() => ref.current?.close()}>취소</Button>
            <Button variant="primary" size="sm" leadingIcon="check" onClick={() => {}}>마감 확정</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
