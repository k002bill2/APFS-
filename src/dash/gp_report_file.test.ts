import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GP_REPORT_FILE_TABLE, GP_REPORT_FILE_LABEL, GP_REPORT_FILE_SOURCE, RPT_OPTIONS } from './gp_report_file';

const mockup = readFileSync(GP_REPORT_FILE_SOURCE.normalize('NFC'), 'utf8');
const src = readFileSync('src/dash/gp_report_file.tsx', 'utf8');

describe('보고 파일 조회 (S5_116)', () => {
  it('라벨 = 메뉴 리프', () => {
    expect(GP_REPORT_FILE_LABEL).toBe('보고 파일 조회');
    expect(readFileSync('src/dash/data.ts', 'utf8')).toContain('{ label:"보고 파일 조회" }');
  });

  it('컬럼 = 원문 thead 순서', () => {
    const heads = [...mockup.matchAll(/<th scope="col"[^>]*>([^<]+)<\/th>/g)].map((m) => m[1]);
    expect(GP_REPORT_FILE_TABLE.cols.map((c) => c.label)).toEqual(heads);
  });

  it('행 = 원문 DATA 리터럴', () => {
    expect(GP_REPORT_FILE_TABLE.rows).toHaveLength(2);
    for (const r of GP_REPORT_FILE_TABLE.rows) {
      expect(mockup).toContain(`rpt:'${String(r.rpt)}'`);
      expect(mockup).toContain(`file:'${String(r.file)}'`);
      expect(mockup).toContain(`mdate:'${String(r.mdate)}'`);
      expect(mockup).toContain(`valid:'${String(r.valid)}'`);
    }
  });

  it('보고구분 옵션 = 원문 select 옵션', () => {
    const opts = [...mockup.matchAll(/<select id="f-rpt">(.*?)<\/select>/g)][0][1];
    expect([...opts.matchAll(/<option>([^<]+)<\/option>/g)].map((m) => m[1])).toEqual([...RPT_OPTIONS]);
  });

  it('업로드 = 툴바 버튼 + 공용 UploadModal(원문 토스트) · 조회 전용이라 행 선택 없음', () => {
    expect(src).toContain('UploadModal');
    expect(src).toContain("emptyMsg=\"첨부파일을 먼저 선택하세요\"");
    expect(src).not.toMatch(/selectable|rowSelection/);
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
});
