/* PortalContainerContext — Radix Portal(드롭다운·다이얼로그·컨텍스트 메뉴)의 container 목적지를 주입한다.
   기본값 null → usePortalContainer()가 undefined 반환 → Radix Portal 기본(body)과 동일(앱 전역 무영향).
   네이티브 전체화면(element.requestFullscreen) 중엔 top layer가 fullscreen 요소 서브트리만 렌더하므로,
   body 포털 오버레이가 화면에 안 보인다. 전체화면 루트 element를 value로 주면 오버레이가 그 서브트리로
   포털되어 top layer 안에서 보인다. */
import React from 'react';

export const PortalContainerContext = React.createContext<HTMLElement | null>(null);

export function usePortalContainer(): HTMLElement | undefined {
  return React.useContext(PortalContainerContext) ?? undefined;
}
