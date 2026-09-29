/* 자펀드 보고 > 보고조회 > 자펀드 보고 조회 — 출처 목업 docs/mockups/05_MOAF/S5_121_자펀드_보고_조회.html(MOAF REPORT System).

   원문: 보고항목(DB 테이블 논리명) select 1개로 그 테이블을 조회하는 읽기전용 화면. 그리드 헤더 = 선택한 테이블의 논리 컬럼명.
   목업 → 우리 규약
   - 검색박스 `보고항목` select(원문 옵션 8건, '전체' 없음) → 상세필터 드로어 select(allLabel:null). 원문 [조회] → 툴바 새로고침(조회).
   - 항목마다 컬럼·행이 다르다 → 항목별 TableMeta 를 두고 선택에 따라 ReadGrid 에 넘긴다.
     컬럼이 확인된 2건(자펀드 펀드개요·자펀드 조합개요)은 원문 ITEMS 리터럴 그대로(원문 주석: S5_118·S5_119 실데이터 재사용).
     나머지 6건은 원문도 컬럼 정의가 없다 — 컬럼을 지어내지 않고 원문 안내 문구를 빈 상태로 보인다. 옵션 라벨의 ' (컬럼 미정의)'도 원문 그대로.
   - 금액단위 seg(원/백만원/억원) → 툴바 UnitToggle. 원문처럼 금액 컬럼이 있는 항목에서만 보인다. 행 값은 원 단위 숫자(risk_table_meta 계약).
   - 원문 `엑셀` → 푸터 내보내기(⌥D). 건수 `총 N건` → 푸터.
   - 날짜·년월은 원문 fmtD/fmtYM 표시값(YYYY-MM-DD / YYYY-MM)으로 싣는다. 빈 값은 null → '-'.
   - 조회 전용 — 행 선택 없음. 원문 스캐폴딩(GNB/LNB 토글·출처시스템 메뉴)·설계 메모·검토필요 마커(2026-09-24 삭제 규약)는 옮기지 않는다. */
import { useMemo, useState } from 'react';
import { toast } from './ui/sonner';
import { RiskPage } from './risk_page_kit';
import type { FilterSpec } from './risk_page_kit';
import { ReadGrid } from './risk_grid';
import { exportTables } from './risk_excel';
import type { ColMeta, TableMeta } from './risk_table_meta';
import { DEFAULT_UNIT } from './schemas/unit';
import type { Unit } from './schemas/unit';

export const GP_REPORT_QUERY_LABEL = '자펀드 보고 조회';
export const GP_REPORT_QUERY_SOURCE = 'docs/mockups/05_MOAF/S5_121_자펀드_보고_조회.html';

/** 원문 미정의 항목의 안내 문구(원문 그대로) */
export const UNDEFINED_MSG = '이 보고항목의 그리드 컬럼(논리명)이 아직 확정되지 않았습니다. 원본 화면 캡처에 항목명만 있고 컬럼 정의가 없어 테이블정의서 확정 후 반영이 필요합니다.';

export type ReportItem = { key: string; label: string; grounded: boolean; hasAmt: boolean; table: TableMeta };

const c = (key: string, label: string, kind: ColMeta['kind'], extra: Partial<ColMeta> = {}): ColMeta => ({ key, label, kind, ...extra });

const FUND_OVERVIEW: TableMeta = {
  id: 'FUND_OVERVIEW',
  cols: [
    c('no', 'No', 'number', { align: 'center', width: 64, flex: 0 }),
    c('ym', '보고기준년월', 'date'),
    c('mgr', '운용사코드', 'text'),
    c('fcode', '운용사펀드코드', 'center'),
    c('form', '결성일', 'date'),
    c('ds', '존속시작일자', 'date'),
    c('de', '존속종료일자', 'date'),
    c('dur', '존속기간', 'center'),
    c('amt', '결성액', 'amount'),
  ],
  rows: [
    { id: 'fo-1', no: 1, ym: '2026-04', mgr: 'APFSLIB', fcode: '102', form: '2022-12-20', ds: '2022-12-20', de: '2030-12-25', dur: '8년', amt: 1000000000 },
    { id: 'fo-2', no: 2, ym: '2026-04', mgr: 'APFSLIB', fcode: '103', form: '2023-07-06', ds: '2023-07-31', de: '2031-07-30', dur: '8년', amt: 3000000000 },
  ],
};

const UNION_OVERVIEW: TableMeta = {
  id: 'UNION_OVERVIEW',
  cols: [
    c('no', 'No', 'number', { align: 'center', width: 64, flex: 0 }),
    c('ym', '보고기준년월', 'date'),
    c('mgr', '운용사코드', 'center'),
    c('fcode', '운용사펀드코드', 'center'),
    c('fn', '조합명', 'text'),
    c('ds', '존속시작일자', 'date'),
    c('de', '존속종료일자', 'date'),
    c('dur', '존속기간(년)', 'center'),
    c('ie', '투자종료일자', 'date'),
    c('iper', '투자기간(년)', 'center'),
    c('pm', '납입방법', 'center'),
    c('pc', '납입회수', 'center'),
    c('commit', '약정총액', 'amount'),
    c('paid', '납입총액', 'amount'),
    c('main', '주요투자분야', 'text'),
    c('duty', '의무투자분야', 'text'),
    c('dutyr', '의무투자비율(%)', 'center'),
    c('pref', '우선투자분야', 'text'),
    c('prefr', '우선투자비율(%)', 'center'),
  ],
  rows: [
    { id: 'uo-1', no: 1, ym: '2025-12', mgr: 'APFSLIB', fcode: '102', fn: '농식품새싹키움매칭펀드',
      ds: '2022-12-20', de: '2030-12-25', dur: '8', ie: '2026-12-19', iper: '4',
      pm: 'A1', pc: '0', commit: 1000000000, paid: 1000000000,
      main: '농림수산식품투자조합의 결성 및 운용에 관한 법률 제3조',
      duty: '중소기업창업지원법 제2조에 따른 창업기업(사업 개시 7년 이내)', dutyr: null,
      pref: '농림수산식품투자조합의 결성 및 운용에 관한 법률 제3조', prefr: null },
    { id: 'uo-2', no: 2, ym: '2025-12', mgr: 'APFSLIB', fcode: '103', fn: '농식품혁신스타트업투자조합',
      ds: '2023-07-31', de: '2031-07-30', dur: '8', ie: '2027-07-30', iper: '4',
      pm: 'A1', pc: '0', commit: 3000000000, paid: null,
      main: null, duty: null, dutyr: null, pref: null, prefr: null },
  ],
};

/** 원문 미정의 항목 — 안내 헤더 1칸 + 빈 상태(행 0건) */
const undefinedTable = (key: string): TableMeta => ({ id: key, cols: [c('note', '안내', 'text')], rows: [], empty: UNDEFINED_MSG });

const UNDEFINED: [string, string][] = [
  ['UNION_COMPOSITION', '조합구성'],
  ['MGMT_STAFF', '운용인력 정보'],
  ['INVESTED_COMPANY', '투자집행업체현황'],
  ['MONTHLY_CONFIRM', '월간보고 확정여부'],
  ['INVEST_FIELD_MEMBER', '투자분야·조합원구성'],
  ['AUDITOR', '회계연도별 회계감사인·변경/해임사항'],
];

/** 원문 ITEMS 순서 그대로 */
export const REPORT_ITEMS: ReportItem[] = [
  { key: 'FUND_OVERVIEW', label: '자펀드 펀드개요', grounded: true, hasAmt: true, table: FUND_OVERVIEW },
  { key: 'UNION_OVERVIEW', label: '자펀드 조합개요', grounded: true, hasAmt: true, table: UNION_OVERVIEW },
  ...UNDEFINED.map(([key, label]): ReportItem => ({ key, label, grounded: false, hasAmt: false, table: undefinedTable(key) })),
];

/** select 옵션 표시 라벨 — 원문: 미정의 항목엔 ' (컬럼 미정의)' 접미 */
export const optionLabel = (it: ReportItem): string => it.label + (it.grounded ? '' : ' (컬럼 미정의)');

/** 자펀드 보고 조회 — S5_121 */
export function GpReportQuery({ onNav }: { onNav?: (r: string) => void }) {
  const first = optionLabel(REPORT_ITEMS[0]);
  const [picked, setPicked] = useState<string>(first);
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);

  const item = useMemo(() => REPORT_ITEMS.find((it) => optionLabel(it) === picked) ?? REPORT_ITEMS[0], [picked]);
  const reset = () => { setPicked(first); setUnit(DEFAULT_UNIT); };

  const filters: FilterSpec[] = [
    { label: '보고항목', kind: 'select', value: picked, onChange: setPicked, options: REPORT_ITEMS.map(optionLabel), allLabel: null },
  ];

  const exportExcel = () => {
    exportTables(`${GP_REPORT_QUERY_LABEL}_${item.label}`, [{ name: item.label, table: item.table }], item.hasAmt ? unit : null);
    toast.success('Excel로 내보냈습니다');
  };

  return (
    <RiskPage system="자펀드 보고" group="보고조회" label={GP_REPORT_QUERY_LABEL} route={GP_REPORT_QUERY_LABEL} onNav={onNav}
      filters={filters} onReset={reset}
      unit={item.hasAmt ? unit : undefined} onUnit={item.hasAmt ? setUnit : undefined}
      footerLeft={<span>{`${item.label} · 총 ${String(item.table.rows.length)}건`}</span>}
      onExport={exportExcel} exportEnabled={item.grounded}>
      {/* key=항목 — 컬럼 세트가 통째로 바뀌므로 그리드를 새로 마운트한다(이전 컬럼 상태·정렬 잔존 방지) */}
      <ReadGrid key={item.key} table={item.table} rows={item.table.rows} unit={item.hasAmt ? unit : null} ariaLabel={`자펀드 보고 조회 — ${item.label}`} />
    </RiskPage>
  );
}
