/* 공용 생략형 페이저 — GridFrame footerCenter 용 `‹ 1 … 5 6 7 … 37 ›` (2026-11-09 사용자 결정).
   골드 페이저(apfs-grid "푸터 골드 양식" — IconBtn chevron + 로컬 PageBtn)는 번호를 전부 그려 쪽이 많으면 버튼이 수십 개가 된다.
   7쪽 이하는 골드와 같은 모양(번호 전부), 넘으면 처음·현재±1·마지막만 두고 나머지를 … 로 접는다 — 칸 수가 항상 7 이라
   쪽을 넘겨도 버튼 수가 바뀌지 않는다(폭은 숫자 자릿수 차만큼 수 px — 37쪽 실측 308↔316px). 쪽 번호는 AG Grid 와 같은 0-based(page.current · paginationGoToPage). */
import { UI } from './components';

const { IconBtn } = UI;

export type PageItem = number | 'gap';

/* 처음 1 + … + 현재±1 + … + 마지막 1 = 7칸. 이하이면 접을 게 없다 */
const SLOTS = 7;

/* 접힌 자리는 'gap'. … 는 2쪽 이상을 접을 때만 — 한 쪽만 빠지는 자리는 그 번호를 그대로 둔다(MUI usePagination 과 같은 규칙,
   boundary 1 · siblings 1). current 가 범위 밖이면(빈 목록 재조회 직후 등) 양 끝으로 붙인다. */
export function pageItems(current: number, total: number): PageItem[] {
  if (total <= 0) return [];
  if (total <= SLOTS) return Array.from({ length: total }, (_, i) => i);
  const cur = Math.min(Math.max(current, 0), total - 1);
  const start = Math.max(Math.min(cur - 1, total - 5), 2);   // 형제 구간 시작(0-based) — 앞쪽에선 2 에 고정
  const end = Math.min(Math.max(cur + 1, 4), total - 3);      // 형제 구간 끝 — 뒤쪽에선 total-3 에 고정
  const mid = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  return [0, start > 2 ? 'gap' : 1, ...mid, end < total - 3 ? 'gap' : total - 2, total - 1];
}

/* 페이지 번호 버튼 — 골드 PageBtn 과 같은 모양(로컬 복사본들과 픽셀 동일) */
function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

/* 소비처: `footerCenter={page.total > 1 ? <GridPager current={page.current} total={page.total} onGo={(i) => apiRef.current?.paginationGoToPage(i)} /> : undefined}` */
export function GridPager({ current, total, onGo }: { current: number; total: number; onGo: (page: number) => void }) {
  return (
    <nav aria-label="페이지 이동" className="flex items-center gap-1">
      <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => onGo(Math.max(0, current - 1))} />
      {pageItems(current, total).map((p, idx) => (p === 'gap'
        ? <span key={'gap' + String(idx)} aria-hidden="true" className="inline-flex items-center justify-center text-muted-foreground" style={{ minWidth: 30, height: 30, fontSize: 12.5 }}>…</span>
        : <PageBtn key={p} n={p + 1} active={p === current} onClick={() => onGo(p)} />))}
      <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => onGo(Math.min(total - 1, current + 1))} />
    </nav>
  );
}
