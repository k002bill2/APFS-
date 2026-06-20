/* 데이터 마스크 — 민감 수치/라벨 Privacy 처리 모듈
   module-level singleton: Context 없이 전 앱이 동기화 */
import React from 'react';

const _on = true;

/** 마스크 항상 ON — 실 데이터 연동 전 빈 영역(placeholder) 표시 */
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
    <span style={{
      display: 'inline-block',
      background: 'var(--muted-foreground)',
      borderRadius: 4,
      width,
      height: '0.72em',
      verticalAlign: 'middle',
      opacity: 0.28,
    }} />
  );
}
