import * as React from 'react';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from 'apfs-dashboard-offline';

/* AlertDialogTrigger — 확인 모달을 여는 버튼. 목록 툴바의 「삭제」처럼 파괴적 동작 자리에 놓인다.
   ⚠ UI.Button 은 forwardRef 가 없어 asChild 트리거로 쓸 수 없다 — 트리거에 직접 스타일을 준다. */

const btnDanger: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 9, border: '1px solid transparent', background: 'var(--danger)', color: '#fff', font: 'inherit', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' };
const btnOutline: React.CSSProperties = { ...btnDanger, background: 'var(--card)', borderColor: 'var(--border-strong)', color: 'var(--foreground)' };
const danger: React.CSSProperties = { background: 'var(--danger)', color: '#fff' };

export function TriggerOpensConfirm() {
  const ref = React.useRef<any>(null);
  return (
    <div style={{ padding: 20, background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--foreground)' }}>분개 관리 · 2026년 9월</div>
        <AlertDialog ref={ref} open onOpenChange={() => {}}>
          <AlertDialogTrigger style={btnDanger}>선택 분개 삭제</AlertDialogTrigger>
          <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <AlertDialogHeader>
              <AlertDialogTitle>분개 3건을 삭제할까요?</AlertDialogTitle>
              <AlertDialogDescription>
                삭제한 분개는 복구할 수 없습니다. 마감 확정 이후에는 조정 분개로만 정정할 수 있습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction style={danger}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div style={{ border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--card)', padding: 14, fontSize: 13.5, color: 'var(--foreground)' }}>
        선택 3건 · 차변 합계 420백만원 · 대변 합계 420백만원
      </div>
    </div>
  );
}

export function TriggerVariants() {
  return (
    <div style={{ padding: 24, background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <AlertDialog open={false} onOpenChange={() => {}}>
        <AlertDialogTrigger style={btnDanger}>자펀드 삭제</AlertDialogTrigger>
      </AlertDialog>
      <AlertDialog open={false} onOpenChange={() => {}}>
        <AlertDialogTrigger style={btnOutline}>마감 취소</AlertDialogTrigger>
      </AlertDialog>
    </div>
  );
}
