import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, Button, StatusBadge } from 'apfs-dashboard-offline';

/* DialogHeader — 하단 보더가 있는 모달 머리(flex items-center justify-between).
   좌측 제목(+설명), 우측 상태 배지 같은 보조 정보가 들어간다. 우상단 X 와 겹치지 않도록 여백을 둔다.
   본문이 46px 패밀리면 헤더도 px-[46px] 로 맞춘다. */

const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--foreground)' };

export function HeaderWithBadge() {
  const ref = React.useRef<any>(null);
  return (
    <Dialog ref={ref} open onOpenChange={() => {}}>
      <DialogContent className="max-w-[640px]" onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <div>
            <DialogTitle>운용사 건전성 상세</DialogTitle>
            <DialogDescription style={{ marginTop: 4 }}>그린하베스트파트너스 · 등록번호 AF-GP-0142</DialogDescription>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 26 }}>
            <StatusBadge tone="warning" label="주의" />
          </div>
        </DialogHeader>
        <div className="p-[46px]" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={row}><span style={{ color: 'var(--caption)' }}>운용 자펀드</span><span>4개 · 약정 96,000백만원</span></div>
          <div style={row}><span style={{ color: 'var(--caption)' }}>자기자본</span><span>3,120백만원</span></div>
          <div style={row}><span style={{ color: 'var(--caption)' }}>전문인력</span><span>5명 (기준 3명)</span></div>
          <div style={row}><span style={{ color: 'var(--caption)' }}>최근 점검</span><span>2026-08-27 · 지적 2건</span></div>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={() => ref.current?.close()}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HeaderTitleOnly() {
  const ref = React.useRef<any>(null);
  return (
    <Dialog ref={ref} open onOpenChange={() => {}}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>보고서 내려받기</DialogTitle>
          <DialogDescription className="sr-only">보고서 내려받기 형식 선택</DialogDescription>
        </DialogHeader>
        <div style={{ padding: 18, fontSize: 13.5, color: 'var(--foreground)', lineHeight: 1.7 }}>
          2026년 3분기 투자성과 보고서를 엑셀로 내려받습니다. 포함 시트: 요약 · 자펀드별 성과 · 피투자기업 목록.
        </div>
        <DialogFooter>
          <div />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="outline" size="sm" onClick={() => ref.current?.close()}>취소</Button>
            <Button variant="primary" size="sm" leadingIcon="download" onClick={() => {}}>내려받기</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
