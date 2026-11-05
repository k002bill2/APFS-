/* 감가상각비처리(ACC-018) 순수 모델 — slide 10 ③ 계산 예시(기준년월 2026-10) · 클램프 · 제외 · 저장 게이트 · 기간 원장 · 매핑 검증. */
import { describe, it, expect } from 'vitest';
import {
  MSG, buildRows, calcRow, commitDelete, commitSave, decliningMonthly, defaultYm, endDateOf, mappingSnapshot, periodKey,
  priorAccumOf, ratePermil, saveGate, straightMonthly, validateMapping,
} from './depreciation_model';
import type { PeriodLedger } from './depreciation_model';
import { DEFAULT_MAPPING, DEPR_ACCOUNTS, DEPR_ASSETS, DEPR_FUND_ACCOUNTS } from './depreciation_data';
import type { DeprAsset } from './depreciation_data';

const byNo = (no: string) => DEPR_ASSETS.find((a) => a.assetNo === no)!;
const asset = (p: Partial<DeprAsset>): DeprAsset => ({
  id: 't', account: DEPR_FUND_ACCOUNTS[0], assetType: '집기비품', assetNo: 'T-1', name: '테스트', acqDate: '2025-01-02',
  life: 5, method: '정액법', cost: 60_000_000, residual: 0, ...p,
});
const EMPTY: PeriodLedger = {};
const [FUND, INVEST] = DEPR_FUND_ACCOUNTS;

describe('slide 10 ③ 계산 예시 — 기준년월 2026-10', () => {
  it('① 정액법 월 상각액 = (60,000,000 − 0) ÷ 5 ÷ 12 = 1,000,000', () => {
    expect(straightMonthly({ cost: 60_000_000, residual: 0, life: 5 })).toBe(1_000_000);
  });
  it('② 정률법 월 상각액 = (10,000,000 − 4,510,000) × 0.451 ÷ 12 = 206,333(원 미만 반올림)', () => {
    expect(ratePermil(5)).toBe(451);
    expect(decliningMonthly(10_000_000, 4_510_000, 451)).toBe(206_333);
  });
  it('③ FA-0001 그리드 1행 — 전기말 12,000,000 · 상각액 1,000,000 · 미상각잔액 38,000,000', () => {
    const r = calcRow(byNo('FA-0001'), '2026-10')!;
    expect(r.priorAccum).toBe(12_000_000);
    expect(r.amount).toBe(1_000_000);
    expect(r.remaining).toBe(38_000_000);   // 60,000,000 − 12,000,000 − 1,000,000 × 10
  });
  it('FA-0002 그리드 2행 — 전기말 4,510,000 · 상각액 206,333 · 미상각잔액 3,426,670', () => {
    const r = calcRow(byNo('FA-0002'), '2026-10')!;
    expect(r.priorAccum).toBe(4_510_000);
    expect(r.amount).toBe(206_333);
    expect(r.remaining).toBe(3_426_670);    // 10,000,000 − 4,510,000 − 206,333 × 10
  });
  it('종료일 = (취득월 + 내용년수 × 12 − 1)월의 말일', () => {
    expect(endDateOf('2025-01-02', 5)).toBe('2029-12-31');   // slide 10 예시
    expect(endDateOf('2024-03-15', 1)).toBe('2025-02-28');
    expect(endDateOf('2023-03-20', 1)).toBe('2024-02-29');   // 윤년 말일
    expect(calcRow(byNo('FA-0001'), '2026-10')!.endDate).toBe('2029-12-31');
  });
  it('총 상각 개월 = 내용년수 × 12(60) — 취득월 ~ 종료월, 61번째 달 없음', () => {
    for (const acqDate of ['2025-01-02', '2025-01-31', '2024-07-15']) {
      const a = asset({ acqDate });
      const start = Number(acqDate.slice(0, 4));
      let months = 0, total = 0;
      for (let y = start; y <= start + 6; y++) for (let m = 1; m <= 12; m++) {
        const r = calcRow(a, `${String(y)}-${String(m).padStart(2, '0')}`);
        if (r && r.amount > 0) { months++; total += r.amount; }
      }
      expect(months).toBe(60);
      expect(total).toBe(60_000_000);
    }
  });
});

describe('월수·클램프·제외', () => {
  it('당기 취득 — 취득월부터 센다(2026-04 취득 → 2026-10 은 7개월째)', () => {
    const r = calcRow(asset({ acqDate: '2026-04-01', cost: 24_000_000 }), '2026-10')!;
    expect(r.priorAccum).toBe(0);
    expect(r.amount).toBe(400_000);
    expect(r.remaining).toBe(24_000_000 - 400_000 * 7);
  });
  it('취득일이 기준년월 이후면 제외(null), 취득월이면 포함', () => {
    expect(calcRow(asset({ acqDate: '2026-11-10' }), '2026-10')).toBeNull();
    expect(calcRow(asset({ acqDate: '2026-10-31' }), '2026-10')!.amount).toBe(1_000_000);
  });
  it('종료일이 지난 자산 = 상각액 0, 미상각잔액 = 잔존가치', () => {
    const r = calcRow(byNo('FA-0006'), '2026-10')!;   // 2021-09-01 · 4년 → 2025-08-31 종료
    expect(r.endDate).toBe('2025-08-31');
    expect(r.amount).toBe(0);
    expect(r.priorAccum).toBe(30_000_000);
    expect(r.remaining).toBe(0);
  });
  it('상각액은 남은 상각 가능액을 넘지 않는다(잔존가치 하한)', () => {
    /* 정액 월 1,000,000 · 60개월(2025-01 ~ 2029-12) 상각 후 다음 달은 0 */
    const end = calcRow(asset({}), '2030-01')!;
    expect(end.amount).toBe(0);
    expect(end.remaining).toBe(0);
    /* 잔존가치 2,000,000 — 미상각잔액은 잔존가치 아래로 내려가지 않는다 */
    const res = calcRow(asset({ cost: 42_000_000, residual: 2_000_000 }), '2029-12')!;
    expect(res.remaining).toBeGreaterThanOrEqual(2_000_000);
    /* 월 상각액 반올림 누적이 상각 가능액을 넘는 마지막 달 — 83,334 × 12 = 1,000,008 > 1,000,006 → 12월분 83,332 로 클램프 */
    const last = calcRow(asset({ cost: 1_000_006, life: 1, acqDate: '2026-01-01' }), '2026-12')!;
    expect(last.amount).toBe(83_332);
    expect(last.remaining).toBe(0);
  });
  it('정액법 종료월 정리 — FA-0008(월 833,333 내림): 종료월 833,353 · 이후 미상각잔액 = 잔존가치(0)', () => {
    const a = byNo('FA-0008');   // 2025-06-01 · 5년 → 2030-05-31
    expect(calcRow(a, '2030-04')!.amount).toBe(833_333);
    expect(calcRow(a, '2030-05')!.amount).toBe(50_000_000 - 833_333 * 59);
    expect(calcRow(a, '2030-05')!.remaining).toBe(0);
    expect(calcRow(a, '2030-06')!.amount).toBe(0);
    expect(calcRow(a, '2031-03')!.remaining).toBe(a.residual);
  });
  it('정액법 총합 = 상각가능액 — FA-0010(월 666,667 올림 · 잔존가치 2,000,000)·FA-0008', () => {
    for (const no of ['FA-0010', 'FA-0008']) {
      const a = byNo(no);
      const start = Number(a.acqDate.slice(0, 4));
      let total = 0;
      for (let y = start; y <= start + 6; y++) for (let m = 1; m <= 12; m++) total += calcRow(a, `${String(y)}-${String(m).padStart(2, '0')}`)?.amount ?? 0;
      expect(total).toBe(a.cost - a.residual);
      expect(calcRow(a, `${String(start + 6)}-12`)!.remaining).toBe(a.residual);
    }
    expect(calcRow(byNo('FA-0010'), '2030-01')!.amount).toBe(40_000_000 - 666_667 * 59);   // 종료월은 작아진다
  });
  it('전기말 누계는 기준년도에 따라 다시 계산된다', () => {
    expect(priorAccumOf(byNo('FA-0001'), 2025)).toBe(0);
    expect(priorAccumOf(byNo('FA-0001'), 2027)).toBe(24_000_000);
    /* 정률 2026년분 = round(5,490,000 × 0.451) = 2,475,990 */
    expect(priorAccumOf(byNo('FA-0002'), 2027)).toBe(4_510_000 + 2_475_990);
  });
});

describe('조회 · 기본 기준년월', () => {
  it('기준년월 기본값 = 현재월 − 1(연도 넘김 포함)', () => {
    expect(defaultYm('2026-11-04')).toBe('2026-10');
    expect(defaultYm('2026-01-15')).toBe('2025-12');
  });
  it('계정구분으로 거르고 자산번호 순 · 저장여부 기본 부', () => {
    const rows = buildRows(DEPR_ASSETS, FUND, '2026-10', EMPTY, EMPTY);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.account === FUND && r.saved === '부')).toBe(true);
    expect(rows.map((r) => r.assetNo)).toEqual([...rows.map((r) => r.assetNo)].sort());
    expect(rows.slice(0, 2).map((r) => r.assetNo)).toEqual(['FA-0001', 'FA-0002']);
  });
  it('취득 전 자산(FA-0012)은 2026-10 에 없고 2026-12 에 있다', () => {
    expect(buildRows(DEPR_ASSETS, INVEST, '2026-10', EMPTY, EMPTY).some((r) => r.assetNo === 'FA-0012')).toBe(false);
    expect(buildRows(DEPR_ASSETS, INVEST, '2026-12', EMPTY, EMPTY).some((r) => r.assetNo === 'FA-0012')).toBe(true);
  });
});

describe('E02 저장 게이트 · 기간 원장', () => {
  const key = periodKey(FUND, '2026-10');
  it('대상 0건 = empty', () => { expect(saveGate([])).toBe('empty'); expect(MSG.emptySave).toBe('저장할 내역이 없습니다.'); });
  it('미저장 = ok → 저장 후 그 기간 전 행 여 · 다른 기간은 부', () => {
    const rows = buildRows(DEPR_ASSETS, FUND, '2026-10', EMPTY, EMPTY);
    expect(saveGate(rows)).toBe('ok');
    const saved = commitSave(EMPTY, key, rows);
    const after = buildRows(DEPR_ASSETS, FUND, '2026-10', saved, EMPTY);
    expect(after.every((r) => r.saved === '여')).toBe(true);
    expect(saveGate(after)).toBe('overwrite');
    expect(buildRows(DEPR_ASSETS, FUND, '2026-09', saved, EMPTY).every((r) => r.saved === '부')).toBe(true);
    expect(buildRows(DEPR_ASSETS, INVEST, '2026-10', saved, EMPTY).every((r) => r.saved === '부')).toBe(true);
  });
  it('저장된 행이 하나라도 섞이면 overwrite', () => {
    const rows = buildRows(DEPR_ASSETS, FUND, '2026-10', { [key]: ['fa-0001'] }, EMPTY);
    expect(rows.filter((r) => r.saved === '여')).toHaveLength(1);
    expect(saveGate(rows)).toBe('overwrite');
  });
  it('E06 삭제 = 그 기간 목록에서만 제외 · 저장 원장에서도 빠짐 · 다른 기간은 그대로', () => {
    const rows = buildRows(DEPR_ASSETS, FUND, '2026-10', EMPTY, EMPTY);
    const saved0 = commitSave(EMPTY, key, rows);
    const { saved, deleted } = commitDelete(saved0, EMPTY, key, ['fa-0001', 'fa-0002']);
    const after = buildRows(DEPR_ASSETS, FUND, '2026-10', saved, deleted);
    expect(after).toHaveLength(rows.length - 2);
    expect(saved[key]).not.toContain('fa-0001');
    expect(buildRows(DEPR_ASSETS, FUND, '2026-09', saved, deleted).some((r) => r.id === 'fa-0001')).toBe(true);
    /* 중복 삭제는 원장에 한 번만 */
    expect(commitDelete(saved, deleted, key, ['fa-0001']).deleted[key].filter((id) => id === 'fa-0001')).toHaveLength(1);
  });
});

describe('E03 계정과목 설정 검증', () => {
  it('기본 매핑 = slide 12 표 5행, 코드는 매핑 계정과목에 있다', () => {
    expect(DEFAULT_MAPPING.map((m) => m.assetType)).toEqual(['건물', '차량운반구', '집기비품', '시설장치', '소프트웨어']);
    for (const m of DEFAULT_MAPPING) for (const s of [m.debit, m.credit]) {
      expect(DEPR_ACCOUNTS.some((a) => a.code === s.code && a.name === s.name)).toBe(true);
    }
    expect(validateMapping(DEFAULT_MAPPING)).toBeNull();
  });
  it('위→아래, 좌→우 첫 미충족', () => {
    const rows = DEFAULT_MAPPING.map((m) => ({ ...m }));
    rows[3] = { ...rows[3], credit: { code: '', name: '' } };
    rows[2] = { ...rows[2], credit: { code: '', name: '' } };
    expect(validateMapping(rows)).toEqual({ index: 2, side: 'credit', msg: '대변 계정과목을 선택하세요.' });
    rows[2] = { ...rows[2], debit: { code: '', name: '' } };
    expect(validateMapping(rows)).toEqual({ index: 2, side: 'debit', msg: '차변 계정과목을 선택하세요.' });
  });
  it('스냅샷은 코드 변경을 잡는다', () => {
    const changed = DEFAULT_MAPPING.map((m, i) => (i === 0 ? { ...m, debit: { code: '5100400', name: '감가상각비' } } : m));
    expect(mappingSnapshot(changed)).not.toBe(mappingSnapshot(DEFAULT_MAPPING));
  });
});
