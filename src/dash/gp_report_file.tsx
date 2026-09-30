/* 자펀드 보고 > 파일 > 보고 파일 조회 — 출처 목업 docs/mockups/05_MOAF/S5_116_업로드.html(MOAF REPORT System · 업로드).

   목업 → 우리 규약
   - 검색박스 `보고구분` select(원문 옵션 '투심일정보고' 1건, '전체' 없음) → 상세필터 드로어 select(allLabel:null) · 행 값으로 실제로 거른다.
     원문 [조회] 버튼 → 툴바 새로고침(조회) 아이콘.
   - 첨부파일 드롭존 박스 + [업로드] → 툴바 [업로드] → 공용 `UploadModal`(2026-09-24 사용자 결정 — 드롭존을 카드 본문에 펼쳐 두지 않는다).
     원문 토스트 문구 그대로: 파일 없이 확인 '첨부파일을 먼저 선택하세요' / 선택 후 '업로드되었습니다'. 파일 처리·전송은 하지 않는다.
   - 목록 5열(No·보고구분·파일명·수정일자·정합성) = 원문 thead 그대로. 정합성 `.tag.g` O / `.tag.n` X → 배지 success / muted.
     원문은 보고구분 셀을 rowspan 병합했지만 AG Grid 는 행별로 같은 값을 반복 표시한다(값은 동일).
   - 원문 그리드 위 정합성 안내 2줄은 두지 않는다(2026-09-29 사용자 지시로 삭제).
   - 조회 전용 — 선택이 만드는 액션이 없으므로 행 선택(체크박스)을 두지 않는다. 엑셀 = 푸터 내보내기(⌥D).
   - 원문 스캐폴딩(GNB/LNB 토글·출처시스템 메뉴·서브탭)·설계 메모·검토필요 마커는 옮기지 않는다. KPI 배지 행 없음. */
import { useMemo, useState } from 'react';
import { UI } from './components';
import { toast } from './ui/sonner';
import { RiskPage } from './risk_page_kit';
import type { FilterSpec } from './risk_page_kit';
import { ReadGrid } from './risk_grid';
import { exportTables } from './risk_excel';
import type { ColMeta, Row, TableMeta } from './risk_table_meta';
import { UploadModal } from './trust_upload';

const { Button } = UI;

export const GP_REPORT_FILE_LABEL = '보고 파일 조회';
export const GP_REPORT_FILE_SOURCE = 'docs/mockups/05_MOAF/S5_116_업로드.html';

/** 원문 보고구분 select 옵션 — 확인된 실값 1건뿐(그 외 옵션은 만들지 않는다) */
export const RPT_OPTIONS = ['투심일정보고'] as const;

const FILE = '(붙임8) 농식품혁신스타트업투자조합 별지 서식_적격성 심의 체크리스트 투자검토 보고서 준법감시보고서 등(그리네틀).hwp';

const COLS: ColMeta[] = [
  { key: 'no', label: 'No', kind: 'number', align: 'center', width: 64, flex: 0 },
  { key: 'rpt', label: '보고구분', kind: 'center', width: 120, flex: 0 },
  { key: 'file', label: '파일명', kind: 'text', width: 320 },
  { key: 'mdate', label: '수정일자', kind: 'date', width: 110, flex: 0 },
  { key: 'valid', label: '정합성', kind: 'badge', tones: { O: 'success', X: 'muted' } },
];

/** 원문 DATA 리터럴 2행 그대로 */
const ROWS: Row[] = [
  { id: 'rf-1', no: 1, rpt: '투심일정보고', file: FILE, mdate: '2026.04.21', valid: 'O' },
  { id: 'rf-2', no: 2, rpt: '투심일정보고', file: FILE, mdate: '2026.04.21', valid: 'O' },
];

export const GP_REPORT_FILE_TABLE: TableMeta = {
  id: 'gpReportFile', cols: COLS, rows: ROWS, empty: '조회된 보고 파일이 없습니다.',
};

/** 보고 파일 조회 — S5_116 */
export function GpReportFile({ onNav }: { onNav?: (r: string) => void }) {
  const [rpt, setRpt] = useState<string>(RPT_OPTIONS[0]);
  const [uploadOpen, setUploadOpen] = useState(false);

  const reset = () => setRpt(RPT_OPTIONS[0]);
  const shown = useMemo(() => GP_REPORT_FILE_TABLE.rows.filter((r) => !rpt || r.rpt === rpt), [rpt]);

  const filters: FilterSpec[] = [
    { label: '보고구분', kind: 'select', value: rpt, onChange: setRpt, options: RPT_OPTIONS, allLabel: null },
  ];

  const exportExcel = () => {
    exportTables(GP_REPORT_FILE_LABEL, [{ name: GP_REPORT_FILE_LABEL, table: GP_REPORT_FILE_TABLE, rows: shown }], null);
    toast.success('Excel로 내보냈습니다');
  };

  return (
    <RiskPage system="자펀드 보고" group="파일" label={GP_REPORT_FILE_LABEL} route={GP_REPORT_FILE_LABEL} onNav={onNav}
      filters={filters} onReset={reset}
      actions={<Button variant="outline" size="sm" leadingIcon="upload" onClick={() => setUploadOpen(true)}>업로드</Button>}
      footerLeft={<span>{`총 ${String(shown.length)}건`}</span>}
      onExport={exportExcel} exportEnabled={!uploadOpen}>
      <ReadGrid table={GP_REPORT_FILE_TABLE} rows={shown} ariaLabel="보고 첨부파일 목록" />
      {uploadOpen && (
        <UploadModal title="보고 첨부파일 업로드" label="첨부파일" removedMsg="첨부파일 제거됨"
          emptyMsg="첨부파일을 먼저 선택하세요" doneMsg="업로드되었습니다" onClose={() => setUploadOpen(false)} />
      )}
    </RiskPage>
  );
}
