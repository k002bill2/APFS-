import * as React from 'react';
import { Toaster, toast } from 'apfs-dashboard-offline';

/* Toaster — sonner 래퍼. 전 CRUD 피드백(등록·수정·삭제)에 사용. 표면은 popover 토큰, position 기본 bottom-right.
   토스트는 전역 store 라 `<Toaster />` 를 한 번만 마운트하고(앱은 루트에 하나) `toast()` / `toast.success()` / `toast.error()` 로 띄운다.
   프리뷰는 정적 캡처라 duration: Infinity 로 열린 상태를 고정했다(제품에서는 기본 4s 후 자동 소멸). */

export function Toasts() {
  React.useEffect(() => {
    toast('결성조합 1건이 등록되었습니다', { duration: Infinity, description: '상주-어니스트 애그테크 투자조합' });
    toast.error('필수 항목을 확인하세요 — 약정총액 미입력', { duration: Infinity });
    toast.success('자펀드 정보가 저장되었습니다', { duration: Infinity });
    return () => toast.dismiss();
  }, []);
  return (
    <div style={{ minHeight: 260 }}>
      <Toaster expand />
    </div>
  );
}
