/* 자금일보(ACC-021) 전자결재 더미 — 결재라인조회 사용자 목록 · 부서 · 기안자 · 기본 결재라인.
   출처: 화면설계서 ACC-021 자금일보 v1.0 slide 12(상신 모달 샘플 결재선) · slide 14(결재라인조회 사용자 목록).
   결정·가정
   - 로그인·조직도 API 가 없어 사용자·부서는 고정 더미. 기안자 = 홍길동 / 자금관리팀(설계서 샘플).
   - 기본 결재라인 = 설계서 상신 모달 샘플(결재 1~3 + 합의 1). 페이지 수명 동안만 유지(저장 API 없음). */

export interface ApprovalUser {
  id: string;       // 아이디(사번)
  name: string;     // 성명
  position: string; // 직위
  dept: string;     // 부서
}

export const APPROVAL_DEPTS = ['자금관리팀', '회계팀', '경영관리본부', '기획조정실', '투자운용팀'] as const;

/** 기안자(로그인 사용자) — 결재라인조회 부서 기본값 = 기안자 부서 */
export const DRAFTER: ApprovalUser = { id: '2019007', name: '홍길동', position: '대리', dept: '자금관리팀' };

export const APPROVAL_USERS: readonly ApprovalUser[] = [
  { id: '2015001', name: '김결재', position: '팀장', dept: '자금관리팀' },
  { id: '2008002', name: '이승인', position: '부장', dept: '자금관리팀' },
  { id: '2017011', name: '정자금', position: '과장', dept: '자금관리팀' },
  DRAFTER,
  { id: '2001003', name: '박본부', position: '본부장', dept: '경영관리본부' },
  { id: '2010021', name: '윤경영', position: '부장', dept: '경영관리본부' },
  { id: '2012004', name: '최협조', position: '팀장', dept: '회계팀' },
  { id: '2016014', name: '한회계', position: '과장', dept: '회계팀' },
  { id: '2011031', name: '오기획', position: '실장', dept: '기획조정실' },
  { id: '2018032', name: '서조정', position: '차장', dept: '기획조정실' },
  { id: '2013041', name: '강운용', position: '팀장', dept: '투자운용팀' },
  { id: '2020042', name: '임투자', position: '대리', dept: '투자운용팀' },
];

const byId = (id: string): ApprovalUser => {
  const u = APPROVAL_USERS.find((x) => x.id === id);
  if (!u) throw new Error(`unknown approval user ${id}`);
  return u;
};

/** 기본 결재라인 시드 — [결재1~3], [합의1~3] (null = 미지정) */
export const DEFAULT_LINE_SEED: { approval: (ApprovalUser | null)[]; agreement: (ApprovalUser | null)[] } = {
  approval: [byId('2015001'), byId('2008002'), byId('2001003')],
  agreement: [byId('2012004'), null, null],
};
