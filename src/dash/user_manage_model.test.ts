import { describe, it, expect } from 'vitest';
import { demoUsers, gateFor, filterUsers, lidTaken, nextUserId, unlockUser, replaceUser, belong, belongName } from './user_manage_model';
import { effectiveMenus, ROLE_MENUS, TOP_MENUS } from './admin_demo_data';

const rows = demoUsers();
const by = (lid: string) => rows.find((u) => u.lid === lid)!;

describe('gateFor — 상태·구분별 액션 게이팅(목업 gate)', () => {
  it('선택 없음 → 전부 닫힘', () => { expect(Object.values(gateFor(null)).every((v) => v === false)).toBe(true); });
  it('이미 비밀번호 만료 처리된 활성 계정은 만료 버튼이 닫힌다(그리드 \'비밀번호\' 컬럼과 같은 상태)', () => {
    const active = demoUsers().find((u) => u.status === '활성' && !u.pwExpired)!;
    expect(gateFor(active).expire).toBe(true);
    expect(gateFor({ ...active, pwExpired: true }).expire).toBe(false);
  });
  it('온보딩대기 → 온보딩 메일 열림·OTP 재발급 닫힘', () => {
    const g = gateFor(by('nh.trust2'));
    expect(g.mail).toBe(true); expect(g.otp).toBe(false); expect(g.expire).toBe(false);
  });
  it('잠금 → 잠금 해제만 열림(만료·교체 닫힘)', () => {
    const g = gateFor(by('mof'));
    expect(g.unlock).toBe(true); expect(g.expire).toBe(false); expect(g.replace).toBe(false);
  });
  it('수탁·활성 → 담당자 교체 열림, 농금원·활성 → 닫힘', () => {
    expect(gateFor(by('nh.trust')).replace).toBe(true);
    expect(gateFor(by('nh.invest')).replace).toBe(false);
  });
});

describe('filterUsers — 구분·상태·소속·검색어', () => {
  it('상태 잠금 1건', () => { expect(filterUsers(rows, { status: '잠금' }).map((u) => u.lid)).toEqual(['mof']); });
  it('소속 IMM 2건', () => { expect(filterUsers(rows, { org: 'IMM' }).length).toBe(2); });
  it('검색어는 성명·아이디·이메일 부분일치(대소문자 무시)', () => {
    expect(filterUsers(rows, { kw: 'NH.' }).length).toBe(4);
    expect(filterUsers(rows, { kw: '수탁' }).map((u) => u.lid).sort()).toEqual(['nh.trust', 'nh.trust2']);
  });
  it('빈 필터는 전체', () => { expect(filterUsers(rows, {}).length).toBe(rows.length); });
});

describe('lidTaken / nextUserId', () => {
  it('아이디 중복은 대소문자 무시, 자기 자신 제외', () => {
    expect(lidTaken(rows, 'NH.ADMIN')).toBe(true);
    expect(lidTaken(rows, 'nh.admin', 'U2')).toBe(false);
    expect(lidTaken(rows, 'new.user')).toBe(false);
  });
  it('다음 id = 최대 번호 + 1', () => { expect(nextUserId(rows)).toBe('U9'); });
});

describe('전이 — 잠금 해제·담당자 교체(불변)', () => {
  it('잠금 해제는 활성 + 실패 0, 원본 불변', () => {
    const u = by('mof'); const n = unlockUser(u);
    expect(n.status).toBe('활성'); expect(n.fail).toBe(0); expect(u.status).toBe('잠금');
  });
  it('담당자 교체 = 구 비활성 + 신 온보딩대기, 아이디 승계 없음, 권한 복사', () => {
    const u = by('nh.trust'); const { retired, created } = replaceUser(rows, u);
    expect(retired.status).toBe('비활성');
    expect(created.status).toBe('온보딩대기');
    expect(created.lid).not.toBe(u.lid);
    expect(created.id).toBe('U9');
    expect(created.roles).toEqual(u.roles); expect(created.roles).not.toBe(u.roles);
    expect(created.type).toBe('수탁');
  });
});

describe('belong / belongName / effectiveMenus', () => {
  it('농금원=내부(개인), 그 외 기관소속(개인)', () => { expect(belong(by('nh.admin'))).toBe('내부(개인)'); expect(belong(by('mof'))).toBe('기관소속(개인)'); });
  it('소속 표시 우선순위 기관 › 계정 › 부서', () => {
    expect(belongName(by('nh.trust'))).toBe('농협은행'); expect(belongName(by('mof'))).toBe('수산 계정'); expect(belongName(by('nh.invest'))).toBe('투자팀');
  });
  it('유효 메뉴 = 권한 합집합, LNB 순서', () => {
    expect(effectiveMenus(['부처', '수탁'])).toEqual(['대시보드', '투자자산관리', '부처보고', '수탁보고']);
    expect(effectiveMenus(['전산(관리자)'])).toEqual([...TOP_MENUS]);
    expect(effectiveMenus(['없는권한'])).toEqual([]);
    expect(ROLE_MENUS['운용사']).toContain('자펀드 보고');
  });
});
