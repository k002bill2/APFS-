/* 결산양식 관리(ACC-002) 순수 모델 — 행추가·삽입·삭제(복구)·이동·상태 추적·검증·저장 반영. */
import { describe, it, expect } from 'vitest';
import {
  seedRows, reloadRows, appendBlank, insertAbove, patchRow, toggleDelete, moveRow, canMove,
  changedCount, validateRows, commitRows, passesFilter,
} from './closing_form_data';
import type { ClosingRow } from './closing_form_data';
import { ACCOUNTS, searchAccounts } from '../account_data';

const base = () => seedRows('재무상태표').slice(0, 4);
const ids = (rs: readonly ClosingRow[]) => rs.map((r) => r.id);

describe('seed / reload', () => {
  it('양식구분별 세트가 다르고 계정코드는 계정과목에 있다', () => {
    const bs = seedRows('재무상태표'), is = seedRows('손익계산서');
    expect(bs.length).toBeGreaterThanOrEqual(10);
    expect(is.length).toBeGreaterThanOrEqual(8);
    for (const r of [...bs, ...is]) {
      expect(ACCOUNTS.some((a) => a.code === r.acctCode && a.name === r.acctName)).toBe(true);
      expect(r.status).toBe('');
    }
  });
  it('reload 는 새 id 를 주고 상태·오류를 지운다', () => {
    const rs = base();
    const re = reloadRows([{ ...rs[0], status: 'U', prev: 'U', err: ['level'] }]);
    expect(re[0].id).not.toBe(rs[0].id);
    expect(re[0].status).toBe('');
    expect(re[0].prev).toBeUndefined();
    expect(re[0].err).toBeUndefined();
  });
});

describe('행추가·행삽입', () => {
  it('행추가 = 하단 빈 I 행', () => {
    const rs = base();
    const { rows, id } = appendBlank(rs);
    expect(rows).toHaveLength(5);
    expect(rows[4].id).toBe(id);
    expect(rows[4].status).toBe('I');
    expect(rs).toHaveLength(4);   // 원본 불변
  });
  it('행삽입 = 선택 행 바로 위', () => {
    const rs = base();
    const { rows, id } = insertAbove(rs, rs[2].id);
    expect(rows[2].id).toBe(id);
    expect(rows[3].id).toBe(rs[2].id);
    expect(rows[2].status).toBe('I');
  });
  it('대상이 없으면 그대로', () => {
    const rs = base();
    const { rows, id } = insertAbove(rs, 'nope');
    expect(id).toBeNull();
    expect(ids(rows)).toEqual(ids(rs));
  });
});

describe('편집 상태 추적', () => {
  it('기존 행 편집 = U, I 행 편집 = I 유지', () => {
    const { rows } = appendBlank(base());
    const a = patchRow(rows, rows[0].id, { name: 'x' });
    expect(a[0].status).toBe('U');
    const b = patchRow(rows, rows[4].id, { name: 'y' });
    expect(b[4].status).toBe('I');
  });
  it('D 행은 편집되지 않는다', () => {
    const rs = base();
    const d = toggleDelete(rs, [rs[0].id]).rows;
    expect(d[0].status).toBe('D');
    expect(patchRow(d, rs[0].id, { name: 'z' })[0].name).toBe(rs[0].name);
  });
  it('편집한 칸의 오류 표시는 지운다(계정코드 갱신은 계정코드명 오류도 지움)', () => {
    const rs = base().map((r, i) => (i === 0 ? { ...r, err: ['level', 'acctName'] as ClosingRow['err'] } : r));
    expect(patchRow(rs, rs[0].id, { level: 2 })[0].err).toEqual(['acctName']);
    expect(patchRow(rs, rs[0].id, { acctCode: '1100100', acctName: '보통예금' })[0].err).toEqual(['level']);
  });
});

describe('행삭제(토글·복구)', () => {
  it('I 행은 즉시 제거, 기존 행은 D 로 남는다', () => {
    const { rows } = appendBlank(base());
    const r = toggleDelete(rows, [rows[1].id, rows[4].id]);
    expect(r.rows).toHaveLength(4);
    expect(r.rows[1].status).toBe('D');
    expect(r.deleted).toBe(2);
    expect(r.restored).toBe(0);
  });
  it('D 행을 다시 삭제하면 직전 상태로 복구(U 였으면 U)', () => {
    const rs = base();
    const edited = patchRow(rs, rs[0].id, { name: '수정' });
    const d = toggleDelete(edited, [rs[0].id, rs[1].id]).rows;
    expect(d[0].status).toBe('D');
    const back = toggleDelete(d, [rs[0].id, rs[1].id]);
    expect(back.restored).toBe(2);
    expect(back.rows[0].status).toBe('U');
    expect(back.rows[1].status).toBe('');
    expect(back.rows[0].prev).toBeUndefined();
  });
});

describe('위로·아래로 이동', () => {
  it('한 칸 이동 후 두 행 모두 U, 원본 불변', () => {
    const rs = base();
    const m = moveRow(rs, rs[2].id, -1)!;
    expect(ids(m)).toEqual([rs[0].id, rs[2].id, rs[1].id, rs[3].id]);
    expect(m[1].status).toBe('U');
    expect(m[2].status).toBe('U');
    expect(ids(rs)).toEqual(ids(base()).map((_, i) => rs[i].id));
  });
  it('경계에서는 null(no-op)', () => {
    const rs = base();
    expect(moveRow(rs, rs[0].id, -1)).toBeNull();
    expect(moveRow(rs, rs[3].id, 1)).toBeNull();
    expect(canMove(rs, rs[0].id, 1)).toBe(true);
  });
  it('필터로 숨은 행은 건너뛰고 가장 가까운 보이는 이웃과 바꾼다', () => {
    const rs = base();
    const hidden = new Set([rs[1].id]);
    const m = moveRow(rs, rs[2].id, -1, (r) => !hidden.has(r.id))!;
    expect(ids(m)).toEqual([rs[2].id, rs[1].id, rs[0].id, rs[3].id]);
    expect(moveRow(rs, rs[0].id, 1, (r) => r.id === rs[0].id)).toBeNull();
  });
  it('I 행은 이동해도 I, D 행은 D 유지(복구 시 U)', () => {
    const { rows } = appendBlank(base());
    const d = toggleDelete(rows, [rows[3].id]).rows;
    const m = moveRow(d, rows[4].id, -1)!;
    expect(m[3].status).toBe('I');
    expect(m[4].status).toBe('D');
    expect(toggleDelete(m, [m[4].id]).rows[4].status).toBe('U');
  });
});

describe('저장 검증·반영', () => {
  it('변경 건수 = I + U + D', () => {
    const rs = base();
    let x = appendBlank(rs).rows;
    x = patchRow(x, rs[0].id, { name: 'a' });
    x = toggleDelete(x, [rs[1].id]).rows;
    expect(changedCount(x)).toBe(3);
    expect(changedCount(rs)).toBe(0);
  });
  it('신규 빈 행은 계정코드명(검색 선택값) 누락으로 걸린다', () => {
    const { rows, id } = appendBlank(base());
    const v = validateRows(rows);
    expect(v.invalid).toBe(1);
    expect(v.rows.find((r) => r.id === id)!.err).toEqual(['acctName']);
  });
  it('레벨 범위·출력위치 허용값·검색값 불일치를 잡는다', () => {
    const rs = base().map((r, i) => (i === 0 ? { ...r, status: 'U' as const, level: 7, pos: '3열' as never, acctName: '임의 입력' } : r));
    const v = validateRows(rs);
    expect(v.rows[0].err).toEqual(['level', 'acctName', 'pos']);
    expect(v.invalid).toBe(1);
  });
  it('변경 없는 행·D 행은 검증하지 않는다', () => {
    const rs = base().map((r) => ({ ...r, level: 9 }));
    expect(validateRows(rs).invalid).toBe(0);
    expect(validateRows(toggleDelete(rs, [rs[0].id]).rows).invalid).toBe(0);
  });
  it('검색으로 고른 신규 행은 통과하고, 반영 시 D 행 제거·상태 초기화', () => {
    const { rows, id } = appendBlank(base());
    let x = patchRow(rows, id, { acctCode: '1100100', acctName: '보통예금' });
    x = toggleDelete(x, [rows[0].id]).rows;
    expect(validateRows(x).invalid).toBe(0);
    const saved = commitRows(x);
    expect(saved).toHaveLength(4);
    expect(saved.every((r) => r.status === '' && r.prev === undefined && r.err === undefined)).toBe(true);
    expect(saved.some((r) => r.id === rows[0].id)).toBe(false);
  });
});

describe('상세필터(계정코드명 부분일치)', () => {
  it('부분일치로 거르되 I·D 행은 항상 보인다', () => {
    const { rows } = appendBlank(base());
    const d = toggleDelete(rows, [rows[0].id]).rows;
    const pass = passesFilter('예금');
    const shown = d.filter(pass).map((r) => r.acctName || r.status);
    expect(shown).toEqual(['자산', '보통예금', '정기예금', 'I']);
    expect(d.filter(passesFilter('  ')).length).toBe(d.length);
  });
  it('변경(U) 행도 필터와 무관하게 보인다 — 계정을 바꿔 조건 밖이 돼도 사라지지 않는다', () => {
    const rs = base();
    const u = patchRow(rs, rs[1].id, { acctCode: '2100100', acctName: '미지급금' });
    const pass = passesFilter('예금');
    expect(pass(u[1])).toBe(true);
    expect(pass(rs[1])).toBe(false);   // 같은 행이라도 변경 전(상태 '')이면 걸러진다
  });
});

describe('계정과목 검색', () => {
  it('코드/명 부분일치 + 계정분류, 코드 오름차순', () => {
    expect(searchAccounts(ACCOUNTS, '자본금', '전체').map((a) => a.code)).toEqual(['3100000', '3100100', '3100200']);
    expect(searchAccounts(ACCOUNTS, '31001', '자본').map((a) => a.name)).toEqual(['보통주자본금']);
    expect(searchAccounts(ACCOUNTS, '', '부채')).toHaveLength(5);
    expect(searchAccounts(ACCOUNTS, '예금', '부채')).toHaveLength(0);
  });
});
