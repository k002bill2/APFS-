import * as React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from 'apfs-dashboard-offline';

/* AlertDialogCancel — 되묻기를 취소하는 버튼(outline 표면, Radix Cancel = 닫힘 + 초기 포커스 대상).
   ⚠ Cancel 에 onClick 으로 부모를 직접 언마운트하면 닫힘 애니메이션이 죽는다 — Radix 기본 닫힘 경로에 맡긴다. */

const danger: React.CSSProperties = { background: 'var(--danger)', color: '#fff' };

export function CancelDefault() {
  const ref = React.useRef<any>(null);
  return (
    <AlertDialog ref={ref} open onOpenChange={() => {}}>
      <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>첨부파일을 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            «투자심의 결과보고서_2026Q3.pdf» 가 삭제됩니다. 제출 이력에는 삭제 기록이 남습니다.
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

export function CancelWording() {
  const ref = React.useRef<any>(null);
  return (
    <AlertDialog ref={ref} open onOpenChange={() => {}}>
      <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>점검을 중단할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            의무투자 이행점검이 12개 조합 중 5개까지 진행됐습니다. 중단하면 지금까지의 결과가 저장되지 않습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>점검 계속</AlertDialogCancel>
          <AlertDialogAction style={danger}>중단</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
