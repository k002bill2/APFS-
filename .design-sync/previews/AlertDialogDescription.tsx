import * as React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from 'apfs-dashboard-offline';

/* AlertDialogDescription — 확인 모달 본문(13px muted, leading-relaxed). 무엇이 바뀌는지·되돌릴 수 있는지를 적는다.
   Radix 가 aria-describedby 로 연결하므로 스크린리더가 제목 다음에 이 문장을 읽는다. */

const danger: React.CSSProperties = { background: 'var(--danger)', color: '#fff' };

export function DescriptionImpact() {
  const ref = React.useRef<any>(null);
  return (
    <AlertDialog ref={ref} open onOpenChange={() => {}}>
      <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>자펀드를 청산 처리할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            «해양수산 그로스 투자조합» 이 청산 상태로 바뀌면 신규 투자·회수 등록이 차단되고, 잔여재산 분배 일정만 관리됩니다.
            청산 해제는 관리자만 할 수 있습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction style={danger}>청산 처리</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DescriptionShort() {
  const ref = React.useRef<any>(null);
  return (
    <AlertDialog ref={ref} open onOpenChange={() => {}}>
      <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>변경사항을 되돌릴까요?</AlertDialogTitle>
          <AlertDialogDescription>편집 중인 권한 매트릭스가 마지막 저장 상태로 복원됩니다.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>계속 편집</AlertDialogCancel>
          <AlertDialogAction>되돌리기</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
