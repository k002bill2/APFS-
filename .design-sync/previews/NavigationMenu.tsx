import * as React from 'react';
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink, ColorChip } from 'apfs-dashboard-offline';

/* NavigationMenu — 세로 아이콘 레일 + 측면 플라이아웃(셸의 접힘 LNB / RailNav).
   Viewport 미사용이라 Content 는 각 Item 안에 인라인 렌더되고, 소비처가 position:fixed + left/top 으로
   레일 overflow 를 탈출시킨다(레일 nav 에는 양수 z-index 필수 — 쌓임 맥락에 갇히지 않게).
   여기서는 `value` 제어형으로 '조기경보' 패널을 열어둔 상태. */

const P: Record<string, string[]> = {
  landmark: ['M3 21h18', 'M5 21V10', 'M19 21V10', 'M9 21V10', 'M15 21V10', 'M2.5 10 12 3.5 21.5 10', 'M3 10h18'],
  wallet: ['M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v0', 'M3 7v10a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-3', 'M21 10h-5a2 2 0 0 0 0 4h5a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1Z'],
  'shield-alert': ['M12 3 5 6v6c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6l-7-3Z', 'M12 8.5v4', 'M12 15.5h.01'],
  chart: ['M3 3v18h18', 'M7 15l3-4 3 2 4-6'],
  calendar: ['M7 3v3', 'M17 3v3', 'M4 8h16', 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z', 'M9 13h2', 'M13 13h2', 'M9 17h2'],
  'arrow-right': ['M5 12h14', 'M13 6l6 6-6 6'],
};

function Glyph({ name, size = 21 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

const MENU = [
  { id: 'invest', label: '투자자산관리', icon: 'landmark', leaves: ['자펀드 정보관리', '출자 이행 관리', '투자기업 관리', '투자 실적 조회'] },
  { id: 'fund', label: '모태펀드 관리', icon: 'wallet', leaves: ['출자사업 공고', '운용사 선정', '조합 규약 관리', '의무투자 점검'] },
  { id: 'risk', label: '조기경보', icon: 'shield-alert', urgent: true, leaves: ['조기경보 현황', '지표 관리', '운용사 평가', '조치 이력'] },
  { id: 'acct', label: '회계·자금', icon: 'chart', leaves: ['전표 관리', '자금 집행', '월별 결산', '잔액 대조'] },
  { id: 'sched', label: '일정·알림', icon: 'calendar', leaves: ['업무 일정', '보고 마감', '알림 설정', '메모'] },
];

function trigger(active: boolean): React.CSSProperties {
  return {
    width: 48, height: 48, borderRadius: 12, border: 'none', font: 'inherit', display: 'flex',
    alignItems: 'center', justifyContent: 'center', margin: '0 auto',
    background: active ? 'color-mix(in srgb,var(--primary) 13%,transparent)' : 'transparent',
    color: active ? 'var(--primary)' : 'var(--foreground)',
  };
}

const leafStyle: React.CSSProperties = {
  display: 'block', padding: '7px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 500,
  color: 'var(--foreground)', textDecoration: 'none',
};

function Rail({ open }: { open: string }) {
  return (
    <div style={{ position: 'relative', height: 300, display: 'flex' }}>
      <nav aria-label="주 메뉴" className="bg-card" style={{ width: 64, height: 300, borderRight: '1px solid var(--border)', position: 'relative', zIndex: 48 }}>
        <NavigationMenu orientation="vertical" value={open} onValueChange={() => {}} className="block max-w-none">
          <NavigationMenuList className="gap-1 py-3 px-2">
            {MENU.map((m) => (
              <NavigationMenuItem key={m.id} value={m.id}>
                <NavigationMenuTrigger aria-label={m.label} title={m.label} style={trigger(m.id === open)}>
                  <span style={{ position: 'relative', display: 'inline-flex' }}>
                    <Glyph name={m.icon} />
                    {m.urgent && <span style={{ position: 'absolute', top: -2, right: -3, width: 7, height: 7, borderRadius: 99, background: 'var(--danger)' }} />}
                  </span>
                </NavigationMenuTrigger>
                <NavigationMenuContent style={{ left: 72, top: 0, width: 264, maxHeight: 300 }}>
                  <div className="flex items-center shrink-0 pt-3.5 px-4 pb-2.5" style={{ gap: 9, borderBottom: '1px solid var(--border)' }}>
                    <ColorChip icon={m.icon} color={m.urgent ? 'var(--danger)' : 'var(--primary)'} size={30} iconSize={16} />
                    <span className="font-bold" style={{ fontSize: 13.5 }}>{m.label}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5">
                    <NavigationMenuLink href={`#/${m.id}`} className="flex items-center gap-2 py-2 px-2.5 text-primary mb-1" style={{ fontWeight: 700, borderRadius: 8, fontSize: 12.5, textDecoration: 'none' }}>
                      <Glyph name="arrow-right" size={14} />전체 보기
                    </NavigationMenuLink>
                    {m.leaves.map((l, i) => (
                      <NavigationMenuLink key={l} href={`#/${m.id}-${i}`} style={{ ...leafStyle, background: i === 0 ? 'color-mix(in srgb,var(--primary) 10%,transparent)' : 'transparent', color: i === 0 ? 'var(--primary)' : 'var(--foreground)', fontWeight: i === 0 ? 700 : 500 }}>
                        {l}
                      </NavigationMenuLink>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </nav>
      <div style={{ flex: 1, minWidth: 0, padding: '14px 18px 14px 296px' }}>
        <div style={{ fontSize: 11.5, color: 'var(--caption)' }}>대시보드 / 조기경보</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--foreground)', marginTop: 6 }}>조기경보 현황</div>
      </div>
    </div>
  );
}

export function OpenFlyout() { return <Rail open="risk" />; }
export function ClosedRail() { return <Rail open="" />; }
