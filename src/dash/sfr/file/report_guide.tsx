/* 자펀드 보고 > 파일 > 보고양식·가이드 조회 — 출처 목업 docs/mockups/05_MOAF/SRP_007_보고양식_가이드_조회.html(SRP-007).
   농금원이 배포한 보고양식·작성 가이드라인을 운용사가 조회·다운로드하는 읽기 전용 화면. 데이터는 report_guide_data.ts.

   목업 → 우리 규약
   - 검색박스 `제목 검색` 입력 + [조회] → 상세필터 드로어 text(제목 부분일치 — 원문 indexOf), 원문 placeholder 그대로.
     원문 [조회] → 툴바 새로고침. 원문처럼 검색 결과에 No 를 1부터 다시 매긴다.
   - 목록 6열 = 원문 thead. 양식명 뒤 'N' 배지 = 버전 이력이 있는 양식만(원문 `.latest-badge` '최신' → 'N', 2026-10-30 사용자 지시).
     글자 하나라 스크린리더용 '최신 버전' 을 sr-only 로 덧붙인다.
   - Download 칸 행 버튼 → 셀 안 `Button outline sm`(report_form_manage DownloadCell 과 같은 모양·접근名). 백엔드가 없어 토스트.
   - 이력 칸 `이력 N건` → 버전 이력 팝업(report_guide_history_modal). 이력 없는 양식은 '이력없음' 텍스트(원문 disabled 버튼 — 조작 불가).
   - 두 버튼 칸은 ReadGrid cellRenderers 칸이라 Tab 이 브라우저 기본 이동으로 셀 안 버튼에 닿고, Enter/Space 는 버튼 기본 동작이다.
     방향키로 셀(gridcell)에 닿은 경우엔 셀 Enter 가 같은 동작을 한다(onCellAction).
   - 조회 전용 — 행 선택·업로드 없음(원문 설계 메모: 등록/수정/삭제는 관리자 화면). 엑셀 = 푸터 내보내기(⌥D, Download 칸 제외).
   - 원문 스캐폴딩(GNB/LNB·출처시스템 메뉴·서브탭)·설계 메모·검토필요 마커는 옮기지 않는다. KPI 배지 행 없음. */
import React, { useCallback, useMemo, useState } from 'react';
import { UI } from '../../components';
import { Icon } from '../../icons';
import { toast } from '../../ui/sonner';
import { RiskPage } from '../../risk_page_kit';
import type { FilterSpec } from '../../risk_page_kit';
import { ReadGrid } from '../../risk_grid';
import type { CellRenderers } from '../../risk_grid';
import { exportTables } from '../../risk_excel';
import type { Row } from '../../risk_table_meta';
import { REPORT_GUIDE_TABLE, REPORT_GUIDE_LABEL, REPORT_GUIDE_ROUTE, GUIDE_HISTORY } from './report_guide_data';
import { ReportGuideHistoryModal } from './report_guide_history_modal';

const { Button, StatusBadge } = UI;

/* 팝업 트리거 링크 모양 — ReadGrid LinkCell 과 같은 표현(primary·밑줄·external 아이콘).
   preflight:false 라 <button> 은 UA 글꼴(13.33px 시스템체)을 쓴다 → 글꼴을 셀에서 물려받는다 */
const LINK_BTN: React.CSSProperties = {
  fontFamily: 'inherit', fontSize: 'inherit', color: 'var(--primary)', textDecoration: 'underline', textUnderlineOffset: 3,
  background: 'none', border: 0, padding: 0, cursor: 'pointer',
};

/** 보고양식·가이드 조회 — SRP-007 */
export function ReportGuide({ onNav }: { onNav?: (r: string) => void }) {
  const [q, setQ] = useState('');
  const [histId, setHistId] = useState<string | null>(null);

  const reset = () => setQ('');
  const shown = useMemo(() => {
    const k = q.trim();
    if (!k) return REPORT_GUIDE_TABLE.rows;
    return REPORT_GUIDE_TABLE.rows.filter((r) => String(r.title).includes(k)).map((r, i) => ({ ...r, no: i + 1 }));
  }, [q]);

  const download = useCallback((file: string) => { toast.success(`다운로드: ${file}`); }, []);

  /* 참조 고정 필수 — 바뀌면 ReadGrid 가 컬럼 정의를 다시 만든다(폭 되돌림) */
  const cellRenderers = useMemo<CellRenderers>(() => ({
    title: (r) => (
      <span className="flex items-center gap-1.5 min-w-0">
        <span className="min-w-0 truncate">{String(r.title)}</span>
        {GUIDE_HISTORY[r.id] && <StatusBadge tone="success" label={<>N<span className="sr-only"> 최신 버전</span></>} size="sm" />}
      </span>
    ),
    dl: (r) => (
      <Button variant="outline" size="sm" leadingIcon="download" onClick={() => download(String(r.file))}>
        다운로드<span className="sr-only"> — {String(r.title)}</span>
      </Button>
    ),
    hist: (r) => (GUIDE_HISTORY[r.id]
      ? (
        <button type="button" aria-haspopup="dialog" onClick={() => setHistId(r.id)} className="inline-flex items-center gap-1 font-semibold" style={LINK_BTN}>
          {String(r.hist)}<span className="sr-only"> — {String(r.title)} 버전 이력 보기</span>
          <Icon name="external" size={13} stroke={2.2} className="shrink-0" />
        </button>
      )
      : <span className="text-muted-foreground">{String(r.hist)}</span>),
  }), [download]);
  /* 셀(gridcell) Enter = 셀 안 버튼과 같은 동작 — 방향키로 셀에 닿은 뒤 바로 Enter(ReadGrid onCellAction) */
  const onCellAction = useCallback((r: Row, key: string) => {
    if (key === 'dl') download(String(r.file));
    else if (key === 'hist' && GUIDE_HISTORY[r.id]) setHistId(r.id);
  }, [download]);

  const filters: FilterSpec[] = [
    { label: '제목 검색', kind: 'text', value: q, onChange: setQ, placeholder: '양식·가이드 제목을 입력하세요' },
  ];

  const exportExcel = () => {
    exportTables(REPORT_GUIDE_LABEL, [{ name: REPORT_GUIDE_LABEL, table: REPORT_GUIDE_TABLE, rows: shown }], null);
    toast.success('Excel로 내보냈습니다');
  };

  const histRow = histId ? REPORT_GUIDE_TABLE.rows.find((r) => r.id === histId) : undefined;

  return (
    <RiskPage system="자펀드 보고" group="파일" label={REPORT_GUIDE_LABEL} route={REPORT_GUIDE_ROUTE} onNav={onNav}
      filters={filters} onReset={reset}
      footerLeft={<span>{`총 ${String(shown.length)}건`}</span>}
      onExport={exportExcel} exportEnabled={histId === null}>
      <ReadGrid table={REPORT_GUIDE_TABLE} rows={shown} cellRenderers={cellRenderers} onCellAction={onCellAction} ariaLabel="보고양식·가이드 목록" />
      {histRow && GUIDE_HISTORY[histRow.id] && (
        <ReportGuideHistoryModal title={String(histRow.title)} versions={GUIDE_HISTORY[histRow.id]}
          onDownload={download} onClose={() => setHistId(null)} />
      )}
    </RiskPage>
  );
}
