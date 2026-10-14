/* 투심보고 확정 및 승인(investment-review) — 목록 행 데이터 · 도메인 타입(순수 모듈, React·AG Grid import 금지).
   출처: docs/mockups/01_투자자산관리/S1_01_투자심의관리.html `var DATA`(3건: 엔테로바이옴·에스티리테일·팡세).

   행 = 원문 DATA 3건 그대로다. 이전엔 원문에 없는 합성 3건((주)그린바이오텍·(주)블루오션푸드·(주)팜스토리)을 붙여
   파생 단계(가결·부결·투심위취소)를 전부 시연했으나 원문 충실 원칙에 따라 삭제했다(2026-09-24).
   원문 3건은 모두 `confirm:'미확정', res:''` 라 첫 화면의 파생 단계는 전부 '미확정'이다 — 확정·결과 단계는
   툴바 전이 액션으로 도달한다. 합계·건수는 행에서 파생하므로 별도 수정이 없다.

   값 규약: 금액 N/A=null(문자 '-' 아님), 텍스트 N/A='-'. 단위=원. 투심상태(원문 `st`)는 res 에서 파생한다.
   ir-2 의 `compliance` 는 목록 값이 아니라 투자준법감시내역 CRUD 시연용 폼값이다(원문 DATA 필드 아님).

   `detail` = 원문 DATA 각 행의 `detail`(gen/co/inv/files) **원문 문자열 그대로**(2026-10-08 상세 팝업 포함).
   숫자도 표기 문자열('800,050,960'·'6.67 %'·'0')로 둔다 — 상세는 읽기전용 표시라 재포맷하지 않는다.
   원문에 없는 키는 생략(optional), 빈 문자열('')도 원문대로 — 화면에서 둘 다 '-'(muted).
   ⚠ ir-2 상세 투심일자(2026-02-20)·납입예정(2026-02-27)은 목록 값(2026-06-10·2026-06-15)과 다르다 — 목업 내부 불일치, 값 그대로. */

export type Confirm = '미확정' | '확정' | '투심위취소';
export type Result = '' | '미결' | '가결' | '부결' | '조건부' | '승인취소' | '보류';

/* 상세 팝업(원문 `detail`) — 키는 원문 이름 그대로 */
export interface InvReviewDetail {
  gen: { fund: string; mgr: string; dt: string; time: string; place: string; src?: string; assist?: string; srctype?: string; pay?: string };
  co: { name: string; ceo1: string; ceo1b: string; ceo2: string; ceo2b: string; female?: string; youth?: string; cap?: string; setup: string; biz: string; bizno: string };
  inv: { total: string; type: string; ob: string; sm: string; amt: string; ratio: string; price: string };
  files: { gb: string; name: string; mod: string }[];
}

export interface InvReviewRow {
  id: string; no: number;
  gp: string; fn: string; co: string;
  dt: string; inv: number | null; ty: string; ob: string; sm: string; ag: string;
  confirm: Confirm; appr: number | null; pay: string; res: Result;
  compliance?: Record<string, unknown> | null;   // 투자준법감시내역(백엔드 없음 — 폼값 보관). 있으면 수정/삭제 노출
  detail?: InvReviewDetail;   // 상세 팝업 데이터(원문 `detail`)
}

export const INV_REVIEW_ROWS: readonly InvReviewRow[] = [
  { id: 'ir-1', no: 1, gp: '인라이트벤처스(주)', fn: '인라이트 농식품 청년기업 성장펀드', co: '(주)엔테로바이옴', dt: '2026-06-02', inv: 800_050_960, ty: '신주-우선주', ob: '-', sm: '-', ag: '-', confirm: '미확정', appr: 800_050_960, pay: '2026-06-05', res: '',
    detail: { gen: { fund: '인라이트 농식품 청년기업 성장펀드', mgr: '', dt: '2026-06-02', time: '', place: '' },
      co: { name: '(주)엔테로바이옴', ceo1: '', ceo1b: '', ceo2: '', ceo2b: '', setup: '', biz: '', bizno: '' },
      inv: { total: '800,050,960', type: '신주-우선주', ob: '-', sm: '-', amt: '800,050,960', ratio: '', price: '' },
      files: [] } },
  { id: 'ir-2', no: 2, gp: '어니스트벤처스(주)', fn: '상주-어니스트 애그테크 투자조합', co: '(주)에스티리테일', dt: '2026-06-10', inv: 500_000_000, ty: '전환사채', ob: 'Y', sm: 'Y', ag: 'Y', confirm: '미확정', appr: 500_000_000, pay: '2026-06-15', res: '',
    compliance: { gp: '어니스트벤처스(주)', fn: '상주-어니스트 애그테크 투자조합', baseDate: '2026-06-10', co: '(주)에스티리테일', bizno: '342-88-02365', overseas: '아니오', founded: '2022-03-02', fdiv: '식품관련산업', fcon: '기타 과실·채소 가공 및 저장 처리업', iv: 'CB', ns: '신주', ivDate: '', sale: '', mm: '일반기업', venture: '아니오', region: '경북', ob: '예', sm: '예', agf: '예', follow: '아니오', opinion: '적격', remark: '' },
    detail: { gen: { fund: '상주-어니스트 애그테크 투자조합', mgr: '이준용', dt: '2026-02-20', time: '10:59', place: '어니스트벤처스 회의실', src: '이준용', assist: 'O', srctype: '담당자추천', pay: '2026-02-27' },
      co: { name: '(주)에스티리테일', ceo1: '김태성', ceo1b: '19811029-1', ceo2: '', ceo2b: '', female: 'N', youth: 'N', cap: '0', setup: '2022-03-02', biz: '기타 과실-채소 가공 및 저장 처리업', bizno: '342-88-02365' },
      inv: { total: '500,000,000', type: '전환사채', ob: 'Y', sm: 'Y', amt: '500,000,000', ratio: '6.67 %', price: '1,500' },
      files: [
        { gb: '투심일정', name: '[투심보고서]에스티리테일_투심보고서_260223_상생 주목적 부분 보완.pdf', mod: '2026-02-23 오후 3:44:11' },
        { gb: '투심일정', name: '[준법감시보고서]에스티리테일_준법감시보고서_260210.pdf', mod: '2026-02-10' },
        { gb: '투심일정', name: '[주주명부]에스티리테일_주주명부_260204.pdf', mod: '2026-02-24 오후 3:43:11' },
        { gb: '투심일정', name: '[기타](증빙자료제외) 1. 매출 전자계산서 첨부(FY2022~2025).pdf', mod: '2026-02-24 오후 3:43:11' },
        { gb: '투심일정', name: '[기타](상세) 2-1. 우편치퇴,등기부등본 첨부(FY2023-2024).pdf', mod: '2026-02-24 오후 3:43:11' },
        { gb: '투심일정', name: '[기타](상세) 2-2. 우편치퇴,등기부등본 첨부(FY2025).pdf', mod: '2026-02-24 오후 3:43:11' },
        { gb: '투심일정', name: '[기타](상세) 3-1. 준위축협 매입 전자계산서 첨부_FY2025.pdf', mod: '2026-02-24 오후 3:43:11' },
        { gb: '투심일정', name: '[기타](상세) 3-2. 준위축협 급여계산서·거래명세서·이체확인증.pdf', mod: '2026-02-24 오후 3:43:11' },
        { gb: '투심결과', name: '에스티리테일_투심위 의사록_260220.pdf', mod: '2026-02-24 오후 2:34:11' },
        { gb: '투자계약서', name: '에스티리테일_투자계약서_260224.pdf', mod: '2026-02-24 오후 3:43:55' },
        { gb: '투자계약서', name: '에스티리테일_투자계약서 체크리스트_260224.pdf', mod: '2026-02-24 오후 3:43:55' },
      ] } },
  { id: 'ir-3', no: 3, gp: '엔비에이치(NBH)캐피탈 주식회사', fn: '웰투시-NBH 전북애그리푸드 투자조합', co: '주식회사 팡세', dt: '2026-06-18', inv: 1_200_000_000, ty: '신주-우선주', ob: 'Y', sm: 'Y', ag: 'Y', confirm: '미확정', appr: 1_150_000_000, pay: '2026-06-24', res: '',
    detail: { gen: { fund: '웰투시-NBH 전북애그리푸드 투자조합', mgr: '', dt: '2026-06-18', time: '', place: '' },
      co: { name: '주식회사 팡세', ceo1: '', ceo1b: '', ceo2: '', ceo2b: '', setup: '', biz: '', bizno: '' },
      inv: { total: '1,200,000,000', type: '신주-우선주', ob: 'Y', sm: 'Y', amt: '1,200,000,000', ratio: '', price: '' },
      files: [] } },
];
