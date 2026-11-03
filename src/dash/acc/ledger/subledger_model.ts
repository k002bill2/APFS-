/* 계정별보조부(ACC-010) 화면 전용 로직 — 상세필터 상태 ↔ 공용 모델(ledger_model.subledger) 변환, 그리드 행 파생, 진입 가능 판정.
   집계 자체(전잔·누적잔액·소계)는 공용 ledger_model 이 소유한다. 이 파일은 화면 조건의 기본값·매핑만 둔다.
   - 기본값(slide 11 ② 표): 계정구분 전체 · 기간 없음(E00 "필터 없음 전체 조회") · 작성계정과목만 여 · 미결재포함 부 · 텍스트 4종 빈 값.
   - 결산전표포함은 이 화면 조건에 없다(slide 11 ③ 표에는 적용 범위로만 등장) → 전부 포함(DEFAULT_COND) 고정.
   - 작성자·거래처·적요 = 명세 행만 거른다(전잔 불변) — subledger() 가 보장하고 subledger_model.test 가 고정한다. */
import { DEFAULT_COND, subledger, flattenSubledger, validatePeriod } from './ledger_model';
import type { LedgerCond, SubledgerQuery, SubledgerRow } from './ledger_model';
import type { LedgerLine } from './ledger_data';

export interface SubledgerFilter {
  fundAccount: string;          // '' = 전체
  from: string; to: string;     // 기간(빈 값 = 열린 경계)
  writtenOnly: boolean;         // 작성계정과목만
  includeUnapproved: boolean;   // 미결재포함
  writer: string; account: string; partner: string; memo: string;
}

export const SUBLEDGER_DEFAULT: SubledgerFilter = {
  fundAccount: '', from: '', to: '', writtenOnly: true, includeUnapproved: false,
  writer: '', account: '', partner: '', memo: '',
};

export const condOf = (f: SubledgerFilter): LedgerCond => ({ ...DEFAULT_COND, fundAccount: f.fundAccount, includeUnapproved: f.includeUnapproved });
export const queryOf = (f: SubledgerFilter): SubledgerQuery => ({
  from: f.from, to: f.to, account: f.account, writer: f.writer, partner: f.partner, memo: f.memo, writtenOnly: f.writtenOnly,
});

/** 그리드 행 — 계정마다 [전잔] · 명세 · [소계] */
export function subledgerRows(lines: readonly LedgerLine[], f: SubledgerFilter): SubledgerRow[] {
  return flattenSubledger(subledger(lines, condOf(f), queryOf(f)), { subtotal: true });
}

/** E03 — 명세 행만 전표상세로 들어간다([전잔]·[소계] 무반응) */
export const slipNoOf = (r: SubledgerRow | undefined | null): string | null => (r?.kind === 'entry' && r.line ? r.line.slipNo : null);

/** [필터 적용] 검증 — 기간 시작 > 종료면 설계서 E01 문구. 통과 = null */
export const validateFilter = (f: SubledgerFilter): string | null => validatePeriod(f.from, f.to);
