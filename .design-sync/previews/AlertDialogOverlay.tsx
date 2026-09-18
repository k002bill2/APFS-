import * as React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from 'apfs-dashboard-offline';

/* AlertDialogOverlay — 확인 모달 뒤 딤(black/55, z-overlay 75). AlertDialogContent 가 자동으로 렌더한다.
   ⚠ Dialog 와 달리 바깥 클릭으로 닫히지 않는다(Radix AlertDialog 규약) — 딤은 시선 집중 역할만. */

const danger: React.CSSProperties = { background: 'var(--danger)', color: '#fff' };

function PageBehind() {
  return (
    <div style={{ padding: 20, background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--foreground)', marginBottom: 14 }}>회계마감 현황 · 2026년 9월</div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[['마감 대상', '34개'], ['제출 완료', '32개'], ['조정 분개', '7건']].map(([k, v]) => (
          <div key={k} style={{ flex: 1, border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)', padding: '12px 14px' }}>
            <div style={{ fontSize: 12, color: 'var(--caption)' }}>{k}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)', marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)', overflow: 'hidden' }}>
        {[['농식품 스마트팜 투자조합 2호', '제출 완료'], ['해양수산 그로스 투자조합', '검증 대기'], ['상주-어니스트 애그테크 투자조합', '제출 완료'], ['푸드테크 혁신 투자조합 1호', '미제출']].map(([n, s], i) => (
          <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 14px', borderTop: i ? '1px solid var(--border-strong)' : 'none', fontSize: 13, color: 'var(--foreground)' }}>
            <span>{n}</span><span style={{ color: 'var(--caption)' }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OverlayScrim() {
  const ref = React.useRef<any>(null);
  return (
    <>
      <PageBehind />
      <AlertDialog ref={ref} open onOpenChange={() => {}}>
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>마감을 되돌릴까요?</AlertDialogTitle>
            <AlertDialogDescription>
              8월 마감이 해제되어 운용사 32개사가 제출 자료를 다시 수정할 수 있게 됩니다. 확정된 원장 반영분도 함께 취소됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction style={danger}>마감 해제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
