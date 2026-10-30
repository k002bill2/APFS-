import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { readSrc } from '../../test_src';
import { REPORT_GUIDE_TABLE, REPORT_GUIDE_LABEL, REPORT_GUIDE_ROUTE, REPORT_GUIDE_SOURCE, GUIDE_HISTORY } from './report_guide_data';

const mockup = readFileSync(REPORT_GUIDE_SOURCE.normalize('NFC'), 'utf8');
const page = readSrc('report_guide.tsx');
const modal = readSrc('report_guide_history_modal.tsx');
const rows = REPORT_GUIDE_TABLE.rows;

describe('보고양식·가이드 조회 (SRP-007)', () => {
  it('라벨·route = 메뉴 리프', () => {
    expect(REPORT_GUIDE_LABEL).toBe('보고양식·가이드 조회');
    expect(REPORT_GUIDE_ROUTE).toBe('report-guide');
    expect(readSrc('data.ts')).toContain('{ label:"보고양식·가이드 조회", path:"report-guide" }');
  });

  it('app 라우트가 전용 화면으로 연결된다(GenericListPage 폴백 아님)', () => {
    expect(readSrc('app.tsx')).toContain('route === "report-guide") page = <ReportGuide');
  });

  it('컬럼 = 원문 목록 thead 순서', () => {
    const thead = mockup.slice(mockup.indexOf('<table class="grid-form">'), mockup.indexOf('</thead>'));
    const heads = [...thead.matchAll(/<th[^>]*>([^<]+)<\/th>/g)].map((m) => m[1]);
    expect(REPORT_GUIDE_TABLE.cols.map((c) => c.label)).toEqual(heads);
  });

  it('행 = 원문 DATA 리터럴 14건(제목·설명·파일·등록일시)', () => {
    expect(rows).toHaveLength(14);
    for (const r of rows) {
      expect(mockup).toContain(`title:'${String(r.title)}',desc:'${r.desc == null ? '' : String(r.desc)}',file:'${String(r.file)}',reg:'${String(r.reg)}'`);
    }
  });

  it('등록일시 최신순 · No 는 정렬 뒤 1부터(원문 DATA.sort)', () => {
    const regs = rows.map((r) => String(r.reg));
    expect(regs).toEqual([...regs].sort().reverse());
    expect(rows.map((r) => r.no)).toEqual(rows.map((_, i) => i + 1));
  });

  it('버전 이력 = 원문 history 3건 · 이력 칸 문구', () => {
    const withHist = rows.filter((r) => GUIDE_HISTORY[r.id]);
    expect(withHist.map((r) => r.title).sort()).toEqual(['농식품투자조합 반기 영업보고서', '농식품투자조합 월간보고 양식_수정', '농식품투자조합 회계처리 가이드라인'].sort());
    for (const r of rows) {
      const h = GUIDE_HISTORY[r.id];
      expect(r.hist).toBe(h ? `이력 ${String(h.length)}건` : '이력없음');
      for (const v of h ?? []) expect(mockup).toContain(`{v:'${v.v}',desc:'${v.desc}',file:'${v.file}',reg:'${v.reg}'}`);
    }
  });

  it('Download 칸은 조작 UI 라 엑셀 제외 · 조회 전용(행 선택·업로드 없음)', () => {
    expect(REPORT_GUIDE_TABLE.cols.find((c) => c.label === 'Download')?.noExport).toBe(true);
    expect(page).not.toMatch(/selectable|rowSelection|UploadModal/);
  });

  it('행 버튼은 접근名을 행마다 구분한다', () => {
    expect(page).toContain('<span className="sr-only"> — {String(r.title)}</span>');
    expect(page).toContain('aria-haspopup="dialog"');
    expect(page).toContain('onCellAction={onCellAction}');   // 셀(gridcell) Enter 동치
    expect(page).toContain('label={<>N<span className="sr-only"> 최신 버전</span></>}');   // 'N' 배지(2026-10-30 사용자 지시)
    expect(page).not.toContain('label="최신"');
    expect(modal).toContain('label={`${h.v} 다운로드`}');
  });

  it('색은 토큰만(hex 리터럴 없음)', () => {
    for (const s of [page, modal, readSrc('report_guide_data.ts')]) expect(s).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
});
