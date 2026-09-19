import * as React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from 'apfs-dashboard-offline';

/* AlertDialogFooter — 확인 모달의 버튼 줄(mt-4 flex justify-end gap-2). 취소가 왼쪽, 실행이 오른쪽.
   버튼은 두 개까지만 — 세 번째 선택지가 필요하면 Dialog 로 올린다. */

const danger: React.CSSProperties = { background: 'var(--danger)', color: '#fff' };

export function FooterCancelAction() {
  const ref = React.useRef<any>(null);
  return (
    <AlertDialog ref={ref} open onOpenChange={() => {}}>
      <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>제출 자료를 반려할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            «해양수산 그로스 투자조합» 의 3분기 조합재무제표가 운용사에게 반려되고, 재제출 기한이 7일 부여됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction style={danger}>반려</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function FooterWideButtons() {
  const ref = React.useRef<any>(null);
  return (
    <AlertDialog ref={ref} open onOpenChange={() => {}}>
      <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>세션이 곧 만료됩니다</AlertDialogTitle>
          <AlertDialogDescription>
            30분간 활동이 없어 5분 후 자동 로그아웃됩니다. 작성 중인 투심보고서는 임시 저장되어 있습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel style={{ flex: 1 }}>로그아웃</AlertDialogCancel>
          <AlertDialogAction style={{ flex: 1 }}>계속 사용</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
