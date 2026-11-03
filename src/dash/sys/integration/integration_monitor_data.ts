/* 연동 모니터링(ADM-005) — 데모 데이터. 출처: `연동 모니터링.html` 하단 스크립트의 `INSTS`·`TRSM`·`PRCS`·`ATTACH` 리터럴 그대로.
   필드명·값·순서를 목업과 같게 둔다(리뷰·PM 대조가 목업 키로 된다). 기간 기본값도 목업 검색박스 초기값 그대로.
   ⚠ 실제 외부연동 송수신·배치 반영 기록이 아니다 — 연계기관·인터페이스ID·오류코드 체계는 목업이 도메인 추론으로 만든 예시다.
   regUser/regDt(최초등록)는 수신 즉시 적재되는 로그성 테이블 특성상 요청자ID/요청일시와 같은 값이다(목업 주석). */

/** 연계기관 — 목업 `INSTS`(송수신이력 연계기관 select 옵션) */
export const INSTS = ['NICE평가정보', '농식품 투자정보 플랫폼(ASSIST)', '가치평가시스템', '운용사'] as const;
/** 연계방식 — 목업 `t-f-mth` 옵션 */
export const METHODS = ['REST API', 'Batch', 'SFTP'] as const;
/** 송수신 — 목업 `t-f-trrc` 옵션 */
export const DIRECTIONS = ['송신', '수신'] as const;
/** 처리상태 — 목업 `p-f-stts` 옵션(상태 전이: 반영대기 → 반영완료/검증오류/반영실패/제외) */
export const PRCS_STATUSES = ['반영대기', '반영완료', '검증오류', '반영실패', '제외'] as const;

export type Method = typeof METHODS[number];
export type Direction = typeof DIRECTIONS[number];
export type PrcsStatus = typeof PRCS_STATUSES[number];

/** 송수신이력 1건(연계일련번호 단위 요청·응답 통신 기록) */
export interface TrsmRow {
  sn: number;              // 연계일련번호
  trsmId: string;          // 전송ID
  inst: string;            // 연계기관
  rqstr: string;           // 요청자ID
  ifId: string;            // 인터페이스ID
  trrc: Direction;         // 송수신
  mth: Method;             // 연계방식
  rsn: string;             // 전송사유(정기·재전송)
  orgnlSn: number | null;  // 원연계일련번호(재전송 건만)
  ip: string;
  url: string;
  req: string;             // 요청일시 'YYYY-MM-DD HH:mm:ss'
  rsp: string;             // 응답일시
  whol: number;            // 전체 건수
  scs: number;             // 성공 건수
  fail: number;            // 실패 건수
  cd: string;              // 응답코드('0' = 성공)
  msg: string;             // 응답메시지
  encpt: string;           // 전문암호화값
  regUser: string;         // 최초등록자
  regDt: string;           // 최초등록일시
}

/** 연계처리이력 1건(들어온 레코드가 배치로 업무 테이블에 반영되는 상태 전이) */
export interface PrcsRow {
  sn: number;               // 이력일련번호
  linkSn: number;           // 연계일련번호(→ TrsmRow.sn)
  tbl: string;              // 대상테이블명
  key: string;              // 거래고유번호
  bef: PrcsStatus | null;   // 변경전 상태(최초 적재는 null)
  aft: PrcsStatus;          // 변경후 상태
  err: string;              // 오류코드('' = 없음)
  msg: string;              // 오류메시지('' = 없음)
  retry: number;            // 재처리 횟수(자동 재전송 이력)
  actor: string;            // 행위자
  dt: string;               // 발생일시
}

/** 연계첨부파일 1건 */
export interface AttachRow {
  linkSn: number; tbl: string; key: string;
  fileSn: number; fileType: string;
  orgName: string; stgName: string; path: string;
  size: number;             // 바이트
  regUser: string; regDt: string;
}

export const TRSM: readonly TrsmRow[] = Object.freeze([
  { sn: 1024, trsmId: 'a1e3f9c2-11', inst: '운용사', rqstr: 'API_CLIENT_GP01', ifId: 'IF-GP-REPORT-01', trrc: '수신', mth: 'REST API', rsn: '정기', orgnlSn: null, ip: '203.233.10.21', url: '/api/v1/gp/report/upload', req: '2026-10-28 09:00:12', rsp: '2026-10-28 09:00:13', whol: 120, scs: 120, fail: 0, cd: '0', msg: 'OK', encpt: '7f9a2e...c41b', regUser: 'API_CLIENT_GP01', regDt: '2026-10-28 09:00:12' },
  { sn: 1023, trsmId: 'a1e3f9c2-10', inst: '가치평가시스템', rqstr: 'BATCH_VAL_ACCT', ifId: 'IF-VAL-SYNC-02', trrc: '수신', mth: 'Batch', rsn: '정기', orgnlSn: null, ip: '10.20.5.33', url: '-', req: '2026-10-28 06:30:00', rsp: '2026-10-28 06:32:41', whol: 48, scs: 45, fail: 3, cd: 'E400-0007', msg: '일부 레코드 필수값 누락', encpt: 'c0912a...88ef', regUser: 'BATCH_VAL_ACCT', regDt: '2026-10-28 06:30:00' },
  { sn: 1022, trsmId: 'a1e3f9c2-09', inst: 'NICE평가정보', rqstr: 'BATCH_NICE_ACCT', ifId: 'IF-NICE-CREDIT-01', trrc: '수신', mth: 'SFTP', rsn: '정기', orgnlSn: null, ip: '172.16.40.5', url: 'sftp://nice.kr/outbound/', req: '2026-10-28 05:00:00', rsp: '2026-10-28 05:04:18', whol: 300, scs: 300, fail: 0, cd: '0', msg: 'OK', encpt: '91ab3d...12fa', regUser: 'BATCH_NICE_ACCT', regDt: '2026-10-28 05:00:00' },
  { sn: 1021, trsmId: 'a1e3f9c2-08', inst: '농식품 투자정보 플랫폼(ASSIST)', rqstr: 'API_CLIENT_MOAF', ifId: 'IF-MOAF-FUND-03', trrc: '송신', mth: 'REST API', rsn: '정기', orgnlSn: null, ip: '203.233.10.21', url: '/api/v1/moaf/fund/sync', req: '2026-10-27 22:00:05', rsp: '2026-10-27 22:00:06', whol: 12, scs: 12, fail: 0, cd: '0', msg: 'OK', encpt: '4b2e71...aa09', regUser: 'API_CLIENT_MOAF', regDt: '2026-10-27 22:00:05' },
  { sn: 1019, trsmId: 'a1e3f9c2-06', inst: '운용사', rqstr: 'API_CLIENT_GP04', ifId: 'IF-GP-REPORT-01', trrc: '수신', mth: 'REST API', rsn: '재전송', orgnlSn: 1015, ip: '121.78.44.9', url: '/api/v1/gp/report/upload', req: '2026-10-27 18:40:00', rsp: '2026-10-27 18:40:01', whol: 5, scs: 5, fail: 0, cd: '0', msg: 'OK', encpt: '33fd90...76e2', regUser: 'API_CLIENT_GP04', regDt: '2026-10-27 18:40:00' },
  { sn: 1018, trsmId: 'a1e3f9c2-05', inst: '가치평가시스템', rqstr: 'BATCH_VAL_ACCT', ifId: 'IF-VAL-SYNC-02', trrc: '수신', mth: 'Batch', rsn: '정기', orgnlSn: null, ip: '10.20.5.33', url: '-', req: '2026-10-27 06:30:00', rsp: '2026-10-27 06:31:55', whol: 50, scs: 50, fail: 0, cd: '0', msg: 'OK', encpt: '2a7788...5519', regUser: 'BATCH_VAL_ACCT', regDt: '2026-10-27 06:30:00' },
  { sn: 1017, trsmId: 'a1e3f9c2-04', inst: 'NICE평가정보', rqstr: 'BATCH_NICE_ACCT', ifId: 'IF-NICE-CREDIT-01', trrc: '수신', mth: 'SFTP', rsn: '정기', orgnlSn: null, ip: '172.16.40.5', url: 'sftp://nice.kr/outbound/', req: '2026-10-27 05:00:00', rsp: '2026-10-27 05:03:30', whol: 295, scs: 295, fail: 0, cd: '0', msg: 'OK', encpt: 'f10cde...3b21', regUser: 'BATCH_NICE_ACCT', regDt: '2026-10-27 05:00:00' },
  { sn: 1015, trsmId: 'a1e3f9c2-02', inst: '운용사', rqstr: 'API_CLIENT_GP04', ifId: 'IF-GP-REPORT-01', trrc: '수신', mth: 'REST API', rsn: '정기', orgnlSn: null, ip: '121.78.44.9', url: '/api/v1/gp/report/upload', req: '2026-10-27 18:10:00', rsp: '2026-10-27 18:10:05', whol: 5, scs: 0, fail: 5, cd: 'E500-0001', msg: '대상 시스템 처리 중 오류', encpt: '7788aa...33cc', regUser: 'API_CLIENT_GP04', regDt: '2026-10-27 18:10:00' },
] satisfies TrsmRow[]);

export const PRCS: readonly PrcsRow[] = Object.freeze([
  { sn: 5101, linkSn: 1023, tbl: '가치평가', key: 'VAL-20261028-0031', bef: '반영대기', aft: '검증오류', err: 'E400-0007', msg: '필수값(평가기준일) 누락', retry: 0, actor: 'BATCH_VAL_ACCT', dt: '2026-10-28 06:32:41' },
  { sn: 5100, linkSn: 1023, tbl: '가치평가', key: 'VAL-20261028-0030', bef: '반영대기', aft: '반영완료', err: '', msg: '', retry: 0, actor: 'BATCH_VAL_ACCT', dt: '2026-10-28 06:32:40' },
  { sn: 5097, linkSn: 1019, tbl: '운용사보고', key: 'GP-20261027-1188', bef: '검증오류', aft: '반영완료', err: '', msg: '재전송 후 반영 확인', retry: 1, actor: '관리자', dt: '2026-10-27 18:40:01' },
  { sn: 5096, linkSn: 1024, tbl: '운용사보고', key: 'GP-20261028-1201', bef: '반영대기', aft: '반영완료', err: '', msg: '', retry: 0, actor: 'API_CLIENT_GP01', dt: '2026-10-28 09:00:13' },
  { sn: 5095, linkSn: 1022, tbl: '신용정보', key: 'NICE-20261028-0501', bef: '반영대기', aft: '반영완료', err: '', msg: '', retry: 0, actor: 'BATCH_NICE_ACCT', dt: '2026-10-28 05:04:18' },
  { sn: 5094, linkSn: 1021, tbl: '모태펀드', key: 'MOAF-20261027-0022', bef: null, aft: '제외', err: '', msg: '테스트 데이터 제외 처리', retry: 0, actor: '관리자', dt: '2026-10-27 22:00:06' },
] satisfies PrcsRow[]);

export const ATTACH: readonly AttachRow[] = Object.freeze([
  { linkSn: 1024, tbl: '운용사보고', key: 'GP-20261028-1201', fileSn: 1, fileType: '공문', orgName: '2026년10월_정기보고_공문.pdf', stgName: 'GP01_20261028_0001.pdf', path: '/link/2026/10/28/', size: 245760, regUser: 'API_CLIENT_GP01', regDt: '2026-10-28 09:00:13' },
  { linkSn: 1024, tbl: '운용사보고', key: 'GP-20261028-1201', fileSn: 2, fileType: '통지서', orgName: '자산운용보고_통지서.pdf', stgName: 'GP01_20261028_0002.pdf', path: '/link/2026/10/28/', size: 88320, regUser: 'API_CLIENT_GP01', regDt: '2026-10-28 09:00:13' },
  { linkSn: 1019, tbl: '운용사보고', key: 'GP-20261027-1188', fileSn: 1, fileType: '회계감사', orgName: '2026년3분기_회계감사보고서.pdf', stgName: 'GP04_20261027_0001.pdf', path: '/link/2026/10/27/', size: 1540096, regUser: 'API_CLIENT_GP04', regDt: '2026-10-27 18:40:01' },
] satisfies AttachRow[]);

/** 대상테이블 — 목업 `TBLS`(PRCS 에서 등장 순서대로 중복 제거) */
export const TBLS: readonly string[] = Object.freeze(Array.from(new Set(PRCS.map((r) => r.tbl))));

/** 요청기간·발생기간 기본값 — 목업 검색박스 초기값(두 탭 같음) */
export const DEMO_RANGE: readonly [string, string] = ['2026-09-28', '2026-10-28'];
