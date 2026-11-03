import { describe, it, expect } from 'vitest';
import { REPORT_GUIDE_TABLE, GUIDE_HISTORY } from '../../report_guide_data';
import {
  seedForms, renumber, addForm, editForm, addVersion, removeForm,
  hasHistory, histCount, histLabel, currentVersionSummary, PREV_VERSION_LABEL,
} from './sfund_report_form_model';
import type { SfundReportForm } from './sfund_report_form_model';

const NOW = '2026-11-02 10:00:00';
const byTitle = (rows: readonly SfundReportForm[], t: string) => rows.find((r) => r.title === t)!;
const HALF = '농식품투자조합 반기 영업보고서';
const ESG = '농림수산식품모태펀드 ESG 투자 가이드라인';

describe('자펀드보고양식관리 시드 — SRP-007 공유 데이터와 같은 값', () => {
  it('14건 · 제목·설명·파일·등록일시가 공유 행 그대로(설명 null → 빈 문자열)', () => {
    const rows = seedForms();
    expect(rows).toHaveLength(14);
    rows.forEach((r, i) => {
      const s = REPORT_GUIDE_TABLE.rows[i];
      expect(r.id).toBe(s.id);
      expect([r.title, r.desc, r.file, r.reg]).toEqual([s.title, s.desc ?? '', s.file, s.reg]);
    });
    expect(rows.some((r) => r.desc === 'null')).toBe(false);
  });

  it('버전 이력 = 공유 GUIDE_HISTORY 그대로(첫 항목 = 현재 버전)', () => {
    const rows = seedForms();
    for (const r of rows) expect(r.versions).toEqual(GUIDE_HISTORY[r.id] ?? []);
    expect(rows.filter(hasHistory)).toHaveLength(3);
  });

  it('등록일시 최신순 · No 는 1부터', () => {
    const rows = seedForms();
    const regs = rows.map((r) => r.reg);
    expect(regs).toEqual([...regs].sort().reverse());
    expect(rows.map((r) => r.no)).toEqual(rows.map((_, i) => i + 1));
  });
});

describe('최신 배지 · 이력 N건', () => {
  it('배지 조건 = 버전 이력이 있을 때만', () => {
    const rows = seedForms();
    expect(hasHistory(byTitle(rows, HALF))).toBe(true);
    expect(hasHistory(byTitle(rows, ESG))).toBe(false);
  });

  it('이력 N건 = 버전 수(현재 포함 — SRP-007 과 같은 숫자), 없으면 이력없음', () => {
    const rows = seedForms();
    expect(histCount(byTitle(rows, HALF))).toBe(2);
    expect(histLabel(byTitle(rows, HALF))).toBe('이력 2건');
    expect(histCount(byTitle(rows, ESG))).toBe(0);
    expect(histLabel(byTitle(rows, ESG))).toBe('이력없음');
    for (const r of REPORT_GUIDE_TABLE.rows) expect(histLabel(byTitle(rows, String(r.title)))).toBe(r.hist);
  });

  it('현재 버전 요약 = 버전명 · 등록일시 · 파일(버전명 없으면 안내 문구)', () => {
    const rows = seedForms();
    expect(currentVersionSummary(byTitle(rows, HALF))).toBe('2024년 버전 · 2024-03-29 13:22:38 · 농식품투자조합_반기_영업보고서.hwp');
    expect(currentVersionSummary(byTitle(rows, ESG))).toBe('(버전명 없음) · 2024-12-27 17:32:04 · 농림수산식품모태펀드_ESG_투자_가이드라인.pdf');
  });
});

describe('새 버전 등록', () => {
  it('이력이 있는 양식 — 새 버전이 이력 맨 앞에 쌓이고 현재 버전(설명·파일·등록일시)이 바뀐다', () => {
    const before = seedForms();
    const cur = byTitle(before, HALF);
    const after = addVersion(before, cur.id, { ver: '2026년 버전', desc: '2026 개정', file: '반기_2026.hwp' }, NOW);
    const r = byTitle(after, HALF);
    expect(r.versions[0]).toEqual({ v: '2026년 버전', desc: '2026 개정', file: '반기_2026.hwp', reg: NOW });
    expect(r.versions.slice(1)).toEqual(cur.versions);   // 기존 버전은 그대로 이력으로 보관
    expect([r.desc, r.file, r.reg]).toEqual(['2026 개정', '반기_2026.hwp', NOW]);
    expect(histLabel(r)).toBe('이력 3건');
  });

  it('이력이 없는 양식 — 기존 현재 상태를 "이전 버전" 으로 보관하고 배지가 생긴다', () => {
    const before = seedForms();
    const cur = byTitle(before, ESG);
    const r = byTitle(addVersion(before, cur.id, { ver: '2026년 버전', desc: '', file: 'esg_2026.pdf' }, NOW), ESG);
    expect(r.versions).toEqual([
      { v: '2026년 버전', desc: '', file: 'esg_2026.pdf', reg: NOW },
      { v: PREV_VERSION_LABEL, desc: cur.desc, file: cur.file, reg: cur.reg },
    ]);
    expect(hasHistory(r)).toBe(true);
    expect(histLabel(r)).toBe('이력 2건');
  });

  it('새 등록일시로 맨 위로 올라가고 No 를 다시 매긴다 · 입력 배열은 바뀌지 않는다', () => {
    const before = seedForms();
    const snapshot = JSON.stringify(before);
    const cur = byTitle(before, ESG);
    const after = addVersion(before, cur.id, { ver: '2026년 버전', desc: '', file: 'esg_2026.pdf' }, NOW);
    expect(after[0].id).toBe(cur.id);
    expect(after.map((r) => r.no)).toEqual(after.map((_, i) => i + 1));
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('입력값 앞뒤 공백 제거 · 없는 id 면 그대로', () => {
    const before = seedForms();
    const r = byTitle(addVersion(before, byTitle(before, ESG).id, { ver: ' 2026년 버전 ', desc: ' 설명 ', file: ' a.pdf ' }, NOW), ESG);
    expect([r.versions[0].v, r.desc, r.file]).toEqual(['2026년 버전', '설명', 'a.pdf']);
    expect(addVersion(before, 'nope', { ver: 'v', desc: '', file: 'f' }, NOW)).toEqual(before);
  });
});

describe('등록 · 수정 · 삭제', () => {
  it('등록 — 등록일시 = now, 이력 없음, 맨 위 No 1', () => {
    const after = addForm(seedForms(), { title: ' 신규 양식 ', desc: '', file: 'new.hwp' }, { id: 'new-1', now: NOW });
    expect(after).toHaveLength(15);
    expect(after[0]).toEqual({ id: 'new-1', no: 1, title: '신규 양식', desc: '', file: 'new.hwp', reg: NOW, versions: [] });
    expect(after.map((r) => r.no)).toEqual(after.map((_, i) => i + 1));
  });

  it('수정 — 제목·설명·파일만 바뀌고 이력을 추가하지 않는다 · 등록일시는 그대로', () => {
    const before = seedForms();
    const cur = byTitle(before, HALF);
    const after = editForm(before, cur.id, { title: '반기 영업보고서(정정)', desc: '오탈자 정정', file: cur.file });
    const r = after.find((x) => x.id === cur.id)!;
    expect([r.title, r.desc]).toEqual(['반기 영업보고서(정정)', '오탈자 정정']);
    expect(r.versions).toHaveLength(cur.versions.length);
    expect(r.reg).toBe(cur.reg);
    expect(after.map((x) => x.id)).toEqual(before.map((x) => x.id));   // 순서 불변
  });

  it('수정 — 이력이 있으면 현재 버전(versions[0]) 설명·새 첨부를 행 값과 맞춘다 · 이력 길이·과거 버전 불변', () => {
    const before = seedForms();
    const cur = byTitle(before, HALF);
    const r = editForm(before, cur.id, { title: cur.title, desc: '오탈자 정정', file: '반기_정정.hwp' }).find((x) => x.id === cur.id)!;
    expect(r.versions).toHaveLength(cur.versions.length);
    expect(r.versions[0]).toEqual({ ...cur.versions[0], desc: '오탈자 정정', file: '반기_정정.hwp' });
    expect(r.versions.slice(1)).toEqual(cur.versions.slice(1));
    expect(histLabel(r)).toBe(histLabel(cur));
  });

  it('수정 — 첨부를 그대로 두면 현재 버전 파일은 유지(설명만 맞춘다) · 첨부를 지워도 유지', () => {
    const before = seedForms();
    const cur = byTitle(before, HALF);
    const same = editForm(before, cur.id, { title: cur.title, desc: '설명만', file: cur.file }).find((x) => x.id === cur.id)!;
    expect(same.versions[0]).toEqual({ ...cur.versions[0], desc: '설명만' });
    const cleared = editForm(before, cur.id, { title: cur.title, desc: cur.desc, file: '' }).find((x) => x.id === cur.id)!;
    expect(cleared.versions[0].file).toBe(cur.versions[0].file);
  });

  it('수정 — 이력이 없는 양식은 이력을 만들지 않는다', () => {
    const before = seedForms();
    const cur = byTitle(before, ESG);
    const r = editForm(before, cur.id, { title: cur.title, desc: '정정', file: 'esg.pdf' }).find((x) => x.id === cur.id)!;
    expect(r.versions).toEqual([]);
    expect(hasHistory(r)).toBe(false);
  });

  it('삭제 — 그 행만 빠지고 No 를 다시 매긴다', () => {
    const before = seedForms();
    const after = removeForm(before, before[0].id);
    expect(after).toHaveLength(13);
    expect(after.some((r) => r.id === before[0].id)).toBe(false);
    expect(after.map((r) => r.no)).toEqual(after.map((_, i) => i + 1));
  });

  it('renumber — 등록일시 최신순(같으면 기존 순서 유지)', () => {
    const rows = [
      { id: 'a', no: 9, title: 'a', desc: '', file: '', reg: '2020-01-01 00:00:00', versions: [] },
      { id: 'b', no: 9, title: 'b', desc: '', file: '', reg: '2026-01-01 00:00:00', versions: [] },
      { id: 'c', no: 9, title: 'c', desc: '', file: '', reg: '2026-01-01 00:00:00', versions: [] },
    ];
    expect(renumber(rows).map((r) => `${r.id}${String(r.no)}`)).toEqual(['b1', 'c2', 'a3']);
  });
});
