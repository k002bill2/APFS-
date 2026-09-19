import * as React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from 'apfs-dashboard-offline';

/* AlertDialogPortal — AlertDialogContent 가 내부적으로 쓰는 포털(목적지 document.body).
   부모 카드가 overflow:hidden 이어도 확인 모달이 그 안에 갇히지 않고 화면 중앙에 뜬다. */

const danger: React.CSSProperties = { background: 'var(--danger)', color: '#fff' };

export function PortalEscapesCard() {
  const ref = React.useRef<any>(null);
  return (
    <div style={{ padding: 20, background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)', overflow: 'hidden', height: 200 }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-strong)', fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>사용자 권한 관리</div>
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['박민호 · 어니스트벤처스(주)', '운용사 담당자'], ['김서연 · 농업정책보험금융원', '투자운용부'], ['이한결 · 수탁기관', '자금관리']].map(([a, b]) => (
            <div key={a} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--foreground)' }}>
              <span>{a}</span><span style={{ color: 'var(--caption)' }}>{b}</span>
            </div>
          ))}
        </div>
      </div>
      <AlertDialog ref={ref} open onOpenChange={() => {}}>
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>계정을 비활성화할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              «박민호 · 어니스트벤처스(주)» 계정의 접속이 즉시 차단되고, 담당 자펀드 2건의 보고 권한이 회수됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction style={danger}>비활성화</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
