/* 운용사정량지표상세(재무건정성비율) 팝업 내용(순수 모듈 — 화면 gp_ratio_detail_modal.tsx · 테스트 공용).
   출처: docs/mockups/01_투자자산관리/S1_38_운용사_재무정보_조회.html `openRatioDetail(r)` 의 `table.info-tbl`(S1_38:419-434).
   `재무건정성` 은 원문 철자 그대로다(원문 충실 — 정정하지 않는다). 원문에 비율 데이터가 없어 빈 상태 1행이다. */

export const GP_RATIO_TITLE = '운용사정량지표상세(재무건정성비율)';
/** 원문 빈 상태 문구(`td.empty`) */
export const GP_RATIO_EMPTY = '조회내용이 없습니다.';

/** 원문 kv 3행 — 라벨·순서 그대로. 운용사명(r.nm)·GP구분(r.gb)은 누른 행 값, 지표명은 원문 리터럴 */
export function gpRatioItems(r: Record<string, unknown>): { l: string; v: string }[] {
  return [
    { l: '운용사명', v: String(r.gp ?? '') },
    { l: 'GP구분', v: String(r.gpType ?? '') },
    { l: '지표명', v: '재무건정성비율(단위:%)' },
  ];
}
