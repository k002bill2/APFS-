/* 개인정보 접속관리(ADM-010) — 통계 탭 본문. 섹션 3개 세로 쌓기(apfs-multi-grid — 섹션 actions 가 있어 TablesPage 대신
   공용 SectionHead 를 직접 쓴다). 집계는 페이지가 privacy_access_model.buildStats 로 만들어 넘긴다(엑셀과 같은 값).
   목업은 2단(좌: 기간별 추이 / 우: 메뉴별·사용자별)이지만 우리 규약(여러 표 세로 쌓기)대로 한 줄에 하나씩 둔다.
   - 기간별 추이 = 선 차트(2026-11-02 사용자 요청 — 표 대신). 공용 Charts.MultiLineTrend(시간순, 방문자수·페이지뷰 2선, 같은 축).
     정확한 값은 호버 툴팁(hoverTip — 플롯 어디든 올리면 그 기간·페이지뷰 N건·방문자수 N명, 같은 날 사용자 요청)·
     스크린리더용 숨김 표(tableCaption)·엑셀(표 그대로 '기간별 추이' 시트)로 남는다.
   - 메뉴별·사용자별 = ReadGrid 표 그대로. */
import type { CSSProperties } from 'react';
import { UI } from '../../components';
import { Charts } from '../../charts';
import type { TrendSeries } from '../../charts';
import { ReadGrid, SectionHead } from '../../risk_grid';
import { TREND_TABLE, MENU_TABLE, USER_TABLE, TREND_UNITS } from './privacy_access_model';
import type { AccessStats, TrendChart, TrendUnit } from './privacy_access_model';

const { SegTabs } = UI;

const UNIT_OPTIONS = TREND_UNITS.map((u) => ({ value: u.value, label: u.label }));

/* 선 색 = 칠 → 베이스 차트 토큰(color-tokens). indigo(chart-1)·teal(chart-3) — chart-2(blue)는 indigo 와 색상이 가까워 구분이 약하다 */
const SERIES: TrendSeries[] = [
  { key: 'pv', name: '페이지뷰', color: 'var(--chart-1)', unit: '건' },
  { key: 'visitors', name: '방문자수', color: 'var(--chart-3)', unit: '명' },
];

/* 탭 바(TabBar) 하단선과 첫 섹션 상단선이 맞붙어 2px 로 보이지 않게 1px 겹친다 */
const STACK_STYLE = { marginTop: -1 } as const;
/* position:relative + overflow:hidden — 숨김 표(table.sr-only)가 내용 폭으로 절대배치돼 페이지 가로 스크롤을 만든다
   (gp_type_indicator_trend 실측 scrollWidth 1828). 차트 영역을 포함 블록으로 삼아 잘라 둔다 */
const CHART_WRAP: CSSProperties = { position: 'relative', overflow: 'hidden', padding: '4px 4px 12px' };

/* ── 로컬 UI 조각(공유 export 아님 — early_warning_trend_modal 골드 복사 관례) ── */
function Legend({ series }: { series: TrendSeries[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground" style={{ fontSize: 12.5 }}>
          <span className="inline-block" style={{ width: 16, height: 3, borderRadius: 2, background: s.color }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}

function TrendChartView({ chart, unitLabel }: { chart: TrendChart; unitLabel: string }) {
  if (!chart.labels.length) return <p className="text-caption" style={{ fontSize: 13, margin: '24px 0 28px' }}>{TREND_TABLE.empty}</p>;
  const first = chart.fullLabels[0];
  const last = chart.fullLabels[chart.fullLabels.length - 1];
  return (
    <div style={CHART_WRAP}>
      <Charts.MultiLineTrend
        labels={chart.labels} fullLabels={chart.fullLabels} data={chart.data} series={SERIES}
        height={240} hoverTip
        /* 주별 기간 문자열은 이미 'A ~ B' 라 범위를 '~'로 또 잇지 않는다 */
        ariaLabel={`${TREND_TABLE.title!} ${unitLabel} 선 차트 — 페이지뷰·방문자수, 첫 구간 ${first}, 마지막 구간 ${last}`}
        tableCaption={`${TREND_TABLE.title!}(${unitLabel}) — 페이지뷰·방문자수`} seriesHeader="구분" />
    </div>
  );
}

export function PrivacyAccessStats({ stats, unit, onUnit }: { stats: AccessStats; unit: TrendUnit; onUnit: (u: TrendUnit) => void }) {
  const unitLabel = TREND_UNITS.find((u) => u.value === unit)?.label ?? '';
  return (
    <div style={STACK_STYLE}>
      <SectionHead title={TREND_TABLE.title!} actions={
        <div className="flex flex-wrap items-center gap-4">
          <Legend series={SERIES} />
          <div role="group" aria-label="집계 단위">
            <SegTabs size="sm" options={UNIT_OPTIONS} value={unit} onChange={(v: TrendUnit) => onUnit(v)} />
          </div>
        </div>
      } />
      <TrendChartView chart={stats.chart} unitLabel={unitLabel} />
      <SectionHead title={MENU_TABLE.title!} />
      <ReadGrid table={MENU_TABLE} rows={stats.menu} ariaLabel={MENU_TABLE.title} />
      <SectionHead title={USER_TABLE.title!} />
      <ReadGrid table={USER_TABLE} rows={stats.user} ariaLabel={`${USER_TABLE.title!} — 페이지뷰 많은 순`} />
    </div>
  );
}
