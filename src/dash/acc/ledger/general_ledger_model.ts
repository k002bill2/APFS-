/* 총계정원장(ACC-011) 화면 전용 규칙 — 기본 조건 · 동적 헤더 문구. 집계 자체는 공용 ledger_model.generalLedger 가 한다
   (계정별 상세내역 팝업과 같은 subledger 계산이라 기초 = [전잔] · 금일 = 마지막 잔액이 구성상 성립). */
import { DEFAULT_COND, fiscalStart } from './ledger_model';
import type { LedgerCond } from './ledger_model';

export interface GeneralLedgerFilter extends LedgerCond { fundAccount: string; from: string; to: string }

/** 기본 조건 — 기간은 필수라 빈 값 대신 당기 회기 시작 ~ 오늘(E00 이 바로 행을 보이게).
    체크 3종은 설계서 slide 11 기본 '미체크'(결산전표포함 포함 — 공용 DEFAULT_COND 는 전부포함이라 덮어쓴다) */
export const defaultGeneralLedgerFilter = (today: string): GeneralLedgerFilter => ({
  ...DEFAULT_COND, fundAccount: '', includeUnapproved: false, includeAll: false, includeClosing: false,
  from: fiscalStart(today), to: today,
});

/** 그리드·엑셀 헤더(설계서 slide 10: 기초잔액은 조회 시작일 이전, 금일잔액은 조회 종료일) */
export const openingHeader = (from: string): string => `기초잔액(${from} 이전)`;
export const closingHeader = (to: string): string => `금일잔액(${to})`;
