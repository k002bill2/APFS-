/* 통계 화면 검색조건 재계산 공용 — 정수 총량을 칸에 나누는 최대 잉여 배분(2026-11-16 "미연동 필터 전부 동작").
   여러 대분류(투자자산관리 fund_invest_status·investee_invest_stats_model · 부처보고 report_bucheo_model)가 함께 쓴다 → src/dash 루트.
   칸마다 따로 반올림하면 작은 칸(1~4건)에서 몫이 0 으로 사라져 같은 조건인데 뷰마다 비율이 갈린다(Codex P2) —
   총량을 먼저 정하고 이 함수로 나누면 뷰가 달라도 비율이 같다. */

const sum = (a: readonly number[]) => a.reduce((x, y) => x + y, 0);

/** 정수 target 을 가중치 비율로 나눈다(최대 잉여). caps 가 있으면 칸 용량을 넘지 않고, 넘친 몫은 용량이 남은 칸에 다시 준다.
    몫의 합 = target(용량 합이 모자라면 용량 합). 가중치가 이미 target 과 같은 정수 배열이면 그대로 돌려준다(기본 상태 불변). */
export function apportion(weights: readonly number[], target: number, caps?: readonly number[]): number[] {
  const cap = (i: number) => (caps ? caps[i] : Infinity);
  const out = weights.map(() => 0);
  let rest = Math.max(0, Math.round(target));
  let live = weights.flatMap((w, i) => (w > 0 && cap(i) > 0 ? [i] : []));
  while (rest > 0 && live.length) {
    const w = sum(live.map((i) => weights[i]));
    const raw = live.map((i) => ({ i, x: (weights[i] / w) * rest }));
    for (const { i, x } of raw) { const add = Math.min(Math.floor(x), cap(i) - out[i]); out[i] += add; rest -= add; }
    for (const { i } of [...raw].sort((p, q) => (q.x % 1) - (p.x % 1) || p.i - q.i)) {
      if (rest <= 0) break;
      if (out[i] < cap(i)) { out[i] += 1; rest -= 1; }
    }
    live = live.filter((i) => out[i] < cap(i));   // 한 바퀴에 최소 한 칸이 차거나 rest 가 0 이 된다 → 종료
  }
  return out;
}
