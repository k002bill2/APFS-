import React from 'react';

/* 2단 kv 그리드(`sm:grid-cols-2 gap-px bg-border`)의 빈 칸 메우기.
   칸 사이 1px 선을 컨테이너 bg-border 로 그리는 구조라, 행이 반만 차면(홀수 개로 끝남 · full 항목 앞)
   빈 칸에 컨테이너 회색이 그대로 드러난다. 그 자리에 bg-card 칸을 끼운다 — 1단(모바일)은 빈 칸이 없어 sm 이상만. */
export function withKvFill<T>(
  items: readonly T[],
  render: (o: T) => React.ReactNode,
  isFull: (o: T) => boolean = () => false,
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let col = 0;
  items.forEach((o, i) => {
    const full = isFull(o);
    if (full && col === 1) { out.push(<KvFill key={`kv-fill-${i}`} />); col = 0; }
    out.push(render(o));
    col = full ? 0 : (col + 1) % 2;
  });
  if (col === 1) out.push(<KvFill key="kv-fill-end" />);
  return out;
}

function KvFill() {
  return <div aria-hidden="true" className="hidden sm:block bg-card" />;
}
