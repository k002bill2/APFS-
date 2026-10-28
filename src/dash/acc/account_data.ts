/* 회계 공용 계정과목 데이터 — 계정과목 검색 팝업(ACC-001/002/003 공통)·결산양식 관리·일반전표가 함께 쓴다.
   출처: feat/acc-general-journal `acc/slip/general_journal_data.ts` 계정과목 블록을 필드명·값 그대로 옮김(합칠 때 import 경로만 바꾼다). */

/* ── 계정과목(slide 14 계정과목 검색) ── */
export type AccountClass = '자산' | '부채' | '자본' | '손익';
export type DrCr = '차변' | '대변';
export interface AccountItem {
  code: string;          // 7자리
  name: string;          // 상위 계정은 로마숫자 접두(I., II.)
  inputYn: 'Y' | 'N';    // N = 집계 계정(전표 입력 불가)
  drcr: DrCr;
  cls: AccountClass;     // 계정분류 라디오(전체·자산·부채·자본·손익)
}
const acc = (code: string, name: string, inputYn: 'Y' | 'N', drcr: DrCr, cls: AccountClass): AccountItem => ({ code, name, inputYn, drcr, cls });
export const ACCOUNTS: AccountItem[] = [
  acc('1000000', '자산', 'N', '차변', '자산'),
  acc('1100000', 'I. 유동자산', 'N', '차변', '자산'),
  acc('1100100', '보통예금', 'Y', '차변', '자산'),
  acc('1100200', '정기예금', 'Y', '차변', '자산'),
  acc('1100300', '미수수익', 'Y', '차변', '자산'),
  acc('1100400', '선급금', 'Y', '차변', '자산'),
  acc('1200000', 'II. 비유동자산', 'N', '차변', '자산'),
  acc('1200100', '조합출자금', 'Y', '차변', '자산'),
  acc('1200200', '비품', 'Y', '차변', '자산'),
  acc('1200300', '소프트웨어', 'Y', '차변', '자산'),
  acc('2000000', '부채', 'N', '대변', '부채'),
  acc('2100000', 'I. 유동부채', 'N', '대변', '부채'),
  acc('2100100', '미지급금', 'Y', '대변', '부채'),
  acc('2100200', '예수금', 'Y', '대변', '부채'),
  acc('2100300', '미지급비용', 'Y', '대변', '부채'),
  /* slide 14 표 원문 그대로 */
  acc('3000000', '자본', 'N', '대변', '자본'),
  acc('3100000', 'I. 자본금', 'N', '대변', '자본'),
  acc('3100100', '보통주자본금', 'Y', '대변', '자본'),
  acc('3100200', '우선주자본금', 'Y', '대변', '자본'),
  acc('3100300', '출자금', 'Y', '대변', '자본'),
  acc('3200000', 'II. 자본잉여금', 'N', '대변', '자본'),
  acc('3200100', '주식발행초과금', 'Y', '대변', '자본'),
  acc('4000000', '수익', 'N', '대변', '손익'),
  acc('4100100', '이자수익', 'Y', '대변', '손익'),
  acc('4100200', '배당금수익', 'Y', '대변', '손익'),
  acc('4100300', '조합분배금수익', 'Y', '대변', '손익'),
  acc('5000000', '비용', 'N', '차변', '손익'),
  acc('5100100', '관리보수', 'Y', '차변', '손익'),
  acc('5100200', '지급수수료', 'Y', '차변', '손익'),
  acc('5100300', '사무용품비', 'Y', '차변', '손익'),
  acc('5100400', '감가상각비', 'Y', '차변', '손익'),
];

/* 계정분류 라디오 옵션 — '전체'는 미적용 */
export type AccountClassFilter = '전체' | AccountClass;
export const ACCOUNT_CLASS_FILTERS: AccountClassFilter[] = ['전체', '자산', '부채', '자본', '손익'];

/** 검색어(코드/명 부분일치, 대소문자 무시) + 계정분류로 거른 뒤 계정코드 오름차순. 순수 함수 — 팝업·테스트 공용 */
export function searchAccounts(list: readonly AccountItem[], keyword: string, cls: AccountClassFilter): AccountItem[] {
  const q = keyword.trim().toLowerCase();
  return list
    .filter((a) => (cls === '전체' || a.cls === cls) && (!q || a.code.includes(q) || a.name.toLowerCase().includes(q)))
    .sort((a, b) => a.code.localeCompare(b.code));
}
