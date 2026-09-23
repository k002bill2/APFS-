/* 자펀드 종합등급 변동 조회 — 조기경보 > 자펀드정보 (원본 S2_79_종합등급_변동.html).
   데이터 SSOT = risk_subfund_info_data.ts(FUND_GRADE · MGR_GRADE — 정상=원천 실값, 주의·경고=원문 값 없음이라 0, 총계=합).

   목업 → 우리 규약
   - 섹션 2개(자펀드 종합등급 · 운용사 종합등급) = 원문 `.section` 그대로. 각 섹션 = 등급×연도 표(총계 = pinned 합계행) +
     연도별 정상 비중 도넛 5개. 원문 도넛은 "정상 vs 그 외(주의·경고 합산, 비율 미확인)" 2구간 — 그 외를 임의로 쪼개지 않는다.
   - 도넛 색: 정상 = success 토큰(상태색) · 그 외 = 중립 회색. 세그먼트 사이 2px 표면 간격, 범례 상시 + 도넛 아래 값 라벨
     (색만으로 식별하지 않는다 — dataviz). 호버 툴팁 = SVG <title>.
   - 검색박스(모펀드 · 기준년도) → 상세필터 드로어. 표가 원문 고정 5개 연도(2021~2025)라 두 조건 모두 `· 데이터 연동 후 적용`.
   - 엑셀 = 표 2장 → 시트 2장(푸터 내보내기 + ⌥D). 금액이 없어 단위 토글 없음. 행 선택 없음. */
import React, { useState } from 'react';
import { toast } from './ui/sonner';
import { RiskPage } from './risk_page_kit';
import type { FilterSpec } from './risk_page_kit';
import { ReadGrid, SectionHead } from './risk_grid';
import { exportTables } from './risk_excel';
import type { TableMeta } from './risk_table_meta';
import { FUND_GRADE, MGR_GRADE, GRADE_YEARS, GRADE_BASE_YEAR, MF_OPTIONS, yearKey } from './risk_subfund_info_data';

const LABEL = '자펀드 종합등급 변동 조회';
const REST = 'var(--border-strong)';

/* 2구간 도넛 — 정상 비중(원문 값 그대로를 %로) vs 그 외. 세그먼트 사이 2px 표면 간격 */
function GradeDonut({ year, pct }: { year: number; pct: number }) {
  const r = 26, c = 2 * Math.PI * r, seg = (c * pct) / 100;
  /* 접근名·툴팁도 행 데이터 — 마스크 ON 이면 mn() 으로 가린다(화면 숫자만 가리고 aria 로 새지 않게) */
  const p = String(pct), rest = String(100 - pct);
  return (
    <figure className="flex flex-col items-center gap-1 m-0">
      <svg width={72} height={72} viewBox="0 0 72 72" role="img" aria-label={`${year}년 정상 ${p}%, 그 외(주의·경고) ${rest}%`}>
        <title>{`${year} · 정상 ${p} / 그 외 ${rest}`}</title>
        {/* 두 호를 각각 그려 이음새마다 2px 간격(원문 surface gap). dasharray 선두 0-길이 대시로 시작점을 옮긴다 */}
        <circle cx={36} cy={36} r={r} fill="none" stroke="var(--success)" strokeWidth={10} transform="rotate(-90 36 36)"
          strokeDasharray={`0 1 ${Math.max(0, seg - 2).toFixed(2)} ${c.toFixed(2)}`} />
        <circle cx={36} cy={36} r={r} fill="none" stroke={REST} strokeWidth={10} transform="rotate(-90 36 36)"
          strokeDasharray={`0 ${(seg + 1).toFixed(2)} ${Math.max(0, c - seg - 2).toFixed(2)} ${c.toFixed(2)}`} />
        <text x={36} y={40} textAnchor="middle" className="tabular-nums font-extrabold" style={{ fontSize: 15, fill: 'var(--foreground)' }}>{String(pct)}</text>
      </svg>
      <figcaption className="text-center" style={{ fontSize: 12 }}>
        <div className="font-bold">{year}</div>
        <div className="text-caption">정상 {String(pct)}</div>
      </figcaption>
    </figure>
  );
}

function GradeSection({ n, table }: { n: number; table: TableMeta }) {
  const normal = table.rows.find((r) => r.grade === '정상')!;
  return (
    <section aria-label={table.title}>
      <SectionHead n={n} title={table.title!} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)]" style={{ padding: '0 18px 18px' }}>
        <div className="min-w-0"><ReadGrid table={table} ariaLabel={table.title} /></div>
        <div className="min-w-0 border border-border" style={{ borderRadius: 12, padding: '12px 14px', background: 'var(--card)' }}>
          {/* preflight:false — p UA 마진 제거 */}
          <p className="font-bold m-0" style={{ fontSize: 13.5, marginBottom: 10 }}>연도별 정상 비중</p>
          <div className="flex flex-wrap justify-between gap-2">
            {GRADE_YEARS.map((y) => <GradeDonut key={y} year={y} pct={Number(normal[yearKey(y)])} />)}
          </div>
          <div className="flex gap-4 text-caption" style={{ fontSize: 12, marginTop: 10 }}>
            <span className="inline-flex items-center gap-1.5"><i aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--success)' }} />정상</span>
            <span className="inline-flex items-center gap-1.5"><i aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: REST }} />그 외(주의·경고)</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SubfundGradeTrend({ onNav }: { onNav?: (r: string) => void }) {
  const [mf, setMf] = useState<string>(MF_OPTIONS[0]);
  const [year, setYear] = useState(GRADE_BASE_YEAR);
  const reset = () => { setMf(MF_OPTIONS[0]); setYear(GRADE_BASE_YEAR); };

  const filters: FilterSpec[] = [
    { label: '모펀드', kind: 'select', value: mf, onChange: setMf, options: MF_OPTIONS, allLabel: null, noop: true },
    { label: '기준년도', kind: 'year', value: year, onChange: setYear, noop: true },
  ];
  const exportExcel = () => {
    exportTables(LABEL, [{ name: FUND_GRADE.title!, table: FUND_GRADE }, { name: MGR_GRADE.title!, table: MGR_GRADE }], null);
    toast.success('Excel로 내보냈습니다');
  };

  return (
    <RiskPage group="자펀드정보" label={LABEL} route={LABEL} onNav={onNav}
      filters={filters} onReset={reset}
      footerLeft={<span>{`기준년도 ${year ? String(year) : '-'} · ${GRADE_YEARS[0]}~${GRADE_YEARS[GRADE_YEARS.length - 1]}년 등급별 값`}</span>}
      onExport={exportExcel}>
      <GradeSection n={1} table={FUND_GRADE} />
      <GradeSection n={2} table={MGR_GRADE} />
    </RiskPage>
  );
}
