/* 일일보고 조회(S5_117) — 수시보고 확인(occasional-report) 리프의 두 번째 탭 화면. 데이터 = daily_report_model.ts

   목업 → 우리 규약
   - 원문은 투자기업개요 단일 레코드의 **읽기전용 프로퍼티 시트**(5블록)다 — 그리드가 아니라 kv 표로 옮긴다.
     한 행 = 라벨·값 2쌍(원문 th·td·th·td). 라벨 칸 = 그리드 헤더 톤(`--grid-header`), 값 없음 `-` 은 muted.
   - 원문에 검색 영역·엑셀·단위 토글이 없다(조회 전용) → 상세필터·내보내기·단위 토글을 두지 않는다.
   - 좁은 폭: 4칸 표는 가로 스크롤(min-width 640) — 칸을 접으면 라벨·값 짝이 어긋난다. */
import { RiskPage } from './risk_page_kit';
import { SectionHead } from './risk_grid';
import { LeafTabBody } from './leaf_tabs';
import type { LeafTabsSlot } from './leaf_tabs';
import { DAILY_LABEL, DAILY_TITLE, DAILY_SECTIONS } from './daily_report_model';
import type { PropSection } from './daily_report_model';

const TH = 'text-left align-middle font-bold text-muted-foreground border border-border bg-[color:var(--grid-header)]';
const TD = 'text-left align-middle border border-border bg-card';
const CELL_PAD = { padding: '9px 12px' } as const;

function PropTable({ sec }: { sec: PropSection }) {
  return (
    <div className="overflow-x-auto" style={{ padding: '0 0 16px' }}>
      <table className="w-full border-collapse" style={{ minWidth: 640, tableLayout: 'fixed' }}>
        <caption className="sr-only">{`${DAILY_TITLE} — ${sec.title}`}</caption>
        <colgroup><col style={{ width: '20%' }} /><col style={{ width: '30%' }} /><col style={{ width: '20%' }} /><col style={{ width: '30%' }} /></colgroup>
        <tbody>
          {sec.rows.map((r, i) => (
            <tr key={i}>
              {[0, 2].map((j) => [
                <th key={`h${j}`} scope="row" className={TH} style={{ ...CELL_PAD, fontSize: 13 }}>{r[j]}</th>,
                <td key={`d${j}`} className={`${TD} ${r[j + 1] === '-' ? 'text-caption' : ''}`} style={{ ...CELL_PAD, fontSize: 14, overflowWrap: 'anywhere' }}>{r[j + 1]}</td>,
              ])}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DailyReportView({ onNav, tabs }: { onNav?: (r: string) => void; tabs?: LeafTabsSlot }) {
  const count = DAILY_SECTIONS.reduce((n, s) => n + s.rows.length, 0);
  return (
    <RiskPage system="투자자산관리" group="사후보고관리" label={tabs?.label ?? DAILY_LABEL} route={tabs?.route ?? 'occasional-report'} onNav={onNav}
      onReset={() => undefined}
      footerLeft={<span>{DAILY_TITLE} · {String(DAILY_SECTIONS.length)}개 블록 · {String(count)}행</span>}>
      <LeafTabBody slot={tabs}>
        {/* preflight:false — h3 UA 마진 제거 */}
        <h3 className="m-0 font-bold" style={{ fontSize: 16, padding: '16px 18px 4px 4px' }}>{DAILY_TITLE}</h3>
        {DAILY_SECTIONS.map((sec) => (
          <section key={sec.title} aria-label={sec.title}>
            <SectionHead title={sec.title} />
            <PropTable sec={sec} />
          </section>
        ))}
      </LeafTabBody>
    </RiskPage>
  );
}
