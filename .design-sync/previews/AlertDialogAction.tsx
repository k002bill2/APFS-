import * as React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from 'apfs-dashboard-offline';

/* AlertDialogAction — 확인 다이얼로그의 실행 버튼(Radix Action = 누르면 닫힘).
   기본은 bg-primary. 파괴적 동작은 인라인 style 로 --danger 표면을 덮어쓴다(className bg-primary 를 이김). */

const danger: React.CSSProperties = { background: 'var(--danger)', color: '#fff', borderColor: 'transparent' };

export function DestructiveAction() {
  const ref = React.useRef<any>(null);
  return (
    <AlertDialog ref={ref} open onOpenChange={() => {}}>
      <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>결성정보를 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            «농식품 스마트팜 투자조합 2호»의 결성정보와 연결된 조합원 출자내역 8건이 함께 삭제됩니다. 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction style={danger}>삭제</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PrimaryAction() {
  const ref = React.useRef<any>(null);
  return (
    <AlertDialog ref={ref} open onOpenChange={() => {}}>
      <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>9월 회계마감을 확정할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            확정하면 조정 분개 7건이 원장에 반영되고, 운용사 제출 자료는 수정할 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>다시 검토</AlertDialogCancel>
          <AlertDialogAction>마감 확정</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
