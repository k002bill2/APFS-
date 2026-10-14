/* 관리보수보고 상세조회 — 원문 산출내역 데이터·상수.
   출처: docs/mockups/01_투자자산관리/S1_43_관리보수관리.html `openDetail(i,tr)` (2026-09-16 파싱 실측)

   ── 왜 스키마 sample 이 아니라 별도 모델인가 ──
   `span`(기준일자 구간)·`days`·`base`(기준금액)·`baseConfirmed` 는 **목록 컬럼이 아니다** —
   팝업 안에만 나온다. sample 에 넣으면 레지스트리 불변식(sample 키 ⊆ columns ∪ fields)이 깨진다
   (schemas/sample_keys.test.ts). company_profile_data.ts 와 같은 분리다.

   ── baseConfirmed 가 load-bearing 인 이유 ──
   원문은 기준금액을 `r.baseConfirmed ? r.base : Math.round(r.amt/RATE)` 로 고른다.
   유일한 원문 행(no:1 제이비인베스트먼트)은 **baseConfirmed: true** 라 실캡처 값 8,509,289,613 을 쓴다.
   이걸 뒤집으면 역산값 7,659,289,600 이 표시된다. */
/** 원문 `var RATE=0.025` */
export const RATE = 0.025;
/** 원문 `pctStr` — (RATE*100).toFixed(1) 에서 끝의 `.0` 제거 → '2.5%' */
export const PCT_LABEL = (RATE * 100).toFixed(1).replace(/\.0$/, '') + '%';
/** 원문 `formula` */
export const FORMULA = '투자잔액(분기말잔액)*' + PCT_LABEL + '*일수/365';

export interface MgmtFeeCalc {
  /** 원문 `span` — 산출 기간 */
  span: string;
  /** 원문 `days` */
  days: number;
  /** 원문 `base` — 기준금액(투자잔액). baseConfirmed 일 때만 이 값을 쓴다 */
  base: number;
  /** 원문 `baseConfirmed` — 실캡처로 확인된 값인가 */
  baseConfirmed: boolean;
}

/* 목록 행의 `no` → 산출내역. 원문 DATA 가 1건뿐인 이유는 목업 주석에 있다:
   "상세팝업까지 실측 확인된 건은 no:1(제이비인베스트먼트) 1건뿐이라, 다른 19건은 근거 없는
   추정 데이터가 되므로" 제외. 그 판단을 승계한다 — 표를 채우려고 행을 만들지 않는다. */
export const CALC_BY_NO: Record<string, MgmtFeeCalc> = {
  '1': { span: '2025-01-01~2025-12-31', days: 365, base: 8509289613, baseConfirmed: true },
};

/** 원문 `var base=r.baseConfirmed?r.base:Math.round(r.amt/RATE)` */
export function baseAmount(calc: MgmtFeeCalc | undefined, amount: number): number | null {
  if (!calc) return null;
  return calc.baseConfirmed ? calc.base : Math.round(amount / RATE);
}
