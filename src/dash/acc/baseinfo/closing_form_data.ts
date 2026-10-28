/* 결산양식 관리(ACC-002) — 더미 행·옵션·순수 모델 함수.
   행 상태(I 신규 · U 변경 · D 삭제)를 행에 싣고, 저장 전까지 D 행은 남겨 두어 복구할 수 있게 한다(E07).
   모든 함수는 입력 배열을 바꾸지 않고 새 배열을 돌려준다(테스트: closing_form.test.ts). */
import { ACCOUNTS } from '../account_data';

export type FormKind = '재무상태표' | '손익계산서';
export const FORM_KINDS: FormKind[] = ['재무상태표', '손익계산서'];

export type OutPos = '항목' | '1열' | '2열';
export const OUT_POS: OutPos[] = ['항목', '1열', '2열'];
export const LEVELS = [1, 2, 3, 4, 5, 6] as const;

/** '' = 조회 직후 그대로 · I 신규 · U 변경 · D 삭제(저장 전까지 복구 가능) */
export type RowStatus = '' | 'I' | 'U' | 'D';
/** 검증 대상 셀 */
export type ErrField = 'level' | 'acctName' | 'pos';

export interface ClosingRow {
  id: string;
  paren: boolean;          // 괄호 — 체크 시 출력명을 괄호로 감싸 출력
  level: number;           // 1~6
  name: string;            // 출력명
  nameEn: string;          // 출력명(영문)
  acctCode: string;        // 계정코드(검색 팝업으로만 채움)
  acctName: string;        // 계정코드명(검색 팝업으로만 채움)
  acctNameEn: string;      // 계정코드명(영문)
  pos: OutPos;             // 출력위치
  status: RowStatus;
  /** D 로 바뀌기 직전 상태 — 복구 시 되돌릴 값('' 또는 'U') */
  prev?: '' | 'U';
  /** 저장 검증에 걸린 셀 */
  err?: ErrField[];
}

let seq = 0;
/** 행 id — 조회마다 새로 발급한다(셀 입력칸의 로컬 상태가 같은 id 로 버린 편집을 붙들지 않게) */
export const nextRowId = () => `cf-${++seq}`;

const acctName = (code: string) => ACCOUNTS.find((a) => a.code === code)?.name ?? '';

type Seed = [paren: boolean, level: number, name: string, nameEn: string, code: string, acctNameEn: string, pos: OutPos];
const SEEDS: Record<FormKind, Seed[]> = {
  재무상태표: [
    [false, 1, '자산', 'Assets', '1000000', 'Assets', '항목'],
    [false, 2, 'I. 유동자산', 'I. Current assets', '1100000', 'Current assets', '1열'],
    [false, 3, '보통예금', 'Demand deposits', '1100100', 'Demand deposits', '2열'],
    [false, 3, '정기예금', 'Time deposits', '1100200', 'Time deposits', '2열'],
    [false, 3, '미수수익', 'Accrued income', '1100300', 'Accrued income', '2열'],
    [false, 3, '선급금', 'Advance payments', '1100400', 'Advance payments', '2열'],
    [false, 2, 'II. 비유동자산', 'II. Non-current assets', '1200000', 'Non-current assets', '1열'],
    [false, 3, '조합출자금', 'Fund contributions', '1200100', 'Fund contributions', '2열'],
    [true, 3, '비품', 'Equipment', '1200200', 'Equipment', '2열'],
    [false, 1, '부채', 'Liabilities', '2000000', 'Liabilities', '항목'],
    [false, 2, 'I. 유동부채', 'I. Current liabilities', '2100000', 'Current liabilities', '1열'],
    [false, 3, '미지급금', 'Accounts payable', '2100100', 'Accounts payable', '2열'],
    [false, 3, '예수금', 'Withholdings', '2100200', 'Withholdings', '2열'],
    [false, 1, '자본', 'Equity', '3000000', 'Equity', '항목'],
    [false, 2, 'I. 자본금', 'I. Capital stock', '3100000', 'Capital stock', '1열'],
    [false, 3, '출자금', 'Paid-in capital', '3100300', 'Paid-in capital', '2열'],
  ],
  손익계산서: [
    [false, 1, '수익', 'Revenue', '4000000', 'Revenue', '항목'],
    [false, 2, '이자수익', 'Interest income', '4100100', 'Interest income', '1열'],
    [false, 2, '배당금수익', 'Dividend income', '4100200', 'Dividend income', '1열'],
    [false, 2, '조합분배금수익', 'Fund distribution income', '4100300', 'Fund distribution income', '1열'],
    [false, 1, '비용', 'Expenses', '5000000', 'Expenses', '항목'],
    [false, 2, '관리보수', 'Management fees', '5100100', 'Management fees', '1열'],
    [false, 2, '지급수수료', 'Fees paid', '5100200', 'Fees paid', '1열'],
    [false, 2, '사무용품비', 'Office supplies', '5100300', 'Office supplies', '1열'],
    [true, 2, '감가상각비', 'Depreciation', '5100400', 'Depreciation', '1열'],
  ],
};

/** 양식구분별 저장본(더미 원천). 조회(E04)는 여기서 새 id 로 다시 만든다 */
export function seedRows(kind: FormKind): ClosingRow[] {
  return SEEDS[kind].map(([paren, level, name, nameEn, acctCode, acctNameEn, pos]) => ({
    id: nextRowId(), paren, level, name, nameEn, acctCode, acctName: acctName(acctCode), acctNameEn, pos, status: '',
  }));
}

/** 저장본 → 화면 행. 상태·오류 없이 새 id 로(셀 로컬 상태 초기화) */
export const reloadRows = (saved: readonly ClosingRow[]): ClosingRow[] =>
  saved.map(({ prev: _p, err: _e, ...r }) => ({ ...r, id: nextRowId(), status: '' as RowStatus }));

export const blankRow = (): ClosingRow => ({
  id: nextRowId(), paren: false, level: 1, name: '', nameEn: '', acctCode: '', acctName: '', acctNameEn: '', pos: '항목', status: 'I',
});

/** 편집·이동으로 바뀐 행의 상태. I 는 I 유지, D 는 D 로 두되 복구 시 U 가 되게 prev 를 올린다 */
function touched(r: ClosingRow): ClosingRow {
  if (r.status === 'I') return r;
  if (r.status === 'D') return { ...r, prev: 'U' };
  return { ...r, status: 'U' };
}

/** E02 행추가 — 목록 하단에 빈 I 행 */
export function appendBlank(rows: readonly ClosingRow[]): { rows: ClosingRow[]; id: string } {
  const r = blankRow();
  return { rows: [...rows, r], id: r.id };
}

/** E06 행삽입 — 선택 행 바로 위에 빈 I 행. 대상이 없으면 그대로 */
export function insertAbove(rows: readonly ClosingRow[], targetId: string): { rows: ClosingRow[]; id: string | null } {
  const i = rows.findIndex((r) => r.id === targetId);
  if (i < 0) return { rows: [...rows], id: null };
  const r = blankRow();
  return { rows: [...rows.slice(0, i), r, ...rows.slice(i)], id: r.id };
}

/** 셀 편집 — D 행은 편집 불가(무시). 편집한 칸의 오류 표시는 지운다 */
export function patchRow(rows: readonly ClosingRow[], id: string, patch: Partial<Pick<ClosingRow, 'paren' | 'level' | 'name' | 'nameEn' | 'acctCode' | 'acctName' | 'acctNameEn' | 'pos'>>): ClosingRow[] {
  return rows.map((r) => {
    if (r.id !== id || r.status === 'D') return r;
    const keys = Object.keys(patch) as ErrField[];
    const err = r.err?.filter((f) => !keys.includes(f) && !(f === 'acctName' && 'acctCode' in patch));
    const next = touched({ ...r, ...patch });
    return { ...next, err: err && err.length ? err : undefined };
  });
}

/** E07 행삭제(토글) — I 행은 즉시 제거, D 행은 직전 상태로 복구, 나머지는 D(저장 전까지 남김) */
export function toggleDelete(rows: readonly ClosingRow[], ids: readonly string[]): { rows: ClosingRow[]; deleted: number; restored: number } {
  const set = new Set(ids);
  let deleted = 0, restored = 0;
  const out: ClosingRow[] = [];
  for (const r of rows) {
    if (!set.has(r.id)) { out.push(r); continue; }
    if (r.status === 'I') { deleted += 1; continue; }
    if (r.status === 'D') { restored += 1; const { prev, ...rest } = r; out.push({ ...rest, status: prev ?? '' }); continue; }
    deleted += 1;
    out.push({ ...r, status: 'D', prev: r.status === 'U' ? 'U' : '', err: undefined });
  }
  return { rows: out, deleted, restored };
}

/** E08/E09 이동 — 보이는(visible) 이웃 중 가장 가까운 행과 자리를 바꾼다. 경계면 null(no-op).
    출력 순서가 바뀌므로 두 행 모두 변경(U) 처리(I 는 I 유지) */
export function moveRow(rows: readonly ClosingRow[], id: string, dir: -1 | 1, visible: (r: ClosingRow) => boolean = () => true): ClosingRow[] | null {
  const i = rows.findIndex((r) => r.id === id);
  if (i < 0) return null;
  let j = i + dir;
  while (j >= 0 && j < rows.length && !visible(rows[j])) j += dir;
  if (j < 0 || j >= rows.length) return null;
  const out = [...rows];
  out[i] = touched(rows[j]);
  out[j] = touched(rows[i]);
  return out;
}

/** 경계 판정(버튼 비활성용) — moveRow 가 null 을 돌려줄 자리인지 */
export const canMove = (rows: readonly ClosingRow[], id: string, dir: -1 | 1, visible?: (r: ClosingRow) => boolean) =>
  moveRow(rows, id, dir, visible) !== null;

/** 저장 대상(I·U·D) 건수 */
export const changedCount = (rows: readonly ClosingRow[]) => rows.filter((r) => r.status !== '').length;

/** E03 편집 행 검증 — I·U 행만. 레벨 1~6 정수 · 출력위치 허용값 · 계정코드명은 검색 팝업 선택값(코드·명이 계정과목과 일치) */
export function validateRows(rows: readonly ClosingRow[]): { rows: ClosingRow[]; invalid: number } {
  let invalid = 0;
  const out = rows.map((r) => {
    if (r.status !== 'I' && r.status !== 'U') return r.err ? { ...r, err: undefined } : r;
    const err: ErrField[] = [];
    if (!Number.isInteger(r.level) || r.level < 1 || r.level > 6) err.push('level');
    if (!r.acctCode || !ACCOUNTS.some((a) => a.code === r.acctCode && a.name === r.acctName)) err.push('acctName');
    if (!OUT_POS.includes(r.pos)) err.push('pos');
    if (err.length) invalid += 1;
    return { ...r, err: err.length ? err : undefined };
  });
  return { rows: out, invalid };
}

/** E03 저장 반영 — D 행 제거, 상태·오류 초기화. 반환값이 새 저장본 */
export const commitRows = (rows: readonly ClosingRow[]): ClosingRow[] =>
  rows.filter((r) => r.status !== 'D').map(({ prev: _p, err: _e, ...r }) => ({ ...r, status: '' as RowStatus }));

/** E01 상세필터(계정코드명 부분일치). 상태가 있는 행(I·U·D)은 필터와 무관하게 항상 보인다 —
    막 추가한 빈 행·계정을 바꾼 편집 행이 사라지거나 삭제 복구 경로가 숨지 않게(미저장 변경분은 늘 눈에 보여야 한다) */
export const passesFilter = (acctNameQ: string) => (r: ClosingRow) =>
  !acctNameQ.trim() || r.status !== '' || r.acctName.includes(acctNameQ.trim());
