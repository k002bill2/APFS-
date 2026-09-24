/* 투심보고 확정 및 승인(investment-review) — 목록 행 데이터 · 도메인 타입(순수 모듈, React·AG Grid import 금지).
   출처: docs/mockups/01_투자자산관리/S1_01_투자심의관리.html `var DATA`(3건: 엔테로바이옴·에스티리테일·팡세).

   행 = 원문 DATA 3건 그대로다. 이전엔 원문에 없는 합성 3건((주)그린바이오텍·(주)블루오션푸드·(주)팜스토리)을 붙여
   파생 단계(가결·부결·투심위취소)를 전부 시연했으나 원문 충실 원칙에 따라 삭제했다(2026-09-24).
   원문 3건은 모두 `confirm:'미확정', res:''` 라 첫 화면의 파생 단계는 전부 '미확정'이다 — 확정·결과 단계는
   툴바 전이 액션으로 도달한다. 합계·건수는 행에서 파생하므로 별도 수정이 없다.

   값 규약: 금액 N/A=null(문자 '-' 아님), 텍스트 N/A='-'. 단위=원. 투심상태(원문 `st`)는 res 에서 파생한다.
   ir-2 의 `compliance` 는 목록 값이 아니라 투자준법감시내역 CRUD 시연용 폼값이다(원문 DATA 필드 아님). */

export type Confirm = '미확정' | '확정' | '투심위취소';
export type Result = '' | '미결' | '가결' | '부결' | '조건부' | '승인취소' | '보류';

export interface InvReviewRow {
  id: string; no: number;
  gp: string; fn: string; co: string;
  dt: string; inv: number | null; ty: string; ob: string; sm: string; ag: string;
  confirm: Confirm; appr: number | null; pay: string; res: Result;
  compliance?: Record<string, unknown> | null;   // 투자준법감시내역(백엔드 없음 — 폼값 보관). 있으면 수정/삭제 노출
}

export const INV_REVIEW_ROWS: readonly InvReviewRow[] = [
  { id: 'ir-1', no: 1, gp: '인라이트벤처스(주)', fn: '인라이트 농식품 청년기업 성장펀드', co: '(주)엔테로바이옴', dt: '2026-06-02', inv: 800_050_960, ty: '신주-우선주', ob: '-', sm: '-', ag: '-', confirm: '미확정', appr: 800_050_960, pay: '2026-06-05', res: '' },
  { id: 'ir-2', no: 2, gp: '어니스트벤처스(주)', fn: '상주-어니스트 애그테크 투자조합', co: '(주)에스티리테일', dt: '2026-06-10', inv: 500_000_000, ty: '전환사채', ob: 'Y', sm: 'Y', ag: 'Y', confirm: '미확정', appr: 500_000_000, pay: '2026-06-15', res: '',
    compliance: { gp: '어니스트벤처스(주)', fn: '상주-어니스트 애그테크 투자조합', baseDate: '2026-06-10', co: '(주)에스티리테일', bizno: '342-88-02365', overseas: '아니오', founded: '2022-03-02', fdiv: '식품관련산업', fcon: '기타 과실·채소 가공 및 저장 처리업', iv: 'CB', ns: '신주', ivDate: '', sale: '', mm: '일반기업', venture: '아니오', region: '경북', ob: '예', sm: '예', agf: '예', follow: '아니오', opinion: '적격', remark: '' } },
  { id: 'ir-3', no: 3, gp: '엔비에이치(NBH)캐피탈 주식회사', fn: '웰투시-NBH 전북애그리푸드 투자조합', co: '주식회사 팡세', dt: '2026-06-18', inv: 1_200_000_000, ty: '신주-우선주', ob: 'Y', sm: 'Y', ag: 'Y', confirm: '미확정', appr: 1_150_000_000, pay: '2026-06-24', res: '' },
];
