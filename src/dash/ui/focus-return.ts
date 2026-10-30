/* 닫으면 연 자리로 초점 복귀 — Radix 대화상자 3종(Dialog·Sheet·AlertDialog) 공용(2026-10-30).
   앱 대화상자는 전부 Trigger 없이 open 상태로 연다. Radix 모달은 닫힐 때 초점을 triggerRef 로 보내는데
   그게 null 이라 초점이 body 로 사라졌다.
   onOpenAutoFocus 시점엔 FocusScope 가 아직 초점을 옮기기 전이라 activeElement 가 곧 연 요소다 → 열 때마다 기억한다
   (상시 마운트 `<Dialog open={open}>` 는 Content 래퍼가 닫힌 채로도 렌더돼 있어 첫 렌더에서 잡으면 틀린 요소가 잡힌다).
   소비처 핸들러를 먼저 부르고, 소비처가 preventDefault 했으면(에디터·주소 검색처럼 직접 돌려줌) 손대지 않는다 — Radix 합성 규칙과 같다.
   AlertDialog 는 Radix 가 소비처 onOpenAutoFocus 를 [취소] 초점 이동보다 먼저 부르므로 같은 시점에 잡힌다.
   메뉴·Popover 등 떠 있는 오버레이 안에서 연 경우는 기억하지 않는다 — 그 항목은 오버레이 exit 동안만 DOM 에 남았다가 사라져
   초점이 함께 body 로 사라진다. 그 오버레이가 자기 트리거로 돌려주는 기존 동작에 맡긴다(계좌정보 관리 ▾ → 업로드 실측).
   한계: 안쪽 요소에 autoFocus 가 있으면 React 가 마운트 때 먼저 초점을 가져가 FocusScope 가 onOpenAutoFocus 를 보내지 않는다
   → 연 자리를 못 잡아 종전처럼 body 로 간다. */
import * as React from 'react';

type AutoFocusHandler = (e: Event) => void;

const OVERLAY_OPENER = '[data-radix-popper-content-wrapper],[role="menu"]';

export function useFocusReturn(onOpenAutoFocus?: AutoFocusHandler, onCloseAutoFocus?: AutoFocusHandler) {
  const openerRef = React.useRef<HTMLElement | null>(null);
  const handleOpenAutoFocus = (e: Event) => {
    const a = document.activeElement;
    openerRef.current = a instanceof HTMLElement && a !== document.body && !a.closest(OVERLAY_OPENER) ? a : null;
    onOpenAutoFocus?.(e);
  };
  const handleCloseAutoFocus = (e: Event) => {
    onCloseAutoFocus?.(e);
    const el = openerRef.current;
    openerRef.current = null;
    if (e.defaultPrevented || !el?.isConnected) return;
    e.preventDefault();
    el.focus();
  };
  return { onOpenAutoFocus: handleOpenAutoFocus, onCloseAutoFocus: handleCloseAutoFocus };
}
