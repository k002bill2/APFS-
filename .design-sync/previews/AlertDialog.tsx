import * as React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from 'apfs-dashboard-offline';

/* AlertDialog — 파괴적·비가역 동작을 되묻는 확인 모달(취소/실행 2버튼, ESC·포커스 트랩).
   제어형으로 쓸 때는 Dialog 와 같은 규약: `open` + ref(닫힘 애니메이션 완료 후 언마운트).
   Action/Cancel 은 Radix 닫기 버튼이라 소비처가 닫기를 따로 배선하지 않는다. */

const danger: React.CSSProperties = { background: 'var(--danger)', color: '#fff' };

export function DeleteConfirm() {
  const ref = React.useRef<any>(null);
  return (
    <AlertDialog ref={ref} open onOpenChange={() => {}}>
      <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>선정결과를 취소할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            2026년 정시 출자사업 «푸드테크 혁신» 분야의 선정결과가 취소되고, 운용사에게 통보된 선정 알림이 회수됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>유지</AlertDialogCancel>
          <AlertDialogAction style={danger}>선정 취소</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function LeaveWithoutSaving() {
  const ref = React.useRef<any>(null);
  return (
    <AlertDialog ref={ref} open onOpenChange={() => {}}>
      <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>저장하지 않고 나갈까요?</AlertDialogTitle>
          <AlertDialogDescription>
            작성 중인 투심보고서 «해양수산 그로스 투자조합» 의 변경사항 12개 항목이 저장되지 않습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>계속 작성</AlertDialogCancel>
          <AlertDialogAction>나가기</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
