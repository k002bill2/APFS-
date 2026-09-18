import * as React from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, Button, SaveButton } from 'apfs-dashboard-offline';

/* DialogTrigger — 모달을 여는 버튼(Radix Trigger, 기본 <button>). 목록 툴바의 「등록」 자리에 놓인다.
   ⚠ UI.Button 은 forwardRef 가 없어 asChild 트리거로 쓸 수 없다 — 트리거에 직접 스타일을 준다. */

const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 9, border: '1px solid transparent', background: 'var(--primary)', color: 'var(--primary-foreground)', font: 'inherit', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' };
const btnOutline: React.CSSProperties = { ...btn, background: 'var(--card)', borderColor: 'var(--border-strong)', color: 'var(--foreground)' };
const btnGhost: React.CSSProperties = { ...btn, background: 'transparent', borderColor: 'transparent', color: 'var(--muted-foreground)' };
const label: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6, display: 'block' };
const input: React.CSSProperties = { width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)', fontSize: 13.5, boxSizing: 'border-box' };

export function TriggerOpensDialog() {
  const ref = React.useRef<any>(null);
  return (
    <div style={{ padding: 20, background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--foreground)' }}>조합원 관리</div>
        <Dialog ref={ref} open onOpenChange={() => {}}>
          <DialogTrigger style={btn}>조합원 등록</DialogTrigger>
          <DialogContent className="max-w-[640px]" onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader className="px-[46px]">
              <DialogTitle>조합원 등록</DialogTitle>
              <DialogDescription className="sr-only">자펀드 조합원 등록 양식</DialogDescription>
            </DialogHeader>
            <div className="p-[46px]" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px' }}>
              <div><span style={label}>조합원명 *</span><input style={input} defaultValue="농업정책보험금융원" /></div>
              <div><span style={label}>구분</span><input style={input} defaultValue="유한책임조합원(LP)" /></div>
              <div><span style={label}>출자약정액(백만원)</span><input style={input} defaultValue="9,000" /></div>
              <div><span style={label}>출자비율(%)</span><input style={input} defaultValue="30.0" /></div>
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
      </div>
      <div style={{ border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)', padding: 14, color: 'var(--foreground)', fontSize: 13.5 }}>
        조합원 3인 · 약정총액 30,000백만원 · 최근 변경 2026-09-11
      </div>
    </div>
  );
}

export function TriggerVariants() {
  return (
    <div style={{ padding: 24, background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogTrigger style={btn}>자펀드 등록</DialogTrigger>
      </Dialog>
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogTrigger style={btnOutline}>선정결과 수정</DialogTrigger>
      </Dialog>
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogTrigger style={btnGhost}>명세 보기</DialogTrigger>
      </Dialog>
    </div>
  );
}
