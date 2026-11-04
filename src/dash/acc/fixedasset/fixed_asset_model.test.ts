/* 유무형자산관리(ACC-017) — 순수 로직 테스트: 채번·산식·상각률·검증 순서·파생 상태·그룹/소계·삭제 게이트·변동 취소·전표생성 */
import { describe, expect, it } from 'vitest';
import { FA_FUNDS } from './fixed_asset_data';
import type { FixedAsset } from './fixed_asset_data';
import {
  ASSET_MSG, CHANGE_MSG, DELETE_MSG, FILTER_MSG, VOUCHER_MSG, disposalLines, effectiveFilter, rangeError, showGroupLabel, acqCost, assetPasses, calcDecrease, calcGain, cancelChangeGate, changeOpenGate,
  changeRows, changeTotal, changesUntil, commitAsset, commitChange, commitVouchers, defaultFilter, defaultMemo, deleteAssetGate, demoFixedAssets,
  deprRate, deriveAsset, isBalanced, lineSum, monthEnd, nextAssetNo, nextSlipNo, prepareAcquisition, prepareDisposal, previewChange, rateLabel,
  reconcileType, summaryRows, summaryTotal, validateAsset, validateChange, validateVouchers,
} from './fixed_asset_model';
import type { AssetInput, AssetPatch, ChangeInput } from './fixed_asset_model';

const fresh = () => demoFixedAssets();
const byNo = (assets: FixedAsset[], no: string) => {
  const a = assets.find((x) => x.assetNo === no);
  if (!a) throw new Error('자산 없음: ' + no);
  return a;
};
const view = (no: string) => { const s = fresh(); return { ...s, v: deriveAsset(byNo(s.assets, no), s.changes) }; };

const okInput: AssetInput = { fund: FA_FUNDS[0], assetType: '비품', name: '모니터', purchase: 300_000, qty: 2, unitPrice: 150_000, acqKind: '구입', acqDate: '2026-11-03', deprKind: '정액법', life: 5 };
const patch = (over: Partial<AssetPatch> = {}): AssetPatch => ({
  fund: FA_FUNDS[0], assetType: '비품', name: '모니터', model: '', purchase: 300_000, extra: 0, qty: 2, unitPrice: 150_000, spec: '', unit: '대',
  acqKind: '구입', acqDate: '2022-10-18', supplier: '', vehicleNo: '', maker: '', makeDate: '', deprKind: '정액법', life: 5,
  userKind: '공용', userName: '', location: '', memo: '', files: '', ...over,
});
const chg = (over: Partial<ChangeInput> = {}): ChangeInput => ({ kind: '처분', date: '2026-11-03', proc: '부분', qty: 1, sale: 10_000, memo: '', ...over });

describe('자산번호 · 금액 · 상각률', () => {
  it('자산번호 = 취득일 YYYYMMDD + 같은 날 일련번호 4자리', () => {
    const { assets } = fresh();
    expect(nextAssetNo(assets, '2022-10-18')).toBe('202210180003');
    expect(nextAssetNo(assets, '2026-11-03')).toBe('202611030001');
  });
  it('수정 — 취득일자를 바꾸면 새 취득일로 재채번, 그대로면 번호 유지', () => {
    const { assets } = fresh();
    const a = byNo(assets, '202304170001');   // 전표·변동 없음
    expect(commitAsset(assets, patch({ fund: a.fund, assetType: a.assetType, acqDate: a.acqDate }), a.id).saved.assetNo).toBe(a.assetNo);
    const moved = commitAsset(assets, patch({ fund: a.fund, assetType: a.assetType, acqDate: '2022-10-18' }), a.id);
    expect(moved.saved.assetNo).toBe('202210180003');
    expect(moved.assets.filter((x) => x.assetNo === '202210180003')).toHaveLength(1);
    /* 같은 날짜 안에서 자기 번호는 후보에서 빠진다 — 202304170002 를 0002 → 같은 날 유지(재채번 없음) */
    const b = byNo(assets, '202304170002');
    expect(commitAsset(assets, patch({ fund: b.fund, assetType: b.assetType, acqDate: b.acqDate }), b.id).saved.assetNo).toBe('202304170002');
  });
  it('전표·변동 있는 자산 — 계정구분·자산유형도 잠금', () => {
    const { assets } = fresh();
    const a = byNo(assets, '202303150001');   // 전표 있음 · 계정구분 A 비품
    const res = commitAsset(assets, patch({ fund: FA_FUNDS[1], assetType: '집기비품' }), a.id);
    expect(res.saved).toMatchObject({ fund: a.fund, assetType: a.assetType });
    const c = byNo(assets, '202304170002');   // 변동 있음
    expect(commitAsset(assets, patch({ fund: FA_FUNDS[0], assetType: '소프트웨어' }), c.id, { hasChanges: true }).saved).toMatchObject({ fund: c.fund, assetType: c.assetType });
  });
  it('삭제 후 재등록 — 남은 번호와 겹치지 않는다(최댓값 + 1)', () => {
    const { assets } = fresh();
    const rest = assets.filter((a) => a.assetNo !== '202210180001');   // 0001 삭제, 0002 남음
    const res = commitAsset(rest, patch({ acqDate: '2022-10-18' }));
    expect(res.saved.assetNo).toBe('202210180003');
    expect(new Set(res.assets.map((a) => a.assetNo)).size).toBe(res.assets.length);
  });
  it('취득원가 C = A + B · 잔존가액 = 취득원가 − 감가상각누계액', () => {
    expect(acqCost(22_300, 0)).toBe(22_300);
    expect(acqCost(2_400_000, 60_000)).toBe(2_460_000);
    const { v } = view('202210180001');
    expect(v.cost).toBe(22_300);
    expect(v.prevBook).toBe(12_903);   // 22,300 − 9,397 (설계서 샘플 전기말장부가액)
    expect(v.residual).toBe(22_300 - 9_397);
  });
  it('상각률 — 정액 1/n · 정률 1 − 0.05^(1/n), 소수 3자리', () => {
    expect(deprRate('정액법', 5)).toBe(0.2);
    expect(deprRate('정률법', 5)).toBe(0.451);
    expect(deprRate('정액법', 8)).toBe(0.125);
    expect(deprRate('정률법', null)).toBeNull();
    expect(rateLabel(0.451)).toBe('45.1%');
    expect(rateLabel(0.2)).toBe('20%');
  });
});

describe('등록 검증(slide13 ③ 순서)', () => {
  it('통과', () => expect(validateAsset(okInput).ok).toBe(true));
  it.each([
    ['fund', { fund: '' }, ASSET_MSG.fund],
    ['assetType', { assetType: '' }, ASSET_MSG.assetType],
    ['assetType(계정구분에 없는 유형)', { assetType: '차량운반구', fund: FA_FUNDS[1] }, ASSET_MSG.assetType],
    ['name', { name: '  ' }, ASSET_MSG.name],
    ['purchase', { purchase: null }, ASSET_MSG.purchase],
    ['qty', { qty: null }, ASSET_MSG.qtyPrice],
    ['qty 0', { qty: 0 }, ASSET_MSG.qtyPrice],
    ['unitPrice', { unitPrice: null }, ASSET_MSG.qtyPrice],
    ['acqKind', { acqKind: '' }, ASSET_MSG.acqKind],
    ['acqDate', { acqDate: '2026-02-30' }, ASSET_MSG.acqDate],
    ['deprKind', { deprKind: '' }, ASSET_MSG.deprKind],
    ['purchase 0원', { purchase: 0 }, ASSET_MSG.purchase],
    ['life 미입력', { life: null }, ASSET_MSG.life],
    ['life 0', { life: 0 }, ASSET_MSG.life],
    ['life 100', { life: 100 }, ASSET_MSG.life],
  ] as const)('%s 미충족 → 문구', (_n, over, msg) => {
    const r = validateAsset({ ...okInput, ...over });
    expect(r.ok === false && r.message).toBe(msg);
  });
  it('여러 개가 비면 화면 순서상 첫 항목만', () => {
    const r = validateAsset({ ...okInput, name: '', acqKind: '', deprKind: '' });
    expect(r.ok === false && r.field).toBe('name');
  });
  it('변동내역이 있는 자산 수정 — 금액·수량·단가·취득일자는 원장 값 유지', () => {
    const { assets } = fresh();
    const a = byNo(assets, '202304170002');   // 전표 없음 · 변동 1건
    expect(a.slipNo).toBeNull();
    const res = commitAsset(assets, patch({ name: '변경', purchase: 1, extra: 1, qty: 9, unitPrice: 1, acqDate: '2020-01-01', fund: a.fund }), a.id, { hasChanges: true });
    expect(res.saved).toMatchObject({ name: '변경', purchase: a.purchase, extra: a.extra, qty: a.qty, unitPrice: a.unitPrice, acqDate: a.acqDate });
    expect(commitAsset(assets, patch({ purchase: 1, fund: a.fund }), a.id).saved.purchase).toBe(1);   // 변동 없으면 수정 가능
  });
  it('전표 생성 자산 수정 — 금액·수량·단가·취득일자는 원장 값 유지', () => {
    const { assets } = fresh();
    const a = byNo(assets, '202303150001');
    expect(a.slipNo).not.toBeNull();
    const res = commitAsset(assets, patch({ name: '이름변경', purchase: 1, extra: 1, qty: 1, acqDate: '2020-01-01', fund: a.fund }), a.id);
    expect(res.saved).toMatchObject({ name: '이름변경', purchase: a.purchase, extra: a.extra, qty: a.qty, acqDate: a.acqDate, assetNo: a.assetNo });
  });
});

describe('변동(처분·불용)', () => {
  it('F = A ÷ B × C 반올림 · H = D − E − G + F', () => {
    expect(calcDecrease(1_000, 3, 1)).toBe(333);
    expect(calcDecrease(1_000, 3, 2)).toBe(667);
    expect(calcDecrease(568, 1, 1)).toBe(568);
    expect(calcGain(100, 500, 1_122, 568)).toBe(100 - 500 - 1_122 + 568);
  });
  it('처리구분 전체면 C = B 자동, 불용이면 매각액 0', () => {
    const { v, changes } = view('202304170001');
    const p = previewChange(v, changes, { kind: '불용', proc: '전체', qty: null, sale: 99 });
    expect(p.C).toBe(v.remainQty);
    expect(p.E).toBe(0);
    expect(p.F).toBe(v.residual);
  });
  it('검증 순서(slide14 ③) — 변동구분 → 변동일(취득일 이전 불가) → 처리구분 → 처리수량 → 매각액', () => {
    const { v: v0 } = view('202209050001');   // 잔여 8
    const v = { ...v0, lastChangeDate: '' };   // 취득일 하한만 본다(최근 변동일 하한은 별도 테스트)
    const msg = (over: Partial<ChangeInput>) => { const r = validateChange(v, chg(over)); return r.ok === false ? r.message : null; };
    expect(msg({ kind: '', date: '', proc: '' })).toBe(CHANGE_MSG.kind);
    expect(msg({ date: '' })).toBe(CHANGE_MSG.date);
    expect(msg({ date: '2022-09-04' })).toBe(CHANGE_MSG.date);
    expect(msg({ date: '2022-09-05' })).toBeNull();
    expect(msg({ proc: '' })).toBe(CHANGE_MSG.proc);
    expect(msg({ qty: 0 })).toBe(CHANGE_MSG.qty);
    expect(msg({ qty: v.remainQty + 1 })).toBe(CHANGE_MSG.qty);
    expect(msg({ qty: v.remainQty })).toBeNull();
    expect(msg({ sale: null })).toBe(CHANGE_MSG.sale);
    expect(msg({ kind: '불용', sale: null })).toBeNull();
  });
  it('변동일 — 같은 자산 최근 변동일 이전이면 "변동일을 확인해 주세요."', () => {
    const { assets, changes } = fresh();
    const v = deriveAsset(byNo(assets, '202305020001'), changes);   // 최근 변동 2026-02-10
    expect(v.lastChangeDate).toBe('2026-02-10');
    const msg = (date: string) => { const r = validateChange(v, chg({ date })); return r.ok === false ? r.message : null; };
    expect(msg('2026-02-09')).toBe(CHANGE_MSG.date);
    expect(msg('2026-02-10')).toBeNull();
    expect(msg('2026-03-01')).toBeNull();
    expect(deriveAsset(byNo(assets, '202304170001'), changes).lastChangeDate).toBe('');
  });
  it('진입 게이트(E04) — 미선택·다건·잔여수량 0', () => {
    const { assets, changes } = fresh();
    const views = assets.map((a) => deriveAsset(a, changes));
    const done = byNo(assets, '202210180002');   // 시드에서 전체 처분됨
    const g = (ids: string[]) => { const r = changeOpenGate(views, ids); return r.ok === false ? r.message : null; };
    expect(g([])).toBe(CHANGE_MSG.noSelection);
    expect(g([assets[0].id, assets[2].id])).toBe(CHANGE_MSG.multi);
    expect(g([done.id])).toBe(CHANGE_MSG.noRemain);
    expect(g([assets[0].id])).toBeNull();
  });
  it('저장 후 총괄 수량·잔존가액 갱신, 잔여수량 0 이면 자산상태 = 변동구분', () => {
    const { assets, changes } = fresh();
    const a = byNo(assets, '202304170001');   // 복합기 1대
    const before = deriveAsset(a, changes);
    const res = commitChange(changes, before, chg({ kind: '불용', proc: '전체', qty: null, sale: null }));
    const after = deriveAsset(a, res.changes);
    expect(after.remainQty).toBe(0);
    expect(after.residual).toBe(0);
    expect(after.status).toBe('불용');
    expect(res.saved).toMatchObject({ qty: 1, sale: 0, bookBefore: before.residual, qtyBefore: 1, decrease: before.residual });
  });
  it('부분 처분 연속 — 마지막 잔량 처리면 취득원가 해당분 합 = 취득원가', () => {
    const { assets, changes } = fresh();
    const a = byNo(assets, '202305020001');   // 의자 10개 — 시드 3+2 처리, 잔여 5
    const v = deriveAsset(a, changes);
    expect(v.remainQty).toBe(5);
    const res = commitChange(changes, v, chg({ proc: '전체', qty: null, sale: 1 }));
    const mine = res.changes.filter((c) => c.assetId === a.id);
    expect(mine.reduce((s, c) => s + c.costPart, 0)).toBe(v.cost);
    expect(deriveAsset(a, res.changes).residual).toBe(0);
  });
  it('설계서 샘플(자산명, 202210180002) 처분 전체 — 분개 차) 누계 1,122 · 현금 500 · 처분손실 68 / 대) 비품 1,690', () => {
    const { changes } = fresh();
    const c = changes.find((x) => x.date === '2023-05-02');
    expect(c).toMatchObject({ bookBefore: 568, qtyBefore: 1, qty: 1, decrease: 568, sale: 500, costPart: 1_690, accumPart: 1_122 });
  });
});

describe('기준년월 · 상세필터', () => {
  it('기본 = 당월 · 취득기간 시작 > 종료는 오류 + 범위 조건만 무시(즉시 반영)', () => {
    const base = defaultFilter('2026-11-04');
    expect(base.ym).toBe('2026-11');
    const bad = { ...base, name: '책상', from: '2026-02-01', to: '2026-01-01' };
    expect(rangeError(bad)).toBe(FILTER_MSG.range);
    expect(effectiveFilter(bad)).toEqual({ ...bad, from: '', to: '' });   // 이름 조건은 살아 있다
    expect(rangeError({ ...base, from: '2026-01-01', to: '2026-01-01' })).toBeNull();
    expect(effectiveFilter(base)).toBe(base);
  });
  it('월말 계산(윤년)', () => {
    expect(monthEnd('2024-02')).toBe('2024-02-29');
    expect(monthEnd('2026-11')).toBe('2026-11-30');
  });
  it('기준년월 말 이후 취득 자산·변동은 제외 → 이전 달은 처분 전 상태', () => {
    const { assets, changes } = fresh();
    const f = { ...defaultFilter('2026-11-04'), ym: '2023-04' };
    expect(assets.filter((a) => assetPasses(a, f)).every((a) => a.acqDate <= '2023-04-30')).toBe(true);
    const a = byNo(assets, '202210180002');
    expect(deriveAsset(a, changesUntil(changes, '2023-04')).remainQty).toBe(1);
    expect(deriveAsset(a, changesUntil(changes, '2023-05')).remainQty).toBe(0);
  });
  it('부분일치 · 계정구분 · 취득기간', () => {
    const { assets } = fresh();
    const f = { ...defaultFilter('2026-11-04'), fund: FA_FUNDS[1], name: '책상', from: '2022-01-01', to: '2022-12-31' };
    expect(assets.filter((a) => assetPasses(a, f)).map((a) => a.assetNo)).toEqual(['202209050001']);
  });
  it('계정구분을 바꾸면 그 계정구분에 없는 자산유형은 비운다', () => {
    expect(reconcileType({ fund: FA_FUNDS[1], assetType: '차량운반구' }).assetType).toBe('');
    expect(reconcileType({ fund: FA_FUNDS[1], assetType: '비품' }).assetType).toBe('비품');
  });
});

describe('그리드 행 — 계정구분 > 자산유형 그룹 + (계) 소계 · Σ', () => {
  const { assets, changes } = fresh();
  const views = assets.map((a) => deriveAsset(a, changes));
  const rows = summaryRows(views);
  it('그룹마다 소계 1행, 모든 행((계) 포함)에 계정구분·자산유형 값', () => {
    const subs = rows.filter((r) => r.kind === 'sub');
    expect(subs.length).toBe(7);   // A 3유형 + B 4유형
    expect(rows.every((r) => r.fund && r.assetType)).toBe(true);
    expect(rows[rows.length - 1].kind).toBe('sub');
    expect(subs.every((s) => s.acqDate === '(계)' && s.no == null)).toBe(true);
  });
  it('그룹 라벨 표시 — 페이지 첫 행은 항상, 그 밖엔 직전 행과 같은 그룹이면 숨김', () => {
    const shown = (size: number, level: 'fund' | 'assetType') =>
      rows.map((r, i) => showGroupLabel(i % size === 0 ? null : rows[i - 1], r, level));
    const all = shown(rows.length, 'assetType');
    expect(all.filter(Boolean).length).toBe(7);   // 유형 그룹 7개의 첫 행
    expect(shown(rows.length, 'fund').filter(Boolean).length).toBe(2);
    const paged = shown(20, 'assetType');
    expect(paged[20]).toBe(true);                  // 2쪽 첫 행(그룹 중간이어도) 표시
    expect(showGroupLabel(rows[0], { ...rows[0] }, 'assetType')).toBe(false);
    expect(showGroupLabel({ fund: 'A', assetType: '비품' }, { fund: 'B', assetType: '비품' }, 'assetType')).toBe(true);
  });
  it('No 는 자산 행만 1..N', () => {
    expect(rows.filter((r) => r.kind === 'asset').map((r) => r.no)).toEqual(views.map((_, i) => i + 1));
  });
  it('소계 = 그룹 합 · Σ = 자산 행 합(소계 이중 합산 없음)', () => {
    const first = rows.findIndex((r) => r.kind === 'sub');
    const members = rows.slice(0, first);
    expect(rows[first].cost).toBe(members.reduce((s, r) => s + r.cost, 0));
    const t = summaryTotal(rows);
    expect(t.cost).toBe(views.reduce((s, v) => s + v.cost, 0));
    expect(t.residual).toBe(views.reduce((s, v) => s + v.residual, 0));
    expect(t.qty).toBeNull();
  });
  it('변동내역 행 — 잔존가액 = A − F · 잔여수량 = B − C · 합계 대상은 처리수량·매각액·취득가감소액', () => {
    const cr = changeRows(changes, assets);
    expect(cr.filter((r) => r.kind === 'change').length).toBe(changes.length);
    const sample = cr.find((r) => r.kind === 'change' && r.date === '2023-05-02');
    expect(sample).toMatchObject({ residual: 0, remain: 0, decrease: 568 });
    const t = changeTotal(cr);
    expect(t.qty).toBe(changes.reduce((s, c) => s + c.qty, 0));
    expect(t.sale).toBe(changes.reduce((s, c) => s + c.sale, 0));
    expect(t.residual).toBeNull();
    expect(t.remain).toBeNull();
  });
});

describe('삭제 게이트(E07 — 전체 중단형)', () => {
  const { assets, changes } = fresh();
  const slip = byNo(assets, '202303150001');
  const withChange = byNo(assets, '202305020001');
  const plain = byNo(assets, '202304170001');
  it('미선택 · 전표 생성 행 포함 · 변동내역 있는 자산', () => {
    expect(deleteAssetGate(assets, changes, [])).toBe(DELETE_MSG.noSelection);
    expect(deleteAssetGate(assets, changes, [plain.id, slip.id])).toBe(DELETE_MSG.slip);
    expect(deleteAssetGate(assets, changes, [plain.id, withChange.id])).toBe(DELETE_MSG.hasChanges);
    expect(deleteAssetGate(assets, changes, [slip.id, withChange.id])).toBe(DELETE_MSG.slip);   // 전표 사유 우선
    expect(deleteAssetGate(assets, changes, [plain.id])).toBeNull();
  });
  it('변동 취소 — 전표 생성 변동 차단 · 최근 변동부터', () => {
    const mine = changes.filter((c) => c.assetId === withChange.id).sort((a, b) => a.seq - b.seq);   // [0] 전표 있음, [1] 없음
    expect(mine[0].slipNo).not.toBeNull();
    expect(cancelChangeGate(changes, [])).toBe(DELETE_MSG.noChangeSelection);
    expect(cancelChangeGate(changes, [mine[0].id])).toBe(DELETE_MSG.changeSlip);
    expect(cancelChangeGate(changes, [mine[1].id])).toBeNull();
    const extra = commitChange(changes, deriveAsset(withChange, changes), chg({ qty: 1 })).changes;
    expect(cancelChangeGate(extra, [mine[1].id])).toBe(DELETE_MSG.notLatest);
    const last = extra[extra.length - 1];
    expect(cancelChangeGate(extra, [mine[1].id, last.id])).toBeNull();
  });
  it('변동 취소 → 총괄 수량·잔존가액 원복', () => {
    const before = deriveAsset(plain, changes);
    const added = commitChange(changes, before, chg({ qty: 1, proc: '전체' }));
    const reverted = added.changes.filter((c) => c.id !== added.saved.id);
    expect(deriveAsset(plain, reverted)).toMatchObject({ remainQty: before.remainQty, residual: before.residual, status: before.status });
  });
});

describe('처분·불용 분개 균형', () => {
  const { assets, changes } = fresh();
  const a = byNo(assets, '202209050001');   // 책상 12개 — 시드 불용 4, 잔여 8
  const v = deriveAsset(a, changes);
  const lines = (sale: number, kind: '처분' | '불용' = '처분') => {
    const c = commitChange(changes, v, chg({ kind, qty: 2, sale })).saved;
    return { c, ls: disposalLines([{ c, a }]) };
  };
  it('매각액 < F → 처분손실(차변), 차대 일치', () => {
    const { c, ls } = lines(1);
    expect(c.decrease - c.sale).toBeGreaterThan(0);
    expect(ls.find((l) => l.account === '유형자산처분손실')?.debit).toBe(c.decrease - c.sale);
    expect(ls.some((l) => l.account === '유형자산처분이익')).toBe(false);
    expect(isBalanced(ls)).toBe(true);
  });
  it('매각액 > F → 처분이익(대변), 차대 일치', () => {
    const { c, ls } = lines(9_999_999);
    expect(ls.find((l) => l.account === '유형자산처분이익')?.credit).toBe(c.sale - c.decrease);
    expect(ls.some((l) => l.account === '유형자산처분손실')).toBe(false);
    expect(isBalanced(ls)).toBe(true);
  });
  it('매각액 = F → 손익 줄 없음, 차대 일치', () => {
    const f = previewChange(v, changes, { kind: '처분', proc: '부분', qty: 2, sale: 0 }).F;
    const { ls } = lines(f);
    expect(ls.some((l) => l.account.startsWith('유형자산처분'))).toBe(false);
    expect(isBalanced(ls)).toBe(true);
  });
  it('불용 → 매각액 0 · 손실 = F, 차대 일치', () => {
    const { c, ls } = lines(0, '불용');
    expect(ls.some((l) => l.account === '현금')).toBe(false);
    expect(ls.find((l) => l.account === '유형자산처분손실')?.debit).toBe(c.decrease);
    expect(isBalanced(ls)).toBe(true);
  });
});

describe('기준년월별 파생(changesUntil + deriveAsset)', () => {
  const { assets, changes } = fresh();
  const a = byNo(assets, '202305020001');   // 의자 10 — 2025-03-14 처분 3 · 2026-02-10 불용 2
  const at = (ym: string) => deriveAsset(a, changesUntil(changes, ym));
  it('변동 전 · 1차 후 · 2차 후 수량·잔존가액·상태', () => {
    const v0 = at('2025-02');
    const v1 = at('2025-03');
    const v2 = at('2026-02');
    expect([v0.remainQty, v1.remainQty, v2.remainQty]).toEqual([10, 7, 5]);
    expect(v0.residual).toBe(v0.cost - a.accum);
    expect(v1.residual).toBeLessThan(v0.residual);
    expect(v2.residual).toBeLessThan(v1.residual);
    expect(v2.status).toBe('미상각');   // 잔여가 남아 있으면 원래 상태
  });
});

describe('전표생성(E06)', () => {
  const { assets, changes } = fresh();
  const views = assets.map((a) => deriveAsset(a, changes));
  const A0 = views.filter((v) => v.fund === FA_FUNDS[0] && !v.slipNo);
  const B0 = views.filter((v) => v.fund === FA_FUNDS[1] && !v.slipNo);
  const done = views.find((v) => v.slipNo);
  if (!done) throw new Error('전표 생성 시드 없음');
  it('선택 0 · 전부 생성됨 → 모달 열지 않음', () => {
    const r0 = prepareAcquisition(views, []);
    expect(r0.ok === false && r0.message).toBe(VOUCHER_MSG.noSelection);
    const r1 = prepareAcquisition(views, [done.id]);
    expect(r1.ok === false && r1.message).toBe(VOUCHER_MSG.allDone);
  });
  it('이미 생성 N건 제외 · 계정구분별 전표 1건 · 적요 기본값', () => {
    const ids = [A0[0].id, A0[1].id, B0[0].id, done.id];
    const r = prepareAcquisition(views, ids);
    if (r.ok === false) throw new Error(r.message);
    expect(r.excluded).toBe(1);
    expect(VOUCHER_MSG.excluded(r.excluded)).toBe('이미 전표가 생성된 1건은 제외됩니다.');
    expect(r.drafts.map((d) => [d.fund, d.count])).toEqual([[FA_FUNDS[0], 2], [FA_FUNDS[1], 1]]);
    expect(r.drafts[0].memo).toBe(`유무형자산 취득 — ${FA_FUNDS[0]} · ${A0[0].name} 외 1건`);
    expect(r.drafts[1].memo).toBe(`유무형자산 취득 — ${FA_FUNDS[1]} · ${B0[0].name}`);
    expect(r.drafts.every((d) => isBalanced(d.lines))).toBe(true);
    expect(lineSum(r.drafts[0].lines).debit).toBe(A0[0].cost + A0[1].cost);
    expect(r.drafts[0].lines.find((l) => l.side === '대변')?.account).toBe('미지급금');
  });
  it('처분·불용 전표 — 적요 "유무형자산 처분 —" · 차대 일치(손실/이익 모두)', () => {
    const pending = changes.filter((c) => !c.slipNo);
    const r = prepareDisposal(changes, assets, pending.map((c) => c.id));
    if (r.ok === false) throw new Error(r.message);
    expect(r.drafts.every((d) => d.memo.startsWith('유무형자산 처분 — '))).toBe(true);
    expect(r.drafts.every((d) => isBalanced(d.lines))).toBe(true);
    expect(defaultMemo('처분·불용', 'X', ['a', 'b', 'c'])).toBe('유무형자산 처분 — X · a 외 2건');
  });
  it('[생성] 검증 — 전표일자·적요·차대, 첫 문제 탭', () => {
    const r = prepareAcquisition(views, [A0[0].id, B0[0].id]);
    if (r.ok === false) throw new Error(r.message);
    const bad = r.drafts.map((d, i) => (i === 1 ? { ...d, memo: ' ' } : d));
    expect(validateVouchers(bad)).toMatchObject({ ok: false, index: 1, field: 'memo' });
    const unbal = r.drafts.map((d, i) => (i === 0 ? { ...d, lines: [{ ...d.lines[0], debit: d.lines[0].debit + 1 }, ...d.lines.slice(1)] } : d));
    expect(validateVouchers(unbal)).toMatchObject({ ok: false, index: 0, field: 'lines' });
    expect(validateVouchers(r.drafts).ok).toBe(true);
  });
  it('생성 — 그룹별 전표번호 채번 + 결재상태 미상신, 다른 행은 그대로', () => {
    const r = prepareAcquisition(views, [A0[0].id, A0[1].id, B0[0].id]);
    if (r.ok === false) throw new Error(r.message);
    const drafts = r.drafts.map((d) => ({ ...d, date: '2026-11-04' }));
    const res = commitVouchers(assets, changes, drafts);
    expect(res.slipNos).toEqual(['20261104-001', '20261104-002']);
    const get = (id: string) => res.assets.find((a) => a.id === id);
    expect(get(A0[0].id)).toMatchObject({ slipNo: '20261104-001', approval: '미상신' });
    expect(get(A0[1].id)?.slipNo).toBe('20261104-001');
    expect(get(B0[0].id)?.slipNo).toBe('20261104-002');
    expect(get(A0[2].id)?.slipNo).toBeNull();
    expect(VOUCHER_MSG.done(res.slipNos.length)).toBe('전표 2건이 생성되었습니다.');
  });
  it('전표번호 = 같은 날짜 최댓값 + 1', () => {
    expect(nextSlipNo(['20261104-001', '20261104-007', '20261103-009'], '2026-11-04')).toBe('20261104-008');
  });
});
