/* 재무상태표 — 회계 > 장부조회 > 재무상태표 (route acct-balance-sheet, 화면ID ACC-012, 요구사항 SFR-016-12/18, 설계서 slide 9~22).
   골격(툴바·그리드·상세필터·팝업·출력)은 statement_kit.tsx(ACC-012·013 공용) — 이 파일은 화면 설정만 둔다.

   설계서 → 우리 규약 (이 화면 기준)
   - ① 브레드크럼 '홈 > 회계 > 장부조회 > 재무상태표' · ☆ 즐겨찾기(favRoute) · [메인으로] = GridFrame 규약.
   - E00 메뉴 진입: 계정구분 전체 · 당기기준일 = 올해 12-31(당기 결산일) · 전기기준일 = 전년 12-31 · 미결재 부 · 모든계정 부 ·
     결산전표 전부포함(slide 11 기본값). 설계서 계정구분 '선택 필요·필수' ↔ E00 '필터 없음 전체 조회' 충돌 → 전체(PM 확인).
   - ② 툴바: [상세필터](E01) · ⟳ 조회(E02, 토스트 "조회되었습니다"). 설계서 "보기 필터(당기·전기/차대변)"는 미구현(결산서 6열에 차대변 열이 없음 — PM 확인).
   - E01 상세필터 6개(slide 11·18): 계정구분(셀렉트 — 검색창은 옵션 10개 이상일 때 자동, searchable 미지정 2026-11-03) · 당기기준일* · 전기기준일*(달력) · 미결재포함(체크박스) · 모든계정포함(부/여 —
     여 = 잔액 0 계정 표시) · 결산전표포함(체크박스 — 체크 = 전부포함). [필터 적용] 검증 — 미입력 "기준일을 입력하세요." ·
     전기 ≥ 당기 "전기기준일은 당기기준일보다 이전이어야 합니다." 기준일 칩은 필수라 × 없음. slide 15(기간형·체크박스) 변형은 따르지 않음.
   - ③ 그리드 6열: 계정코드 · 계정과목명(레벨 들여쓰기) · 제N(당)기(회기기간)[세부금액|합계금액] · 제N-1(전)기[세부금액|합계금액].
     계층 = 자산 > Ⅰ. 유동자산 > (1) 당좌자산 > 계정 … 자 산 총 계 / 부채 … 부 채 총 계 / 자본 … Ⅲ. 이익잉여금
     (전기이월이익잉여금·당기순이익 — 손익 계정에서 파생, ledger_model balanceSheet) … 자 본 총 계 / 자본과 부채총계.
     입력계정 = 세부금액 열, 소계·총계 = 합계금액 열. 계정코드 '중앙' 정렬 → 좌측(정렬 규약). 계층 순서라 정렬 끔.
   - E03 행 더블클릭/Enter → 「계정별 상세내역」(AccountDetailModal · 기준일 = 당기 회기 시작일 ~ 당기기준일). 입력계정 행만 —
     소계·합계·총계·이익잉여금 파생 행은 무반응(설계서 "소계·합계 행 처리 확인 필요" → 합계행 무반응으로 둠).
   - E06 상세내역 행 더블클릭 → 전표 상세(JournalEntryScreen readOnly · [닫기]만) · [전잔] 행 무반응.
   - ④ 푸터: E04 [새 창] · E05 [내보내기](⌥D · SheetJS · 금액 숫자 셀 · 토스트 "Excel로 내보냈습니다") ·
     E07 [인쇄] combo — 본체/⌘P = 그리드 인쇄, ⌄ '재무상태표 출력' = 리포트 뷰어(slide 14 양식 · 0건이면 "조회 결과가 없습니다.").
     "인쇄·다운로드" 권한 기반 노출은 RBAC 미구현이라 항상 노출. 팝업·뷰어는 새 창 대신 Dialog.
   - 출력 양식(slide 14·22): 제목 '재 무 상 태 표' · 기간 줄 '제 N기 YYYY년 MM월 DD일 현재'(당기·전기 2줄) · 계정구분명(좌)/단위(우) ·
     계정코드 미출력 · 총계 행 들여쓰기 없음 · SAVE 파일명 '재무상태표_계정구분명_당기기준일'. */
import { StatementKit, krDate } from './statement_kit';
import type { StatementConfig, StatementTerm } from './statement_kit';
import { balanceSheet } from './ledger_model';

/** 출력 양식 기간 줄(slide 14) — 기준일 '현재' 표기(회기 종료일이 아니라 기준일) */
export const balancePeriodLines = (cur: StatementTerm, prev: StatementTerm): string[] =>
  [`제 ${String(cur.no)}기 ${krDate(cur.end)} 현재`, `제 ${String(prev.no)}기 ${krDate(prev.end)} 현재`];

export const BALANCE_SHEET_CONFIG: StatementConfig = {
  route: 'acct-balance-sheet',
  title: '재무상태표',
  build: balanceSheet,
  printTitle: '재 무 상 태 표',
  periodLines: balancePeriodLines,
};

export function BalanceSheetManage({ onNav }: { onNav?: (r: string) => void }) {
  return <StatementKit config={BALANCE_SHEET_CONFIG} onNav={onNav} />;
}
