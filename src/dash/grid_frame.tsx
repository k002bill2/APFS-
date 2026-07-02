/* GridFrame — 리스트/그리드/매트릭스 페이지 공통 양식 프레임(셸).
   generic_list.tsx의 시각 양식(PageHeader · Card pad0 · 카드헤더+KPI · 툴바 · 푸터)을
   SSOT로 표준화한다. 테이블 본체는 children으로 주입 —
   리스트(체크박스·CRUD)든 매트릭스(2단헤더·합계행)든 동일 프레임을 입는다.
   apfs-grid 스킬 규약의 정본 구현. */
import React from 'react';
import { Shell } from './shell';
import { UI } from './components';
import { MT } from './mask';
import { Icon } from './icons';
import { APFS_DATA, MenuStore, useMenuSel } from './data';

const { PageHeader } = Shell;
const { Card, ColorChip } = UI;

/* 카드헤더 즐겨찾기 토글(★) — 현재 페이지(route)를 MenuStore 'fav'에 on/off. 개수 제한 없음.
   route가 메뉴(ALLMENU, key=라우트)에 없으면 렌더하지 않는다(FAB에서 표시·딥링크 불가). */
function FavStar({ route }: { route: string }) {
  const favs = useMenuSel("fav", APFS_DATA.DEFAULT_FAV);
  if (!APFS_DATA.ALLMENU.some((o: any) => o.key === route)) return null;
  const on = favs.includes(route);
  const toggle = () => MenuStore.set("fav", on ? favs.filter((k: string) => k !== route) : [...favs, route]);
  return (
    <button
      type="button" onClick={toggle} aria-pressed={on}
      aria-label={on ? "즐겨찾기 해제" : "즐겨찾기 추가"} title={on ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      className="inline-flex items-center justify-center cursor-pointer shrink-0"
      style={{ width: 30, height: 30, border: "none", borderRadius: 8, background: "transparent", color: on ? "var(--warning)" : "var(--caption)", transition: "color .15s,background .15s" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--muted)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      {/* on: 채운 별 — svg 루트 inline fill이 fill="none" 속성을 덮는다(단일 폐곡선 star 글리프) */}
      <Icon name="star" size={17} style={on ? { fill: "var(--warning)" } : undefined} />
    </button>
  );
}

/* 헤더 우측 KPI 배지 — generic_list.tsx에서 verbatim 추출(라벨 MT 마스킹 포함).
   value는 호출자가 이미 mn() 처리해 넘기는 ReactNode(숫자/단위), 라벨은 MT(원본 동일). */
export function KpiBadge({ icon, color, label, value, valueColor, valueSize }: { icon: string; color: string; label: string; value: React.ReactNode; valueColor?: string; valueSize?: number }) {
  return (
    <div className="flex items-center gap-2.5 py-2 px-3.5 bg-card" style={{ border: "1px solid var(--border)", borderRadius: 12 }}>
      <ColorChip icon={icon} color={color} size={30} iconSize={16} />
      <div className="flex flex-col" style={{ gap: 1, lineHeight: 1.2 }}>
        <span className="font-semibold text-caption" style={{ fontSize: 11 }}><MT>{label}</MT></span>
        <span className="tabular font-extrabold" style={{ fontSize: valueSize ?? 14, color: valueColor || "var(--foreground)" }}>{value}</span>
      </div>
    </div>
  );
}

export interface GridFrameProps {
  crumbs: string[];
  title: string;
  sub?: string;
  /** PageHeader 우측 액션 (예: 메인으로·내보내기). 내보내기 등 주 액션은 여기 한 곳에만. */
  headerActions?: React.ReactNode;
  /** 카드 헤더 타이틀(미지정 시 title 재사용) */
  cardTitle?: string;
  /** 카드 헤더 우측 KPI 배지군 슬롯 (KpiBadge 나열) */
  kpis?: React.ReactNode;
  /** 즐겨찾기 토글(★) 활성 — 현재 페이지의 라우트(onNav 인자와 동일 문자열).
      지정 시 카드헤더 타이틀 옆에 별 아이콘이 붙고, 클릭으로 MenuStore 'fav'에 on/off 된다. */
  favRoute?: string;
  /** 툴바 좌: 필터칩·선택 액션 */
  toolbarLeft?: React.ReactNode;
  /** 툴바 우: 새로고침·상세필터 등 보조 액션 */
  toolbarRight?: React.ReactNode;
  /** 푸터 좌: 건수 등 요약 텍스트 */
  footerLeft?: React.ReactNode;
  /** 푸터 중: 페이지네이션 */
  footerCenter?: React.ReactNode;
  /** 푸터 우: 뷰 토글·다운로드 등 */
  footerRight?: React.ReactNode;
  /** 테이블 본체. ⚠️ Card가 overflow:hidden이므로 가로 스크롤이 필요하면
      이 children이 자체 overflow-x:auto + min-width 래퍼를 반드시 가질 것(아니면 클립됨). */
  children: React.ReactNode;
}

export function GridFrame({
  crumbs, title, sub, headerActions, cardTitle, kpis, favRoute,
  toolbarLeft, toolbarRight, footerLeft, footerCenter, footerRight, children,
}: GridFrameProps) {
  const hasToolbar = Boolean(toolbarLeft || toolbarRight);
  const hasFooter = Boolean(footerLeft || footerCenter || footerRight);
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', animation: 'dashFade .3s var(--ease) both' }}>
      {/* PageHeader: 현 shell은 title/sub를 렌더하지 않으므로(crumbs·actions만) title/sub는 카드헤더가 직접 그린다.
          title은 forward-compat용으로 계속 넘기되 라이브 제목은 카드 <h3> — 향후 shell이 title 렌더를 복원하면 중복 주의 */}
      <PageHeader crumbs={crumbs} title={title} actions={headerActions} />
      {/* ⚠️ overflow-hidden 제거: 푸터 sticky가 뷰포트 기준으로 달라붙으려면 조상에 scrollport가 없어야 한다.
          가로 클리핑은 이미 각 children이 자체 overflow-x:auto 래퍼로 책임진다(asset_funding=overflow-x-auto+min-w,
          AG Grid=내부 스크롤). 카드 모서리 클리핑은 푸터가 하단 모서리를 직접 라운딩해 보완. */}
      <Card pad={0}>
        {/* 카드 헤더: 타이틀(+sub 캡션) + KPI 슬롯 */}
        <div className="flex items-center justify-between flex-wrap gap-4" style={{ padding: '6px 18px' }}>
          <div className="min-w-0">
            <div className="flex items-center" style={{ gap: 4 }}>
              <h3 className="font-bold" style={{ fontSize: 20 }}>{cardTitle ?? title}</h3>
              {favRoute && <FavStar route={favRoute} />}
            </div>
            {sub && <p className="text-caption" style={{ fontSize: 12.5, margin: '2px 0 0', lineHeight: 1.4 }}>{sub}</p>}
          </div>
          {kpis && <div className="flex gap-2.5 flex-wrap">{kpis}</div>}
        </div>

        {/* 툴바 */}
        {hasToolbar && (
          <div className="flex items-center justify-between flex-wrap gap-3" style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--muted) 35%, transparent)' }}>
            <div className="flex items-center gap-2 flex-wrap">{toolbarLeft}</div>
            <div className="flex items-center gap-1 flex-wrap">{toolbarRight}</div>
          </div>
        )}

        {/* 본문: 테이블 (가로 스크롤은 children 책임 — 상단 계약 주석 참조) */}
        {children}

        {/* 푸터 — sticky 하단 고정: 긴 목록을 스크롤해도 건수·페이지네이션·뷰토글이 항상 보인다.
            background 불투명(스크롤되는 행이 비치지 않게) + 하단 모서리 라운딩(카드 overflow:hidden 제거 보완)
            + zIndex는 FAB(60)보다 낮게 둬 우하단 FAB 클릭성을 침범하지 않게 한다. */}
        {hasFooter && (
          <div className="flex items-center justify-between flex-wrap gap-3" style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', position: 'sticky', bottom: 0, zIndex: 20, background: 'var(--card)', borderBottomLeftRadius: 'var(--radius)', borderBottomRightRadius: 'var(--radius)' }}>
            <span className="flex items-center min-w-0 text-caption" style={{ fontSize: 12.5 }}>{footerLeft}</span>
            {footerCenter && <div className="flex items-center gap-1 flex-wrap">{footerCenter}</div>}
            <div className="flex items-center gap-1.5 flex-wrap">{footerRight}</div>
          </div>
        )}
      </Card>
    </div>
  );
}
