/* 모달 닫힘(exit) 애니메이션 보존 — Dialog/AlertDialog 공용.

   문제: 앱 내 모달 40곳이 `<Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>` 형태로
   open 을 true 로 하드코딩하고, 닫을 때 부모가 컴포넌트를 통째로 언마운트한다. 이러면 Radix
   Presence 가 data-state="closed" 를 걸고 노드를 붙잡아 둘 틈 자체가 없어 exit 애니메이션이
   통째로 생략된다 — 키프레임을 아무리 고쳐도 "툭" 사라진다(2026-09-18 사용자 리포트).
   반면 open={state} 로 제어하는 소비처(셸 알림센터·상세필터 Sheet)는 정상 동작했다.

   해법: 루트가 내부 open 상태를 들고, 닫기 요청이 오면 내부만 먼저 닫아 애니메이션을 재생한 뒤
   끝난 시점에야 부모의 onOpenChange(false) 를 호출한다 → 부모의 언마운트가 그만큼 늦춰진다.
   제어형 소비처는 부모 open 을 그대로 미러링하므로 동작이 바뀌지 않는다. */
import * as React from 'react';

/** animationend 가 유실될 때(탭 백그라운드 전환 등) 부모가 영영 안 닫히는 것 방지. --dur-slow(280ms) + 여유. */
export const EXIT_FALLBACK_MS = 450;
/** tailwind.config.js 의 닫힘 키프레임 이름. Dialog·AlertDialog 가 공유한다. */
export const EXIT_ANIMATION = 'dialog-out';

const ExitEndContext = React.createContext<(() => void) | null>(null);
export const DialogExitProvider = ExitEndContext.Provider;
/** Content 가 자신의 exit 애니메이션 종료를 루트에 알리는 통로. 중첩 모달은 가장 안쪽 루트에 붙는다. */
export function useExitEnd() {
  return React.useContext(ExitEndContext);
}

/** `<Dialog ref>` 로 노출되는 핸들 — 모달 자체 버튼(취소·저장)이 애니메이션을 살려 닫을 때 쓴다. */
export type DialogHandle = { close: () => void };

export function useDeferredClose(open: boolean | undefined, onOpenChange?: (o: boolean) => void) {
  const [inner, setInner] = React.useState(!!open);
  const openRef = React.useRef(!!open);
  const mounted = React.useRef(true);
  const timer = React.useRef<number | undefined>(undefined);
  /* onOpenChange 를 ref 로 들고 있어야 finish/close 가 재생성되지 않는다 — 소비처 대부분이
     인라인 화살표 함수를 넘겨 매 렌더 새 참조가 되기 때문. */
  const changeRef = React.useRef(onOpenChange);
  changeRef.current = onOpenChange;
  /** exit 재생 중 걸어둔 document 리스너 해제기. finish/언마운트 시 반드시 호출. */
  const detach = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) window.clearTimeout(timer.current);
      detach.current?.();
      detach.current = null;
    };
  }, []);

  /* 제어형 소비처: 부모 open 을 그대로 따라간다. 하드코딩(true) 소비처에선 값이 안 변해 재실행되지 않고,
     그래서 닫는 중(inner=false)에 다시 열리지 않는다. */
  React.useEffect(() => {
    openRef.current = !!open;
    setInner(!!open);
  }, [open]);

  const finish = React.useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = undefined;
    }
    detach.current?.();
    detach.current = null;
    if (!mounted.current) return;
    changeRef.current?.(false);
    /* 부모가 언마운트하는 정상 경로에선 이 rAF 가 mounted 가드에 걸려 버려진다.
       부모가 살아있는 재사용 경로(모달 A→B 로 교체돼 open 이 계속 true)에서만 내부 상태를 되살려
       inner=false 로 굳어 모달이 안 보이는 사태를 막는다. */
    requestAnimationFrame(() => {
      if (mounted.current) setInner(openRef.current);
    });
  }, []);

  /** 닫기 시작 — 내부만 닫아 exit 애니메이션을 재생시킨다. 부모 통지는 finish 로 미룬다. */
  const close = React.useCallback(() => {
    setInner(false);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(finish, EXIT_FALLBACK_MS);
    /* exit 재생(≈280ms) 중 사용자가 다음 동작을 하면 지연을 즉시 끝낸다.
       안 그러면 그 사이 모달을 다시 연 경우, 뒤늦게 도착한 onOpenChange(false) 가 방금 연
       모달을 닫아버린다(소비처의 open 이 리터럴 true 라 재오픈을 감지할 방법이 없다).
       pointerdown 은 click 보다 먼저 오므로, 재오픈 클릭이 처리되기 전에 정리가 끝난다. */
    const flush = () => finish();
    detach.current?.();
    document.addEventListener('pointerdown', flush, true);
    document.addEventListener('keydown', flush, true);
    detach.current = () => {
      document.removeEventListener('pointerdown', flush, true);
      document.removeEventListener('keydown', flush, true);
    };
  }, [finish]);

  const rootOpenChange = React.useCallback(
    (o: boolean) => {
      if (o) {
        setInner(true);
        changeRef.current?.(true);
      } else {
        close();
      }
    },
    [close],
  );

  return { inner, finish, close, rootOpenChange };
}

/** Content 의 onAnimationEnd 핸들러 — 소비처가 넘긴 핸들러를 먼저 돌리고 exit 종료만 걸러낸다. */
export function makeExitEndHandler<T extends HTMLElement>(
  onExitEnd: (() => void) | null,
  userHandler?: React.AnimationEventHandler<T>,
) {
  return (e: React.AnimationEvent<T>) => {
    userHandler?.(e);
    // target===currentTarget: 자식 요소의 애니메이션이 버블링해 조기 종료시키는 것 차단.
    if (e.target === e.currentTarget && e.animationName === EXIT_ANIMATION) onExitEnd?.();
  };
}
