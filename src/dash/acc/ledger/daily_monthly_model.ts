/* 일/월계표(ACC-009) 화면 전용 규칙 — 탭별 기본값·탭 전환 시 조건 변환(slide 12 ③ 표)·상세필터 검증(즉시 반영 — 렌더마다 applied 로 판정, 실패 = 칸 표시 + 결과 0건).
   집계 자체(dailyStatement·monthlyStatement)는 장부조회 공용 ledger_model 이 한다. 페이지는 배선만. */
import { endOfMonth, format, parseISO } from 'date-fns';
import { DEFAULT_COND, MSG, validatePeriod } from './ledger_model';
import type { LedgerCond } from './ledger_model';
import { FUND_ACCOUNTS } from '../slip/general_journal_data';

export type DmTab = 'daily' | 'monthly';

/** 두 탭이 한 모양을 쓴다 — 월계표는 funds[0] 만 읽는다(단일 선택) */
export interface DmFilter extends LedgerCond {
  fundAccount: string[];   // 일계표 다중([] = 전체) · 월계표 0~1개(필수)
  date: string;            // 일계표 기준일(필수)
  from: string;            // 월계표 기간(필수)
  to: string;
}

/** 월계표 기본 기간 = 당해 1월 1일 ~ 현재월 말(로컬 달력 — toISOString 금지) */
export function defaultMonthRange(today: string): { from: string; to: string } {
  return { from: `${today.slice(0, 4)}-01-01`, to: format(endOfMonth(parseISO(today)), 'yyyy-MM-dd') };
}

/** 공통 플래그 기본 — 미결재·결산전표 미체크, 모든계정포함 부(slide 12 ②표 3~5). DEFAULT_COND 의 결산전표포함(true)을 덮는다 */
export const DM_FLAGS: Pick<LedgerCond, 'includeUnapproved' | 'includeClosing' | 'includeAll'> = {
  includeUnapproved: false, includeClosing: false, includeAll: false,
};

/** 기본 조건([초기화]·첫 진입) — 일계표: 계정구분 전체 · 기준일 오늘 / 월계표: 계정구분 미선택 · 기간 1/1 ~ 현재월 말.
   두 탭 기본값이 한 객체에 함께 들어 있다(각 탭은 자기 칸만 읽는다) */
export function defaultFilter(today: string): DmFilter {
  return { ...DEFAULT_COND, ...DM_FLAGS, fundAccount: [], date: today, ...defaultMonthRange(today) };
}

/** 월계표 데모 기본 계정구분 — 설계서는 '미선택 → 선택 요청'이지만, 진입 즉시 그리드를 볼 수 있게 첫 계정구분을 미리 고른다(2026-11-03 사용자 지시) */
export const MONTHLY_DEFAULT_FUND: string = FUND_ACCOUNTS[0];

/** [초기화](slide 12 ⑤) — 현재 탭 칸만 기본값으로. 다른 탭 칸은 보존한다
   - 일계표: 계정구분 전체 · 기준일 오늘 · 플래그 기본 (월계표 기간 from/to 보존)
   - 월계표: 계정구분 = MONTHLY_DEFAULT_FUND · 기간 1/1 ~ 현재월 말 · 플래그 기본 (일계표 기준일 date 보존) */
export function resetFilter(d: DmFilter, tab: DmTab, base: DmFilter): DmFilter {
  return tab === 'daily' ? { ...base, from: d.from, to: d.to } : { ...base, fundAccount: [MONTHLY_DEFAULT_FUND], date: d.date };
}

/** 탭 전환(E04 · slide 12 ③) — 플래그는 유지
   - 일계표 → 월계표: 기간 = 1/1 ~ 현재월 말, 계정구분 = 다중 선택값 중 첫 번째만(없으면 MONTHLY_DEFAULT_FUND)
   - 월계표 → 일계표: 기준일 = 오늘, 계정구분 = 선택값 유지 */
export function switchTab(f: DmFilter, to: DmTab, today: string): DmFilter {
  if (to === 'monthly') return { ...f, fundAccount: f.fundAccount.length ? f.fundAccount.slice(0, 1) : [MONTHLY_DEFAULT_FUND], ...defaultMonthRange(today) };
  return { ...f, date: today };
}

/** 그 탭이 지금 조회 가능한가 — 통과 = null, 아니면 설계서 문구 */
export function validateFilter(tab: DmTab, f: DmFilter): string | null {
  if (tab === 'daily') return f.date ? null : MSG.dateRequired;
  if (!f.fundAccount[0]) return MSG.fundRequired;
  return validatePeriod(f.from, f.to, true);
}

/** 오류가 난 항목(드로어 errMsg 표시용) */
export function errorField(tab: DmTab, f: DmFilter): '' | 'fund' | 'date' | 'period' {
  const err = validateFilter(tab, f);
  if (!err) return '';
  if (tab === 'daily') return 'date';
  return err === MSG.fundRequired ? 'fund' : 'period';
}

/** 집계에 넘길 공통조건 — 일계표 = 다중 배열 그대로, 월계표 = 첫 값 하나 */
export function condOf(tab: DmTab, f: DmFilter): LedgerCond {
  const { includeUnapproved, includeClosing, includeAll } = f;
  return { includeUnapproved, includeClosing, includeAll, fundAccount: tab === 'daily' ? f.fundAccount : (f.fundAccount[0] ?? '') };
}
