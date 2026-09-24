/* 운용사 유형별 정량지표 변동 조회 — 조기경보 > 자펀드정보 (원본 S2_78_운용사_유형별_정량지표_변동.html).
   데이터 SSOT = risk_subfund_info_data.ts(TREND_SECTIONS — 평균값 4개는 원문 실데이터, 월별 13점은 원문이 명시한 "예시 곡선(추론)").

   목업 → 우리 규약
   - 섹션 2개(자본 건전성 지표 · 수익성 지표) = 원문 `<section>` 그대로. 각 섹션의 **평균 카드**는 이 화면의 유일한 실데이터라
     본문 콘텐츠로 옮긴다(브리프 규칙 5 의 "KPI 배지 행"은 GridFrame 카드헤더 `kpis` 슬롯을 말한다 — 그 슬롯은 쓰지 않는다).
   - ⚠ 원문 차트는 **이중 축**(좌=자본충실도 ~430, 우=부채비율 ~33)이다. 이중 축은 두 척도의 교차·기울기를 임의로 만들어 내는
     대표적 오독 원인이라(dataviz 비타협 규칙 "One axis") **지표별 단일 축 차트 2장(small multiples)** 으로 나눴다.
     값·월·평균은 원문 그대로이며 표현만 바뀐다. 차트 = 공용 Charts.MultiLineTrend(스크린리더용 숨김 표 내장).
   - 검색박스(모펀드 · 운용사 유형 · 기간 시작~종료) → 상세필터 드로어. **기간**은 원문 13점(2025.07~2026.07, 점마다 월이 정해져 있다)을
     선택 범위로 실제로 잘라 그린다 — 원문 스크립트처럼 x축이 기간을 따른다. 단 원문은 라벨만 다시 만들고 값 13개를 그대로
     앞에서부터 붙여 월-값 대응이 어긋났다; 여기서는 점을 **자기 월로 거른다**(범위 밖 월은 원천 값이 없으므로 그리지 않는다).
     모펀드·운용사 유형은 원천 값이 한 벌뿐이라 `· 데이터 연동 후 적용`. 평균 카드는 원문 확정값이라 기간과 무관하게 고정.
   - 비율(%) 지표라 금액 단위 토글·엑셀이 없다(원문도 없음). 표·행 선택 없음. */
import React, { useState } from 'react';
import { Charts } from './charts';
import { RiskPage } from './risk_page_kit';
import type { FilterSpec } from './risk_page_kit';
import { SectionHead } from './risk_grid';
import { TREND_SECTIONS, TREND_FROM, TREND_TO, TREND_TYPES, MF_OPTIONS, monthLabels, trendPointsInRange } from './risk_subfund_info_data';
import type { TrendSeries } from './risk_subfund_info_data';

const LABEL = '운용사 유형별 정량지표 변동 조회';
const LABELS = monthLabels(TREND_FROM, TREND_TO);   // 원문 시계열 13점의 월('YYYY.MM' — 툴팁·숨김 표)

/* 지표 1개 = 평균 카드 + 단일 축 추이 차트(단일 계열이라 범례 대신 제목이 이름을 댄다) */
function IndicatorPanel({ s, idx }: { s: TrendSeries; idx: number[] }) {
  const labels = idx.map((i) => LABELS[i]);
  return (
    /* position:relative + overflow:hidden — MultiLineTrend 의 숨김 표(`table.sr-only`)는 table 이라 width:1px 가 안 먹어
       내용 폭으로 절대배치된다. 패널을 포함 블록으로 삼아 잘라 두지 않으면 페이지 전체에 가로 스크롤이 생긴다(실측 scrollWidth 1828). */
    <div className="min-w-0 border border-border" style={{ position: 'relative', overflow: 'hidden', borderRadius: 12, padding: '14px 16px', background: 'var(--card)' }}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap" style={{ marginBottom: 8 }}>
        {/* preflight:false — h5 UA 마진 제거 */}
        <h5 className="font-bold m-0" style={{ fontSize: 14 }}>{s.name} 월별 추이</h5>
        <div className="inline-flex items-baseline gap-1.5">
          <span className="text-caption font-semibold" style={{ fontSize: 12.5 }}>{s.name} 평균</span>
          <span className="tabular-nums font-extrabold" style={{ fontSize: 22 }}>{String(s.avg)}</span>
          <span className="text-caption font-semibold" style={{ fontSize: 13 }}>%</span>
        </div>
      </div>
      {idx.length === 0
        ? <p className="text-caption m-0" style={{ fontSize: 13, padding: '40px 0', textAlign: 'center' }}>선택한 기간에 월별 값이 없습니다(원문 2025.07~2026.07).</p>
        : <Charts.MultiLineTrend
            /* 축 눈금은 'YY.MM' — 13개월 × 'YYYY.MM' 은 small multiple 폭(~470px)에서 겹친다(2026-09-23 실측) */
            labels={labels.map((l) => l.slice(2))} fullLabels={labels} data={{ v: idx.map((i) => s.data[i]) }}
            series={[{ key: 'v', name: s.name, color: s.color }]}
            height={220} unit="%" minWidth={380}
            ariaLabel={`${s.name} 월별 추이 라인차트(원문 예시값), 평균 ${String(s.avg)}%`}
            tableCaption={`${s.name} 월별 값(%)`} seriesHeader="지표" />}
    </div>
  );
}

export function GpTypeIndicatorTrend({ onNav }: { onNav?: (r: string) => void }) {
  const [mf, setMf] = useState<string>(MF_OPTIONS[0]);
  const [type, setType] = useState<string>(TREND_TYPES[0]);
  const [from, setFrom] = useState(TREND_FROM);
  const [to, setTo] = useState(TREND_TO);
  const reset = () => { setMf(MF_OPTIONS[0]); setType(TREND_TYPES[0]); setFrom(TREND_FROM); setTo(TREND_TO); };

  const filters: FilterSpec[] = [
    { label: '모펀드', kind: 'select', value: mf, onChange: setMf, options: MF_OPTIONS, allLabel: null, noop: true },
    { label: '운용사 유형', kind: 'select', value: type, onChange: setType, options: TREND_TYPES, noop: true },
    { label: '기간(시작)', kind: 'month', value: from, onChange: setFrom },
    { label: '기간(종료)', kind: 'month', value: to, onChange: setTo },
  ];
  const idx = trendPointsInRange(from, to);

  return (
    <RiskPage group="자펀드정보" label={LABEL} route={LABEL} onNav={onNav}
      filters={filters} onReset={reset}
      footerLeft={<span>{`운용사 유형 ${type || '전체'} · 기간 ${from ? String(from) : '-'} ~ ${to ? String(to) : '-'} · ${String(idx.length)}개월 · 월별 값은 원문 예시(평균만 확정값)`}</span>}>
      {TREND_SECTIONS.map((sec) => (
        <section key={sec.id} aria-labelledby={`trend-${sec.id}`}>
          <SectionHead title={sec.title} cap={sec.chartTitle} />
          <span id={`trend-${sec.id}`} className="sr-only">{sec.title}</span>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2" style={{ padding: '0 0 18px' }}>
            {sec.series.map((s) => <IndicatorPanel key={s.name} s={s} idx={idx} />)}
          </div>
        </section>
      ))}
    </RiskPage>
  );
}
