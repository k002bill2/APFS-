import * as React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from 'apfs-dashboard-offline';

/* AlertDialogContent — 확인 모달 표면(bg-card, max-w-[420px], p-[22px], gap-2).
   Dialog 처럼 헤더/푸터 보더로 나누지 않고 한 덩어리 — 문장 한두 줄 + 버튼 2개가 전부인 크기다. */

const danger: React.CSSProperties = { background: 'var(--danger)', color: '#fff' };
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--foreground)' };

export function ContentDefault() {
  const ref = React.useRef<any>(null);
  return (
    <AlertDialog ref={ref} open onOpenChange={() => {}}>
      <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>운용사 등록을 말소할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            «그린하베스트파트너스» 의 운용사 등록이 말소되고, 신규 출자사업 신청이 제한됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction style={danger}>말소</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ContentWithSummary() {
  const ref = React.useRef<any>(null);
  return (
    <AlertDialog ref={ref} open onOpenChange={() => {}}>
      <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>자금집행을 승인할까요?</AlertDialogTitle>
          <AlertDialogDescription>승인 후에는 수탁기관으로 지급지시가 전송되어 취소할 수 없습니다.</AlertDialogDescription>
        </AlertDialogHeader>
        <div style={{ border: '1px solid var(--border-strong)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
          <div style={row}><span style={{ color: 'var(--caption)' }}>대상 자펀드</span><span>푸드테크 혁신 투자조합 1호</span></div>
          <div style={row}><span style={{ color: 'var(--caption)' }}>집행액</span><span>4,500백만원</span></div>
          <div style={row}><span style={{ color: 'var(--caption)' }}>집행일</span><span>2026-10-08</span></div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction>승인</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
