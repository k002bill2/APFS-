/* 수탁보고 > 모태펀드 수탁 5리프의 원문 데이터(순수 모듈, React import 금지).
   - 모태수탁 공통코드   = S3_102 모태수탁공통코드 — 코드구분 7종 → 코드 목록
   - 계좌정보 관리       = S3_103 계좌정보관리 — 파일 업로드 폼(목록 없음)
   - 입출금 정보관리     = S3_105 입출금정보관리 — 파일 업로드 폼(목록 없음)
   - 입출금정보 비교조회 = S3_106 입출금정보조회 — 거래금액 원금·손익 2단 헤더 목록
   - 계좌정보 비교조회   = S3_104 계좌정보조회 — 단일 헤더 18열 + 개시일 기간 검색
     (단일 헤더·flat 이지만 스키마 트랙이 아니다: 원문 검색조건이 **기본값 있는 기간**(시작~종료)인데 스키마 필터는
      단일 일자·기본값 없음이라 원문 조회 동작을 담지 못한다 — Codex 리뷰 2026-09-23 P2)
   출처: docs/mockups/03_자산수탁/*.html `<script> DATA/LISTS` 2026-09-23 파싱 실측. 값·순서·개수를 바꾸지 않는다. */
import type { TableMeta, Provenance } from './risk_table_meta';
import { trustSrc, VERIFY_DIGITS } from './trust_sub_data';

const prov = (file: string): Provenance => ({ capturedAt: '2026-09-23', sourceSystem: 'TRUST', captureFiles: [trustSrc(file)] });

/* ═══════════════ S3_102 모태수탁공통코드 → 모태수탁 공통코드 ═══════════════ */
export const MOTHER_CODE_PROVENANCE = prov('S3_102_모태수탁공통코드.html');
/** 원문 코드구분 7종(옵션 순서 그대로) · 기본 '거래구분'(원문 selected) */
export const MOTHER_CODE_GROUPS = ['거래구분', '입출금구분', '계좌계정구분', '계좌구분', '계좌종류', '기타거래처코드', '금융기관코드'] as const;
export const MOTHER_CODE_DEFAULT = '거래구분';
/** 원문 `LISTS` — 확정 실데이터는 '거래구분' 1건(A1/모태출자금/입금성격)뿐, 나머지 6종은 빈 배열. grp = LISTS 키 */
export const MOTHER_CODE_TABLE: TableMeta = {
  id: 'motherCode',
  cols: [
    { key: 'code', label: '코드', kind: 'center', width: 160 },
    { key: 'name', label: '코드명', kind: 'text', width: 280 },
    { key: 'note', label: '비고', kind: 'text' },
  ],
  rows: [{ id: 'mc-1', grp: '거래구분', code: 'A1', name: '모태출자금', note: '입금성격' }],
  empty: '조회 결과가 없습니다.',
};

/* ═══════════════ S3_103 계좌정보관리 · S3_105 입출금정보관리 — 업로드 폼 ═══════════════
   원문은 파일명(드롭존 + 파일 선택) · 확인 버튼뿐이다. 파일형식·용량 규격은 원문에 없어 표기하지 않는다(원문 설계메모). */
export const ACCOUNT_UPLOAD_PROVENANCE = prov('S3_103_계좌정보관리.html');
export const CASHFLOW_UPLOAD_PROVENANCE = prov('S3_105_입출금정보관리.html');
/** S3_105 드롭존 안내 문구(원문 `#dzHint`) — S3_103 에는 없다 */
export const CASHFLOW_UPLOAD_HINT = '파일을 선택하거나 드래그앤드롭한 뒤 [확인]을 누르세요.';

/* ═══════════════ S3_104 계좌정보조회 → 계좌정보 비교조회 ═══════════════ */
export const ACCOUNT_PROVENANCE = prov('S3_104_계좌정보조회.html');
/** 원문 개시일 기본 기간(`f-from`~`f-to` value) */
export const ACCOUNT_RANGE = '2026-07-13~2026-08-13';
/** 원문 DATA 1건(설계메모: 원문 확정 실데이터 1건 — 예시 2건·합계행은 원문에 없어 제거됨).
    계좌구분 `.tag n` · 계정구분 `.tag b` 배지, 이율은 원문 문자열 '3.65', 비고 '' → 원문 표시 '-'.
    원본액 헤더는 원문이 `원본액 (<span id="u-head">원</span>)` 으로 단위를 붙인다 → 라벨 '원본액' + 단위 토글(엑셀 헤더는 단위를 단다) */
export const ACCOUNT_TABLE: TableMeta = {
  id: 'account',
  cols: [
    { key: 'no', label: 'No', kind: 'number', align: 'center', width: 64 },
    { key: 'acc', label: '계좌번호', kind: 'text' },
    { key: 'pnm', label: '상품명', kind: 'text', width: 240 },
    { key: 'gcd', label: '계좌구분코드', kind: 'center' },
    { key: 'g', label: '계좌구분', kind: 'badge', tone: 'muted' },
    { key: 'jcd', label: '계정구분코드', kind: 'center' },
    { key: 'j', label: '계정구분', kind: 'badge', tone: 'info' },
    { key: 'kcd', label: '계좌종류코드', kind: 'center' },
    { key: 'k', label: '계좌종류', kind: 'center' },
    { key: 'st', label: '개시일', kind: 'date' },
    { key: 'en', label: '종료일', kind: 'date' },
    { key: 'rate', label: '이율(%)', kind: 'number' },
    { key: 'won', label: '원본액', kind: 'amount' },
    { key: 'fcd', label: '금융기관코드', kind: 'center' },
    { key: 'fnm', label: '금융기관명', kind: 'center' },
    { key: 'subj', label: '계정과목', kind: 'center' },
    { key: 'memo', label: '비고', kind: 'text' },
    { key: 'reg', label: '등록일자', kind: 'date' },
  ],
  rows: [{
    id: 'acc-1', no: 1, acc: '1020020911969', pnm: '정기우리270713 농식품모태펀드(기본)', gcd: 'A2', g: '미투자자산', jcd: 'A1', j: '농식품투자계정',
    kcd: 'A1', k: '정기예금', st: '2026-07-13', en: '2027-07-13', rate: '3.65', won: 10000000000,
    fcd: '020', fnm: '우리은행', subj: '정기예금', memo: '-', reg: '2026-07-14',
  }],
};

/* ═══════════════ S3_106 입출금정보조회 → 입출금정보 비교조회 ═══════════════ */
export const CASHFLOW_PROVENANCE = prov('S3_106_입출금정보조회.html');
/** 원문 거래일자 기본 기간(`f-from`~`f-to` value) */
export const CASHFLOW_RANGE = '2026-07-13~2026-08-13';
/** 원문 DATA 1건. 원문 키 `id`(입출금구분)는 행 id 와 겹쳐 `io` 로 옮긴다. null 금액은 원문 fmt() → '-' */
export const CASHFLOW_TABLE: TableMeta = {
  id: 'cashflow', unitDigits: VERIFY_DIGITS,   // S3_106 원문 fmt() 도 원 정수 · 백만원 최대 1 · 억원 최대 2(S3_101 과 같다)
  cols: [
    { key: 'no', label: 'No', kind: 'number', align: 'center', width: 64 },
    { key: 'acct', label: '계좌번호', kind: 'text' },
    { key: 'dt', label: '거래일자', kind: 'date' },
    { key: 'seq', label: '거래순번', kind: 'number', align: 'center' },
    { key: 'tc', label: '거래구분코드', kind: 'center' },
    { key: 'td', label: '거래구분', kind: 'text' },
    { key: 'ic', label: '입출금구분코드', kind: 'center' },
    /* 원문 ioTag: 출금=`.tag r` · 입금=`.tag b` · 그 외 `.tag n` */
    { key: 'io', label: '입출금구분', kind: 'badge', tones: { 출금: 'danger', 입금: 'info' } },
    { key: 'prin', label: '원금', kind: 'amount', group: '거래금액' },
    { key: 'pl', label: '손익', kind: 'amount', group: '거래금액' },
    { key: 'bal', label: '거래후잔액', kind: 'amount' },
    { key: 'pc', label: '거래처코드', kind: 'center' },
    { key: 'party', label: '거래처', kind: 'text' },
    { key: 'memo', label: '적요', kind: 'text', width: 180 },
    { key: 'cp', label: '상대계좌', kind: 'text' },
    { key: 'inv', label: '출자금액', kind: 'amount' },
    { key: 'rp', label: '회수원금', kind: 'amount' },
    { key: 'rpl', label: '회수손익', kind: 'amount' },
    { key: 'rd', label: '등록일자', kind: 'date' },
  ],
  rows: [{
    id: 'cf-1', no: 1, acct: '3170005846651', dt: '2026-07-13', seq: 1, tc: 'B3', td: '미투자자산', ic: 'B0', io: '출금',
    prin: 3000000000, pl: null, bal: 1434049117, pc: 'A1', party: '농식품모태펀드', memo: 'MNY010K(유동자산매입)',
    cp: '8169153346052', inv: null, rp: null, rpl: null, rd: '2026-07-14',
  }],
};
