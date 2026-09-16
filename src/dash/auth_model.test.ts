import { describe, it, expect } from 'vitest';
import {
  verifyCredentials, verifyOtp, verifyPwChange, verifyRegister, verifyRealName,
  railSteps, LOGIN_RAIL, ISSUE_RAIL, RESET_RAIL, SIMPLE_AUTH_RAIL,
  verifyReset, verifySimpleAuth, hasError,
  DEMO_ID, DEMO_PW, DEMO_REAL_NAME, LOCK_LIMIT, MSG, PW_RE,
} from './auth_model';

describe('verifyCredentials — 실패 누적과 잠금', () => {
  it('데모 계정이 일치하면 통과하고 실패 횟수를 늘리지 않는다', () => {
    const r = verifyCredentials(DEMO_ID, DEMO_PW, 2);
    expect(r.ok).toBe(true); expect(r.fails).toBe(2); expect(r.locked).toBe(false);
  });
  it('아이디 앞뒤 공백은 무시한다', () => {
    expect(verifyCredentials(`  ${DEMO_ID} `, DEMO_PW, 0).ok).toBe(true);
  });
  it('불일치는 실패를 1 올리고 진행 횟수를 메시지에 담는다', () => {
    const r = verifyCredentials('nope', 'nope', 0);
    expect(r.ok).toBe(false); expect(r.fails).toBe(1);
    expect(r.error).toBe(`아이디 또는 비밀번호가 올바르지 않습니다. (1/${LOCK_LIMIT})`);
  });
  it('상한에 닿으면 잠금으로 전이한다', () => {
    const r = verifyCredentials('nope', 'nope', LOCK_LIMIT - 1);
    expect(r.locked).toBe(true); expect(r.error).toBe(MSG.locked);
  });
  it('lockLimit은 주입 가능하다(캔버스 props lockLimit 대응)', () => {
    expect(verifyCredentials('x', 'y', 0, 1).locked).toBe(true);
  });
});

describe('verifyOtp', () => {
  it('표시 코드와 같으면 오류 없음', () => { expect(verifyOtp(' 123456 ', '123456')).toBeNull(); });
  it('다르면 오류 메시지', () => { expect(verifyOtp('000000', '123456')).toBe(MSG.otpMismatch); });
});

describe('verifyPwChange', () => {
  it('세 필드가 모두 정상이면 오류 없음', () => {
    const e = verifyPwChange('Apfs!2026', 'Apfs!2027x', 'Apfs!2027x', 'Apfs!2026');
    expect(hasError(e)).toBe(false);
  });
  it('현재 비밀번호 미입력을 잡는다', () => {
    expect(verifyPwChange('', 'Apfs!2027x', 'Apfs!2027x', 'Apfs!2026').cur).toBe(MSG.curRequired);
  });
  it('정책 미달을 잡는다(8자·특수문자 없음)', () => {
    expect(verifyPwChange('x', 'abcd1234', 'abcd1234', 'x').next).toBe(MSG.pwWeak);
  });
  it('직전 비밀번호 재사용을 잡는다', () => {
    expect(verifyPwChange('Apfs!2026', 'Apfs!2026', 'Apfs!2026', 'Apfs!2026').next).toBe(MSG.pwReuse);
  });
  it('확인 불일치를 잡는다', () => {
    expect(verifyPwChange('x', 'Apfs!2027x', 'Apfs!2028x', 'x').confirm).toBe(MSG.pwNewMismatch);
  });
});

describe('verifyRegister — 발급·초대 온보딩 공용', () => {
  it('비밀번호·확인·코드가 모두 맞으면 오류 없음', () => {
    expect(hasError(verifyRegister('Apfs!2026', 'Apfs!2026', '123456', '123456'))).toBe(false);
  });
  it('세 오류를 동시에 보고한다', () => {
    const e = verifyRegister('short', 'other', '000000', '123456');
    expect(e.pw).toBe(MSG.pwWeak); expect(e.confirm).toBe(MSG.pwMismatch); expect(e.otp).toBe(MSG.regOtpMismatch);
  });
});

describe('verifyRealName', () => {
  it('초대 대상과 일치하면 통과', () => { expect(verifyRealName(` ${DEMO_REAL_NAME} `)).toBeNull(); });
  it('불일치는 거부 메시지', () => { expect(verifyRealName('홍길동')).toBe(MSG.nameMismatch); });
});

describe('PW_RE 정책', () => {
  it.each([
    ['Apfs!2026', true],
    ['abcdefghi', false],   // 숫자·특수문자 없음
    ['abcdefg1!', true],
    ['abc1!', false],       // 9자 미만
    ['123456789!', false],  // 영문 없음
  ])('%s → %s', (pw, ok) => { expect(PW_RE.test(pw as string)).toBe(ok); });
});

describe('railSteps', () => {
  it('현재 단계 앞은 done, 뒤는 todo', () => {
    const r = railSteps(ISSUE_RAIL, 2);
    expect(r.map((s) => s.status)).toEqual(['done', 'current', 'todo']);
  });
  it('done 단계는 완료 캡션을, 그 외는 예정 캡션을 쓴다', () => {
    const r = railSteps(ISSUE_RAIL, 2);
    expect(r[0].cap).toBe('계정 정보 확인 완료');
    expect(r[2].cap).toBe('');
  });
  it('마지막 항목만 notLast=false', () => {
    expect(railSteps(ISSUE_RAIL, 1).map((s) => s.notLast)).toEqual([true, true, false]);
  });
  it('비밀번호 미만료로 3단계를 건너뛰면 forceDone으로 완료 표시한다', () => {
    const r = railSteps(LOGIN_RAIL(false, 4), 4);
    expect(r[2].status).toBe('done');
    expect(r[2].cap).toBe('90일 미경과 — 건너뜀');
  });
  it('만료 시나리오에서는 3단계가 실제 단계로 남는다', () => {
    expect(railSteps(LOGIN_RAIL(true, 3), 3)[2].status).toBe('current');
  });
});

describe('빈 입력은 인증 시도로 세지 않는다 (Codex P2)', () => {
  it('아이디가 비면 실패 횟수를 올리지 않고 아이디 필드를 지목한다', () => {
    const r = verifyCredentials('', 'anything', 3);
    expect(r.fails).toBe(3); expect(r.locked).toBe(false); expect(r.field).toBe('id');
  });
  it('비밀번호가 비면 실패 횟수를 올리지 않고 비밀번호 필드를 지목한다', () => {
    const r = verifyCredentials(DEMO_ID, '', 3);
    expect(r.fails).toBe(3); expect(r.field).toBe('pw');
  });
  it('공백만 입력한 제출을 반복해도 계정이 잠기지 않는다', () => {
    let fails = 0;
    for (let i = 0; i < LOCK_LIMIT + 2; i++) { const r = verifyCredentials('   ', '', fails); fails = r.fails; expect(r.locked).toBe(false); }
    expect(fails).toBe(0);
  });
  it('값이 다 있고 틀렸을 때만 비밀번호 필드에 오류를 붙이고 횟수를 센다', () => {
    const r = verifyCredentials('someone', 'wrong', 0);
    expect(r.fails).toBe(1); expect(r.field).toBe('pw');
  });
});

describe('표시된 코드를 그대로 붙여넣어도 통과한다 (Codex P2)', () => {
  it('verifyOtp — 화면 표기 "123 456" 을 그대로 넣어도 통과', () => {
    expect(verifyOtp('123 456', '123456')).toBeNull();
  });
  it('verifyOtp — 앞뒤 공백 + 내부 공백 혼합도 통과', () => {
    expect(verifyOtp('  123 456 ', '123456')).toBeNull();
  });
  it('verifyRegister — 등록 확인 코드도 같은 정규화를 쓴다', () => {
    expect(verifyRegister('Apfs!2026', 'Apfs!2026', '947 650', '947650').otp).toBeNull();
  });
  it('공백을 지워도 값이 다르면 여전히 실패', () => {
    expect(verifyOtp('123 457', '123456')).toBe(MSG.otpMismatch);
  });
});

describe('현재 비밀번호를 실제로 대조한다 (Codex R2 P2)', () => {
  it('현재 비밀번호가 틀리면 새 비밀번호가 정상이어도 통과하지 않는다', () => {
    const e = verifyPwChange('틀린비번', 'Apfs!2027x', 'Apfs!2027x', 'Apfs!2026');
    expect(e.cur).toBe(MSG.curMismatch);
    expect(hasError(e)).toBe(true);
  });
  it('현재 비밀번호가 맞으면 cur 오류가 없다', () => {
    expect(verifyPwChange('Apfs!2026', 'Apfs!2027x', 'Apfs!2027x', 'Apfs!2026').cur).toBeNull();
  });
  it('빈 값은 불일치가 아니라 미입력으로 구분해 알린다', () => {
    expect(verifyPwChange('', 'Apfs!2027x', 'Apfs!2027x', 'Apfs!2026').cur).toBe(MSG.curRequired);
  });
});

describe('TOTP 허용창 ±1 — 직전 코드도 받는다 (Codex R2 P2)', () => {
  it('입력 중 코드가 회전해도 직전 코드로 통과한다', () => {
    expect(verifyOtp('111111', '222222', '111111')).toBeNull();
  });
  it('현재 코드는 당연히 통과한다', () => {
    expect(verifyOtp('222222', '222222', '111111')).toBeNull();
  });
  it('직전도 현재도 아니면 실패', () => {
    expect(verifyOtp('333333', '222222', '111111')).toBe(MSG.otpMismatch);
  });
  it('직전 코드가 아직 없으면(최초 창) 현재 코드만 받는다', () => {
    expect(verifyOtp('111111', '222222')).toBe(MSG.otpMismatch);
  });
  it('등록 확인 코드도 같은 허용창을 쓴다', () => {
    expect(verifyRegister('Apfs!2026', 'Apfs!2026', '111 111', '222222', '111111').otp).toBeNull();
  });
});

describe('verifyReset — 계정 정보 확인', () => {
  it('성명·아이디가 모두 있으면 통과', () => {
    expect(verifyReset('김담당', 'kim.admin')).toBeNull();
  });
  it('성명이 비면 성명부터 알린다 — 화면 필드 순서대로', () => {
    expect(verifyReset('  ', '')).toBe(MSG.nameRequired);
  });
  it('아이디가 비면 아이디를 알린다', () => {
    expect(verifyReset('김담당', '   ')).toBe(MSG.idRequired);
  });
});

describe('간편인증 — 외부 통합인증창 연동', () => {
  it('이름·생년월일·휴대폰이 모두 맞으면 통합인증창을 호출할 수 있다', () => {
    expect(verifySimpleAuth('김담당', '19850302', '01012345678')).toBeNull();
  });
  it('하이픈이 섞인 입력도 받는다 — 화면 placeholder 가 010-0000-0000 형식이다', () => {
    expect(verifySimpleAuth('김담당', '1985-03-02', '010-1234-5678')).toBeNull();
  });
  it('이름이 비면 이름부터 알린다 — 화면 필드 순서대로', () => {
    expect(verifySimpleAuth('  ', '', '')).toBe(MSG.nameRequired);
  });
  it('생년월일이 8자리가 아니면 거부', () => {
    expect(verifySimpleAuth('김담당', '850302', '01012345678')).toBe(MSG.birthInvalid);
  });
  it('없는 월은 거부', () => {
    expect(verifySimpleAuth('김담당', '19851302', '01012345678')).toBe(MSG.birthInvalid);
    expect(verifySimpleAuth('김담당', '19850002', '01012345678')).toBe(MSG.birthInvalid);
  });
  it('달에 없는 날짜는 거부 — 2월 31일·4월 31일·평년 2월 29일', () => {
    expect(verifySimpleAuth('김담당', '20250231', '01012345678')).toBe(MSG.birthInvalid);
    expect(verifySimpleAuth('김담당', '20250431', '01012345678')).toBe(MSG.birthInvalid);
    expect(verifySimpleAuth('김담당', '20250229', '01012345678')).toBe(MSG.birthInvalid);
  });
  it('윤년 2월 29일은 통과', () => {
    expect(verifySimpleAuth('김담당', '20240229', '01012345678')).toBeNull();
  });
  it('이동전화 대역이 아니거나 자릿수가 모자라면 거부', () => {
    expect(verifySimpleAuth('김담당', '19850302', '0212345678')).toBe(MSG.phoneInvalid);
    expect(verifySimpleAuth('김담당', '19850302', '010123456')).toBe(MSG.phoneInvalid);
  });
  it('앱 레일은 3단계 — 가운데 인증 단계는 외부 모듈이 처리한다', () => {
    expect(railSteps(SIMPLE_AUTH_RAIL, 1).map((x) => x.title))
      .toEqual(['간편인증 요청', '통합인증창 인증', '인증결과 확인']);
  });
  it('요청 단계에서는 뒤 두 단계가 아직 예정 상태', () => {
    expect(railSteps(SIMPLE_AUTH_RAIL, 1).map((x) => x.status)).toEqual(['current', 'todo', 'todo']);
  });
  it('두 재설정 경로의 레일 길이가 서로 다르다 — 2단계 vs 3단계', () => {
    expect(railSteps(RESET_RAIL, 1)).toHaveLength(2);
    expect(railSteps(SIMPLE_AUTH_RAIL, 3).map((x) => x.status)).toEqual(['done', 'done', 'current']);
  });
});
