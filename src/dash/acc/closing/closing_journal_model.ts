/* 결산전표 관리(ACC-015) — 업무 규칙 순수 함수. 화면(closing_journal_manage.tsx)·더미(closing_journal_data.ts)·테스트가 공유한다.
   날짜는 'YYYY-MM-DD' 문자열(사전순 = 시간순), '오늘'·사용자는 호출부가 주입한다(테스트 결정성).

   결정(설계서 '정책 확인' 항목 — PR 본문 "설계서와 다른 점"에도 기재)
   - 원전표·환원전표 연결 = **pairId 필드**(환원전표에만 원전표 id 를 둔다 — 원전표는 null) + 표시용 전표번호 `원전표번호-R`.
     쌍 판정은 전부 pairOf/expandPairs 한 곳을 거친다(전표번호 문자열을 다시 파싱하지 않는다).
   - 환원전표 = 원전표 분개의 차변↔대변 교환 · 전표일 = 원전표 전표일 + 1일(월말·연말·윤년 넘김은 date-fns addDays) ·
     발생구분 '가결산(환원)' · 적요 앞 "[환원] " · 결재 상태는 원전표와 항상 같다 · 첨부·자금집행예정일은 복사하지 않는다.
   - 결재상신·삭제는 쌍 단위 — 원전표/환원전표 중 하나만 골라도 짝을 같이 처리한다(고아 환원전표 금지).
   - 삭제 가능 = 결재 미상신·반려(당일자 조건 없음 — ACC-003 deleteGate 와 다르다). 조건 밖 건이 하나라도 섞이면 전체 중단.
   - 원전표 수정 저장 = 환원전표 재생성(같은 id 유지). 가결산→결산으로 바꾸면 환원전표 삭제, 결산→가결산이면 새로 생성. */
import { addDays, format, isValid } from 'date-fns';
import { CURRENT_USER, lineTotals } from '../slip/general_journal_data';
import type { JournalRow } from '../slip/general_journal_data';
import { canSubmit, nextSeq } from '../slip/general_journal_model';

/** 결산전표 전표발생구분(slide 11 조건 4) — 일반전표 JOURNAL_ORIGINS 와 별개 상수(ACC-003 필터·더미 전수 테스트에 섞지 않는다) */
export const CLOSING_ORIGINS = ['가결산', '가결산(환원)', '결산'] as const;
export type ClosingOrigin = typeof CLOSING_ORIGINS[number];
/** 전표등록 헤더에서 고르는 값(slide 12 ① — 환원전표는 자동 생성이라 고르지 않는다) */
export const CLOSING_ENTRY_ORIGINS = ['가결산', '결산'] as const;

/** 결산전표 목록 행 — 일반전표 행 + 쌍 연결(환원전표만 원전표 id, 그 외 null) */
export interface ClosingRow extends JournalRow {
  pairId: string | null;
}

export const REVERSAL_PREFIX = '[환원] ';
export const REVERSAL_SLIP_SUFFIX = '-R';

/** 다음날 — 9/30 → 10/1, 12/31 → 다음 해 1/1, 2/28 → 2/29(윤년)·3/1. 빈 값·무효 입력은 ''(throw 하지 않는다 — 저장 전 validateEntry closing 이 작성일을 막는다) */
export const nextDay = (d: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return '';
  const t = new Date(d + 'T00:00:00');
  if (!isValid(t) || format(t, 'yyyy-MM-dd') !== d) return '';   // 2026-02-30 같은 넘침(엔진이 3/2 로 굴린다)도 무효
  return format(addDays(t, 1), 'yyyy-MM-dd');
};

const prefixed = (m: string) => (m === '' || m.startsWith(REVERSAL_PREFIX) ? m : REVERSAL_PREFIX + m);

/** 원전표 → 환원전표(차대 반대). keep = 기존 환원전표의 id·순번·최초등록자(동기화 시 유지) */
export function reversalOf(orig: JournalRow, keep: { id: string; seq: string; createdBy: string; updatedBy?: string }): ClosingRow {
  const lines = orig.lines.map((l) => ({ ...l, memo: prefixed(l.memo), debit: l.credit, credit: l.debit }));
  return {
    ...orig,
    id: keep.id, seq: keep.seq, createdBy: keep.createdBy, updatedBy: keep.updatedBy ?? orig.updatedBy,
    origin: '가결산(환원)', pairId: orig.id,
    slipDate: nextDay(orig.slipDate), slipNo: orig.slipNo + REVERSAL_SLIP_SUFFIX,
    memo: prefixed(orig.memo), amount: lineTotals(lines).debit, lines,
    attachments: [], fundDueDate: '-',
  };
}

/** 짝 — 원전표면 그 환원전표, 환원전표면 원전표, 결산이면 null */
export function pairOf(rows: readonly ClosingRow[], r: ClosingRow): ClosingRow | null {
  if (r.origin === '가결산(환원)') return rows.find((x) => x.id === r.pairId) ?? null;
  if (r.origin === '가결산') return rows.find((x) => x.origin === '가결산(환원)' && x.pairId === r.id) ?? null;
  return null;
}

/** 선택 id + 짝 id(목록 순서). 없는 id 는 버린다 */
export function expandPairs(rows: readonly ClosingRow[], ids: readonly string[]): string[] {
  const sel = new Set(ids);
  rows.forEach((r) => { if (sel.has(r.id)) { const p = pairOf(rows, r); if (p) sel.add(p.id); } });
  return rows.filter((r) => sel.has(r.id)).map((r) => r.id);
}

/** 목록 필터 = 쌍 단위 — 원전표·환원전표 중 하나라도 통과하면 쌍 둘 다 보인다(가결산 1건 저장 = 2행 조회. 환원전표가 다음날이라 기간 밖이어도). 반환 = 보일 id 집합 */
export function closingVisibleIds(rows: readonly ClosingRow[], pass: (r: ClosingRow) => boolean): Set<string> {
  return new Set(expandPairs(rows, rows.filter(pass).map((r) => r.id)));
}

/** 쌍 단위 키 — 환원전표는 원전표 id 로 묶는다 */
const unitKey = (r: ClosingRow) => (r.origin === '가결산(환원)' && r.pairId ? r.pairId : r.id);

/** E05 결재상신 — 쌍으로 확장 후 단위(쌍·단건)마다 전원 미상신·반려면 '상신', 아니면 그 단위 skip. 건수는 행 기준 */
export function submitClosing(rows: readonly ClosingRow[], ids: readonly string[], user: string = CURRENT_USER): { rows: ClosingRow[]; submitted: number; skipped: number } {
  const picked = new Set(expandPairs(rows, ids));
  const units = new Map<string, ClosingRow[]>();
  rows.forEach((r) => { if (picked.has(r.id)) units.set(unitKey(r), [...(units.get(unitKey(r)) ?? []), r]); });
  const ok = new Set<string>();
  let submitted = 0, skipped = 0;
  units.forEach((ms, k) => {
    if (ms.every((m) => canSubmit(m.approval))) { ok.add(k); submitted += ms.length; } else skipped += ms.length;
  });
  const next = rows.map((r) => (picked.has(r.id) && ok.has(unitKey(r)) ? { ...r, approval: '상신' as const, updatedBy: user } : r));
  return { rows: next, submitted, skipped };
}

/** 상신 가능 건 존재 여부(모달 열기 전 판정) */
export const hasSubmittable = (rows: readonly ClosingRow[], ids: readonly string[]): boolean => submitClosing(rows, ids).submitted > 0;

export const CLOSING_DELETE_LOCKED_MSG = '결재 상신·승인된 전표는 삭제할 수 없습니다. 미상신·반려 전표만 삭제할 수 있습니다.';

/** E06 삭제 게이트 — 쌍으로 확장한 전 건이 미상신·반려여야 통과. 하나라도 상신·승인이면 전체 중단(설계서 업무 규칙) */
export function closingDeleteGate(rows: readonly ClosingRow[], ids: readonly string[]): { ok: boolean; ids: string[]; locked: number } {
  const all = expandPairs(rows, ids);
  const set = new Set(all);
  const locked = rows.filter((r) => set.has(r.id) && !canSubmit(r.approval)).length;
  return { ok: all.length > 0 && locked === 0, ids: all, locked };
}

/** 논리삭제 = 목록에서 제거(쌍 포함) */
export function deleteClosing(rows: readonly ClosingRow[], ids: readonly string[]): ClosingRow[] {
  const set = new Set(expandPairs(rows, ids));
  return rows.filter((r) => !set.has(r.id));
}

const nextClosingId = (rows: readonly JournalRow[]) => 'cj-' + String(rows.reduce((m, r) => Math.max(m, Number(r.id.replace(/\D/g, '')) || 0), 0) + 1).padStart(3, '0');

/** E02/E07 저장 반영(동일 트랜잭션 흉내 — 한 번에 rows 반환).
    원전표 upsert(신규 = id·순번·전표번호 채번, 맨 앞) → 가결산이면 환원전표 생성/재생성(원전표 바로 뒤), 결산이면 기존 환원전표 제거.
    submit = 저장 후 상신(쌍 모두 '상신'). 저장된 원전표를 돌려준다(화면이 이후 수정 모드로 전환). */
export function commitClosing(rows: readonly ClosingRow[], j: JournalRow, opts: { submit?: boolean; user?: string } = {}): { rows: ClosingRow[]; saved: ClosingRow } {
  const user = opts.user ?? CURRENT_USER;
  const prev = j.id ? rows.find((r) => r.id === j.id) : undefined;
  let saved: ClosingRow = { ...j, pairId: null, updatedBy: user, approval: opts.submit ? '상신' : j.approval };
  let acc: ClosingRow[];
  if (!prev) {
    const seq = nextSeq(rows, j.slipDate);
    saved = { ...saved, id: nextClosingId(rows), seq, slipNo: j.slipDate.replace(/-/g, '') + '-' + seq, createdBy: user };
    acc = [saved, ...rows];
  } else {
    acc = rows.map((r) => (r.id === prev.id ? saved : r));
  }
  const oldRev = pairOf(rows, saved.origin === '가결산' ? saved : { ...saved, origin: '가결산' });
  const others = acc.filter((r) => r !== oldRev);
  if (saved.origin !== '가결산') return { rows: others, saved };
  const revDate = nextDay(saved.slipDate);
  const keep = oldRev
    ? { id: oldRev.id, seq: oldRev.slipDate === revDate ? oldRev.seq : nextSeq(others, revDate), createdBy: oldRev.createdBy, updatedBy: user }
    : { id: nextClosingId(acc), seq: nextSeq(others, revDate), createdBy: user, updatedBy: user };
  const rev = reversalOf(saved, keep);
  const at = others.findIndex((r) => r.id === saved.id);
  return { rows: [...others.slice(0, at + 1), rev, ...others.slice(at + 1)], saved };
}
