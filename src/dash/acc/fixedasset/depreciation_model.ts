/* 감가상각비처리(ACC-018) 순수 모델 — 상각액 자동계산(slide 10 ③) · 저장 게이트(E02) · 기간별 저장/삭제 원장 · 계정 매핑 검증(E03).
   페이지(depreciation_manage)는 배선만 한다.

   산식(slide 10 ③ — 기준년월 2026-10 예시를 테스트 기대값으로 고정)
   - 정액법 월 상각액 = (취득금액 − 잔존가치) ÷ 내용년수 ÷ 12 (원 미만 반올림)
   - 정률법 월 상각액 = (취득금액 − 전기말상각누계액) × 상각률 ÷ 12 (원 미만 반올림). 상각률은 천분율 정수(451 = 0.451)로 계산한다
     — 5,490,000 × 0.451 ÷ 12 = 206,332.5 가 정확히 .5 라 부동소수 오차로 206,332 가 나올 수 있어서.
   - 미상각잔액 = 취득금액 − 전기말상각누계액 − 당기 상각누계액(당기 1월 또는 취득월 ~ 기준년월, 종료월까지)

   결정·가정
   - 전기말상각누계액은 저장값이 아니라 계산값이다 — 기준년월 연도의 전년 12월까지 누계. 정액법 = 월 상각액 × 경과 월수,
     정률법 = 연도별 (취득금액 − 누계) × 상각률 × 그해 상각 월수 ÷ 12 를 원 미만 반올림해 누적(예시 4,510,000 과 일치).
   - 상각 월수는 월할 — 취득월·종료월을 각각 한 달로 센다.
   - 종료일 = (취득월 + 내용년수 × 12 − 1)월의 말일(2025-01-02 · 5년 → 2029-12-31, slide 10 예시와 일치).
     상각 월수는 취득월 ~ 종료월 = 정확히 내용년수 × 12개월(61번째 달 없음).
   - 취득일이 기준년월 이후인 자산은 그 기준년월 목록에서 **제외**(아직 없는 자산). 종료일이 지난 자산은 **상각액 0 으로 표시**한다.
   - 상각 하한 = 잔존가치. 정액법은 종료월 상각액 = 상각가능액 − 전월까지 누계(반올림 차이 정리 — 종료월 뒤 미상각잔액 = 잔존가치).
     정률법은 클램프만 하고 종료월 잔액 일괄상각은 하지 않는다(설계서 미기재 — PM 확인). */
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import type { AcctMapping, DeprAsset, DeprFundAccount } from './depreciation_data';

export type SavedYn = '여' | '부';

export interface DeprRow extends DeprAsset {
  endDate: string;
  priorAccum: number;   // 전기말상각누계액
  amount: number;       // 상각액(기준년월 1개월분)
  remaining: number;    // 미상각잔액
  saved: SavedYn;
}

export const MSG = {
  saved: '저장되었습니다.',
  emptySave: '저장할 내역이 없습니다.',
  queried: '조회되었습니다.',
  noResult: '조회 결과가 없습니다.',   // 내보내기 0건 — 회계 장부조회(ledger_model MSG.noResult)와 같은 문구
  deleted: '삭제되었습니다.',
  deleteConfirm: '선택한 항목을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.',
  overwriteConfirm: '이미 저장된 내역이 있습니다. 재계산한 상각액으로 덮어쓰시겠습니까?',
  debitRequired: '차변 계정과목을 선택하세요.',
  creditRequired: '대변 계정과목을 선택하세요.',
} as const;

/* ── 날짜 ── */
const monthIdx = (ymOrDate: string) => Number(ymOrDate.slice(0, 4)) * 12 + Number(ymOrDate.slice(5, 7)) - 1;

/** 종료일 = (취득월 + 내용년수 × 12 − 1)월의 말일 — 월할 상각이라 취득월부터 정확히 내용년수 × 12개월 */
export function endDateOf(acqDate: string, life: number): string {
  return format(endOfMonth(addMonths(startOfMonth(new Date(acqDate + 'T00:00:00')), life * 12 - 1)), 'yyyy-MM-dd');
}

/** 기준년월 기본값 = 현재월 − 1(slide 9 구성1 · slide 10 ②) */
export function defaultYm(today: string): string {
  const i = monthIdx(today) - 1;
  return `${String(Math.floor(i / 12))}-${String((i % 12) + 1).padStart(2, '0')}`;
}

/* ── 상각률(정률법) — 천분율 정수. 법인세법 시행규칙 별표 상각률(내용년수 2~10), 그 밖은 1 − 0.05^(1/n) ── */
const RATE_PERMIL: Record<number, number> = { 2: 777, 3: 632, 4: 528, 5: 451, 6: 394, 7: 349, 8: 313, 9: 284, 10: 259 };
export const ratePermil = (life: number): number => RATE_PERMIL[life] ?? Math.round((1 - 0.05 ** (1 / life)) * 1000);

/** 해당 연도에 상각한 월수 — 취득월·종료월 포함, throughIdx(월 인덱스)까지 */
function activeMonths(a: DeprAsset, year: number, throughIdx: number): number {
  const from = Math.max(monthIdx(a.acqDate), year * 12);
  const to = Math.min(monthIdx(endDateOf(a.acqDate, a.life)), throughIdx, year * 12 + 11);
  return Math.max(0, to - from + 1);
}

/** 상각 가능 총액(취득금액 − 잔존가치) */
const depreciable = (a: DeprAsset) => Math.max(0, a.cost - a.residual);

/** 정액법 월 상각액 */
export const straightMonthly = (a: Pick<DeprAsset, 'cost' | 'residual' | 'life'>) => Math.round((a.cost - a.residual) / a.life / 12);
/** 정률법 월 상각액 */
export const decliningMonthly = (cost: number, priorAccum: number, permil: number) => Math.round(((cost - priorAccum) * permil) / 12000);

/** 정액법 누계(취득월 ~ throughIdx) — 종료월에 도달하면 상각가능액 전액(월 상각액 반올림 차이를 종료월에서 정리).
    종료월 상각액 = 상각가능액 − 전월까지 누계라 총합이 항상 상각가능액이다(올림이면 종료월이 작아지고, 내림이면 커진다) */
function straightCum(a: DeprAsset, throughIdx: number): number {
  const cap = depreciable(a);
  if (throughIdx >= monthIdx(endDateOf(a.acqDate, a.life))) return cap;
  return Math.min(straightMonthly(a) * Math.max(0, throughIdx - monthIdx(a.acqDate) + 1), cap);
}

/** 전기말상각누계액 — 기준년도 전년 12월까지 */
export function priorAccumOf(a: DeprAsset, baseYear: number): number {
  const cap = depreciable(a);
  const startYear = Number(a.acqDate.slice(0, 4));
  if (a.method === '정액법') return straightCum(a, baseYear * 12 - 1);
  /* 정률법은 종료월 잔액 정리(잔존가치까지 일괄상각)를 하지 않는다 — 설계서 미기재(PM 확인). 상각가능액 클램프만 */
  const permil = ratePermil(a.life);
  let accum = 0;
  for (let y = startYear; y < baseYear; y++) {
    const m = activeMonths(a, y, y * 12 + 11);
    accum = Math.min(accum + Math.round(((a.cost - accum) * permil * m) / 12000), cap);
  }
  return accum;
}

/** 기준년월 1행 계산. 취득일이 기준년월 이후면 null(목록 제외) */
export function calcRow(a: DeprAsset, ym: string): Omit<DeprRow, 'saved'> | null {
  const b = monthIdx(ym);
  if (b < monthIdx(a.acqDate)) return null;
  const year = Math.floor(b / 12);
  const priorAccum = priorAccumOf(a, year);
  if (a.method === '정액법') {
    const accNow = straightCum(a, b) - priorAccum;
    const amount = accNow - (straightCum(a, b - 1) - priorAccum);
    return { ...a, endDate: endDateOf(a.acqDate, a.life), priorAccum, amount, remaining: a.cost - priorAccum - accNow };
  }
  const monthly = decliningMonthly(a.cost, priorAccum, ratePermil(a.life));
  const left = Math.max(0, depreciable(a) - priorAccum);
  const accPrev = Math.min(monthly * activeMonths(a, year, b - 1), left);
  const accNow = Math.min(monthly * activeMonths(a, year, b), left);
  return { ...a, endDate: endDateOf(a.acqDate, a.life), priorAccum, amount: accNow - accPrev, remaining: a.cost - priorAccum - accNow };
}

/* ── 기간 원장(계정구분 + 기준년월) ── */
export const periodKey = (account: DeprFundAccount, ym: string) => `${account}|${ym}`;
/** 기간 키 → 자산 id 목록. 저장 원장 = 그 기간에 저장된 행, 삭제 원장 = 그 기간 계산 결과에서 논리삭제한 행 */
export type PeriodLedger = Readonly<Record<string, readonly string[]>>;

/** 조회(E00·E04) — 계정구분·기준년월로 자산을 거르고 상각액을 계산한다. 자산번호 오름차순 */
export function buildRows(assets: readonly DeprAsset[], account: DeprFundAccount, ym: string, saved: PeriodLedger, deleted: PeriodLedger): DeprRow[] {
  const key = periodKey(account, ym);
  const savedIds = new Set(saved[key] ?? []);
  const deletedIds = new Set(deleted[key] ?? []);
  return assets
    .filter((a) => a.account === account && !deletedIds.has(a.id))
    .map((a) => calcRow(a, ym))
    .filter((r): r is Omit<DeprRow, 'saved'> => r !== null)
    .map((r) => ({ ...r, saved: savedIds.has(r.id) ? '여' : '부' } as DeprRow))
    .sort((x, y) => x.assetNo.localeCompare(y.assetNo));
}

/** E02 저장 게이트 — 대상 0건 · 이미 저장된 행 포함(덮어쓰기 확인) · 바로 저장 */
export type SaveGate = 'empty' | 'overwrite' | 'ok';
export function saveGate(rows: readonly DeprRow[]): SaveGate {
  if (rows.length === 0) return 'empty';
  return rows.some((r) => r.saved === '여') ? 'overwrite' : 'ok';
}

/** E02 저장 반영 — 그 기간 저장 원장을 현재 행 전체로 바꾼다(일괄 저장 · 덮어쓰기) */
export function commitSave(saved: PeriodLedger, key: string, rows: readonly DeprRow[]): PeriodLedger {
  return { ...saved, [key]: rows.map((r) => r.id) };
}

/** E06 삭제 — 그 기간 계산 결과에서 논리삭제(목록 제외). 저장 원장에서도 뺀다 */
export function commitDelete(saved: PeriodLedger, deleted: PeriodLedger, key: string, ids: readonly string[]): { saved: PeriodLedger; deleted: PeriodLedger } {
  const del = new Set(ids);
  return {
    saved: { ...saved, [key]: (saved[key] ?? []).filter((id) => !del.has(id)) },
    deleted: { ...deleted, [key]: [...new Set([...(deleted[key] ?? []), ...ids])] },
  };
}

/* ── E03 계정과목 설정 ── */
export type MappingSide = 'debit' | 'credit';
export interface MappingError { index: number; side: MappingSide; msg: string }

/** 저장 검증 — 화면 순서(위→아래, 좌→우) 첫 미충족 1건 */
export function validateMapping(rows: readonly AcctMapping[]): MappingError | null {
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i].debit.code) return { index: i, side: 'debit', msg: MSG.debitRequired };
    if (!rows[i].credit.code) return { index: i, side: 'credit', msg: MSG.creditRequired };
  }
  return null;
}

/** 입력 중 닫기 판정용 스냅샷 */
export const mappingSnapshot = (rows: readonly AcctMapping[]) => rows.map((r) => `${r.debit.code}/${r.credit.code}`).join('|');
