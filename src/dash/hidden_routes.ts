import { HistoryStore } from './data';

/* 진입점을 숨긴 route(2026-11-13 — LNB 하단 디자인 시스템 버튼 제거). 주소(#/route)로 직접 열 수는 있지만
   마지막 화면(apfs.route)·방문기록(apfs.history.v1)에는 남기지 않는다 — 남기면 주소 없이 다시 열 때 복원되거나
   방문기록 팝오버에 보여 숨긴 의미가 없다. app.tsx 가 저장·적재를 건너뛰고, 아래 두 함수로 이미 저장된 값을 거른다. */
export const HIDDEN_ROUTES: ReadonlySet<string> = new Set(["designsystem"]);

/* 저장된 마지막 화면 → 복원할 route. 숨긴 route 가 남아 있으면(이 변경 전에 저장된 값) 기본 화면으로. */
export function restorableRoute(saved: string, fallback: string): string {
  return HIDDEN_ROUTES.has(saved) ? fallback : saved;
}

/* 이 변경 전에 쌓인 방문기록에서 숨긴 route 를 지운다(앱 모듈 로드 시 1회 — Shell 의 방문기록 초기 렌더보다 먼저). */
export function purgeHiddenFromHistory(): void {
  HIDDEN_ROUTES.forEach((r) => HistoryStore.remove(r));
}
