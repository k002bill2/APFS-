/* 읽기전용 상세 팝업 종류(과제별 목록). 컬럼이 detail 을 선언하면 그 셀 값이 링크가 되어 해당 팝업을 연다.
   import 가 없는 순수 목록이어야 한다 — schemas/types.ts(zod 검증)가 모듈 초기화 시점에 읽으므로,
   팝업 컴포넌트를 끌어오는 detail_popups.ts 와 합치면 순환 import 로 초기화 전 값을 읽을 수 있다.
   키를 추가하면 detail_popups.ts 의 DETAIL_MODALS·DETAIL_HINT 에도 같은 키를 넣는다(Record 타입이 누락을 잡는다). */
export const DETAIL_POPUPS = ['monthlyReport', 'gpSpec', 'companyProfile', 'mgmtFeeDetail', 'dueDiligChecklist', 'gpRatioDetail'] as const;
