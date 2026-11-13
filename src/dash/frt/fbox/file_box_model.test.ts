import { describe, expect, it } from 'vitest';
import { demoMyFiles, demoSubFiles } from './file_box_data';
import type { SubFile } from './file_box_data';
import {
  fmtSize, filterMy, filterSub, filterSubKeyword, optionsOf, addMyFiles, deleteMyFiles,
  supplementSub, validateSupplement, targetLabel, SUPPLEMENT_MODES, downloadPlan,
} from './file_box_model';

describe('fmtSize — 바이트 → 화면 표기', () => {
  it('1MB 미만은 KB 정수', () => expect(fmtSize(320 * 1024)).toBe('320KB'));
  it('1MB 이상은 MB 소수 1자리', () => expect(fmtSize(Math.round(1.8 * 1024 * 1024))).toBe('1.8MB'));
  it('1KB 미만도 최소 1KB', () => expect(fmtSize(10)).toBe('1KB'));
  it('크기를 모르면 -', () => expect(fmtSize(null)).toBe('-'));
});

describe('filterMy — 파일명 부분일치', () => {
  const rows = demoMyFiles();
  it('빈 조건 = 전체', () => expect(filterMy(rows, { name: '' })).toHaveLength(rows.length));
  it('부분일치·앞뒤 공백 무시', () => expect(filterMy(rows, { name: ' 의사록 ' }).map((r) => r.id)).toEqual(['my-2']));
  it('영문 확장자는 대소문자 무시', () => expect(filterMy(rows, { name: 'PDF' }).map((r) => r.id)).toEqual(['my-1']));
});

describe('filterSub — 운용사·조합명·투자기업(정확일치) + 파일명(부분일치), AND', () => {
  const rows = demoSubFiles();
  const none = { org: '', fund: '', co: '', name: '' };
  it('빈 조건 = 전체', () => expect(filterSub(rows, none)).toHaveLength(rows.length));
  it('운용사', () => expect(filterSub(rows, { ...none, org: '그린루트벤처스' }).every((r) => r.org === '그린루트벤처스')).toBe(true));
  it('운용사 + 파일명', () => expect(filterSub(rows, { ...none, org: '그린루트벤처스', name: '정기' }).map((r) => r.id)).toEqual(['sub-1']));
  it('투자기업 — 다른 조건과 AND', () => expect(filterSub(rows, { ...none, co: '(주)팜프레시', fund: '그린루트성장투자조합2호' })).toEqual([]));
});

describe('filterSubKeyword — 팝업 검색 한 칸(운용사·조합명·투자기업·파일명 중 하나라도)', () => {
  const rows = demoSubFiles();
  it('조합명으로', () => expect(filterSubKeyword(rows, '한투').map((r) => r.id)).toEqual(['sub-3', 'sub-6']));
  it('투자기업으로', () => expect(filterSubKeyword(rows, '선양').map((r) => r.id)).toEqual(['sub-4']));
  it('빈 검색어 = 전체', () => expect(filterSubKeyword(rows, '  ')).toHaveLength(rows.length));
});

describe('optionsOf — 상세필터 선택지(중복 제거·가나다순)', () => {
  it('운용사', () => expect(optionsOf(demoSubFiles(), 'org')).toEqual(['그린루트벤처스', '인라이트벤처스(주)', '한국투자파트너스']));
});

describe('addMyFiles / deleteMyFiles — 원본 불변', () => {
  it('새 파일이 맨 앞에 붙고(목업 unshift) 크기는 모름', () => {
    const rows = demoMyFiles();
    let n = 0;
    const next = addMyFiles(rows, ['a.pdf', 'b.hwp'], '2026-11-13', () => 'new-' + String(++n));
    expect(next.slice(0, 2)).toEqual([
      { id: 'new-1', name: 'a.pdf', size: null, date: '2026-11-13' },
      { id: 'new-2', name: 'b.hwp', size: null, date: '2026-11-13' },
    ]);
    expect(next).toHaveLength(rows.length + 2);
    expect(rows).toHaveLength(5);
  });
  it('지정한 id 만 지운다', () => {
    const rows = demoMyFiles();
    expect(deleteMyFiles(rows, ['my-1', 'my-3']).map((r) => r.id)).toEqual(['my-2', 'my-4', 'my-5']);
    expect(rows).toHaveLength(5);
  });
});

describe('supplementSub — 운용사 제출 파일 추가·교체', () => {
  const rows = demoSubFiles();
  const target = rows.find((r) => r.id === 'sub-3') as SubFile;
  it('추가 = 대상 바로 아래에 같은 운용사·조합·기업으로 새 행', () => {
    const next = supplementSub(rows, { id: 'sub-3', mode: 'add', fileName: '보완.pdf', today: '2026-11-13', newId: 'sub-new' });
    const i = next.findIndex((r) => r.id === 'sub-3');
    expect(next[i + 1]).toEqual({ id: 'sub-new', org: target.org, fund: target.fund, co: target.co, name: '보완.pdf', size: null, date: '2026-11-13' });
    expect(next).toHaveLength(rows.length + 1);
  });
  it('교체 = 대상 행의 파일명·크기·등록일만 바뀐다', () => {
    const next = supplementSub(rows, { id: 'sub-3', mode: 'replace', fileName: '수시보고_첨부_v2.pdf', today: '2026-11-13', newId: 'x' });
    expect(next).toHaveLength(rows.length);
    expect(next.find((r) => r.id === 'sub-3')).toEqual({ ...target, name: '수시보고_첨부_v2.pdf', size: null, date: '2026-11-13' });
    expect(rows.find((r) => r.id === 'sub-3')).toEqual(target);
  });
  it('없는 대상이면 그대로', () => expect(supplementSub(rows, { id: 'none', mode: 'add', fileName: 'a', today: 'd', newId: 'n' })).toEqual(rows));
});

describe('validateSupplement / targetLabel / 구분 라벨', () => {
  it('파일이 없으면 막는다(목업 alert 문구)', () => expect(validateSupplement({ fileName: ' ' })).toEqual({ key: 'file', msg: '파일을 선택하세요.' }));
  it('파일이 있으면 통과(사유는 선택)', () => expect(validateSupplement({ fileName: 'a.pdf' })).toBeNull());
  it('대상 = 운용사 · 조합명 · 투자기업 · 파일명', () =>
    expect(targetLabel(demoSubFiles()[0])).toBe('그린루트벤처스 · 그린루트성장투자조합2호 · (주)체리부로 · 정기보고서_202605.xlsx'));
  it('구분 2가지 = 목업 select 문구, 첫째가 기본(추가)', () => expect(SUPPLEMENT_MODES.map((m) => m.code)).toEqual(['add', 'replace']));
});

describe('downloadPlan — 1개 = 목업 파일 하나, 여러 개 = ZIP(목업 텍스트)', () => {
  const my = demoMyFiles();
  const sub = demoSubFiles();
  it('1개면 원본명.txt 를 바로 내려받는다(가짜 PDF 를 만들지 않는다)', () => {
    const p = downloadPlan([my[0]], '20261113');
    expect(p.kind).toBe('file');
    expect(p.fileName).toBe('2026년_2분기_투자심의자료.pdf.txt');
    expect(p.entries[0].text).toContain('원본 파일명: 2026년_2분기_투자심의자료.pdf');
    expect(p.entries[0].text).toContain('크기: 1.8MB · 등록일: 2026-06-08');
  });
  it('내 파일함 여러 개 = 평평한 ZIP', () => {
    const p = downloadPlan([my[0], my[1]], '20261113');
    expect(p).toMatchObject({ kind: 'zip', fileName: '파일BOX_내 파일함_20261113.zip' });
    expect(p.entries.map((e) => e.path)).toEqual(['2026년_2분기_투자심의자료.pdf.txt', '자펀드_결성총회_의사록.hwp.txt']);
  });
  it('운용사 제출 = 운용사/조합명/투자기업 폴더 + 대상 정보', () => {
    const p = downloadPlan([sub[0], sub[2]], '20261113');
    expect(p.fileName).toBe('파일BOX_운용사 제출 파일_20261113.zip');
    expect(p.entries[0].path).toBe('그린루트벤처스/그린루트성장투자조합2호/(주)체리부로/정기보고서_202605.xlsx.txt');
    expect(p.entries[1].text).toContain('운용사: 한국투자파트너스 · 조합명: 한투스마트농업투자조합 · 투자기업: (주)팜프레시');
  });
  it('같은 경로가 겹치면 (2)·(3) 을 붙인다', () => {
    const dup = [my[0], { ...my[0], id: 'x' }, { ...my[0], id: 'y' }];
    expect(downloadPlan(dup, 'd').entries.map((e) => e.path)).toEqual([
      '2026년_2분기_투자심의자료.pdf.txt', '2026년_2분기_투자심의자료.pdf (2).txt', '2026년_2분기_투자심의자료.pdf (3).txt',
    ]);
  });
  it('붙인 번호가 다른 원래 이름과 겹치지 않는다(Codex P2)', () => {
    const rows = ['r', 'r', 'r (2)'].map((name, i) => ({ ...my[0], id: String(i), name }));
    const paths = downloadPlan(rows, 'd').entries.map((e) => e.path);
    expect(new Set(paths).size).toBe(3);
    expect(paths).toEqual(['r.txt', 'r (2).txt', 'r (2) (2).txt']);
  });
  it('경로 금지 문자는 _ 로', () => {
    expect(downloadPlan([{ ...sub[0], org: 'A/B', name: 'x:y.pdf' }, sub[1]], 'd').entries[0].path).toBe('A_B/그린루트성장투자조합2호/(주)체리부로/x_y.pdf.txt');
  });
});
