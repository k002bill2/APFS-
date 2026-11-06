/* 경영체 상세보기 — 읽기전용 5탭 팝업(ACC-023 행 더블클릭 / Enter, ACC-024 IR 상세 참가경영체 기업명 링크가 같은 모달을 쓴다).
   출처: ACC-023 화면설계서 v1.1 경영체 상세 팝업(슬라이드 9~20, 감리 지적 019-01-1 반영 5탭)
        → APFS 디자인시스템(apfs-spec-popup kv 규약 · member_info_detail_modal 골격).

   구성(설계서 → 우리 규약):
   - 팝업 → Radix `Dialog` max-w-[1020px](wide — member_info_detail_modal 선례, 8열 그리드 헤더가 잘리지 않는 폭. 46px 패밀리 — 헤더·본문·푸터 px-[46px]). 제목 '경영체 상세보기' + 대상명(기업명).
   - E04 탭 5개(기본정보·재무정보·주주현황·정부지원사업·사업계획서·홍보자료) → `UI.SegTabs`(새 탭 컴포넌트 없음). 열 때 기본정보.
   - 기본정보 13항목 → kv 그리드(한글 가로 라벨좌·값우, withKvFill 로 홀수 빈칸 메움).
   - 재무정보 → AG Grid(행 = 항목 8개 순서 고정, 열 = 구분 + 기준년월 3열 균등, 정렬 없음, 단위 백만원). 부채비율·영업이익률은 모델 산출(분모 ≤ 0 = '-').
   - 주주현황 → AG Grid 8열 + pinned 합계 행, 지분율 내림차순. 합계 ≠ 100.0% 면 그리드 아래 경고 문구. 
   - 정부지원사업(슬라이드 15) → AG Grid 8열 + pinned 합계 행(지원금액), 사업연도 내림차순. 진행상태 = StatusBadge compact
     (예정 info · 진행 primary · 완료 muted · 취소 danger). 캡션 '단위: 백만원'. 합계는 취소 건 제외('합계(취소 제외)', 라벨이 길어 사업명 칸까지 colSpan).
   - 사업계획서·홍보자료(슬라이드 16) → AG Grid 6열, 수정일자 내림차순. 구분 = TagBadge. 미리보기 = 아이콘 전용 버튼(Eye),
     Download = LinkCell '다운로드' — 둘 다 데모 토스트. 그리드 아래 '총 N건'. 이 탭엔 엑셀 없음(설계서 버튼 = 미리보기·Download·닫기).
   - 정부지원사업·자료 출처는 '농식품 투자정보 플랫폼 API 연계'(설계서) — 백엔드가 없어 데모 데이터.
   - 엑셀 = 푸터 [엑셀](outline·download) · [닫기] — apfs-spec-popup 규약 1(읽기전용 상세 팝업의 내보내기는 탭 머리가 아니라 푸터).
     현재 탭 데이터를 `<탭명>_<기업명>.xlsx` 로 낸다. 낼 게 있는 탭(재무정보·주주현황·정부지원사업)에서만 보이고 나머지 탭에선 숨긴다.
   결정·가정
   - '상장구분'은 설계서 코드 그대로 '상장'/'비상장'(그리드 주식구분과 같은 값).
   - 벤처유형 미인증은 '-'. 재무 음수는 var(--danger-text).
   - 닫기 버튼은 ref.close()(exit 애니메이션), X·Esc·바깥 클릭은 onOpenChange(false) → onClose. */
import '../../aggrid_shared.css';   // pinned 합계행 opacity 0 버그 보정 + 합계행 배경(--muted)·윗선(1px)
import React, { useState, useMemo } from 'react';
import { UI } from '../../components';
import { fmt, apfsTheme, DEFAULT_COL_DEF, numFmt, numStyle } from '../../aggrid_theme';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellStyle, ValueFormatterParams, ICellRendererParams } from 'ag-grid-community';
import { Eye } from 'lucide-react';
import { LinkCell } from '../../link_cell';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { withKvFill } from '../../kv_fill';
import type { AgriEntity, BizMaterial, Financial, GovSupport, GovSupportStatus, Shareholder } from './bizorg_data';
import { debtRatio, opMargin, summarizeHolders, sortGovSupports, govSupportTotal, sortMaterials, GOV_TOTAL_LABEL } from './bizorg_model';

const { Button, SegTabs, StatusBadge, TagBadge } = UI;

/* ── kv 프리미티브(investment_review_detail_modal KvGrid 동형 — 공유 export 아님) ── */
const KV_COLS: React.CSSProperties = { gridTemplateColumns: '150px minmax(0,1fr)' };
const DT_STYLE: React.CSSProperties = { padding: '8px 12px', fontSize: 13 };

/* kv 항목 — num = 수량형 숫자(우측·굵게), v 가 null/'' 이면 muted '-'. 정본 iam/report/investment_review_detail_modal KvGrid 와 같은 dt/dd */
export type KvItem = { l: string; v: React.ReactNode; num?: boolean; full?: boolean };

export function KvGrid({ items }: { items: KvItem[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border overflow-hidden m-0" style={{ borderRadius: 8 }}>
      {withKvFill(items, (o) => {
        const has = o.v != null && o.v !== '';
        return (
          <div key={o.l} className={`grid bg-card ${o.full ? 'sm:col-span-2' : ''}`} style={KV_COLS}>
            <dt className="m-0 flex items-center bg-[color:var(--grid-header)] font-bold text-muted-foreground" style={DT_STYLE}>{o.l}</dt>
            <dd className={`m-0 flex items-center min-w-0 ${o.num ? 'justify-end tabular font-semibold' : ''} ${has ? '' : 'text-caption'}`}
              style={{ padding: '8px 12px', fontSize: 14, overflowWrap: 'anywhere' }}>
              {has ? o.v : '-'}
            </dd>
          </div>
        );
      }, (o) => !!o.full)}
    </dl>
  );
}

/* 탭 머리 줄 — UI.SegTabs 를 감싼 배치 행(새 탭 컴포넌트 아님). 내보내기는 푸터가 소유한다 */
export function TabBar({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <SegTabs value={value} onChange={(v: string) => onChange(v)} options={options.map((o) => ({ value: o, label: o }))} />
    </div>
  );
}


/** 내보내기 파일명에 못 쓰는 문자(\\ / : * ? " < > |)를 '_' 로 */
export const safeFileName = (s: string) => s.replace(/[\\/:*?"<>|]/g, '_');

/** 엑셀 본문 텍스트 빈 값 = '-'(화면과 동일). 합계 행의 빈 칸은 호출부가 '' 로 둔다 */
export const xlText = (v: string | null | undefined) => (v == null || v === '' ? '-' : v);

/** 엑셀 숫자 셀 — aoa 의 숫자는 SheetJS 가 t:'n' 으로 쓴다. 천단위 서식만 붙인다 */
function numberFormat(ws: XLSX.WorkSheet, rowFrom: number, rowTo: number, cols: number[], z = '#,##0') {
  for (let r = rowFrom; r <= rowTo; r++) {
    for (const c of cols) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t === 'n') cell.z = z;
    }
  }
}

/* ── 기본정보 13항목 — 설계서 순서 유지, 기업명·기업명(영문)만 한 줄에 나란히(2단):
   사업자번호(full) / 기업명 | 기업명(영문) / 대표자 | 기업구분 / 설립일자 | 표준산업분류 / 결산월 | 종업원수 /
   벤처유형 | 상장구분 / 주요제품 | 소속 자펀드 ── */
const buildKv = (e: AgriEntity): KvItem[] => [
  { l: '사업자번호', v: <span className="tabular">{e.bizNo}</span>, full: true },
  { l: '기업명', v: e.name },
  { l: '기업명(영문)', v: e.nameEn },
  { l: '대표자', v: e.ceo },
  { l: '기업구분', v: e.corpKind },
  { l: '설립일자', v: <span className="tabular">{e.foundedAt}</span> },
  { l: '표준산업분류', v: e.industry },
  { l: '결산월', v: e.fiscalMonth },
  { l: '종업원수', v: `${String(fmt(e.employees))}명`, num: true },
  { l: '벤처유형', v: e.ventureType },
  { l: '상장구분', v: e.stockKind },
  { l: '주요제품', v: e.mainProduct },
  { l: '소속 자펀드', v: `${e.gp} > ${e.fund}` },
];

/* ── 재무정보 행 — 금액 6행 + 비율 2행. 화면·(향후)엑셀 공용 ── */
type FinRow = { l: string; get: (f: Financial) => number | null; pct?: boolean };
const FIN_ROWS: FinRow[] = [
  { l: '자산총계', get: (f) => f.assets },
  { l: '부채총계', get: (f) => f.liabilities },
  { l: '자본총계', get: (f) => f.equity },
  { l: '매출액', get: (f) => f.revenue },
  { l: '영업이익', get: (f) => f.opIncome },
  { l: '당기순이익', get: (f) => f.netIncome },
  { l: '부채비율(%)', get: debtRatio, pct: true },
  { l: '영업이익률(%)', get: opMargin, pct: true },
];


const HOLDER_HEAD = ['주주명', '관계', '주식종류', '보유주식수', '지분율(%)', '액면가', '취득일', '비고'];
/* ── 주주현황 그리드(조회 전용 — 선택·페이지네이션 없음). 보유주식수·지분율·액면가만 우측, 나머지 좌측.
   합계 = pinned bottom 행(주주명 칸에 '합계'). 합계 지분율이 100.0 이 아니면 그 칸을 warning 텍스트색으로 ── */
type HolderGridRow = Omit<Shareholder, 'parValue'> & { id: string; parValue: number | null; ratioOk?: boolean };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const codeStyle: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };
const isPinned = (p: { node?: { rowPinned?: string | null } | null }) => !!p.node?.rowPinned;
/* 빈 값 '-'(합계행의 빈 칸은 비워 둔다) */
const textOrDash = (p: ValueFormatterParams) => (isPinned(p) ? (p.value ?? '') : p.value == null || p.value === '' ? '-' : String(p.value));
/* display:flex 셀은 기본 말줄임이 안 걸린다 → truncate span */
const textCell = (p: { valueFormatted?: string | null; value: string }) => <span className="min-w-0 truncate">{p.valueFormatted ?? p.value}</span>;
const pctFmt = (p: ValueFormatterParams<HolderGridRow>) => (p.value == null ? '' : (p.value as number).toFixed(1));
const ratioStyle = (p: Parameters<ReturnType<typeof numStyle>>[0] & { data?: HolderGridRow }): CellStyle => ({
  ...numStyle()(p),
  ...(p.node.rowPinned && p.data?.ratioOk === false ? { color: 'var(--warning-text)' } : {}),
});
const HOLDER_COLS: ColDef<HolderGridRow>[] = [
  { field: 'name', headerName: '주주명', width: 180, minWidth: 160, cellStyle: { ...flexCenter, fontWeight: 600 }, cellRenderer: textCell },
  { field: 'relation', headerName: '관계', width: 92, minWidth: 88, cellStyle: flexCenter, valueFormatter: textOrDash },
  { field: 'stockType', headerName: '주식종류', width: 92, minWidth: 92, cellStyle: flexCenter, valueFormatter: textOrDash },
  { field: 'shares', headerName: '보유주식수', width: 106, minWidth: 106, type: 'rightAligned', valueFormatter: numFmt, cellStyle: numStyle() as any },
  { field: 'ratio', headerName: '지분율(%)', width: 100, minWidth: 100, type: 'rightAligned', valueFormatter: pctFmt, cellStyle: ratioStyle as any },
  { field: 'parValue', headerName: '액면가', width: 82, minWidth: 80, type: 'rightAligned', valueFormatter: numFmt, cellStyle: numStyle() as any },
  { field: 'acquiredAt', headerName: '취득일', width: 112, minWidth: 108, cellStyle: codeStyle, valueFormatter: textOrDash },
  { field: 'note', headerName: '비고', flex: 1, width: 140, minWidth: 140, cellStyle: flexCenter, valueFormatter: textOrDash, cellRenderer: textCell },
];

function HolderTable({ entity }: { entity: AgriEntity }) {
  const s = useMemo(() => summarizeHolders(entity.shareholders), [entity]);
  /* 지분율 내림차순(모델). id = 주주명 + 순번(동명 주주 대비) */
  const rows: HolderGridRow[] = useMemo(() => s.rows.map((r, i) => ({ ...r, id: `${r.name}-${String(i)}` })), [s]);
  /* 합계 행 — 참조 안정(useMemo, 인라인 배열 금지) */
  /* 0건이면 합계 행 없음(빈 문구만) */
  const pinned: HolderGridRow[] = useMemo(() => (rows.length === 0 ? [] : [{
    id: 'total', name: '합계', relation: '', stockType: '' as Shareholder['stockType'], shares: s.totalShares, ratio: s.totalRatio,
    parValue: null, acquiredAt: '', note: '', ratioOk: s.ratioOk,
  } as HolderGridRow]), [s, rows]);
  return (
    <div>
      <div className="apfs-grid-min apfs-modal-grid" role="region" aria-label="주주현황 — 지분율 내림차순, 마지막 행은 보유주식수·지분율 합계">
        <AgGridReact<HolderGridRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={HOLDER_COLS}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={FIXED_ORDER_COL_DEF}
          pinnedBottomRowData={pinned}
          overlayNoRowsTemplate={'<span style="padding:24px 0;color:var(--muted-foreground);font-size:13px">등록된 주주가 없습니다.</span>'}
        />
      </div>
      {rows.length > 0 && !s.ratioOk && (
        <p role="status" className="m-0 mt-2 font-semibold" style={{ fontSize: 12.5, color: 'var(--warning-text)' }}>
          {`지분율 합계가 100%가 아닙니다(${s.totalRatio.toFixed(1)}%). 주주명부를 확인하세요.`}
        </p>
      )}
    </div>
  );
}

/* ── 정부지원사업 그리드(슬라이드 15) — 조회 전용(선택·페이지네이션 없음). 지원금액만 우측, 나머지 좌측 ── */
type GovGridRow = Omit<GovSupport, 'status'> & { status: GovSupportStatus | null };
const GOV_TONE: Record<GovSupportStatus, 'info' | 'primary' | 'muted' | 'danger'> = { 예정: 'info', 진행: 'primary', 완료: 'muted', 취소: 'danger' };
function GovStatusCell(p: ICellRendererParams<GovGridRow>) {
  const st = p.data?.status;
  return st ? <StatusBadge tone={GOV_TONE[st]} label={st} size="sm" compact /> : null;
}
const GOV_HEAD = ['사업연도', '사업명', '주관기관', '지원유형', '지원기간', '지원금액', '진행상태', '비고'];
const GOV_COLS: ColDef<GovGridRow>[] = [
  { field: 'year', headerName: '사업연도', colSpan: (p) => (p.node?.rowPinned ? 2 : 1), width: 92, minWidth: 92, cellStyle: (p) => ({ ...codeStyle, fontWeight: p.node.rowPinned ? 700 : 400 }) },
  { field: 'name', headerName: '사업명', flex: 1, width: 120, minWidth: 120, cellStyle: { ...flexCenter, fontWeight: 600 }, valueFormatter: textOrDash, cellRenderer: textCell },
  { field: 'agency', headerName: '주관기관', width: 170, minWidth: 150, cellStyle: flexCenter, valueFormatter: textOrDash, cellRenderer: textCell },
  { field: 'supportType', headerName: '지원유형', width: 92, minWidth: 92, cellStyle: flexCenter, valueFormatter: textOrDash },
  { field: 'period', headerName: '지원기간', width: 150, minWidth: 146, cellStyle: codeStyle, valueFormatter: textOrDash },
  { field: 'amount', headerName: '지원금액', width: 92, minWidth: 92, type: 'rightAligned', valueFormatter: numFmt, cellStyle: numStyle() as any },
  { field: 'status', headerName: '진행상태', width: 92, minWidth: 92, cellStyle: flexCenter, cellRenderer: GovStatusCell },
  { field: 'note', headerName: '비고', width: 80, minWidth: 76, cellStyle: flexCenter, valueFormatter: textOrDash, cellRenderer: textCell },
];
/* 설계서가 정렬을 고정한다(지분율·사업연도·수정일자 내림차순 등) — 헤더 클릭 정렬을 끄면 화면 순서 = 엑셀 순서 */
export const FIXED_ORDER_COL_DEF = { ...DEFAULT_COL_DEF, sortable: false };
const EMPTY_OVERLAY = '<span style="padding:24px 0;color:var(--muted-foreground);font-size:13px">조회 결과가 없습니다.</span>';

function GovSupportTable({ entity }: { entity: AgriEntity }) {
  const rows: GovGridRow[] = useMemo(() => sortGovSupports(entity.govSupports), [entity]);
  /* 합계 행 — 참조 안정(useMemo), 라벨 '합계'는 사업연도 칸 */
  /* 0건이면 합계 행 없음(빈 문구만) */
  const pinned: GovGridRow[] = useMemo(() => (rows.length === 0 ? [] : [{
    id: 'total', year: GOV_TOTAL_LABEL, name: '', agency: '', supportType: '' as GovSupport['supportType'], period: '',
    amount: govSupportTotal(rows), status: null, note: '',
  }]), [rows]);
  return (
    <div>
      <p className="m-0 mb-2 text-caption" style={{ fontSize: 12.5 }}>단위: 백만원</p>
      <div className="apfs-grid-min apfs-modal-grid" role="region" aria-label="정부지원사업 — 사업연도 내림차순, 마지막 행은 지원금액 합계(백만원)">
        <AgGridReact<GovGridRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={GOV_COLS}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={FIXED_ORDER_COL_DEF}
          pinnedBottomRowData={pinned}
          overlayNoRowsTemplate={EMPTY_OVERLAY}
        />
      </div>
    </div>
  );
}

/* ── 사업계획서·홍보자료 그리드(슬라이드 16) — 조회 전용. 미리보기·Download 는 액션 열(정렬 없음) ── */
const MAT_TONE: Record<BizMaterial['kind'], 'primary' | 'info'> = { 사업계획서: 'primary', 홍보자료: 'info' };
const demoPreview = (file: string) => toast(`${file} 미리보기(데모)`);
const demoDownload = (file: string) => toast(`${file} 다운로드(데모)`);
function MatKindCell(p: ICellRendererParams<BizMaterial>) {
  return p.data ? <TagBadge tone={MAT_TONE[p.data.kind]} size="sm">{p.data.kind}</TagBadge> : null;
}
/* 미리보기 — 아이콘 전용 버튼(접근名 = '<파일명> 미리보기'). 삭제전표 첨부 버튼과 같은 외관 */
function PreviewCell(p: ICellRendererParams<BizMaterial>) {
  const f = p.data?.fileName;
  if (!f) return null;
  return (
    <button type="button" aria-label={`${f} 미리보기`} title="미리보기" onClick={() => demoPreview(f)}
      className="inline-flex items-center rounded-card-sm border-0 bg-transparent text-muted-foreground hover:text-foreground cursor-pointer"
      style={{ padding: '4px 4px', fontFamily: 'inherit' }}>
      <Eye size={16} strokeWidth={2} aria-hidden />
    </button>
  );
}
function DownloadCell(p: ICellRendererParams<BizMaterial>) {
  const f = p.data?.fileName;
  return f ? <LinkCell value="다운로드" hint={`${f} 다운로드`} onClick={() => demoDownload(f)} /> : null;
}
const MAT_COLS: ColDef<BizMaterial>[] = [
  { field: 'kind', headerName: '구분', width: 104, minWidth: 100, cellStyle: flexCenter, cellRenderer: MatKindCell },
  { field: 'title', headerName: '자료명', flex: 1, width: 200, minWidth: 200, cellStyle: { ...flexCenter, fontWeight: 600 }, cellRenderer: textCell },
  { field: 'fileName', headerName: '파일명', width: 200, minWidth: 180, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'updatedAt', headerName: '수정일자', width: 112, minWidth: 108, cellStyle: codeStyle },
  { colId: 'preview', headerName: '미리보기', width: 92, minWidth: 92, sortable: false, cellStyle: flexCenter, cellRenderer: PreviewCell },
  { colId: 'download', headerName: 'Download', width: 100, minWidth: 100, sortable: false, cellStyle: flexCenter, cellRenderer: DownloadCell },
];

function MaterialTable({ entity }: { entity: AgriEntity }) {
  const rows = useMemo(() => sortMaterials(entity.materials), [entity]);
  return (
    <div>
      <div className="apfs-grid-min apfs-modal-grid" role="region" aria-label="사업계획서·홍보자료 — 수정일자 내림차순">
        <AgGridReact<BizMaterial>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={MAT_COLS}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={FIXED_ORDER_COL_DEF}
          overlayNoRowsTemplate={EMPTY_OVERLAY}
        />
      </div>
      <p className="m-0 mt-2 text-caption tabular-nums" style={{ fontSize: 12.5 }}>{`총 ${String(rows.length)}건`}</p>
    </div>
  );
}

/* ── 재무정보 그리드 — 행 = 항목 8개(순서 고정), 열 = 구분 + 기준년월 3열(남는 폭 균등 분배 — 이 그리드만 흡수 열 3개).
   정렬 없음(sortable:false). 금액 천단위·비율 소수 1자리·null '-'·음수 danger-text ── */
type FinGridRow = { l: string; pct: boolean; vals: (number | null)[] };
const finValue = (r: FinGridRow | undefined, i: number) => r?.vals[i] ?? null;
const finFmt = (p: ValueFormatterParams<FinGridRow>) => (p.value == null ? '-' : p.data?.pct ? (p.value as number).toFixed(1) : String(fmt(p.value as number)));
const finStyle = (p: { value: unknown }): CellStyle => ({
  textAlign: 'right', fontVariantNumeric: 'tabular-nums',
  color: p.value == null ? 'var(--caption)' : (p.value as number) < 0 ? 'var(--danger-text)' : 'var(--foreground)',
});

function FinanceTable({ entity }: { entity: AgriEntity }) {
  const rows: FinGridRow[] = useMemo(
    () => FIN_ROWS.map((r) => ({ l: r.l, pct: !!r.pct, vals: entity.financials.map((f) => r.get(f)) })),
    [entity]);
  const cols: ColDef<FinGridRow>[] = useMemo(() => [
    { field: 'l', headerName: '구분', width: 150, minWidth: 140, sortable: false, cellStyle: { ...flexCenter, fontWeight: 600 } },
    ...entity.financials.map((f, i): ColDef<FinGridRow> => ({
      colId: f.ym, headerName: f.ym, flex: 1, minWidth: 120, width: 120, sortable: false, type: 'rightAligned',
      valueGetter: (p) => finValue(p.data, i), valueFormatter: finFmt, cellStyle: finStyle as any,
    })),
  ], [entity]);
  return (
    <div>
      <p className="m-0 mb-2 text-caption" style={{ fontSize: 12.5 }}>단위: 백만원</p>
      <div className="apfs-grid-min apfs-modal-grid" role="region" aria-label="재무정보 — 구분별 3개년, 단위 백만원. 비율은 소수 1자리">
        <AgGridReact<FinGridRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={cols}
          getRowId={(p) => p.data.l}
          domLayout="autoHeight"
          defaultColDef={FIXED_ORDER_COL_DEF}
          overlayNoRowsTemplate={EMPTY_OVERLAY}
        />
      </div>
    </div>
  );
}

type Tab = '기본정보' | '재무정보' | '주주현황' | '정부지원사업' | '사업계획서·홍보자료';
const TABS: Tab[] = ['기본정보', '재무정보', '주주현황', '정부지원사업', '사업계획서·홍보자료'];

export function EntityDetailModal({ entity, onClose }: { entity: AgriEntity; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('기본정보');
  const dlgRef = React.useRef<DialogHandle>(null);

  /* 주주현황 Excel — 화면 표 그대로(정렬·합계 행 포함). 수량·액면가·지분율은 숫자 셀 */
  const exportHolders = () => {
    const s = summarizeHolders(entity.shareholders);
    const aoa: (string | number)[][] = [
      HOLDER_HEAD,
      ...s.rows.map((r) => [xlText(r.name), xlText(r.relation), xlText(r.stockType), r.shares, r.ratio, r.parValue, xlText(r.acquiredAt), xlText(r.note)]),
      ...(s.rows.length ? [['합계', '', '', s.totalShares, s.totalRatio, '', '', '']] : []),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    numberFormat(ws, 1, aoa.length - 1, [3, 5]);
    numberFormat(ws, 1, aoa.length - 1, [4], '0.0');
    ws['!cols'] = HOLDER_HEAD.map((_, i) => ({ wch: i === 0 || i === 7 ? 20 : 12 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '주주현황');
    XLSX.writeFile(wb, `주주현황_${safeFileName(entity.name)}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  /* 정부지원사업 Excel — 화면 그리드 그대로(정렬·합계 행 포함). 지원금액은 숫자 셀 */
  const exportGov = () => {
    const rows = sortGovSupports(entity.govSupports);
    const aoa: (string | number)[][] = [
      GOV_HEAD,
      ...rows.map((r) => [xlText(r.year), xlText(r.name), xlText(r.agency), xlText(r.supportType), xlText(r.period), r.amount, xlText(r.status), xlText(r.note)]),
      ...(rows.length ? [[GOV_TOTAL_LABEL, '', '', '', '', govSupportTotal(rows), '', '']] : []),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    numberFormat(ws, 1, aoa.length - 1, [5]);
    ws['!cols'] = GOV_HEAD.map((_, i) => ({ wch: i === 1 ? 30 : i === 2 || i === 7 ? 22 : 14 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '정부지원사업');
    XLSX.writeFile(wb, `정부지원사업_${safeFileName(entity.name)}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };
  /* 재무정보 Excel — 화면 그리드 그대로(항목 8행 × 기준년월). 값은 숫자 셀(금액 천단위 · 비율 소수 1자리), N/A 는 '-' */
  const exportFinance = () => {
    const head = ['구분', ...entity.financials.map((f) => f.ym)];
    const aoa: (string | number)[][] = [head, ...FIN_ROWS.map((r) => [r.l, ...entity.financials.map((f) => r.get(f) ?? '-')])];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    FIN_ROWS.forEach((r, ri) => numberFormat(ws, ri + 1, ri + 1, entity.financials.map((_, ci) => ci + 1), r.pct ? '0.0' : '#,##0'));
    ws['!cols'] = head.map((_, i) => ({ wch: i === 0 ? 16 : 14 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '재무정보');
    XLSX.writeFile(wb, `재무정보_${safeFileName(entity.name)}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };
  /* E04 푸터 [엑셀] = 현재 탭 내보내기. 기본정보·사업계획서·홍보자료(설계서에 내보내기 없음)와 0건 탭은 null → 버튼 숨김 */
  const tabExport = tab === '재무정보' && entity.financials.length ? exportFinance
    : tab === '주주현황' && entity.shareholders.length ? exportHolders
      : tab === '정부지원사업' && entity.govSupports.length ? exportGov
        : null;   // 0건 탭도 숨김

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[1020px] h-[720px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">경영체 상세보기</DialogTitle>
            <DialogDescription className="m-0 text-caption truncate min-w-0">{entity.name}</DialogDescription>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto p-[46px]">
          <TabBar value={tab} onChange={(v) => setTab(v as Tab)} options={TABS} />
          {tab === '기본정보' && <KvGrid items={buildKv(entity)} />}
          {tab === '재무정보' && <FinanceTable entity={entity} />}
          {tab === '주주현황' && <HolderTable entity={entity} />}
          {tab === '정부지원사업' && <GovSupportTable entity={entity} />}
          {tab === '사업계획서·홍보자료' && <MaterialTable entity={entity} />}
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          {/* 팝업 푸터 = [엑셀] · [닫기](apfs-spec-popup 푸터 규약) — 엑셀은 낼 게 있는 탭에서만 */}
          <div className="flex gap-2">
            {tabExport && <Button variant="outline" size="sm" leadingIcon="download" onClick={tabExport}>엑셀</Button>}
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
