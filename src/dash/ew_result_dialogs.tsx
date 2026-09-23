/* 조기경보 결과정보 관리 — 확인 다이얼로그(생성·마감·마감해제·전체권한부여/해제·수정권한처리 공용).
   출처: S2_61 목업 `confirmDlg(title, body, okLabel, onOk)` + S2_62(생성 확인 팝업 정의, 목업에 이식돼 있음).
   형태는 `workforce_form_modal.tsx`의 `WorkforceReleaseDialog`(Radix AlertDialog)를 따른다.
   - 기본 포커스 = 취소(목업 `setTimeout(()=>dlg-cancel.focus())`) — Radix AlertDialog 기본 동작(Cancel 자동 포커스).
   - 확인 버튼은 파괴적 동작이 아니므로 danger 색을 주지 않는다(기본 primary).
   - 닫힘은 AlertDialog 래퍼의 deferred close 경로(exit 애니메이션 종료 뒤 onClose)에 맡긴다 —
     소비처 onConfirm 에서 모달 state 를 동기 언마운트하지 않는다(ui/alert-dialog.tsx 헤더 주석). */
import React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';

export function EwConfirmDialog({ title, body, okLabel, onConfirm, onClose }: {
  title: string;
  /** 본문 — 인라인 요소만(AlertDialogDescription 은 asChild <div> 라 블록도 허용되지만 목업 문구는 한두 줄) */
  body: React.ReactNode;
  okLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{body}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{okLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
