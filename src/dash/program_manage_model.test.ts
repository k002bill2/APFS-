import { describe, it, expect } from 'vitest';
import { buildMenuRows, programCatalog } from './admin_menu_tree';
import { demoPrograms, filterPrograms, gubunOptions, deleteBlocker, programPidTaken, normalizeHelpDoc, helpDocError, emptyHelpDoc } from './program_manage_model';

const menu = buildMenuRows();
const rows = demoPrograms(menu);

describe('demoPrograms — LNB 정본 리프 + 임시 1건', () => {
  it('연결 프로그램 수 = 프로그램 카탈로그 수, 미연결 임시 1건', () => {
    expect(rows.filter((r) => r.linked).length).toBe(programCatalog(menu).length);
    expect(rows.filter((r) => !r.linked).length).toBe(1);
  });
  it('도움말 데모 4건은 개요·첨부가 채워져 있다', () => {
    const h = rows.filter((r) => r.help);
    expect(h.length).toBe(4);
    expect(h.every((r) => r.helpDoc.overview && r.helpDoc.files.length === 1 && r.helpAt)).toBe(true);
  });
  it('구분 = 연결 메뉴의 대분류', () => {
    const p = rows.find((r) => r.pname === '프로그램관리')!;
    expect(p.gubun).toBe('관리자'); expect(p.menuPath).toBe('관리자 › 시스템 관리 › 프로그램관리');
  });
});

describe('filterPrograms / gubunOptions', () => {
  it('도움말 있음/없음·사용여부·구분·검색기준', () => {
    expect(filterPrograms(rows, { help: 'y' }).length).toBe(4);
    expect(filterPrograms(rows, { use: '부' }).map((r) => r.pid)).toEqual(['CO9001']);
    expect(filterPrograms(rows, { gubun: '관리자' }).every((r) => r.gubun === '관리자')).toBe(true);
    expect(filterPrograms(rows, { field: 'pname', kw: '임시' }).length).toBe(1);
    expect(filterPrograms(rows, { field: 'pid', kw: 'co9001' }).length).toBe(1);
  });
  it('구분 옵션은 등장 순서·유일', () => { const g = gubunOptions(rows); expect(g[0]).toBe('대시보드'); expect(new Set(g).size).toBe(g.length); });
});

describe('삭제 게이트 / 프로그램ID 중복', () => {
  it('메뉴 연결은 삭제 불가, 임시는 가능', () => {
    expect(deleteBlocker(rows[0])).toBeTruthy();
    expect(deleteBlocker(rows.find((r) => !r.linked)!)).toBeNull();
  });
  it('프로그램ID 중복은 대소문자 무시·자기 자신 제외', () => {
    expect(programPidTaken(rows, 'co9001')).toBe(true);
    expect(programPidTaken(rows, 'CO9001', 'tmp-1')).toBe(false);
    expect(programPidTaken(rows, 'ZZ0000')).toBe(false);
  });
});

describe('normalizeHelpDoc / helpDocError', () => {
  it('빈 항목 제거 + 공백 정리, 입력 불변', () => {
    const d = { ...emptyHelpDoc(), overview: ' 개요 ', images: [{ name: '' }, { name: ' a.png ' }], items: [{ label: '', desc: '' }, { label: 'x', desc: '' }], steps: ['', ' 1단계 '], faqs: [{ q: '', a: '' }], notes: '', files: [' m.pdf', ''] };
    const n = normalizeHelpDoc(d);
    expect(n).toEqual({ overview: '개요', images: [{ name: 'a.png' }], items: [{ label: 'x', desc: '' }], steps: ['1단계'], faqs: [], notes: '', files: ['m.pdf'] });
    expect(d.images.length).toBe(2);
  });
  it('제공 ON + 개요 없음 → overview 오류, OFF 면 통과', () => {
    expect(helpDocError(true, emptyHelpDoc())).toBe('overview');
    expect(helpDocError(false, emptyHelpDoc())).toBeNull();
    expect(helpDocError(true, { ...emptyHelpDoc(), overview: 'x' })).toBeNull();
  });
});
