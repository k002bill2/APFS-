/* controlled/uncontrolled open 상태 통합 훅 (Animate UI useControlledState 로직 이식).
   Radix 래퍼에 Motion exit(AnimatePresence)를 붙이려면 Content가 open 값을 알아야 한다.

   ⭐ 핵심(잠복버그 회피): 항상 내부 useState를 구동한다.
   - setState(next)는 즉시 내부 상태를 바꾸고(→ AnimatePresence가 부모 재렌더와 무관하게 즉시 exit 발화)
     onChange도 호출한다.
   - controlled prop 변화는 useEffect로 내부 상태에 동기화한다.
   ※ "controlled면 값=prop 그대로 반환하고 setState는 onChange만" 식으로 짜면, close 시 내부 상태가
     안 바뀌어 Radix가 먼저 Content를 언마운트 → exit 애니메이션이 사라진다(실측 확인). */
import * as React from 'react';

export function useControllableState<T>(opts: {
  prop?: T;
  defaultProp: T;
  onChange?: (v: T) => void;
}): readonly [T, (next: T) => void] {
  const { prop, defaultProp, onChange } = opts;
  const [state, setInternal] = React.useState<T>(prop !== undefined ? prop : defaultProp);

  React.useEffect(() => {
    if (prop !== undefined) setInternal(prop);
  }, [prop]);

  const setState = React.useCallback(
    (next: T) => {
      setInternal(next);
      onChange?.(next);
    },
    [onChange],
  );

  return [state, setState] as const;
}
