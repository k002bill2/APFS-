/* GridFrame — 리스트/그리드/매트릭스 페이지 공통 양식 프레임(셸).
   generic_list.tsx의 시각 양식(PageHeader · Card pad0 · 카드헤더+KPI · 툴바 · 푸터)을
   SSOT로 표준화한다. 테이블 본체는 children으로 주입 —
   리스트(체크박스·CRUD)든 매트릭스(2단헤더·합계행)든 동일 프레임을 입는다.
   apfs-grid 스킬 규약의 정본 구현. */
import React from 'react';
import { Shell } from './shell';
import { UI } from './components';
import { MT } from './mask';

const { PageHeader } = Shell;
const { Card, ColorChip } = UI;

/* 헤더 우측 KPI 배지 — generic_list.tsx에서 verbatim 추출(라벨 MT 마스킹 포함).
   value는 호출자가 이미 mn() 처리해 넘기는 ReactNode(숫자/단위), 라벨은 MT(원본 동일). */
export function KpiBadge({ icon, color, label, value, valueColor }: { icon: string; color: string; label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2 px-3.5 bg-card" style={{ border: "1px solid var(--border)", borderRadius: 12 }}>
      <ColorChip icon={icon} color={color} size={30} iconSize={16} />
      <div className="flex flex-col" style={{ gap: 1, lineHeight: 1.2 }}>
        <span className="font-semibold text-caption" style={{ fontSize: 11 }}><MT>{label}</MT></span>
        <span className="tabular font-extrabold" style={{ fontSize: 16, color: valueColor || "var(--foreground)" }}>{value}</span>
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
  crumbs, title, sub, headerActions, cardTitle, kpis,
  toolbarLeft, toolbarRight, footerLeft, footerCenter, footerRight, children,
}: GridFrameProps) {
  const hasToolbar = Boolean(toolbarLeft || toolbarRight);
  const hasFooter = Boolean(footerLeft || footerCenter || footerRight);
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', animation: 'dashFade .3s var(--ease) both' }}>
      {/* PageHeader: 현 shell은 title/sub를 렌더하지 않으므로(crumbs·actions만) title/sub는 카드헤더가 직접 그린다.
          title은 forward-compat용으로 계속 넘기되 라이브 제목은 카드 <h3> — 향후 shell이 title 렌더를 복원하면 중복 주의 */}
      <PageHeader crumbs={crumbs} title={title} actions={headerActions} />
      <Card pad={0} className="overflow-hidden">
        {/* 카드 헤더: 타이틀(+sub 캡션) + KPI 슬롯 */}
        <div className="flex items-center justify-between flex-wrap gap-4" style={{ padding: '16px 18px' }}>
          <div className="min-w-0">
            <h3 className="font-bold" style={{ fontSize: 20 }}>{cardTitle ?? title}</h3>
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

        {/* 푸터 */}
        {hasFooter && (
          <div className="flex items-center justify-between flex-wrap gap-3" style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
            <span className="flex items-center min-w-0 text-caption" style={{ fontSize: 12.5 }}>{footerLeft}</span>
            {footerCenter && <div className="flex items-center gap-1 flex-wrap">{footerCenter}</div>}
            <div className="flex items-center gap-1.5 flex-wrap">{footerRight}</div>
          </div>
        )}
      </Card>
    </div>
  );
}
