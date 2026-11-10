/* 상세 팝업 레지스트리(조립 지점) — 스키마의 detail 키 → 팝업 컴포넌트·링크 힌트. 스키마는 키만 선언하고 매핑은 여기가 갖는다.
   schemas/index.ts(스키마 레지스트리)처럼 도메인 화면을 import 해도 되는 몇 안 되는 파일이다 — 공용 골격(generic_list)은
   이 파일만 보고 도메인 폴더를 직접 import 하지 않는다(가드 core_domain_free.test.ts). 복제 과제는 이 파일과 detail_popup_keys.ts 만 새로 쓴다.
   팝업은 읽기전용이지만 **누른 행**을 받는다 — S1_43 산출내역·S1_40 체크리스트는 행마다 값이 다르다.
   ⚠ `row` 를 안 넘기던 종전 코드 탓에 CompanyProfileModal 의 `row?` prop 이 한 번도 소비되지 않아
     어느 행을 눌러도 헤더 대상명이 폴백 상수로 굳어 있었다(선언이 소비처까지 닿지 않는 그 부류).
   타입 파라미터는 반변이라 `{ onClose }` 만 받는 기존 팝업도 그대로 할당된다 — 무수정으로 남겨 둔다. */
import type React from 'react';
import type { DetailPopup } from './types';
import type { Row } from '../generic_list_modal';
import { MonthlyReportModal } from '../iam/report/monthly_report_modal';   // 읽기전용 상세 보고서 팝업(컬럼 detail 옵트인 스키마만)
import { GpSpecModal } from '../iam/report/gp_spec_modal';                 // 운용사 명세(S1_02) — 운용사 명세서 목록의 행 상세
import { CompanyProfileModal } from '../iam/ent/company_profile_modal'; // 투자기업 기업개요(S1_30) — 투자기업정보(통합)의 행 상세
import { MgmtFeeDetailModal } from '../iam/gp/mgmt_fee_detail_modal';   // 관리보수보고 상세조회(S1_43) — 지급일자 링크
import { DueDiligChecklistModal } from '../iam/gp/due_dilig_checklist_modal'; // 투자금실사보고서 체크리스트(S1_40) — 실사일자 링크
import { GpRatioDetailModal } from '../iam/gp/gp_ratio_detail_modal';       // 운용사정량지표상세(재무건정성비율)(S1_38) — 기준년월 링크

export const DETAIL_MODALS: Record<DetailPopup, (p: { onClose: () => void; row: Row }) => React.ReactElement> = {
  monthlyReport: MonthlyReportModal,
  gpSpec: GpSpecModal,
  companyProfile: CompanyProfileModal,
  mgmtFeeDetail: MgmtFeeDetailModal,
  dueDiligChecklist: DueDiligChecklistModal,
  gpRatioDetail: GpRatioDetailModal,
};

/* 링크 셀 title(동작 힌트) — 값은 절대 넣지 않는다 */
export const DETAIL_HINT: Record<DetailPopup, string> = {
  monthlyReport: '월간보고 상세 보기',
  gpSpec: '운용사 명세 보기',
  companyProfile: '투자기업 기업개요 보기',
  mgmtFeeDetail: '관리보수보고 상세조회',
  dueDiligChecklist: '투자금실사보고서 체크리스트 조회',
  gpRatioDetail: '운용사정량지표상세(재무건정성비율) 보기',
};
