/* 부처보고 > 모태펀드 > 연도별투자현황(route report-bucheo) — 원문 03_연도별투자현황 목업.

   2026-09-23 교체 이력: 이 파일의 이전 본문은 FR-5.8 로 만든 "보고서 목록"(보고서명·보고유형·보고기관·승인 스텝퍼·KPI 카드) 더미
   화면이었다 — 원본 목업과 컬럼·행·합계·검색조건이 하나도 겹치지 않고, 행 5건이 원문에 없는 합성 데이터였다(브리프 규칙 2 위반).
   "차이만 보강"하면 곧 전부 교체라 본문을 원문대로 다시 썼다. 파일·`Pages.ReportBucheo` export·app.tsx route 는 그대로 둔다.

   목업 → 우리 규약
   - 탭 없음 — 옛 탭 2 '연도별투자현황상세'(04 목업)는 원본 화면에 없는 탭이라 삭제했다(2026-09-24 사용자 결정).
   - 검색박스 → 상세필터 드로어: 기준월(원문 2026-08) · 계정구분(전체/농식품/수산) · 조회기준(선정년도/결성년도 라디오).
     기준월·계정구분은 행에 대응 칸이 없어 조회 조건(`· 데이터 연동 후 적용`).
   - 조회기준 → 원문처럼 **데이터셋 자체가 바뀌고**(DATA_SEL ↔ DATA_FORM) 연도 컬럼 헤더가 선택값이 된다.
   - 금액 단위 토글: 기본 백만원(원문 `var UNIT='백만원'`).
   - 합계행: 조합수·금액은 합산, 연도는 '-', 투자배수 = (ΣB1+ΣB2+ΣC)/ΣA(원문 tfoot 1.63).
   - 원문 `.foot-note` 3줄은 화면 안내문이라 표 아래에 둔다(설계 메모 `.note` 는 옮기지 않는다).
   - 원문 [조회] 는 즉시 반영이라 두지 않는다. 엑셀은 푸터 내보내기(⌥D) — 표 그대로. KPI·카드뷰·행 선택 없음. */
import React, { useState } from 'react';
import { toast } from './ui/sonner';
import type { Unit } from './schemas/unit';
import { RiskPage } from './risk_page_kit';
import type { FilterSpec } from './risk_page_kit';
import { ReadGrid } from './risk_grid';
import { exportTables } from './risk_excel';
import {
  YEARLY_BASE_YM, ACCOUNT_TYPES, BASES, YEARLY_FOOTNOTES, YEARLY_TABLES,
} from './brief_data';
import type { Basis } from './brief_data';

const LABEL = '연도별투자현황';
/** 원문 초기 단위 `var UNIT='백만원'` */
const DEFAULT_UNIT: Unit = '백만원';

function ReportBucheo({ onNav }: { onNav?: (route: string) => void }) {
  const [ym, setYm] = useState(YEARLY_BASE_YM);
  const [acc, setAcc] = useState('');
  const [basis, setBasis] = useState<Basis>('선정년도');
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);

  const reset = () => { setYm(YEARLY_BASE_YM); setAcc(''); setBasis('선정년도'); setUnit(DEFAULT_UNIT); };

  const table = YEARLY_TABLES[basis];
  const rows = table.rows;

  const filters: FilterSpec[] = [
    { label: '기준월', kind: 'month', value: ym, onChange: setYm, noop: true },
    { label: '계정구분', kind: 'select', value: acc, onChange: setAcc, options: ACCOUNT_TYPES, noop: true },
    { label: '조회기준', kind: 'radio', value: basis, onChange: (v) => setBasis(v as Basis), options: BASES },
  ];

  const exportExcel = () => {
    exportTables(LABEL, [{ name: LABEL, table, rows }], unit);
    toast.success('Excel로 내보냈습니다');
  };

  return (
    <RiskPage system="부처보고" group="모태펀드" label={LABEL} route="report-bucheo" onNav={onNav}
      filters={filters} onReset={reset}
      unit={unit} onUnit={setUnit}
      unitNote="조합수(개) · 투자배수(배)"
      footerLeft={<span>기준월 {String(ym || '-')} · 총 {String(rows.length)}건</span>}
      onExport={exportExcel}>
      <ReadGrid key={basis} table={table} rows={rows} unit={unit} ariaLabel={LABEL} />
      {/* 원문 `.foot-note` — <p> UA 마진 제거(preflight:false) */}
      <p className="m-0 text-caption" style={{ padding: '12px 18px 16px', fontSize: 12.5, lineHeight: 1.7 }}>
        {YEARLY_FOOTNOTES.map((t, i) => <React.Fragment key={t}>{i > 0 && <br />}{t}</React.Fragment>)}
      </p>
    </RiskPage>
  );
}

export const Pages = { ReportBucheo };
