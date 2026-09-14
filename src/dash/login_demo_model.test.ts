import { describe, it, expect } from 'vitest';
import { initialLogin, verifyCredentials, verifyOtp, verifyPwChange, verifyReset, stepLabels, stepIndex, MAX_FAIL } from './login_demo_model';

describe('verifyCredentials — 빈 값 순서 → 시나리오', () => {
  it('아이디 → 비밀번호 순으로 빈 값을 잡는다', () => {
    expect(verifyCredentials(initialLogin(), '', '').verdict.field).toBe('id');
    expect(verifyCredentials(initialLogin(), 'a', '').verdict.field).toBe('pw');
  });
  it('정상 시나리오는 OTP 단계로', () => { expect(verifyCredentials(initialLogin('ok'), 'a', 'b').next.step).toBe('otp'); });
  it('잠금 시나리오는 진행 불가', () => { const r = verifyCredentials(initialLogin('locked'), 'a', 'b'); expect(r.verdict.ok).toBe(false); expect(r.next.step).toBe('credentials'); });
  it('불일치 시나리오는 실패 횟수를 세고 상한에서 멈춘다(강제 잠금 아님)', () => {
    let s = initialLogin('wrong');
    for (let i = 0; i < MAX_FAIL + 1; i++) s = verifyCredentials(s, 'a', 'b').next;
    expect(s.fails).toBe(MAX_FAIL); expect(s.step).toBe('credentials');
  });
});

describe('verifyOtp / verifyPwChange / verifyReset', () => {
  it('6자리 숫자만 통과, 만료 시나리오는 비밀번호 변경 단계로', () => {
    const s = { ...initialLogin('ok'), step: 'otp' as const };
    expect(verifyOtp(s, '').verdict.field).toBe('otp');
    expect(verifyOtp(s, '12ab').verdict.ok).toBe(false);
    expect(verifyOtp(s, '123456').next.step).toBe('done');
    expect(verifyOtp({ ...s, scenario: 'expired' }, '123456').next.step).toBe('pwchange');
  });
  it('비밀번호 변경은 입력 유무·일치만 검사', () => {
    const s = { ...initialLogin('expired'), step: 'pwchange' as const };
    expect(verifyPwChange(s, '', 'x', 'x').verdict.field).toBe('cur');
    expect(verifyPwChange(s, 'c', 'x', 'y').verdict.field).toBe('n2');
    expect(verifyPwChange(s, 'c', 'x', 'x').next.step).toBe('done');
  });
  it('재설정 모달 검증', () => { expect(verifyReset('', 'id').ok).toBe(false); expect(verifyReset('n', '').ok).toBe(false); expect(verifyReset('n', 'id').ok).toBe(true); });
});

describe('stepLabels / stepIndex', () => {
  it('만료 시나리오만 4단계', () => {
    expect(stepLabels('ok').map((s) => s.key)).toEqual(['credentials', 'otp', 'done']);
    expect(stepLabels('expired').length).toBe(4);
    expect(stepIndex('expired', 'pwchange')).toBe(2);
    expect(stepIndex('ok', 'done')).toBe(2);
  });
});
