/* 조합 수시보고 내역 — 자펀드 보고 > 조합정보 > 조합 수시보고 내역 (route = 리프 라벨).
   출처: docs/mockups/05_MOAF/S5_117_일일보고_조회.html — [타이틀]'투자기업개요' 단일 레코드, 5개 섹션 프로퍼티 시트.

   왜 전용 페이지인가: 원문은 목록이 아니라 기업 1건의 라벨/값 시트다. 스키마(GenericListPage)로 옮기면
   레코드 1건이 컬럼 46개짜리 가로 그리드 1행이 돼 섹션 구조를 잃는다(Codex P2, 2026-09-29) — 그래서
   투자기업정보(통합)과 같은 kv 섹션 프리미티브(company_profile_model 의 Section·KvGridPage, variant 'page')를 쓴다.
   원문에 검색영역·버튼·팝업·금액단위 토글이 없다(설계 메모: 사용자 지시 2026-08-31) → 툴바는 비우고 인쇄만 둔다.
   데이터 SSOT: gp_occasional_overview_data.ts */
import { UI } from './components';
import { GridFrame, FooterActions } from './grid_frame';
import { useHotkey, HOTKEYS } from './use-hotkey';   // ⌘P 인쇄(푸터 툴팁 힌트와 짝)
import { Section, KvGridPage } from './company_profile_model';
import { OCCASIONAL_OVERVIEW, OCCASIONAL_ITEM_COUNT } from './gp_occasional_overview_data';

const { Button } = UI;

export function GpOccasionalOverview({ onNav }: { onNav?: (r: string) => void }) {
  useHotkey(HOTKEYS.print.combo, () => window.print());
  return (
    <GridFrame
      crumbs={['홈', '자펀드 보고', '조합정보', '조합 수시보고 내역']}
      title="조합 수시보고 내역"
      favRoute="조합 수시보고 내역"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      footerLeft={<span>{`투자기업개요 ${OCCASIONAL_OVERVIEW.length}개 섹션 · ${OCCASIONAL_ITEM_COUNT}항목 (원문 그대로)`}</span>}
      footerRight={<FooterActions />}>
      <div style={{ padding: '20px 2px 8px' }}>
        {OCCASIONAL_OVERVIEW.map((s) => (
          <Section key={s.title} title={s.title} variant="page">
            <KvGridPage items={s.items} />
          </Section>
        ))}
      </div>
    </GridFrame>
  );
}
