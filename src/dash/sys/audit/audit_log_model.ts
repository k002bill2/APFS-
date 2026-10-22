/* 감사로그 — 순수 모델(UI 없음). 출처: S0_104_감사로그.html `LOGS`·`applyFilter`·결과 배지.
   접속기록 · 권한변경 · 비정상 접근 통합 조회(목업). 보관 접속기록 2년 · 권한변경 3년(목업 문구).
   ⚠ 실제 접근 로그 수집·보안 이벤트 판정이 아니다 — 데모 행을 화면 로컬로 조회만 한다(브리프). 실명 아님. */

export const AUDIT_RESULTS = ['정상', '실패', '차단'] as const;
export type AuditResult = typeof AUDIT_RESULTS[number];
export const AUDIT_KINDS = ['접속', '계정', '권한변경', '비정상 접근'] as const;
export type AuditKind = typeof AUDIT_KINDS[number];

export interface AuditRow {
  id: string;
  ts: string;        // 'YYYY-MM-DD HH:mm:ss'
  actor: string;     // 로그인 아이디(시스템 행위는 '시스템')
  action: string;    // 행위
  target: string;    // 대상
  ip: string;
  result: AuditResult;
  kind: AuditKind;   // 행위에서 파생(브리프: 접속·권한변경·비정상 접근 행 구분)
}

/** 행위 문자열 → 유형(목업 행위 명칭 규칙) */
export function kindOf(action: string): AuditKind {
  if (action.startsWith('비정상 접근')) return '비정상 접근';
  if (action.startsWith('권한변경')) return '권한변경';
  if (action.startsWith('로그인')) return '접속';
  return '계정';
}

/* 목업 LOGS 14건(일시·행위자·행위·대상·IP·결과) — 대상의 이메일은 예시 도메인으로 치환 */
type Raw = [ts: string, actor: string, action: string, target: string, ip: string, result: AuditResult];
const RAW: Raw[] = [
  ['2026-09-13 09:02:11', 'nh.admin', '로그인 2차', 'TOTP', '10.0.1.20', '정상'],
  ['2026-09-13 09:02:03', 'nh.admin', '로그인 1차', 'ID/PW', '10.0.1.20', '정상'],
  ['2026-09-12 17:44:29', 'nh.admin', '권한변경', '권한 투자팀 (인쇄·다운로드 추가)', '10.0.1.20', '정상'],
  ['2026-09-12 17:41:02', 'nh.invest', '로그인 2차', 'TOTP', '10.0.2.31', '정상'],
  ['2026-09-12 14:20:45', 'imm.rep', '비정상 접근(데이터)', 'F1 직접ID (IDOR 차단)', '10.0.3.77', '차단'],
  ['2026-09-12 14:20:12', 'imm.rep', '비정상 접근(메뉴)', '회계 직접URL', '10.0.3.77', '차단'],
  ['2026-09-11 10:22:38', 'imm.rep', '로그인 2차', 'TOTP', '10.0.3.77', '정상'],
  ['2026-09-11 09:58:01', 'mof', '계정 잠금(5회)', 'ID/PW 5회 실패', '10.0.4.15', '차단'],
  ['2026-09-11 09:57:10', 'mof', '로그인 1차', 'ID/PW', '10.0.4.15', '실패'],
  ['2026-09-10 15:03:22', 'nh.trust', '로그인 2차', 'TOTP', '10.0.5.24', '정상'],
  ['2026-09-10 11:30:00', 'nh.admin', '사용자 등록·온보딩 메일 발송', '이수탁 <lee.trust@nh.example>', '10.0.1.20', '정상'],
  ['2026-09-09 09:15:44', 'mafra', '로그인 2차', 'TOTP', '10.0.4.28', '정상'],
  ['2026-09-08 16:02:19', 'nh.admin', 'OTP 재발급·재등록 안내 메일', '김수탁', '10.0.1.20', '정상'],
  ['2026-08-25 09:10:13', '시스템', '계정 자동 비활성', '정운용 (퇴사보고 연동)', '10.0.3.32', '정상'],
];

export function demoLogs(): AuditRow[] {
  return RAW.map(([ts, actor, action, target, ip, result], i) => ({ id: `a-${i + 1}`, ts, actor, action, target, ip, result, kind: kindOf(action) }));
}

export const RESULT_TONE: Readonly<Record<AuditResult, 'success' | 'warning' | 'danger'>> = Object.freeze({ '정상': 'success', '실패': 'warning', '차단': 'danger' });
export const KIND_TONE: Readonly<Record<AuditKind, 'info' | 'primary' | 'warning' | 'danger'>> = Object.freeze({ '접속': 'info', '계정': 'primary', '권한변경': 'warning', '비정상 접근': 'danger' });

/* 데모 기간 기본값(목업 검색박스 초기값) */
export const DEMO_RANGE: readonly [string, string] = ['2026-08-01', '2026-09-13'];

export interface AuditFilter { from?: string; to?: string; result?: string; kind?: string; actor?: string; kw?: string }
/** 목업 applyFilter — 기간(빈 값=열린 경계)·결과·유형·행위자(부분일치)·검색어(행위·대상 부분일치) */
export function filterLogs(rows: readonly AuditRow[], f: AuditFilter): AuditRow[] {
  const actor = (f.actor ?? '').trim().toLowerCase();
  const kw = (f.kw ?? '').trim().toLowerCase();
  return rows.filter((l) => {
    const d = l.ts.slice(0, 10);
    if (f.from && d < f.from) return false;
    if (f.to && d > f.to) return false;
    if (f.result && l.result !== f.result) return false;
    if (f.kind && l.kind !== f.kind) return false;
    if (actor && !l.actor.toLowerCase().includes(actor)) return false;
    if (kw && !`${l.action} ${l.target}`.toLowerCase().includes(kw)) return false;
    return true;
  });
}

/** 결과별 건수(툴바 요약) */
export function resultCounts(rows: readonly AuditRow[]): Record<AuditResult, number> {
  const c: Record<AuditResult, number> = { '정상': 0, '실패': 0, '차단': 0 };
  for (const l of rows) c[l.result]++;
  return c;
}
