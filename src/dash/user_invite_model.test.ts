import { describe, it, expect } from 'vitest';
import { demoPersonnel, inviteState, inviteGate, sendInvite, cancelInvite, inviteExpiresAt, filterInvites } from './user_invite_model';

const rows = demoPersonnel();
const by = (name: string) => rows.find((r) => r.name === name)!;

describe('inviteState / inviteGate', () => {
  it('가입됨 > 초대발송 > 미초대 우선순위', () => {
    expect(inviteState(by('서운용'))).toBe('가입됨');
    expect(inviteState(by('한공동'))).toBe('초대발송');
    expect(inviteState(by('박심사'))).toBe('미초대');
  });
  it('미초대·재직 → 발송만, 초대발송 → 재발송·취소, 가입됨 → 미리보기만', () => {
    expect(inviteGate(by('박심사'))).toEqual({ send: true, resend: false, cancel: false, preview: true });
    expect(inviteGate(by('한공동'))).toEqual({ send: false, resend: true, cancel: true, preview: true });
    expect(inviteGate(by('서운용'))).toEqual({ send: false, resend: false, cancel: false, preview: true });
  });
  it('퇴사자는 발송 불가', () => { expect(inviteGate({ ...by('박심사'), active: false }).send).toBe(false); });
  it('선택 없음 → 전부 닫힘', () => { expect(inviteGate(null).preview).toBe(false); });
});

describe('전이 — 발송·취소(불변)', () => {
  it('발송은 초대발송 + 일시, 원본 불변', () => {
    const r = by('박심사'); const n = sendInvite(r, '2026-09-14 10:00');
    expect(inviteState(n)).toBe('초대발송'); expect(n.invitedAt).toBe('2026-09-14 10:00'); expect(r.invited).toBe(false);
  });
  it('취소는 미초대로, 가입된 계정은 되돌리지 않는다', () => {
    expect(inviteState(cancelInvite(by('한공동')))).toBe('미초대');
    expect(cancelInvite(by('서운용'))).toBe(by('서운용'));
  });
  it('만료 = 발송 + 72시간, 빈 값은 빈 문자열', () => {
    expect(inviteExpiresAt('2026-09-12 10:30')).toBe('2026-09-15 10:30');
    expect(inviteExpiresAt('')).toBe('');
  });
});

describe('filterInvites', () => {
  it('운용사·재직상태·초대상태·검색어', () => {
    expect(filterInvites(rows, { org: 'IMM' }).length).toBe(2);
    expect(filterInvites(rows, { active: '퇴사' }).map((r) => r.name)).toEqual(['정운용']);
    expect(filterInvites(rows, { state: '미초대' }).length).toBe(2);
    expect(filterInvites(rows, { kw: 'HTP' }).map((r) => r.name)).toEqual(['최투자']);
  });
});
