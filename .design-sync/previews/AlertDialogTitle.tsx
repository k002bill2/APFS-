import * as React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from 'apfs-dashboard-offline';

/* AlertDialogTitle — 확인 모달 제목(text-base bold). Dialog 제목(text-xl)보다 작다 — 문장형 질문을 쓴다.
   "삭제하시겠습니까?" 처럼 되묻는 형태로 두고, 상세 근거는 Description 으로 내린다. */

const danger: React.CSSProperties = { background: 'var(--danger)', color: '#fff' };

export function TitleQuestion() {
  const ref = React.useRef<any>(null);
  return (
    <AlertDialog ref={ref} open onOpenChange={() => {}}>
      <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>출자사업 공고를 게시할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            게시하면 운용사에게 공고 알림이 발송되고, 접수 시작 전까지만 내용을 수정할 수 있습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction>게시</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TitleLongWrap() {
  const ref = React.useRef<any>(null);
  return (
    <AlertDialog ref={ref} open onOpenChange={() => {}}>
      <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>상주-어니스트 애그테크 투자조합의 결성정보를 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            연결된 조합원 출자내역 8건과 투자내역 14건이 함께 삭제됩니다. 되돌릴 수 없습니다.
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
