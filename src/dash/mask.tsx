/* 데이터 마스크 — 민감 수치/라벨 Privacy 처리 모듈
   module-level singleton: Context 없이 전 앱이 동기화 */
import React from 'react';

/* ┌──────────────────────────────────────────────────────────────────┐
   │ 전역 마스크 스위치 — 이 한 줄이 유일한 토글 지점.                  │
   │   _on = true  → 마스크 ON  : 실데이터 연동 전 '빈 영역' placeholder │
   │                 (숫자→0, 텍스트→회색 바)                            │
   │   _on = false → 마스크 OFF : 실데이터 그대로 표시                    │
   │ ▶ 실데이터 연동 시점에 false 로만 바꾸면 전 화면 마스크가 해제됨.   │
   └──────────────────────────────────────────────────────────────────┘ */
const _on = true;

/* 마스크 상태를 루트 DOM 속성으로 투영 — CSS가 토글을 따라 분기하도록(예: AG Grid 헤더 placeholder).
   _on이 SSOT이므로 여기서 1회 설정하면 _on=false 전환 시 헤더 placeholder도 함께 해제된다. */
if (typeof document !== 'undefined') {
  document.documentElement.dataset.mask = _on ? 'on' : 'off';
}

/** 마스크 상태 반환 (위 _on 스위치를 따른다). mn()/MT 가 내부에서 참조. */
export function useMask(): boolean {
  return _on;
}

/** mn — 숫자 문자 → '0' 치환, 서식 기호(, . + - % 억원 등)는 보존.
   표시 값(ReactNode 포함)을 받으므로 인자 타입을 넓힘 — 내부에서 String()으로 정규화. */
export function mn(v: any): string {
  return _on ? String(v).replace(/\d/g, '0') : String(v);
}

/** MT — 마스크 모드에서 텍스트를 회색 skeleton 바로 대체하는 컴포넌트 */
export function MT({ children, w }: { children?: React.ReactNode; w?: number }) {
  const on = useMask();
  if (!on) return <>{children}</>;
  const len = typeof children === 'string' ? children.length : 8;
  const width = w ?? Math.max(28, Math.min(110, Math.round(len * 6.5)));
  return (
    <span className="inline-block bg-muted-foreground" style={{
      borderRadius: 4,
      width,
      height: '0.72em',
      verticalAlign: 'middle',
      opacity: 0.28,
    }} />
  );
}
