import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, Button } from 'apfs-dashboard-offline';

/* DialogDescription — 모달 보조 설명(13px muted, Radix Description = 접근성 설명).
   보일 때는 제목 아래에 쌓고(헤더는 가로 배치라 둘을 div 로 감싼다), 폼 모달처럼 설명이 군더더기면 sr-only 로 남긴다. */

export function DescriptionUnderTitle() {
  const ref = React.useRef<any>(null);
  return (
    <Dialog ref={ref} open onOpenChange={() => {}}>
      <DialogContent className="max-w-[640px]" onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <div>
            <DialogTitle>의무투자 이행점검</DialogTitle>
            <DialogDescription style={{ marginTop: 4 }}>투자기간 종료 자펀드 12개의 농식품 분야 의무투자 비율을 일괄 점검합니다.</DialogDescription>
          </div>
        </DialogHeader>
        <div className="p-[46px]" style={{ display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--foreground)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>점검 기준일</span><span>2026-09-30</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>기준 비율</span><span>60% 이상</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--caption)' }}>미달 예상</span><span style={{ color: 'var(--danger-text)' }}>3개 조합</span></div>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="outline" size="sm" onClick={() => ref.current?.close()}>취소</Button>
            <Button variant="primary" size="sm" leadingIcon="refresh" onClick={() => {}}>점검 실행</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DescriptionAsBodyLead() {
  const ref = React.useRef<any>(null);
  return (
    <Dialog ref={ref} open onOpenChange={() => {}}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>계정 비밀번호 초기화</DialogTitle>
        </DialogHeader>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <DialogDescription>
            운용사 담당자 «어니스트벤처스(주) 박민호»에게 임시 비밀번호 발급 메일을 보냅니다. 임시 비밀번호는 발급 후 24시간 동안만 유효합니다.
          </DialogDescription>
          <div style={{ fontSize: 13.5, color: 'var(--foreground)' }}>수신 메일: minho.park@earnest-vc.co.kr</div>
        </div>
        <DialogFooter>
          <div />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="outline" size="sm" onClick={() => ref.current?.close()}>취소</Button>
            <Button variant="primary" size="sm" onClick={() => {}}>발급 메일 발송</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
