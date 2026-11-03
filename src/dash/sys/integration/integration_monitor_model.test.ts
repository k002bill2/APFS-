import { describe, it, expect } from 'vitest';
import { TRSM, PRCS, ATTACH, TBLS, INSTS, DEMO_RANGE } from './integration_monitor_data';
import {
  filterTrsm, filterPrcs, cdCounts, sttsCounts, trsmBySn, prcsOf, attachOf, originOf,
  fileSize, cdText, cdTone, transitionText, retryText, STTS_TONE,
} from './integration_monitor_model';

const sns = (rows: readonly { sn: number }[]) => rows.map((r) => r.sn);

describe('데모 데이터 무결성', () => {
  it('연계일련번호·이력일련번호가 유일', () => {
    expect(new Set(sns(TRSM)).size).toBe(TRSM.length);
    expect(new Set(sns(PRCS)).size).toBe(PRCS.length);
  });
  it('처리이력·첨부파일의 연계일련번호는 모두 송수신이력에 있다', () => {
    const all = new Set(sns(TRSM));
    expect(PRCS.every((p) => all.has(p.linkSn))).toBe(true);
    expect(ATTACH.every((a) => all.has(a.linkSn))).toBe(true);
  });
  it('연계기관 값은 INSTS 안에 있다 · 대상테이블은 등장 순서대로 중복 제거', () => {
    expect(TRSM.every((r) => (INSTS as readonly string[]).includes(r.inst))).toBe(true);
    expect(TBLS).toEqual(['가치평가', '운용사보고', '신용정보', '모태펀드']);
  });
});

describe('filterTrsm — 송수신이력', () => {
  it('조건 없음 · 기본 기간 = 전 건', () => {
    expect(filterTrsm(TRSM, {}).length).toBe(8);
    expect(filterTrsm(TRSM, { from: DEMO_RANGE[0], to: DEMO_RANGE[1] }).length).toBe(8);
  });
  it('연계기관·연계방식·송수신 정확일치', () => {
    expect(sns(filterTrsm(TRSM, { inst: '운용사' }))).toEqual([1024, 1019, 1015]);
    expect(filterTrsm(TRSM, { inst: '농식품 투자정보 플랫폼(ASSIST)' }).length).toBe(1);
    expect(filterTrsm(TRSM, { mth: 'REST API' }).length).toBe(4);
    expect(filterTrsm(TRSM, { mth: 'Batch' }).length).toBe(2);
    expect(filterTrsm(TRSM, { mth: 'SFTP' }).length).toBe(2);
    expect(sns(filterTrsm(TRSM, { trrc: '송신' }))).toEqual([1021]);
    expect(filterTrsm(TRSM, { trrc: '수신' }).length).toBe(7);
  });
  it("응답코드 — ok 는 '0' 만, err 는 그 외", () => {
    expect(filterTrsm(TRSM, { cd: 'ok' }).length).toBe(6);
    expect(sns(filterTrsm(TRSM, { cd: 'err' }))).toEqual([1023, 1015]);
    expect(filterTrsm(TRSM, { cd: '' }).length).toBe(8);
  });
  it('요청기간 — 경계일 포함, 빈 경계는 열림', () => {
    expect(sns(filterTrsm(TRSM, { from: '2026-10-28' }))).toEqual([1024, 1023, 1022]);
    expect(filterTrsm(TRSM, { to: '2026-10-27' }).length).toBe(5);
    expect(filterTrsm(TRSM, { from: '2026-10-27', to: '2026-10-27' }).length).toBe(5);
    expect(filterTrsm(TRSM, { from: '2026-10-29' }).length).toBe(0);
    expect(filterTrsm(TRSM, { to: '2026-10-26' }).length).toBe(0);
  });
  it('조건은 AND', () => {
    expect(sns(filterTrsm(TRSM, { inst: '운용사', cd: 'err' }))).toEqual([1015]);
    expect(filterTrsm(TRSM, { mth: 'Batch', from: '2026-10-28' }).length).toBe(1);
  });
  it('입력 배열을 바꾸지 않는다', () => {
    const before = sns(TRSM);
    filterTrsm(TRSM, { inst: '운용사' });
    expect(sns(TRSM)).toEqual(before);
  });
});

describe('filterPrcs — 연계처리이력', () => {
  it('대상테이블 · 처리상태(변경후) 정확일치', () => {
    expect(sns(filterPrcs(PRCS, { tbl: '가치평가' }))).toEqual([5101, 5100]);
    expect(filterPrcs(PRCS, { stts: '반영완료' }).length).toBe(4);
    expect(sns(filterPrcs(PRCS, { stts: '검증오류' }))).toEqual([5101]);
    expect(filterPrcs(PRCS, { stts: '반영실패' }).length).toBe(0);
  });
  it('변경전 상태로는 거르지 않는다(5097 은 검증오류 → 반영완료)', () => {
    expect(sns(filterPrcs(PRCS, { stts: '검증오류' }))).not.toContain(5097);
  });
  it('발생기간 — 경계일 포함, 빈 경계는 열림', () => {
    expect(filterPrcs(PRCS, { from: '2026-10-28' }).length).toBe(4);
    expect(sns(filterPrcs(PRCS, { to: '2026-10-27' }))).toEqual([5097, 5094]);
    expect(filterPrcs(PRCS, { from: DEMO_RANGE[0], to: DEMO_RANGE[1] }).length).toBe(6);
    expect(filterPrcs(PRCS, { from: '2026-10-29' }).length).toBe(0);
  });
  it('조건은 AND', () => {
    expect(sns(filterPrcs(PRCS, { tbl: '운용사보고', from: '2026-10-28' }))).toEqual([5096]);
  });
});

describe('칩 건수(facet)', () => {
  it('응답코드 성공/오류', () => {
    expect(cdCounts(TRSM)).toEqual({ ok: 6, err: 2 });
    expect(cdCounts(filterTrsm(TRSM, { inst: '가치평가시스템' }))).toEqual({ ok: 1, err: 1 });
  });
  it('처리상태 5종(0건 상태도 키가 있다)', () => {
    expect(sttsCounts(PRCS)).toEqual({ '반영대기': 0, '반영완료': 4, '검증오류': 1, '반영실패': 0, '제외': 1 });
  });
});

describe('상세 조회 — 연계일련번호 기준', () => {
  it('송수신 1건 찾기 · 없으면 null', () => {
    expect(trsmBySn(1023)?.ifId).toBe('IF-VAL-SYNC-02');
    expect(trsmBySn(9999)).toBeNull();
  });
  it('해당 건의 연계처리이력', () => {
    expect(sns(prcsOf(1023))).toEqual([5101, 5100]);
    expect(prcsOf(1017)).toEqual([]);
  });
  it('해당 건의 연계첨부파일', () => {
    expect(attachOf(1024).map((a) => a.fileSn)).toEqual([1, 2]);
    expect(attachOf(1019).map((a) => a.orgName)).toEqual(['2026년3분기_회계감사보고서.pdf']);
    expect(attachOf(1023)).toEqual([]);
  });
  it('재전송 건 → 원연계(최초) 건, 재전송이 아니면 null', () => {
    const resent = trsmBySn(1019)!;
    expect(resent.rsn).toBe('재전송');
    expect(originOf(resent)?.sn).toBe(1015);
    expect(originOf(trsmBySn(1024)!)).toBeNull();
    expect(originOf({ ...resent, orgnlSn: 1 })).toBeNull();
  });
});

describe('표시 문자열·톤', () => {
  it('파일 크기 — 1MB 이상 MB(소수 1자리), 미만 KB(정수)', () => {
    expect(fileSize(245760)).toBe('240 KB');
    expect(fileSize(88320)).toBe('86 KB');
    expect(fileSize(1540096)).toBe('1.5 MB');
    expect(fileSize(1048576)).toBe('1.0 MB');
  });
  it('응답코드 문자열·톤', () => {
    expect(cdText('0')).toBe('0 · 성공');
    expect(cdText('E500-0001')).toBe('E500-0001');
    expect(cdTone('0')).toBe('success');
    expect(cdTone('E400-0007')).toBe('danger');
  });
  it('변경전→후 · 재처리 횟수', () => {
    expect(transitionText(PRCS.find((p) => p.sn === 5094)!)).toBe('- → 제외');
    expect(transitionText(PRCS.find((p) => p.sn === 5097)!)).toBe('검증오류 → 반영완료');
    expect(retryText(1)).toBe('1회');
    expect(retryText(0)).toBe('0회');
  });
  it('처리상태 톤 — 목업 tag 색 대응', () => {
    expect(STTS_TONE).toEqual({ '반영완료': 'success', '반영대기': 'info', '검증오류': 'warning', '반영실패': 'danger', '제외': 'muted' });
  });
});
