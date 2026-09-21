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

/** animationend 가 유실될 때(탭 백그라운드 전환 등) 부모가 영영 안 닫히는 것 방지. --dur-slow(280ms) + 여유.
    두 단계로 쓴다 — ① close() 시점부터 "exit 가 시작되기까지" 의 가드, ② animationstart 가 오면 그 시점부터
    다시 잰다. 기준점을 닫기 요청이 아니라 애니메이션 시작에 두는 이유: 닫기 순간 정체(scroll-lock 해제·큰
    알림센터 언마운트)로 exit 가 늦게 시작하면 요청 기준 450ms 가 animationend 보다 먼저 와서 하드코딩 소비처의
    부모가 애니메이션 도중 언마운트했다(2026-09-18 실측, 2026-09-21 기준점 이동). */
export const EXIT_FALLBACK_MS = 450;
/** tailwind.config.js 의 닫힘 키프레임 이름. Dialog·AlertDialog 가 공유한다. */
export const EXIT_ANIMATION = 'dialog-out';

const ExitEndContext = React.createContext<(() => void) | null>(null);
const ExitStartContext = React.createContext<(() => void) | null>(null);
/** 닫기 잠금 — 저장 대기(SaveButton "저장 중") 동안 취소·X·Esc 를 무시해 사용자가 누른 저장이 무음으로
    유실되지 않게 한다. close()/rootOpenChange(false) 가 lockRef 를 보고 되돌아간다(overlay 클릭은 소비처가
    이미 preventDefault). Content 는 locked 로 aria-busy + pointer-events 차단. 다이얼로그 밖에서는 null. */
export type DialogLock = { locked: boolean; setLocked: (b: boolean) => void };
const LockContext = React.createContext<DialogLock | null>(null);
export const DialogLockProvider = LockContext.Provider;
export function useDialogLock() {
  return React.useContext(LockContext);
}
export const DialogExitProvider = ExitEndContext.Provider;
export const DialogExitStartProvider = ExitStartContext.Provider;
/** Content 가 자신의 exit 애니메이션 시작을 루트에 알리는 통로 — 폴백 타이머의 기준점을 여기로 옮긴다. */
export function useExitStart() {
  return React.useContext(ExitStartContext);
}
/** Content 가 자신의 exit 애니메이션 종료를 루트에 알리는 통로. 중첩 모달은 가장 안쪽 루트에 붙는다. */
export function useExitEnd() {
  return React.useContext(ExitEndContext);
}

/** `<Dialog ref>` 로 노출되는 핸들 — 모달 자체 버튼(취소·저장)이 애니메이션을 살려 닫을 때 쓴다. */
export type DialogHandle = { close: () => void };

export function useDeferredClose(open: boolean | undefined, onOpenChange?: (o: boolean) => void) {
  const [inner, setInner] = React.useState(!!open);
  /* 렌더 본문에서 동기 갱신한다 — effect 에서만 갱신하면 부모가 open=false 로 재렌더한 뒤에도 잠깐 true 가
     남아, 그 사이 돌아온 복원이 "아직 열려 있다"고 오판해 모달을 다시 열었다(2026-09-18 알림센터 2번 닫힘). */
  const openRef = React.useRef(!!open);
  openRef.current = !!open;
  const mounted = React.useRef(true);
  /* close() 로 시작한 닫힘이 진행 중인지. finish 는 이 플래그가 선 동안 한 번만 실행된다 — 폴백 타이머와
     뒤늦게 도착한 animationend 가 finish 를 두 번 불러 부모 통지·복원이 겹치던 것을 막는다. */
  const closing = React.useRef(false);
  /* finish 가 세우고, 다음 커밋의 effect 가 소비하는 "내부 상태 복원 예약". */
  const restorePending = React.useRef(false);
  const timer = React.useRef<number | undefined>(undefined);
  /* onOpenChange 를 ref 로 들고 있어야 finish/close 가 재생성되지 않는다 — 소비처 대부분이
     인라인 화살표 함수를 넘겨 매 렌더 새 참조가 되기 때문. */
  const changeRef = React.useRef(onOpenChange);
  changeRef.current = onOpenChange;
  /** exit 재생 중 걸어둔 document 리스너 해제기. finish/언마운트 시 반드시 호출. */
  const detach = React.useRef<(() => void) | null>(null);
  /* 닫기 잠금 — ref 는 close() 의 동기 판정용, state 는 Content 렌더(aria-busy)용. 둘을 함께 바꾼다. */
  const lockRef = React.useRef(false);
  const [locked, setLockedState] = React.useState(false);
  const setLocked = React.useCallback((b: boolean) => { lockRef.current = b; setLockedState(b); }, []);

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
     그래서 닫는 중(inner=false)에 다시 열리지 않는다.
     닫는 중(closing) 에 부모가 open=true 로 되돌리면 대기 중인 닫힘을 취소한다 — 그대로 두면 폴백 타이머·
     animationend 가 뒤늦게 finish 를 불러 onOpenChange(false) 로 방금 다시 연 모달을 닫는다(pointerdown/keydown
     없이 프로그램적으로 재오픈되는 경로는 flush 리스너가 못 잡는다. Codex 리뷰 2026-09-19). finish 는 부르지
     않는다 — 부르면 그 통지가 바로 문제의 닫힘이다. restorePending 은 finish 안에서만 서므로 건드릴 것 없다. */
  React.useEffect(() => {
    if (open && closing.current) {
      closing.current = false;
      if (timer.current) { window.clearTimeout(timer.current); timer.current = undefined; }
      detach.current?.();
      detach.current = null;
    }
    setInner(!!open);
  }, [open]);

  /* 복원은 rAF 가 아니라 "finish 이후 첫 커밋" 에서 한다. 이 시점의 openRef 는 그 커밋의 실제 prop 이다:
     - 제어형(open={state}): 부모가 onOpenChange(false) 로 false 를 내려보낸 커밋 → 복원값 false → 닫힌 채 유지.
     - 재사용(모달 A→B, open 은 계속 true): 부모가 B 를 그리는 커밋 → 복원값 true → inner=false 로 굳지 않는다.
     - 하드코딩(open 리터럴 true): 부모가 언마운트 → 커밋 없음 → 복원 없음(정상 경로).
     이전 rAF 방식은 부모 커밋과 순서가 보장되지 않아, 폴백 타이머가 먼저 finish 를 부른 경우 stale true 를 읽고
     제어형 모달을 다시 열었다 닫았다. */
  React.useEffect(() => {
    if (!restorePending.current) return;
    restorePending.current = false;
    setInner(openRef.current);
  });

  const finish = React.useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = undefined;
    }
    detach.current?.();
    detach.current = null;
    /* close() 없이 부모가 직접 open=false 로 닫은 경로(Radix Presence 가 언마운트)나, 폴백 타이머가 이미
       finish 를 끝낸 뒤 도착한 animationend 는 여기서 멈춘다 — 부모 통지·복원을 반복하지 않는다. */
    if (!closing.current) return;
    closing.current = false;
    if (!mounted.current) return;
    restorePending.current = true;
    changeRef.current?.(false);
  }, []);

  /** Content 의 dialog-out 이 실제로 시작됐다 — 폴백 타이머를 지금부터 다시 잰다(같은 timer ref 를 재사용해야
      finish·재오픈 취소 경로가 그대로 지운다). close() 없이 부모가 직접 open=false 로 닫은 경로(closing=false)
      나 flush 가 이미 끝낸 뒤 늦게 시작한 exit 는 무시한다. */
  const onExitStart = React.useCallback(() => {
    if (!closing.current) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(finish, EXIT_FALLBACK_MS);
  }, [finish]);

  /** 닫기 시작 — 내부만 닫아 exit 애니메이션을 재생시킨다. 부모 통지는 finish 로 미룬다. */
  const close = React.useCallback(() => {
    if (lockRef.current) return;   // 저장 대기 중 — 닫기 무시(SaveButton 잠금)
    closing.current = true;
    setInner(false);
    if (timer.current) window.clearTimeout(timer.current);
    /* 1단계 가드: exit 가 아예 시작되지 않는 경우(animation:none 오버라이드·Content 미마운트)만 잡는다.
       정상 경로에서는 onExitStart 가 이 타이머를 애니메이션 시작 시점으로 다시 건다. */
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

  return { inner, finish, onExitStart, close, rootOpenChange, locked, setLocked };
}

/** Content 의 onAnimationStart 핸들러 — exit 시작만 걸러 루트에 알린다. 가드는 makeExitEndHandler 와 같다
    (중첩 모달의 dialog-out 이 바깥 Content 로 버블링해 바깥 타이머를 다시 세우는 것 차단). */
export function makeExitStartHandler<T extends HTMLElement>(
  onExitStart: (() => void) | null,
  userHandler?: React.AnimationEventHandler<T>,
) {
  return (e: React.AnimationEvent<T>) => {
    userHandler?.(e);
    if (e.target === e.currentTarget && e.animationName === EXIT_ANIMATION) onExitStart?.();
  };
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

/** 개발 모드 전용 규약 검사 — `<Dialog open …>`(하드코딩) 인데 ref 가 없으면 경고.

    이 앱은 모달 대부분이 open 을 리터럴 true 로 두고 부모가 언마운트해서 닫는다. 그 패턴에서
    모달 자체의 취소/닫기 버튼이 onClose 를 직접 부르면 부모가 즉시 언마운트해 exit 애니메이션이
    다시 사라진다 — ref={dlgRef} + dlgRef.current?.close() 로 닫아야 한다.
    타입으로는 강제할 수 없어(ref 는 선택) 런타임 경고로 규약을 지킨다.

    판별: "마운트 시점에 이미 open" 이 하드코딩 패턴의 지문이다. 제어형 소비처(open={state})는
    보통 false 로 마운트됐다가 나중에 열리므로 걸리지 않는다. */
export function useHardcodedOpenWarning(open: boolean | undefined, ref: React.Ref<DialogHandle> | null | undefined) {
  React.useEffect(() => {
    const dev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV;
    if (!dev || open !== true || ref != null) return;
    console.warn(
      '[Dialog] open 이 하드코딩(true)인데 ref 가 없습니다. 이 모달의 취소/닫기 버튼이 onClose 를 ' +
        '직접 호출하면 부모가 즉시 언마운트해 닫힘 애니메이션이 재생되지 않습니다.\n' +
        "  고치는 법: import { useRef } from 'react';  ·  const dlgRef = useRef<DialogHandle>(null);\n" +
        '            <Dialog ref={dlgRef} open …>  ·  onClick={() => dlgRef.current?.close()}\n' +
        '  (X·ESC·바깥클릭만으로 닫는 모달이면 무시해도 됩니다.)',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
