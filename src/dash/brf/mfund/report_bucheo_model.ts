/* 연도별투자현황(route report-bucheo) 검색조건 → 표 행 재계산(순수 모듈, React import 금지).
   원문 DATA_SEL·DATA_FORM(brief_data.ts — 원문 대조 테스트가 고정)은 건드리지 않고, 화면에 내보낼 행만 여기서 만든다.

   2026-11-16 사용자 지시 "미연동 필터 전부 동작" — 종전엔 기준월·계정구분이 no-op 캡션이었다.
   원문 표는 계정구분 칸이 없는 **연도별 집계표**라 행을 거르는 대신 수치를 다시 나눈다:
   - 기준월: 연도 칸(선정년도/결성년도)이 기준월의 연도보다 뒤인 행을 뺀다(onOrBefore — 기본 2026-08 은 전 행 통과).
   - 계정구분: '전체'(기본) = 원문 행 그대로. 수산 = 표 전체 총량(조합수 × 0.3 · 금액은 그 조합수 비율)을 정해 행에 배분(susanRows),
     농식품 = 원문 − 수산이라 **두 몫의 합 = 원문 값**이고, 두 조회기준(선정·결성년도)의 수산 합계가 같다.
     조합수 몫이 0 인 연도 행은 그 계정구분에 조합이 없으므로 뺀다. 투자배수는 몫의 (B1+B2+C)/A 로 다시 계산한다(multipleOf). */
import { onOrBefore } from '../../schemas/filter_field';
import type { Row, Cell } from '../../risk_table_meta';
import { ACCOUNT_TYPES, multipleOf } from '../brief_data';
import { apportion } from '../../stat_apportion';

/** 나누는 금액 칸(원 단위 저장) — brief_data AMOUNT_COLS 순서 */
export const YEARLY_AMOUNT_KEYS = ['ct', 'mc', 'a', 'ma', 'b1', 'b2', 'cc', 'rec', 'pf'] as const;
/** 수산 몫 비율(조합수 기준) — 농식품 다수·수산 소수 */
export const SUSAN_RATIO = 0.3;
const MILLION = 1e6;
const n = (v: Cell): number => (typeof v === 'number' ? v : 0);

/** 조합수 c 중 수산 몫 — 반올림, 농식품 = c − 수산 */
export const susanFunds = (c: number): number => Math.round(c * SUSAN_RATIO);

/** 수산 몫을 **표 전체 총량부터** 정하고 행에 배분한다(stat_apportion) — 두 조회기준(선정년도·결성년도)은 같은 조합을
    다른 연도로 묶은 표라, 행마다 따로 나누면 수산 약정총액이 53,000 vs 54,500(백만원)처럼 조회기준끼리 갈렸다.
    총량: 조합수 = 반올림(전체 조합수 × 0.3), 금액 = 전체 금액 × (수산 조합수 / 전체 조합수)(백만원 단위).
    행 배분 가중치 = 그 행 조합수 × 0.3(금액은 그 행 수산 조합수 비율), 용량 = 그 행 원문 값. 농식품 = 원문 − 수산(칸마다 상보) */
function susanRows(rows: readonly Row[]): Row[] {
  const cs = rows.map((r) => n(r.c));
  const C = cs.reduce((x, y) => x + y, 0);
  const susanC = apportion(cs.map((c) => c * SUSAN_RATIO), susanFunds(C), cs);
  const out: Row[] = rows.map((r, i) => ({ ...r, c: susanC[i] }));
  for (const k of YEARLY_AMOUNT_KEYS) {
    const vm = rows.map((r) => Math.floor(n(r[k]) / MILLION));   // 백만원 단위
    const V = vm.reduce((x, y) => x + y, 0);
    const amt = apportion(vm.map((v, i) => (cs[i] ? v * (susanC[i] / cs[i]) : 0)), C ? V * (susanFunds(C) / C) : 0, vm);
    out.forEach((r, i) => { r[k] = amt[i] * MILLION; });
  }
  return out;
}

/** 화면 행 — 기준월(이후 연도 제외) → 계정구분 몫. 기본(계정구분 '' · 기준월 원문)은 원문 행 그대로.
    몫의 조합수가 0 인 연도 행은 그 계정구분에 조합이 없으므로 뺀다. 투자배수는 몫으로 다시 계산 */
export function yearlyRows(rows: readonly Row[], acc: string, ym: string): Row[] {
  const inTime = rows.filter((r) => onOrBefore(r.y, ym));
  if (!acc) return inTime;
  const susan = susanRows(inTime);
  const pick = acc === ACCOUNT_TYPES[1] ? susan
    : inTime.map((r, i) => {
      const o: Row = { ...r, c: n(r.c) - n(susan[i].c) };
      for (const k of YEARLY_AMOUNT_KEYS) o[k] = n(r[k]) - n(susan[i][k]);
      return o;
    });
  return pick.filter((r) => n(r.c) > 0).map((r) => ({ ...r, mul: multipleOf([r]) }));
}
