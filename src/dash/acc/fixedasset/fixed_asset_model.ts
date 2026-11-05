/* 유무형자산관리(ACC-017) — 업무 규칙 순수 함수(페이지·모달은 배선만). 테스트: fixed_asset_model.test.ts
   - 자산번호 채번 · 취득원가/잔존가액 · 상각률 · 변동 산식(F·D·G·H) · 저장 검증(설계서 slide13 ③ · slide14 ③ 순서·문구 그대로)
   - 총괄/변동내역 그리드 행(계정구분 > 자산유형 그룹 + (계) 소계) · Σ 합계 · 상세필터
   - 삭제 게이트(E07 — 전체 중단형) · 변동 취소 게이트 · 전표생성(E06 — 계정구분별 그룹·분개·채번)
   현재 수량·잔존가액·자산상태는 저장값이 아니라 "원장 + 변동내역(기준년월 말까지)"에서 파생한다 — 변동 취소 = 변동 레코드 제거로 원복. */
import { ASSET_TYPES, CHANGE_SEEDS, FA_FUNDS, demoAssets, findType } from './fixed_asset_data';
import type { AcqKind, AssetChange, AssetStatus, ChangeKind, DeprKind, FaFund, FixedAsset, ProcKind, UserKind, VoucherStatus } from './fixed_asset_data';

/* ══════════════ 공통 ══════════════ */
const ymd = (d: string) => d.replace(/-/g, '');
const isIsoDate = (d: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const t = new Date(d + 'T00:00:00Z');   // UTC 로 왕복(로컬 자정은 KST 에서 전날로 직렬화된다)
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
};
/** 'YYYY-MM' → 그 달 말일 'YYYY-MM-DD' */
export function monthEnd(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${ym}-${String(last).padStart(2, '0')}`;
}

/* ══════════════ 자산번호 · 금액 · 상각률 ══════════════ */
/** 자산번호 = 취득일 YYYYMMDD + 같은 취득일 일련번호 4자리. 일련번호 = 그 날짜의 현재 최댓값 + 1 —
    남아 있는 번호와는 겹치지 않고 중간 빈 번호는 다시 쓰지 않는다(최댓값 번호를 지운 뒤면 그 번호가 다시 나올 수 있다) */
export function nextAssetNo(assets: readonly Pick<FixedAsset, 'assetNo'>[], acqDate: string): string {
  const head = ymd(acqDate);
  const max = assets.filter((a) => a.assetNo.startsWith(head) && a.assetNo.length === 12)
    .reduce((m, a) => Math.max(m, Number(a.assetNo.slice(8)) || 0), 0);
  return head + String(max + 1).padStart(4, '0');
}
/** 취득원가 C = 구입가액 A + 부대비용 B */
export const acqCost = (purchase: number | null, extra: number | null): number => (purchase ?? 0) + (extra ?? 0);
/** 상각률(소수 3자리) — 정액법 = 1/n · 정률법 = 1 − 0.05^(1/n)(잔존가치 5% 근사). n 이 없으면 null */
export function deprRate(kind: DeprKind | '', life: number | null): number | null {
  if (!kind || !life || life <= 0) return null;
  const r = kind === '정액법' ? 1 / life : 1 - Math.pow(0.05, 1 / life);
  return Math.round(r * 1000) / 1000;
}
/** 상각률 표시 — 0.451 → '45.1%' */
export const rateLabel = (r: number | null): string => (r == null ? '' : `${String(Math.round(r * 1000) / 10)}%`);

/* ══════════════ 현재 상태 파생 ══════════════ */
export interface AssetView extends FixedAsset {
  cost: number;            // 취득원가
  prevBook: number;        // 전기말장부가액 = 취득원가 − 전기말상각누계액
  remainQty: number;       // 현재 수량 = 취득 수량 − Σ처리수량
  residual: number;        // 잔존가액 = 취득원가 − 감가상각누계액 − Σ취득가액 감소액
  status: AssetStatus;     // 잔여수량 0 이면 마지막 변동구분(처분/불용)
  changeCount: number;
  lastChangeDate: string;  // 최근 변동일(없으면 '') — 새 변동일 하한
}
const changesOf = (changes: readonly AssetChange[], assetId: string) =>
  changes.filter((c) => c.assetId === assetId).sort((a, b) => a.seq - b.seq);

export function deriveAsset(a: FixedAsset, changes: readonly AssetChange[]): AssetView {
  const mine = changesOf(changes, a.id);
  const cost = acqCost(a.purchase, a.extra);
  const used = mine.reduce((s, c) => s + c.qty, 0);
  const dec = mine.reduce((s, c) => s + c.decrease, 0);
  const remainQty = a.qty - used;
  const last = mine[mine.length - 1];
  return {
    ...a, cost, prevBook: cost - a.prevAccum, remainQty,
    residual: cost - a.accum - dec,
    status: remainQty <= 0 && last ? last.kind : a.baseStatus,
    changeCount: mine.length,
    lastChangeDate: mine.reduce((m, c) => (c.date > m ? c.date : m), ''),
  };
}

/* ══════════════ 등록/수정 검증(slide13 ③ — 화면 순서대로 첫 미충족) ══════════════ */
export type AssetField = 'fund' | 'assetType' | 'name' | 'purchase' | 'qtyPrice' | 'acqKind' | 'acqDate' | 'deprKind' | 'life';
export const ASSET_MSG = {
  fund: '계정구분을 선택해 주세요.',
  assetType: '자산유형을 선택해 주세요.',
  name: '자산명을 입력해 주세요.',
  purchase: '구입가액을 입력해 주세요.',
  qtyPrice: '수량과 단가를 입력해 주세요.',
  acqKind: '취득구분을 선택해 주세요.',
  acqDate: '취득일자를 확인해 주세요.',
  deprKind: '상각구분을 선택해 주세요.',
  life: '내용년수를 확인해 주세요.',
  slipLocked: '전표가 생성된 자산은 금액·취득일자를 수정할 수 없습니다.',
  saved: '저장되었습니다.',
} as const;
export interface AssetInput {
  fund: string; assetType: string; name: string; purchase: number | null; qty: number | null; unitPrice: number | null;
  acqKind: string; acqDate: string; deprKind: string; life: number | null;
}
export type Check<F extends string> = { ok: true } | { ok: false; field: F; message: string };
export function validateAsset(v: AssetInput): Check<AssetField> {
  const fail = (field: AssetField): Check<AssetField> => ({ ok: false, field, message: ASSET_MSG[field] });
  if (!v.fund) return fail('fund');
  if (!v.assetType || !findType(v.fund, v.assetType)) return fail('assetType');
  if (!v.name.trim()) return fail('name');
  if (v.purchase == null || v.purchase < 1) return fail('purchase');   // 0 원도 미입력으로 본다
  if (v.qty == null || v.qty < 1 || v.unitPrice == null) return fail('qtyPrice');
  if (!v.acqKind) return fail('acqKind');
  if (!isIsoDate(v.acqDate)) return fail('acqDate');
  if (!v.deprKind) return fail('deprKind');
  if (v.life == null || !Number.isInteger(v.life) || v.life < 1 || v.life > 99) return fail('life');   // 설계서 밖 — 상각률 산식 정의역
  return { ok: true };
}

/** 등록/수정 저장값(모달 → 페이지). 상각 값·전표 값은 원장이 소유 */
export interface AssetPatch {
  fund: FaFund; assetType: string; name: string; model: string; purchase: number; extra: number; qty: number; unitPrice: number;
  spec: string; unit: string; acqKind: AcqKind; acqDate: string; supplier: string; vehicleNo: string; maker: string; makeDate: string;
  deprKind: DeprKind; life: number; userKind: UserKind; userName: string; location: string; memo: string; files: string;
}
/** 등록 = 채번 + 새 행(맨 앞) · 수정 = 자산번호 유지(취득일자를 바꾸면 새 취득일로 재채번).
    전표 생성 자산·변동내역이 있는 자산은 계정구분·자산유형·금액·수량·단가·취득일자를 원장 값으로 고정
    (전표 분개 계정·변동 스냅샷 A·B·취득원가 해당분·'변동일 ≥ 취득일'이 어긋나지 않게) */
export function commitAsset(assets: readonly FixedAsset[], patch: AssetPatch, editId?: string, opts: { hasChanges?: boolean } = {}): { assets: FixedAsset[]; saved: FixedAsset } {
  if (editId) {
    const cur = assets.find((a) => a.id === editId);
    if (!cur) throw new Error('자산 없음: ' + editId);
    const locked = cur.slipNo || opts.hasChanges
      ? { fund: cur.fund, assetType: cur.assetType, purchase: cur.purchase, extra: cur.extra, qty: cur.qty, unitPrice: cur.unitPrice, acqDate: cur.acqDate } : {};
    const next: FixedAsset = { ...cur, ...patch, ...locked };
    const assetNo = next.acqDate === cur.acqDate ? cur.assetNo : nextAssetNo(assets.filter((a) => a.id !== editId), next.acqDate);
    const saved: FixedAsset = { ...next, assetNo };
    return { assets: assets.map((a) => (a.id === editId ? saved : a)), saved };
  }
  const maxId = assets.reduce((m, a) => Math.max(m, Number(a.id.replace(/\D/g, '')) || 0), 0);
  const saved: FixedAsset = {
    ...patch, id: 'fa-' + String(maxId + 1).padStart(3, '0'), assetNo: nextAssetNo(assets, patch.acqDate),
    prevAccum: 0, accum: 0, baseStatus: '미상각', slipNo: null, approval: null,
  };
  return { assets: [saved, ...assets], saved };
}

/* ══════════════ 변동(처분·불용) — slide14 ══════════════ */
/** F = A ÷ B × C (원 미만 반올림) */
export const calcDecrease = (bookBefore: number, qtyBefore: number, qty: number): number =>
  (qtyBefore > 0 ? Math.round((bookBefore / qtyBefore) * qty) : 0);
/** H = D − E − G + F */
export const calcGain = (d: number, e: number, g: number, f: number): number => d - e - g + f;

export const CHANGE_MSG = {
  noSelection: '변동 처리할 자산을 총괄 탭에서 1건 선택해 주세요.',
  multi: '1건만 선택해 주세요.',
  noRemain: '변동 처리할 잔여수량이 없습니다.',
  kind: '변동구분을 선택해 주세요.',
  date: '변동일을 확인해 주세요.',
  proc: '처리구분을 선택해 주세요.',
  qty: '처리수량은 1 ~ 잔여수량 사이로 입력해 주세요.',
  sale: '매각액을 입력해 주세요.',
  saved: '저장되었습니다.',
} as const;

/** E04 진입 게이트 — 총괄 선택 1건 · 잔여수량 > 0 */
export function changeOpenGate(views: readonly AssetView[], ids: readonly string[]): { ok: true; asset: AssetView } | { ok: false; message: string } {
  if (ids.length === 0) return { ok: false, message: CHANGE_MSG.noSelection };
  if (ids.length > 1) return { ok: false, message: CHANGE_MSG.multi };
  const a = views.find((v) => v.id === ids[0]);
  if (!a) return { ok: false, message: CHANGE_MSG.noSelection };
  if (a.remainQty <= 0) return { ok: false, message: CHANGE_MSG.noRemain };
  return { ok: true, asset: a };
}

export interface ChangeInput { kind: ChangeKind | ''; date: string; proc: ProcKind | ''; qty: number | null; sale: number | null; memo: string }
export type ChangeField = 'kind' | 'date' | 'proc' | 'qty' | 'sale';
/** 처리수량 실효값 — 전체 = 잔여수량 자동 */
export const effectiveQty = (proc: ProcKind | '', qty: number | null, remain: number): number | null => (proc === '전체' ? remain : qty);
/** 매각액 실효값 — 불용 = 0 */
export const effectiveSale = (kind: ChangeKind | '', sale: number | null): number | null => (kind === '불용' ? 0 : sale);

export function validateChange(asset: AssetView, v: ChangeInput): Check<ChangeField> {
  const fail = (field: ChangeField): Check<ChangeField> => ({ ok: false, field, message: CHANGE_MSG[field] });
  if (!v.kind) return fail('kind');
  if (!isIsoDate(v.date) || v.date < asset.acqDate || v.date < asset.lastChangeDate) return fail('date');   // 취득일·같은 자산 최근 변동일 이전 불가
  if (!v.proc) return fail('proc');
  const c = effectiveQty(v.proc, v.qty, asset.remainQty);
  if (c == null || !Number.isInteger(c) || c < 1 || c > asset.remainQty) return fail('qty');
  if (v.kind === '처분' && v.sale == null) return fail('sale');
  return { ok: true };
}

/** 변동 미리보기 — A(미상각잔액) B(잔여수량) C D E F G H + 분개용 취득원가·상각누계 해당분.
    D·G 는 취득 수량 대비 처리수량 비율로 안분(당기상각 = 감가상각누계 − 전기말누계). 마지막 잔량 처리면 취득원가 잔액 전부 */
export interface ChangeCalc { A: number; B: number; C: number | null; D: number; E: number; F: number; G: number; H: number; costPart: number; accumPart: number }
export function previewChange(asset: AssetView, changes: readonly AssetChange[], v: Pick<ChangeInput, 'kind' | 'proc' | 'qty' | 'sale'>): ChangeCalc {
  const A = asset.residual;
  const B = asset.remainQty;
  const C = effectiveQty(v.proc, v.qty, B);
  const E = effectiveSale(v.kind, v.sale) ?? 0;
  const ratio = C != null && asset.qty > 0 ? C / asset.qty : 0;
  const D = Math.round((asset.accum - asset.prevAccum) * ratio);
  const G = Math.round(asset.prevAccum * ratio);
  const F = C != null ? calcDecrease(A, B, C) : 0;
  const prevCost = changesOf(changes, asset.id).reduce((s, c) => s + c.costPart, 0);
  const costPart = C == null ? 0 : C === B ? asset.cost - prevCost : Math.round(asset.cost * ratio);
  return { A, B, C, D, E, F, G, H: calcGain(D, E, G, F), costPart, accumPart: costPart - F };
}

/** 변동 저장 — 스냅샷을 담아 추가. 총괄 수량·잔존가액·자산상태는 deriveAsset 이 다시 계산한다 */
export function commitChange(changes: readonly AssetChange[], asset: AssetView, v: ChangeInput): { changes: AssetChange[]; saved: AssetChange } {
  const p = previewChange(asset, changes, v);
  const seq = changes.reduce((m, c) => Math.max(m, c.seq), 0) + 1;
  const saved: AssetChange = {
    id: 'fc-' + String(seq).padStart(3, '0'), seq, assetId: asset.id, date: v.date,
    kind: v.kind as ChangeKind, proc: v.proc as ProcKind, qty: p.C ?? 0, sale: p.E,
    bookBefore: p.A, qtyBefore: p.B, decrease: p.F, deprPart: p.D, prevAccumPart: p.G, gain: p.H,
    costPart: p.costPart, accumPart: p.accumPart, memo: v.memo, slipNo: null, approval: null,
  };
  return { changes: [...changes, saved], saved };
}

/* ══════════════ 삭제 게이트(E07 — 조건 밖 건이 하나라도 있으면 전체 중단) ══════════════ */
export const DELETE_MSG = {
  noSelection: '삭제할 자산을 선택해 주세요.',
  slip: '전표가 생성된 자산은 삭제할 수 없습니다.',
  hasChanges: '변동내역이 있는 자산은 삭제할 수 없습니다.',
  noChangeSelection: '삭제할 변동내역을 선택해 주세요.',
  changeSlip: '전표가 생성된 변동내역은 삭제할 수 없습니다.',
  notLatest: '최근 변동내역부터 삭제할 수 있습니다.',
  done: '삭제되었습니다.',
} as const;
/** 총괄 삭제 — 전표 생성 사유가 변동내역 사유보다 우선 */
export function deleteAssetGate(assets: readonly FixedAsset[], changes: readonly AssetChange[], ids: readonly string[]): string | null {
  if (!ids.length) return DELETE_MSG.noSelection;
  const picked = assets.filter((a) => ids.includes(a.id));
  if (picked.some((a) => a.slipNo)) return DELETE_MSG.slip;
  if (picked.some((a) => changes.some((c) => c.assetId === a.id))) return DELETE_MSG.hasChanges;
  return null;
}
/** 변동내역 삭제(= 변동 취소) — 전표 생성 건 차단 · 같은 자산의 나중 변동이 남으면 차단(저장 스냅샷 A·B 가 어긋나지 않게) */
export function cancelChangeGate(changes: readonly AssetChange[], ids: readonly string[]): string | null {
  if (!ids.length) return DELETE_MSG.noChangeSelection;
  const sel = new Set(ids);
  const picked = changes.filter((c) => sel.has(c.id));
  if (picked.some((c) => c.slipNo)) return DELETE_MSG.changeSlip;
  const later = picked.some((p) => changes.some((c) => c.assetId === p.assetId && c.seq > p.seq && !sel.has(c.id)));
  return later ? DELETE_MSG.notLatest : null;
}

/* ══════════════ 상세필터 ══════════════ */
export interface FaFilter { ym: string; fund: string; assetType: string; assetNo: string; name: string; from: string; to: string }
export const defaultFilter = (today: string): FaFilter => ({ ym: today.slice(0, 7), fund: '', assetType: '', assetNo: '', name: '', from: '', to: '' });
export const FILTER_MSG = { range: '취득기간을 확인해 주세요.' } as const;
/** 상세필터는 즉시 반영 — 취득기간 시작 > 종료면 그 항목 인라인 오류 + 그 범위 조건만 무시한다 */
export const rangeError = (f: Pick<FaFilter, 'from' | 'to'>): string | null => (f.from && f.to && f.from > f.to ? FILTER_MSG.range : null);
export const effectiveFilter = (f: FaFilter): FaFilter => (rangeError(f) ? { ...f, from: '', to: '' } : f);
/** 자산 조건(기준년월 말까지 취득한 자산 · 계정구분 · 자산유형 · 자산번호/자산명 부분일치 · 취득기간). 범위 오류는 effectiveFilter 로 먼저 지운다 */
export function assetPasses(a: FixedAsset, f: FaFilter): boolean {
  if (f.ym && a.acqDate > monthEnd(f.ym)) return false;
  if (f.fund && a.fund !== f.fund) return false;
  if (f.assetType && a.assetType !== f.assetType) return false;
  if (f.assetNo.trim() && !a.assetNo.includes(f.assetNo.trim())) return false;
  if (f.name.trim() && !a.name.includes(f.name.trim())) return false;
  if (f.from && a.acqDate < f.from) return false;
  if (f.to && a.acqDate > f.to) return false;
  return true;
}
/** 기준년월 말까지의 변동만 반영 */
export const changesUntil = (changes: readonly AssetChange[], ym: string): AssetChange[] => {
  const end = ym ? monthEnd(ym) : '9999-12-31';
  return changes.filter((c) => c.date <= end);
};
/** 계정구분 바뀌면 그 계정구분에 없는 자산유형은 비운다 */
export const reconcileType = <T extends { fund: string; assetType: string }>(f: T): T =>
  (f.assetType && f.fund && !findType(f.fund, f.assetType) ? { ...f, assetType: '' } : f);

/* ══════════════ 그리드 행(그룹 + (계) 소계) ══════════════ */
/** 그룹 라벨 표시 — 페이지 첫 행은 항상 보이고, 그 밖엔 같은 페이지 직전 행과 같은 그룹이면 숨긴다(셀 병합 흉내).
    계정구분 = 계정구분이 같으면 숨김 · 자산유형 = 계정구분·자산유형이 모두 같으면 숨김 */
export function showGroupLabel(prev: { fund: string; assetType: string } | null, cur: { fund: string; assetType: string }, level: 'fund' | 'assetType'): boolean {
  if (!prev) return true;
  return level === 'fund' ? prev.fund !== cur.fund : prev.fund !== cur.fund || prev.assetType !== cur.assetType;
}
const fundOrder = (f: string) => (FA_FUNDS as readonly string[]).indexOf(f);
const typeOrder = (fund: FaFund, t: string) => { const i = ASSET_TYPES[fund].findIndex((x) => x.name === t); return i < 0 ? 99 : i; };

export interface SummaryRow {
  id: string; kind: 'asset' | 'sub' | 'total'; no: number | null;
  fund: string; assetType: string;              // 모든 행(소계 포함)에 값 — 화면은 같은 페이지 직전 행과 같은 그룹이면 숨긴다
  assetNo: string; name: string; acqDate: string;   // 소계 행 acqDate = '(계)'
  cost: number; qty: number | null; prevBook: number; prevAccum: number; accum: number; residual: number;
  acqKind: string; status: string; deprKind: string; life: number | null; userKind: string;
  slipNo: string | null; approval: VoucherStatus | null;
}
const SUM_KEYS = ['cost', 'prevBook', 'prevAccum', 'accum', 'residual'] as const;

/** 공용 그룹핑 — 계정구분 > 자산유형 순, 그룹마다 (계) 소계 행. key 함수는 그룹 기준(계정구분·자산유형)을 준다 */
function grouped<T, R>(items: readonly T[], keyOf: (t: T) => { fund: FaFund; assetType: string }, toRow: (t: T, no: number) => R,
  toSub: (fund: FaFund, type: string, members: readonly T[]) => R): R[] {
  const sorted = [...items].sort((a, b) => {
    const ka = keyOf(a), kb = keyOf(b);
    return fundOrder(ka.fund) - fundOrder(kb.fund) || typeOrder(ka.fund, ka.assetType) - typeOrder(kb.fund, kb.assetType);
  });
  const out: R[] = [];
  let no = 0; let i = 0;
  while (i < sorted.length) {
    const k = keyOf(sorted[i]);
    const members: T[] = [];
    while (i < sorted.length && keyOf(sorted[i]).fund === k.fund && keyOf(sorted[i]).assetType === k.assetType) members.push(sorted[i++]);
    members.forEach((m) => out.push(toRow(m, ++no)));
    out.push(toSub(k.fund, k.assetType, members));
  }
  return out;
}

export function summaryRows(views: readonly AssetView[]): SummaryRow[] {
  const sortedViews = [...views].sort((a, b) => a.assetNo.localeCompare(b.assetNo));
  return grouped(sortedViews, (v) => ({ fund: v.fund, assetType: v.assetType }),
    (v, no) => ({
      id: v.id, kind: 'asset', no, fund: v.fund, assetType: v.assetType,
      assetNo: v.assetNo, name: v.name, acqDate: v.acqDate,
      cost: v.cost, qty: v.remainQty, prevBook: v.prevBook, prevAccum: v.prevAccum, accum: v.accum, residual: v.residual,
      acqKind: v.acqKind, status: v.status, deprKind: v.deprKind, life: v.life, userKind: v.userKind,
      slipNo: v.slipNo, approval: v.approval,
    }),
    (fund, type, ms) => ({
      ...emptySummary(`sub:${fund}:${type}`, 'sub'), fund, assetType: type, acqDate: '(계)',
      ...Object.fromEntries(SUM_KEYS.map((k) => [k, ms.reduce((s, m) => s + m[k], 0)])),
    }) as SummaryRow);
}
const emptySummary = (id: string, kind: SummaryRow['kind']): SummaryRow => ({
  id, kind, no: null, fund: '', assetType: '', assetNo: '', name: '', acqDate: '',
  cost: 0, qty: null, prevBook: 0, prevAccum: 0, accum: 0, residual: 0,
  acqKind: '', status: '', deprKind: '', life: null, userKind: '', slipNo: null, approval: null,
});
/** Σ 합계 — 자산 행만 더한다(소계 이중 합산 방지) */
export function summaryTotal(rows: readonly SummaryRow[]): SummaryRow {
  const items = rows.filter((r) => r.kind === 'asset');
  return { ...emptySummary('total', 'total'), ...Object.fromEntries(SUM_KEYS.map((k) => [k, items.reduce((s, r) => s + r[k], 0)])) } as SummaryRow;
}

export interface ChangeRow {
  id: string; kind: 'change' | 'sub' | 'total'; no: number | null;
  fund: string; assetType: string; assetNo: string; name: string;
  date: string; chKind: string; proc: string;      // 소계 행 proc = '(계)'
  qty: number | null; sale: number | null; residual: number | null; remain: number | null; decrease: number | null;
  slipNo: string | null; approval: VoucherStatus | null;
}
const CHANGE_SUM_KEYS = ['qty', 'sale', 'decrease'] as const;
const emptyChange = (id: string, kind: ChangeRow['kind']): ChangeRow => ({
  id, kind, no: null, fund: '', assetType: '', assetNo: '', name: '', date: '', chKind: '', proc: '',
  qty: null, sale: null, residual: null, remain: null, decrease: null, slipNo: null, approval: null,
});
type Joined = { c: AssetChange; a: FixedAsset };
export function changeRows(changes: readonly AssetChange[], assets: readonly FixedAsset[]): ChangeRow[] {
  const joined: Joined[] = changes
    .map((c) => ({ c, a: assets.find((x) => x.id === c.assetId) }))
    .filter((j): j is Joined => !!j.a)
    .sort((x, y) => x.c.date.localeCompare(y.c.date) || x.c.seq - y.c.seq);
  return grouped(joined, (j) => ({ fund: j.a.fund, assetType: j.a.assetType }),
    ({ c, a }, no) => ({
      id: c.id, kind: 'change', no, fund: a.fund, assetType: a.assetType,
      assetNo: a.assetNo, name: a.name, date: c.date, chKind: c.kind, proc: c.proc,
      qty: c.qty, sale: c.sale, residual: c.bookBefore - c.decrease, remain: c.qtyBefore - c.qty, decrease: c.decrease,
      slipNo: c.slipNo, approval: c.approval,
    }),
    (fund, type, ms) => ({
      ...emptyChange(`sub:${fund}:${type}`, 'sub'), fund, assetType: type, proc: '(계)',
      qty: ms.reduce((s, m) => s + m.c.qty, 0), sale: ms.reduce((s, m) => s + m.c.sale, 0), decrease: ms.reduce((s, m) => s + m.c.decrease, 0),
    }));
}
export function changeTotal(rows: readonly ChangeRow[]): ChangeRow {
  const items = rows.filter((r) => r.kind === 'change');
  return { ...emptyChange('total', 'total'), ...Object.fromEntries(CHANGE_SUM_KEYS.map((k) => [k, items.reduce((s, r) => s + (r[k] ?? 0), 0)])) } as ChangeRow;
}

/* ══════════════ 전표생성(E06) ══════════════ */
export type VoucherKind = '자산취득' | '처분·불용';
export interface JournalLine { side: '차변' | '대변'; account: string; note: string; debit: number; credit: number }
export interface VoucherDraft { fund: FaFund; kind: VoucherKind; ids: string[]; count: number; date: string; memo: string; lines: JournalLine[] }
export const VOUCHER_MSG = {
  noSelection: '전표를 생성할 자산을 선택해 주세요.',
  allDone: '선택한 건은 모두 전표가 생성되었습니다.',
  excluded: (n: number) => `이미 전표가 생성된 ${String(n)}건은 제외됩니다.`,
  date: '전표일자를 입력해 주세요.',
  memo: '적요를 입력해 주세요.',
  unbalanced: '차변과 대변 합계가 일치하지 않습니다.',
  done: (n: number) => `전표 ${String(n)}건이 생성되었습니다.`,
} as const;

export const ACCOUNT = { payable: '미지급금', accum: '감가상각누계액', cash: '현금', loss: '유형자산처분손실', gain: '유형자산처분이익' } as const;

/** 적요 기본값 — "유무형자산 취득 — {계정구분} · {자산명} 외 N건"(1건이면 "외 N건" 없음) */
export function defaultMemo(kind: VoucherKind, fund: string, names: readonly string[]): string {
  const head = kind === '자산취득' ? '유무형자산 취득' : '유무형자산 처분';
  const rest = names.length > 1 ? ` 외 ${String(names.length - 1)}건` : '';
  return `${head} — ${fund} · ${names[0] ?? ''}${rest}`;
}

function groupByFund<T>(items: readonly T[], fundOf: (t: T) => FaFund): [FaFund, T[]][] {
  return FA_FUNDS.map((f) => [f, items.filter((t) => fundOf(t) === f)] as [FaFund, T[]]).filter(([, xs]) => xs.length > 0);
}
const maxDate = (ds: readonly string[]) => ds.reduce((m, d) => (d > m ? d : m), '');
/** 같은 계정과목 줄은 합친다(입력 순서 유지) */
function mergeLines(lines: readonly JournalLine[]): JournalLine[] {
  const out: JournalLine[] = [];
  for (const l of lines) {
    if (l.debit === 0 && l.credit === 0) continue;
    const hit = out.find((o) => o.side === l.side && o.account === l.account);
    if (hit) { hit.debit += l.debit; hit.credit += l.credit; } else out.push({ ...l });
  }
  return out;
}

/** 자산취득 분개 — 차) 자산유형 계정(취득원가) / 대) 미지급금(취득구분 무관 — 계정 매핑 확정 전) */
export function acquisitionLines(views: readonly AssetView[]): JournalLine[] {
  const total = views.reduce((s, v) => s + v.cost, 0);
  return mergeLines([
    ...views.map((v): JournalLine => ({ side: '차변', account: v.assetType, note: '자산유형 계정', debit: v.cost, credit: 0 })),
    { side: '대변', account: ACCOUNT.payable, note: '취득구분: ' + [...new Set(views.map((v) => v.acqKind))].join('·'), debit: 0, credit: total },
  ]);
}
/** 처분·불용 분개 — 차) 감가상각누계액 · 현금(매각액) · 처분손실 / 대) 자산유형 계정(취득원가 해당분) · 처분이익.
    손익 = F − E(장부가 − 매각액)로 맞춰 차대가 항상 일치한다(설계서 H 산식은 화면 표시용) */
export function disposalLines(items: readonly { c: AssetChange; a: FixedAsset }[]): JournalLine[] {
  const lines: JournalLine[] = [];
  for (const { c, a } of items) {
    const pl = c.decrease - c.sale;
    lines.push({ side: '차변', account: ACCOUNT.accum, note: '', debit: c.accumPart, credit: 0 });
    if (c.sale > 0) lines.push({ side: '차변', account: ACCOUNT.cash, note: '매각액', debit: c.sale, credit: 0 });
    if (pl > 0) lines.push({ side: '차변', account: ACCOUNT.loss, note: '', debit: pl, credit: 0 });
    lines.push({ side: '대변', account: a.assetType, note: '자산유형 계정', debit: 0, credit: c.costPart });
    if (pl < 0) lines.push({ side: '대변', account: ACCOUNT.gain, note: '', debit: 0, credit: -pl });
  }
  const merged = mergeLines(lines);
  return [...merged.filter((l) => l.side === '차변'), ...merged.filter((l) => l.side === '대변')];
}
export const lineSum = (lines: readonly JournalLine[]) => ({ debit: lines.reduce((s, l) => s + l.debit, 0), credit: lines.reduce((s, l) => s + l.credit, 0) });
export const isBalanced = (lines: readonly JournalLine[]) => { const t = lineSum(lines); return lines.length > 0 && t.debit === t.credit; };

type Prepared = { ok: true; excluded: number; drafts: VoucherDraft[] } | { ok: false; message: string };
/** E06 총괄 — 선택 중 미생성 건만 계정구분별 전표 1건 */
export function prepareAcquisition(views: readonly AssetView[], ids: readonly string[]): Prepared {
  if (!ids.length) return { ok: false, message: VOUCHER_MSG.noSelection };
  const picked = views.filter((v) => ids.includes(v.id));
  const pending = picked.filter((v) => !v.slipNo);
  if (!pending.length) return { ok: false, message: VOUCHER_MSG.allDone };
  const drafts = groupByFund(pending, (v) => v.fund).map(([fund, vs]): VoucherDraft => ({
    fund, kind: '자산취득', ids: vs.map((v) => v.id), count: vs.length, date: maxDate(vs.map((v) => v.acqDate)),
    memo: defaultMemo('자산취득', fund, vs.map((v) => v.name)), lines: acquisitionLines(vs),
  }));
  return { ok: true, excluded: picked.length - pending.length, drafts };
}
/** E06 변동내역 — 선택 중 미생성 변동만 계정구분별 전표 1건 */
export function prepareDisposal(changes: readonly AssetChange[], assets: readonly FixedAsset[], ids: readonly string[]): Prepared {
  if (!ids.length) return { ok: false, message: VOUCHER_MSG.noSelection };
  const picked = changes.filter((c) => ids.includes(c.id));
  const pending = picked.map((c) => ({ c, a: assets.find((a) => a.id === c.assetId) })).filter((j): j is { c: AssetChange; a: FixedAsset } => !!j.a && !j.c.slipNo);
  if (!pending.length) return { ok: false, message: VOUCHER_MSG.allDone };
  const drafts = groupByFund(pending, (j) => j.a.fund).map(([fund, js]): VoucherDraft => ({
    fund, kind: '처분·불용', ids: js.map((j) => j.c.id), count: js.length, date: maxDate(js.map((j) => j.c.date)),
    memo: defaultMemo('처분·불용', fund, js.map((j) => j.a.name)), lines: disposalLines(js),
  }));
  return { ok: true, excluded: picked.length - pending.length, drafts };
}

/** [생성] 검증 — 탭(계정구분) 순서대로 첫 미충족. index = 문제 탭 */
export function validateVouchers(drafts: readonly VoucherDraft[]): { ok: true } | { ok: false; index: number; field: 'date' | 'memo' | 'lines'; message: string } {
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    if (!isIsoDate(d.date)) return { ok: false, index: i, field: 'date', message: VOUCHER_MSG.date };
    if (!d.memo.trim()) return { ok: false, index: i, field: 'memo', message: VOUCHER_MSG.memo };
    if (!isBalanced(d.lines)) return { ok: false, index: i, field: 'lines', message: VOUCHER_MSG.unbalanced };
  }
  return { ok: true };
}
/** 전표번호 = 전표일자 YYYYMMDD-NNN(같은 날짜 최댓값 + 1) */
export function nextSlipNo(taken: readonly string[], date: string): string {
  const head = ymd(date) + '-';
  const max = taken.filter((s) => s.startsWith(head)).reduce((m, s) => Math.max(m, Number(s.slice(head.length)) || 0), 0);
  return head + String(max + 1).padStart(3, '0');
}
/** 생성 — 전표마다 채번, 대상 행에 전표번호 + 결재상태 '미상신' */
export function commitVouchers(assets: readonly FixedAsset[], changes: readonly AssetChange[], drafts: readonly VoucherDraft[]): { assets: FixedAsset[]; changes: AssetChange[]; slipNos: string[] } {
  const taken = [...assets.map((a) => a.slipNo), ...changes.map((c) => c.slipNo)].filter((s): s is string => !!s);
  const byId = new Map<string, string>();
  const slipNos: string[] = [];
  for (const d of drafts) {
    const no = nextSlipNo(taken, d.date);
    taken.push(no); slipNos.push(no);
    d.ids.forEach((id) => byId.set(id, no));
  }
  const stamp = <T extends { id: string; slipNo: string | null; approval: VoucherStatus | null }>(x: T): T =>
    (byId.has(x.id) ? { ...x, slipNo: byId.get(x.id) ?? null, approval: '미상신' } : x);
  return { assets: assets.map(stamp), changes: changes.map(stamp), slipNos };
}

/* ══════════════ 시드 ══════════════ */
/** 화면 초기 상태 — 원장 + 변동내역(CHANGE_SEEDS 를 commitChange 로 순서대로 쌓는다) */
export function demoFixedAssets(): { assets: FixedAsset[]; changes: AssetChange[] } {
  const assets = demoAssets();
  let changes: AssetChange[] = [];
  for (const [no, date, kind, proc, qty, sale, slip] of CHANGE_SEEDS) {
    const a = assets.find((x) => x.assetNo === no);
    if (!a) continue;
    const res = commitChange(changes, deriveAsset(a, changes), { kind, date, proc, qty, sale, memo: '' });
    changes = slip ? res.changes.map((c) => (c.id === res.saved.id ? { ...c, slipNo: slip[0], approval: slip[1] } : c)) : res.changes;
  }
  return { assets, changes };
}
