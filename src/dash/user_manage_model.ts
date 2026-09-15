/* 사용자관리 — 순수 모델(UI 없음). 출처: S0_101_사용자관리.html `USERS`·`gate`·`applyFilter`·담당자 교체.
   ⚠ 실제 계정·인증·잠금 정책이 아니다 — 화면 로컬 더미 상태만 바꾼다(브리프). 실명 아님. */
import type { UType } from './admin_menu_tree';
import { orgName } from './admin_demo_data';
import type { RoleName } from './admin_demo_data';

export const USER_STATUSES = ['활성', '온보딩대기', '잠금', '비활성'] as const;
export type UserStatus = typeof USER_STATUSES[number];
export type AccountKind = '농식품' | '수산';

export interface UserRow {
  id: string;
  lid: string;            // 로그인 아이디(등록 후 불변)
  name: string;           // 성명(계정명)
  type: UType;            // 사용자구분
  dept?: string;          // 농금원 부서
  org?: string;           // 운용사·수탁 소속 기관 id(ORGS)
  account?: AccountKind;  // 부처 계정구분
  email: string;
  roles: RoleName[];      // 권한(복수)
  status: UserStatus;
  last: string;           // 최근 접속일시 'YYYY-MM-DD HH:mm' · 미접속 '—'
  fail: number;           // 로그인 실패 횟수(표시용)
  seed?: boolean;         // 시드 계정 표식
  pwExpired?: boolean;    // 비밀번호 만료 처리됨(표시용)
}

/* 목업 USERS 8건 그대로(실명 아님) */
export function demoUsers(): UserRow[] {
  return [
    { id: 'U1', lid: 'nh.invest', name: '김담당', type: '농금원', dept: '투자팀', email: 'kim@apfs.example', roles: ['투자팀'], status: '활성', last: '2026-09-12 17:41', fail: 0 },
    { id: 'U2', lid: 'nh.admin', name: '전산관리', type: '농금원', dept: '전산', email: 'sys@apfs.example', roles: ['전산(관리자)'], status: '활성', last: '2026-09-13 09:02', fail: 0, seed: true },
    { id: 'U3', lid: 'imm.rep', name: '이대표', type: '운용사', org: 'IMM', email: 'lee@imm.example', roles: ['운용사'], status: '활성', last: '2026-09-11 10:22', fail: 0, pwExpired: true },
    { id: 'U4', lid: 'nh.trust', name: '김수탁', type: '수탁', org: 'NH', email: 'trust@nh.example', roles: ['수탁'], status: '활성', last: '2026-09-10 15:03', fail: 0 },
    { id: 'U5', lid: 'mafra', name: '박농식', type: '부처', account: '농식품', email: 'mafra@gov.example', roles: ['부처'], status: '활성', last: '2026-09-09 09:15', fail: 0 },
    { id: 'U6', lid: 'mof', name: '최수산', type: '부처', account: '수산', email: 'mof@gov.example', roles: ['부처'], status: '잠금', last: '2026-08-28 11:47', fail: 5 },
    { id: 'U7', lid: 'nh.trust2', name: '이수탁', type: '수탁', org: 'NH', email: 'lee.trust@nh.example', roles: ['수탁'], status: '온보딩대기', last: '—', fail: 0 },
    { id: 'U8', lid: 'imm.6', name: '정운용', type: '운용사', org: 'IMM', email: 'jung@imm.example', roles: ['운용사'], status: '비활성', last: '2026-08-25 09:10', fail: 0 },
  ];
}

/** 소속유형 — 농금원=내부(개인), 그 외=기관소속(개인)(목업 belong) */
export const belong = (u: Pick<UserRow, 'type'>): string => (u.type === '농금원' ? '내부(개인)' : '기관소속(개인)');
/** 소속 표시 — 기관명 › 계정구분 › 부서 순(목업 belongName) */
export const belongName = (u: Pick<UserRow, 'org' | 'account' | 'dept'>): string =>
  u.org ? orgName(u.org) : u.account ? `${u.account} 계정` : (u.dept || '-');

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'primary';
export const STATUS_TONE: Readonly<Record<UserStatus, StatusTone>> = Object.freeze({ '활성': 'success', '온보딩대기': 'warning', '잠금': 'danger', '비활성': 'info' });

/* 행 선택 게이팅(목업 gate) — 상태·구분에 따라 열리는 액션 */
export interface UserGate { edit: boolean; mail: boolean; replace: boolean; unlock: boolean; expire: boolean; otp: boolean }
export function gateFor(u: UserRow | null | undefined): UserGate {
  if (!u) return { edit: false, mail: false, replace: false, unlock: false, expire: false, otp: false };
  return {
    edit: true,
    mail: u.status === '온보딩대기',
    replace: (u.type === '수탁' || u.type === '부처') && u.status === '활성',
    unlock: u.status === '잠금',
    expire: u.status === '활성' && !u.pwExpired,   // 이미 만료 처리된 계정은 닫는다(그리드 '비밀번호' 컬럼과 같은 상태를 본다)
    otp: u.status !== '온보딩대기',
  };
}

export interface UserFilter { type?: string; status?: string; org?: string; kw?: string }
/** 목업 applyFilter — 구분·상태·소속기관 정확일치 + 검색어(성명·아이디·이메일 부분일치) */
export function filterUsers(rows: readonly UserRow[], f: UserFilter): UserRow[] {
  const kw = (f.kw ?? '').trim().toLowerCase();
  return rows.filter((u) =>
    (!f.type || u.type === f.type)
    && (!f.status || u.status === f.status)
    && (!f.org || u.org === f.org)
    && (!kw || `${u.name} ${u.lid} ${u.email}`.toLowerCase().includes(kw)));
}

/** 로그인 아이디 중복(대소문자 무시). 수정 중인 자기 자신은 excludeId 로 제외 */
export function lidTaken(rows: readonly Pick<UserRow, 'id' | 'lid'>[], lid: string, excludeId?: string): boolean {
  const n = lid.trim().toLowerCase();
  return rows.some((r) => r.id !== excludeId && r.lid.toLowerCase() === n);
}

/** 다음 사용자 id — 'U' + (최대 번호 + 1) */
export function nextUserId(rows: readonly Pick<UserRow, 'id'>[]): string {
  const max = rows.reduce((m, r) => Math.max(m, Number(r.id.replace(/^U/, '')) || 0), 0);
  return `U${max + 1}`;
}

/** 잠금 해제 — 활성 + 실패 횟수 초기화(새 객체) */
export const unlockUser = (u: UserRow): UserRow => ({ ...u, status: '활성', fail: 0 });

/** 담당자 교체(수탁·부처) — 구 계정 비활성 + 신 계정 신규 발급(온보딩대기). 같은 아이디를 물려주지 않는다(목업) */
export function replaceUser(rows: readonly UserRow[], u: UserRow): { retired: UserRow; created: UserRow } {
  const id = nextUserId(rows);
  const seq = id.replace(/^U/, '');
  const retired: UserRow = { ...u, status: '비활성' };
  const created: UserRow = {
    id, lid: `${(u.org ?? 'org').toLowerCase()}.${seq}`, name: `신담당(${belongName(u)})`, type: u.type, org: u.org, account: u.account,
    email: `new${seq}@${(u.org ?? 'org').toLowerCase()}.example`, roles: [...u.roles], status: '온보딩대기', last: '—', fail: 0,
  };
  return { retired, created };
}
