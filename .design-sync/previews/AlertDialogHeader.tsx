import * as React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, ColorChip } from 'apfs-dashboard-offline';

/* AlertDialogHeader — 확인 모달 머리(flex-col gap-1.5). 보더가 없고 제목·설명을 세로로 쌓기만 한다.
   위험 신호가 필요하면 아이콘 칩을 제목 줄에 함께 둔다. */

const danger: React.CSSProperties = { background: 'var(--danger)', color: '#fff' };

export function HeaderStacked() {
  const ref = React.useRef<any>(null);
  return (
    <AlertDialog ref={ref} open onOpenChange={() => {}}>
      <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>피투자기업 정보를 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            «(주)한들수산» 의 투자내역 5건과 첨부 자료 3건이 함께 삭제됩니다. 되돌릴 수 없습니다.
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

export function HeaderWithIcon() {
  const ref = React.useRef<any>(null);
  return (
    <AlertDialog ref={ref} open onOpenChange={() => {}}>
      <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ColorChip icon="shield-alert" color="var(--danger)" size={32} iconSize={18} />
            <AlertDialogTitle>고위험 경보를 해소 처리할까요?</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            «농식품 스마트팜 투자조합 2호» 의 의무투자 미달 경보를 해소로 기록합니다. 처리 근거는 감사 이력에 남습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction>해소 처리</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
