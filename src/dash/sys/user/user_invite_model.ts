/* 사용자 초대(운용사) — 순수 모델(UI 없음). 출처: S0_103_사용자초대_운용사.html `PERSONNEL`·`inviteState`·`gate`·`doSend`.
   브리프 추가 요구: 초대 생성(발송)·재발송·취소 UI. 초대 링크 유효기간 72시간(목업 문구).
   ⚠ 실제 메일 발송·계정 생성이 아니다 — 화면 로컬 더미 상태만 바꾼다. 실명 아님. */
import { addHours, format, parseISO } from 'date-fns';

export const INVITE_STATES = ['미초대', '초대발송', '가입됨'] as const;
export type InviteState = typeof INVITE_STATES[number];
export const INVITE_TTL_HOURS = 72;

export interface InviteRow {
  id: string;
  org: string;          // 운용사 id(ORGS GP)
  name: string;         // 성명(운용인력 명단 — 실명 아님)
  email: string;
  active: boolean;      // 재직 여부
  invited: boolean;     // 초대 발송됨
  joined: boolean;      // 온보딩 완료(가입됨)
  invitedAt: string;    // 'YYYY-MM-DD HH:mm' · 미발송 ''
}

/* 목업 PERSONNEL 5건 + 초대일시(한공동만 발송 상태) */
export function demoPersonnel(): InviteRow[] {
  return [
    { id: 'P1', org: 'IMM', name: '박심사', email: 'park@imm.example', active: true, invited: false, joined: false, invitedAt: '' },
    { id: 'P2', org: 'HTP', name: '최투자', email: 'choi@htp.example', active: true, invited: false, joined: false, invitedAt: '' },
    { id: 'P3', org: 'YT', name: '한공동', email: 'han@yt.example', active: true, invited: true, joined: false, invitedAt: '2026-09-12 10:30' },
    { id: 'P4', org: 'KB', name: '서운용', email: 'seo@kb.example', active: true, invited: false, joined: true, invitedAt: '2026-08-20 09:00' },
    { id: 'P5', org: 'IMM', name: '정운용', email: 'jung@imm.example', active: false, invited: false, joined: true, invitedAt: '2026-08-01 09:00' },
  ];
}

export const inviteState = (r: Pick<InviteRow, 'invited' | 'joined'>): InviteState => (r.joined ? '가입됨' : r.invited ? '초대발송' : '미초대');
export const INVITE_TONE: Readonly<Record<InviteState, 'info' | 'warning' | 'primary'>> = Object.freeze({ '미초대': 'primary', '초대발송': 'warning', '가입됨': 'info' });

/* 행 선택 게이팅 — 발송은 재직 + 미초대, 재발송·취소는 초대발송 상태, 미리보기는 항상 */
export interface InviteGate { send: boolean; resend: boolean; cancel: boolean; preview: boolean }
export function inviteGate(r: InviteRow | null | undefined): InviteGate {
  if (!r) return { send: false, resend: false, cancel: false, preview: false };
  const st = inviteState(r);
  return { send: r.active && st === '미초대', resend: r.active && st === '초대발송', cancel: st === '초대발송', preview: true };
}

/** 초대 발송·재발송 — 발송 일시를 새로 찍는다(새 객체) */
export const sendInvite = (r: InviteRow, at: string): InviteRow => ({ ...r, invited: true, invitedAt: at });
/** 초대 취소 — 미초대로 되돌린다(가입된 계정은 되돌리지 않는다) */
export const cancelInvite = (r: InviteRow): InviteRow => (r.joined ? r : { ...r, invited: false, invitedAt: '' });

/** 초대 만료 일시 — 발송 + 72시간. 입력은 'YYYY-MM-DD HH:mm', 빈 값이면 '' */
export function inviteExpiresAt(invitedAt: string): string {
  if (!invitedAt) return '';
  const d = parseISO(invitedAt.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  return format(addHours(d, INVITE_TTL_HOURS), 'yyyy-MM-dd HH:mm');
}

export interface InviteFilter { org?: string; active?: '' | '재직' | '퇴사'; state?: '' | InviteState; kw?: string }
/** 목업 applyFilter + 초대상태(브리프 툴바 칩) */
export function filterInvites(rows: readonly InviteRow[], f: InviteFilter): InviteRow[] {
  const kw = (f.kw ?? '').trim().toLowerCase();
  return rows.filter((r) =>
    (!f.org || r.org === f.org)
    && (!f.active || (f.active === '재직') === r.active)
    && (!f.state || inviteState(r) === f.state)
    && (!kw || `${r.name} ${r.email}`.toLowerCase().includes(kw)));
}
