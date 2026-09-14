/* 관리 컨텍스트 탭 바 — 관리 route 4개(사용자 권한·프로그램·메뉴·코드) 본문 상단 공용(GridFrame `tabs` 슬롯).
   이미지 IA: 1차 [사용자 권한 관리 | 시스템관리], 시스템관리 활성 시 2차 [프로그램관리 | 메뉴관리 | 코드관리].
   - 전역 Shell/GNB/브랜드 헤더는 여기서 중복 렌더하지 않는다(브리프) — PageHeader 아래, 카드 위에만 얹는다.
   - 활성 = primary 텍스트 + 하단 2px 강조선(FilterChip·SegTabs 와 같은 --primary 토큰), 비활성 = muted. 색만이 아니라
     밑줄·aria-current 로도 구분된다(web-a11y). 라이트/다크는 토큰이 처리.
   - 라우트를 바꾸는 탭이라 role=tablist 가 아니라 <nav> + aria-current="page"(패널 전환이 아닌 페이지 이동).
   - 좁은 화면: 줄바꿈 대신 가로 스크롤(responsive-ui — 탭 라벨은 잘리면 뜻을 잃는다). */
import { ADMIN_PRIMARY_TABS, ADMIN_SYSTEM_TABS, adminTabState } from './admin_tabs_model';
import type { AdminTab } from './admin_tabs_model';

const TAB_BASE = 'inline-flex items-center shrink-0 whitespace-nowrap bg-transparent border-0 border-b-2 border-solid cursor-pointer font-[inherit] font-semibold transition-colors duration-tok-fast ease-ds motion-safe:active:scale-[.98]';
const TAB_ON = 'text-primary border-primary';
const TAB_OFF = 'text-muted-foreground border-transparent hover:text-foreground';

function TabRow({ label, items, activeRoute, onNav, level }: { label: string; items: readonly AdminTab[]; activeRoute: string | null; onNav?: (r: string) => void; level: 1 | 2 }) {
  const primary = level === 1;
  return (
    <nav aria-label={label} className="flex items-end overflow-x-auto" style={{ gap: 2, borderBottom: '1px solid var(--border)', padding: primary ? '0 4px' : '0 4px', scrollbarWidth: 'thin' }}>
      {items.map((t) => {
        const on = t.route === activeRoute;
        return (
          <button key={t.route} type="button" aria-current={on ? 'page' : undefined} onClick={() => onNav?.(t.route)}
            className={`${TAB_BASE} ${on ? TAB_ON : TAB_OFF}`}
            style={{ padding: primary ? '10px 14px' : '8px 12px', fontSize: primary ? 13.5 : 13, marginBottom: -1 }}>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

/** route 가 관리 route 가 아니면 아무것도 그리지 않는다(잘못 얹어도 조용히 빈 자리). */
export function AdminTabs({ route, onNav }: { route: string; onNav?: (r: string) => void }) {
  const st = adminTabState(route);
  if (!st.primary) return null;
  const primaryRoute = ADMIN_PRIMARY_TABS.find((t) => t.key === st.primary)!.route;
  return (
    <div className="flex flex-col" style={{ margin: '10px 0 12px', gap: 0 }}>
      <TabRow label="관리 메뉴" items={ADMIN_PRIMARY_TABS} activeRoute={primaryRoute} onNav={onNav} level={1} />
      {st.primary === 'system' && (
        <TabRow label="시스템관리 하위 메뉴" items={ADMIN_SYSTEM_TABS} activeRoute={st.secondary} onNav={onNav} level={2} />
      )}
    </div>
  );
}
