/* 손익계산서 — 회계 > 장부조회 > 손익계산서 (route acct-income-statement, 화면ID ACC-013, 설계서 slide 9~22).
   골격·공통 결정(상세필터 6개·2단 헤더·더블클릭 상세·푸터 인쇄 combo·리포트 뷰어)은 statement_kit.tsx 머리 주석.
   이 파일은 화면 설정만 둔다(재무상태표 balance_sheet_manage 와 같은 골격, 손익 고유 차이만 아래).

   설계서 → 우리 규약(ACC-013 고유)
   - 계층(slide 10·14): 4000000 손익(머리행) > Ⅰ. 영업수익 > 계정 · Ⅱ. 영업비용 > 계정 · Ⅲ. 영업이익(4299999) · Ⅳ. 당기순이익(4999999)
     — ledger_model incomeStatement. 이익 행은 합계금액 열, 손실은 '-'. 표는 당기순이익 행으로 끝난다.
     설계서 샘플의 (7) 판매비와관리비 · Ⅷ. 당기순이익 번호는 ACC-001 계정 체계(중간 묶음·영업외 계정 없음)에 맞춰 Ⅳ 로 둔다(PM 확인).
     영업이익·당기순이익 번호는 '보이는 대분류 수'로 매긴다(모든계정 부로 한쪽 대분류가 숨으면 Ⅱ 또는 Ⅰ 이 비고 Ⅲ 부터 —
     설계서 slide 10 샘플(Ⅱ. 영업비용만 보이고 Ⅲ. 영업이익)과 같은 모양이라 의도된 동작. 대분류 자체 번호는 계정 고정 라벨).
   - 금액 = 회계기간(회기 시작 ~ 기준일). 그리드·엑셀 헤더 = 회기기간 '제N(당)기 (회기 시작 ~ 회기 종료일)' · '제N-1(전)기 (…)'(statement_kit termHeader) — 금액 자체는 기준일까지.
   - 상세필터 기본값(slide 11): 계정구분 전체 · 당기기준일 = 올해 결산일(12-31) · 전기기준일 = 전년 결산일 · 미결재 부 · 모든계정 부 ·
     결산전표 전부포함 → DEFAULT_COND 그대로라 defaults 덮어쓰기 없음. 검증 문구(E01 — 즉시 반영, 실패 = 칸 표시 + 결과 0건): "기준일을 입력하세요." /
     "전기기준일은 당기기준일보다 이전이어야 합니다."
   - E03 계정별 상세내역 기준일 = 당기 회기 시작일 ~ 당기기준일(손익 계정은 회기 시작에서 잔액 0 부터 누적).
   - 출력 양식(slide 14·22): 제목 '손 익 계 산 서' · 회계기간 'YYYY년 MM월 DD일 부터 YYYY년 MM월 DD일 까지'(당기·전기 2줄) ·
     계정구분명(좌)·단위(우) · 계정코드 미출력 · A4 세로. SAVE 파일명 '손익계산서_계정구분명_당기기준일'. */
import { StatementKit, krDate } from './statement_kit';
import type { StatementConfig, StatementTerm } from './statement_kit';
import { incomeStatement } from './ledger_model';

/** 출력 양식 회계기간 줄 — 당기·전기 각 '회기 시작 부터 기준일 까지' */
export const incomePeriodLines = (cur: StatementTerm, prev: StatementTerm): string[] =>
  [cur, prev].map((t) => `${krDate(t.start)} 부터 ${krDate(t.end)} 까지`);

export const INCOME_STATEMENT_CONFIG: StatementConfig = {
  route: 'acct-income-statement',
  title: '손익계산서',
  build: incomeStatement,
  printTitle: '손 익 계 산 서',
  periodLines: incomePeriodLines,
};

export function IncomeStatementManage({ onNav }: { onNav?: (r: string) => void }) {
  return <StatementKit config={INCOME_STATEMENT_CONFIG} onNav={onNav} />;
}
