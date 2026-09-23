/* 부처보고 > 모태펀드 > 연도별투자현황(route report-bucheo) — 원문 03_연도별투자현황 + 04_연도별투자현황상세 목업.

   2026-09-23 교체 이력: 이 파일의 이전 본문은 FR-5.8 로 만든 "보고서 목록"(보고서명·보고유형·보고기관·승인 스텝퍼·KPI 카드) 더미
   화면이었다 — 원본 목업과 컬럼·행·합계·검색조건이 하나도 겹치지 않고, 행 5건이 원문에 없는 합성 데이터였다(브리프 규칙 2 위반).
   "차이만 보강"하면 곧 전부 교체라 본문을 원문대로 다시 썼다. 파일·`Pages.ReportBucheo` export·app.tsx route 는 그대로 둔다.

   목업 → 우리 규약
   - 메뉴 리프가 하나(연도별투자현황)라 상세 목업(04)을 **탭 2**로 통합한다(탭 라벨 = 원문 h1). 두 목업의 연도가 서로 대응하지
     않아(상세 2010·2012·2013·2015 ↔ 요약 2011~2014) 행 드릴다운으로 잇지 않는다.
   - 검색박스 → 상세필터 드로어: 기준월(원문 2026-08) · 계정구분(전체/농식품/수산) · 조회기준(선정년도/결성년도 라디오) +
     상세 탭만 조합구분(전체/운영조합/청산조합 라디오). 기준월·계정구분은 행에 대응 칸이 없어 조회 조건(`· 데이터 연동 후 적용`).
   - 조회기준 → 요약 탭은 원문처럼 **데이터셋 자체가 바뀌고**(DATA_SEL ↔ DATA_FORM) 연도 컬럼 헤더가 선택값이 된다.
     상세 탭은 같은 행의 선정/결성 연도 칸만 바뀐다. 조합구분은 운영/청산 행 필터 + No 재부여(원문 render).
   - 금액 단위 토글: 요약 기본 백만원 · 상세 기본 억원(원문 초기값) — 탭별로 따로 기억한다.
   - 합계행(요약만): 조합수·금액은 합산, 연도는 '-', 투자배수 = (ΣB1+ΣB2+ΣC)/ΣA(원문 tfoot 1.63).
   - 원문 `.foot-note` 3줄은 화면 안내문이라 표 아래에 둔다(설계 메모 `.note` 는 옮기지 않는다).
   - 원문 [조회] 는 즉시 반영이라 두지 않는다. 엑셀은 푸터 내보내기(⌥D) — 활성 탭 표 그대로. KPI·카드뷰·행 선택 없음. */
import React, { useMemo, useState } from 'react';
import { mn, useMask } from './mask';
import { toast } from './ui/sonner';
import type { Unit } from './schemas/unit';
import { RiskPage, TabBar, TabPanel } from './risk_page_kit';
import type { FilterSpec } from './risk_page_kit';
import { ReadGrid } from './risk_grid';
import { exportTables } from './risk_excel';
import {
  YEARLY_BASE_YM, ACCOUNT_TYPES, BASES, COMB_TYPES, YEARLY_FOOTNOTES, YEARLY_TABLES, detailTable, detailRows,
} from './brief_data';
import type { Basis } from './brief_data';

const LABEL = '연도별투자현황';
const TABS = [
  { id: 'yearly', label: '연도별투자현황' },
  { id: 'detail', label: '연도별투자현황상세' },
] as const;
type TabId = typeof TABS[number]['id'];
/** 원문 초기 단위 — 요약 `var UNIT='백만원'` · 상세 `var unit='억원'` */
const DEFAULT_UNITS: Record<TabId, Unit> = { yearly: '백만원', detail: '억원' };

function ReportBucheo({ onNav }: { onNav?: (route: string) => void }) {
  const masked = useMask();
  const [tab, setTab] = useState<TabId>('yearly');
  const [ym, setYm] = useState(YEARLY_BASE_YM);
  const [acc, setAcc] = useState('');
  const [basis, setBasis] = useState<Basis>('선정년도');
  const [comb, setComb] = useState<string>(COMB_TYPES[0]);
  const [units, setUnits] = useState<Record<TabId, Unit>>(DEFAULT_UNITS);
  const unit = units[tab];

  const reset = () => { setYm(YEARLY_BASE_YM); setAcc(''); setBasis('선정년도'); setComb(COMB_TYPES[0]); setUnits(DEFAULT_UNITS); };

  const detail = useMemo(() => detailTable(basis), [basis]);
  const table = tab === 'yearly' ? YEARLY_TABLES[basis] : detail;
  const rows = useMemo(() => (tab === 'yearly' ? YEARLY_TABLES[basis].rows : detailRows(basis, comb)), [tab, basis, comb]);

  const filters: FilterSpec[] = [
    { label: '기준월', kind: 'month', value: ym, onChange: setYm, noop: true },
    { label: '계정구분', kind: 'select', value: acc, onChange: setAcc, options: ACCOUNT_TYPES, noop: true },
    { label: '조회기준', kind: 'radio', value: basis, onChange: (v) => setBasis(v as Basis), options: BASES },
    ...(tab === 'detail' ? [{ label: '조합구분', kind: 'radio', value: comb, onChange: setComb, options: COMB_TYPES } as FilterSpec] : []),
  ];

  const tabLabel = TABS.find((t) => t.id === tab)!.label;
  const exportExcel = () => {
    exportTables(`${LABEL}_${tabLabel}`, [{ name: tabLabel, table, rows }], unit, masked);
    toast.success('Excel로 내보냈습니다');
  };

  return (
    <RiskPage system="부처보고" group="모태펀드" label={LABEL} route="report-bucheo" onNav={onNav}
      filters={filters} onReset={reset}
      unit={unit} onUnit={(u) => setUnits((p) => ({ ...p, [tab]: u }))}
      unitNote={tab === 'yearly' ? '조합수(개) · 투자배수(배)' : '투자배수(배)'}
      footerLeft={<span>기준월 {mn(ym || '-')} · {tabLabel} 총 {mn(String(rows.length))}건</span>}
      onExport={exportExcel}>
      <TabBar tabs={TABS.map((t) => ({ id: t.id, label: t.label }))} value={tab} onChange={(id) => setTab(id as TabId)} idBase="yearly-invest" label={LABEL} />
      <TabPanel idBase="yearly-invest" value={tab}>
        <ReadGrid key={`${tab}-${basis}`} table={table} rows={rows} unit={unit} ariaLabel={tabLabel} />
        {tab === 'yearly' && (
          /* 원문 `.foot-note` — <p> UA 마진 제거(preflight:false) */
          <p className="m-0 text-caption" style={{ padding: '12px 18px 16px', fontSize: 12.5, lineHeight: 1.7 }}>
            {YEARLY_FOOTNOTES.map((t, i) => <React.Fragment key={t}>{i > 0 && <br />}{t}</React.Fragment>)}
          </p>
        )}
      </TabPanel>
    </RiskPage>
  );
}

export const Pages = { ReportBucheo };
