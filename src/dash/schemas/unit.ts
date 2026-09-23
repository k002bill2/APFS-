/* unit.ts — 금액 단위 전환(원/백만원/억원) 공유 SSOT. 순수 모듈(React import 금지).

   목업 8종(S1_31·S1_32·S1_33·S1_34·S1_35·S1_44 …)이 목록 상단에 "금액단위 원|백만원|억원" 토글을
   공통으로 갖는다. 그런데 `PageSchema`엔 그 개념이 없어, 지금까지는 typed 페이지마다
   `type Unit` / `UNIT_DIV` / `toUnit`을 **로컬 복사**로 갖고 있었다
   (asset_funding.tsx:62-70 · fund_stats.tsx · gp_spec_modal.tsx:20-29).
   이 파일은 스키마 주도 화면(GenericListPage)이 쓰는 공유 구현이며, 위 3개 로컬 복사는
   각자의 저장 단위(asset_funding은 **억원 저장**)가 달라 이번 범위에서 건드리지 않는다.

   저장 단위 계약: 스키마 `type:'amount'` 컬럼의 행 값은 **원(KRW) 단위 정수**다. */

export const UNITS = ['원', '백만원', '억원'] as const;
export type Unit = typeof UNITS[number];

export const DEFAULT_UNIT: Unit = '원';

/** 원 단위 값을 나눌 제수. 원=1, 백만원=10⁶, 억원=10⁸ */
export const UNIT_DIV: Record<Unit, number> = { 원: 1, 백만원: 1e6, 억원: 1e8 };

export const isUnit = (v: string): v is Unit => (UNITS as readonly string[]).includes(v);

/** 원 단위 값 → 선택 단위 숫자. 원은 정수 유지, 백만원·억원은 소수 2자리까지(목업 표기 규칙). */
export function toUnit(won: number, unit: Unit): number {
  if (unit === '원') return won;
  return Math.round((won / UNIT_DIV[unit]) * 100) / 100;
}

/** 선택 단위로 입력된 숫자 → 원 단위 정수(toUnit 의 역). 편집 셀이 화면 단위로 받은 값을 저장할 때 쓴다.
    숫자가 아니면 0 — 편집기 빈 입력·비숫자를 0원으로 본다. */
export function fromUnit(v: unknown, unit: Unit): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * UNIT_DIV[unit]) : 0;
}

/** 표시 문자열 — 서식만 만든다. */
export function formatUnit(won: number, unit: Unit): string {
  const v = toUnit(won, unit);
  return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/* 엑셀 계약: 내보내기는 **화면에 보이는 단위**를 따른다(asset_funding.tsx:228 선례).
   단위를 헤더에 적지 않으면 1/10⁸ 값이 의미 불명이 되므로, 금액 컬럼 헤더는 반드시 이 함수를 거친다.
   컬럼 원문 단위(col.unit)는 토글이 켜진 순간 선택 단위에 양보한다 — 둘을 같이 적으면 "금액(원) (억원)"이 된다. */
export function amountHeader(label: string, unit: Unit): string {
  return `${label} (${unit})`;
}
