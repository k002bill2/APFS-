/* 모태펀드 조성 및 출자현황 — 투자자산관리 > 모태펀드관리
   FFMS 캡처(image10) 실측: 연도별 조성현황(기금 소스별) + 출자현황 집계 매트릭스.
   2단 중첩 헤더 + 합계행, 조회 전용. 공통 양식은 GridFrame(apfs-grid 스킬)로 통일. */
import React from 'react';
import { Icon } from './icons';
import { UI } from './components';
import { mn } from './mask';
import { GridFrame, KpiBadge } from './grid_frame';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ColGroupDef, ValueGetterParams } from 'ag-grid-community';
import { apfsTheme, numFmt, numStyle } from './aggrid_theme';   // 공유 테마(회색 행선택)·포매터 SSOT
import './aggrid_shared.css';

const { Button, IconBtn } = UI;

/* FFMS 캡처 실측 — 추측 금지. c=조성현황(억원), u=출자현황(조합수 개 / 출자금액 억원) */
type FundingRow = { y: string; c: number[]; u: number[] };
const FUNDING_ROWS: FundingRow[] = [
  { y: '2010', c: [597.3, 507, 90, 0, 0, 0.3], u: [5, 547] },
  { y: '2011', c: [500, 0, 500, 0, 0, 0], u: [6, 495] },
  { y: '2012', c: [500, 0, 500, 0, 0, 0], u: [7, 540] },
  { y: '2013', c: [500, 0, 500, 0, 0, 0], u: [7, 510] },
  { y: '2014', c: [700, 0, 600, 0, 100, 0], u: [10, 790] },
  { y: '2015', c: [600, 0, 0, 500, 100, 0], u: [8, 700] },
  { y: '2016', c: [400, 0, 0, 300, 100, 0], u: [8, 1040] },
  { y: '2017', c: [300, 0, 0, 200, 100, 0], u: [7, 700] },
  { y: '2018', c: [200, 0, 0, 100, 100, 0], u: [6, 520] },
  { y: '2019', c: [270, 0, 0, 200, 70, 0], u: [8, 622.5] },
  { y: '2020', c: [420, 0, 0, 350, 70, 0], u: [10, 980] },
  { y: '2021', c: [0, 0, 0, 0, 0, 0], u: [12, 1047] },
  { y: '2022', c: [0, 0, 0, 0, 0, 0], u: [17, 1655.9] },
  { y: '2023', c: [0, 0, 0, 0, 0, 0], u: [14, 1314.7] },
  { y: '2024', c: [0, 0, 0, 0, 0, 0], u: [15, 1416] },
  { y: '2025', c: [0, 0, 0, 0, 0, 0], u: [14, 1246] },
];
/* 캡처 합계행 실측값 (열 합·행 합과 일치 검증 완료) */
const TOTAL = { c: [4987.3, 507, 2190, 1650, 640, 0.3], u: [154, 14124.1] };

const CO_COLS = ['합계', '농특회계', '농안기금', 'FTA', '수산발전기금', '일반회계'];
const IN_COLS = ['조합수', '출자금액'];

/* 정수는 천단위 콤마, 소수는 1자리까지 — 캡처 표기 재현 */
function fmt(n: number): string {
  return Number.isInteger(n)
    ? n.toLocaleString()
    : n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/* ── AG Grid 컬럼 — 2단 중첩헤더(조성현황 c[0..5] · 출자현황 u[0..1]) ──
   데이터 구조(c[]/u[])를 보존하려 valueGetter로 인덱스 접근. 숫자는 numFmt(mn 마스킹),
   0=muted·합계열=bold는 numStyle, pinned 합계행은 numStyle이 자동 bold + 공유 CSS가 강조. */
const coCol = (i: number, header: string, strong?: boolean): ColDef<FundingRow> => ({
  headerName: header, flex: 1, minWidth: 92, type: 'rightAligned',
  valueGetter: (p: ValueGetterParams<FundingRow>) => p.data?.c?.[i],
  valueFormatter: numFmt, cellStyle: numStyle(strong) as any,
});
const inCol = (i: number, header: string): ColDef<FundingRow> => ({
  headerName: header, flex: 1, minWidth: 92, type: 'rightAligned',
  valueGetter: (p: ValueGetterParams<FundingRow>) => p.data?.u?.[i],
  valueFormatter: numFmt, cellStyle: numStyle() as any,
});
const columnDefs: (ColDef<FundingRow> | ColGroupDef<FundingRow>)[] = [
  { field: 'y', headerName: '구분', pinned: 'left', width: 120, cellStyle: { fontWeight: 600 } },
  { headerName: '조성현황', marryChildren: true, children: CO_COLS.map((h, i) => coCol(i, h, i === 0)) },
  { headerName: '출자현황', marryChildren: true, children: IN_COLS.map((h, i) => inCol(i, h)) },
];
// pinned 합계행 — 매 렌더 새 배열 금지(모듈 상수). 공유 CSS가 강조 처리.
const PINNED_BOTTOM: FundingRow[] = [{ y: '합 계', c: TOTAL.c, u: TOTAL.u }];

function AssetFunding({ onNav }: { onNav?: (r: string) => void }) {
  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '모태펀드관리', '모태펀드 조성 및 출자현황']}
      title="모태펀드 조성 및 출자현황"
      cardTitle="모태펀드 조성·출자 현황표"
      headerActions={<>
        <Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>
        <Button variant="outline" size="sm" leadingIcon="layers" onClick={() => onNav && onNav('asset-funding-aggrid')}>AG Grid PoC</Button>
        <Button variant="primary" size="sm" leadingIcon="download">내보내기</Button>
      </>}
      kpis={<>
        <KpiBadge icon="landmark" color="var(--primary)" label="누적 조성총액" value={mn(fmt(TOTAL.c[0])) + ' 억원'} valueSize={14} />
        <KpiBadge icon="wallet" color="var(--accent)" label="누적 출자금액" value={mn(fmt(TOTAL.u[1])) + ' 억원'} valueSize={14} />
        <KpiBadge icon="layers" color="var(--chart-1)" label="누적 조합수" value={mn(fmt(TOTAL.u[0])) + ' 개'} />
      </>}
      toolbarLeft={<>
        <Icon name="file" size={16} style={{ color: 'var(--caption)' }} />
        <span className="text-caption" style={{ fontSize: 12.5 }}>기금 소스별(농특회계·농안기금·FTA·수산발전기금·일반회계) 조성액 · 결성 조합수/출자금액 집계</span>
      </>}
      toolbarRight={<IconBtn icon="refresh" label="새로고침" size={34} />}
      footerLeft={<span>{'2010 ~ 2025년 · 총 ' + mn(String(FUNDING_ROWS.length)) + '개 연도'}</span>}>

      {/* 매트릭스 본체 — AG Grid(2단 중첩헤더 + pinned 합계행). 가로 스크롤은 AG Grid 내부 뷰포트가 담당 */}
      <div style={{ padding: '0 2px 2px' }}>
        <AgGridReact<FundingRow>
          theme={apfsTheme}
          rowData={FUNDING_ROWS}
          columnDefs={columnDefs}
          pinnedBottomRowData={PINNED_BOTTOM}
          domLayout="autoHeight"
          defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }}
        />
      </div>
    </GridFrame>
  );
}

export { AssetFunding };
