// @vitest-environment jsdom
/* 로그인 화면 탭 전환 — 2단계~에서 [간편인증]·[비밀번호 재설정] 탭을 누를 때 지우는 값(2026-11-17 #432 리뷰 1·2번).
   - 2차 인증·비밀번호 변경 중: [로그인] 탭으로 돌아오면 아이디만 남고 비밀번호는 비어 있다(기능설명서 "아이디만 남고").
   - 완료 화면: [처음부터 다시]와 같다 — 간편인증·재설정 탭에 적어 둔 값도 지운다.
   OTP 는 Math.random 으로 만들므로 0 으로 고정해 '100000' 을 받는다. globals:false 라 cleanup 을 직접 부른다. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { LoginDemo } from './login_demo';
import { DEMO_ID, DEMO_PW } from '../auth_model';

const NEW_PW = 'Fresh#2027x';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
/* 완료 화면 체크 아이콘(auth_shared DonePanel)이 `instanceof SVGPathElement` 로 길이를 잰다 — jsdom 엔 없다. 빈 클래스면 측정만 건너뛴다. */
globalThis.SVGPathElement ??= class {} as unknown as typeof SVGPathElement;

beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.body.replaceChildren(); });

const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const type = (id: string, v: string) => fireEvent.change(input(id), { target: { value: v } });
const submit = (id: string) => fireEvent.submit(input(id).closest('form')!);
const tab = (name: string) => fireEvent.click(screen.getByRole('radio', { name }));

const toOtp = () => { type('login-id', DEMO_ID); type('login-pw', DEMO_PW); submit('login-pw'); };
const toPwChange = () => { toOtp(); type('login-otp', '100000'); submit('login-otp'); };
const toDone = () => {
  toPwChange();
  type('pw-cur', DEMO_PW); type('pw-new', NEW_PW); type('pw-confirm', NEW_PW); submit('pw-confirm');
};

describe('로그인 — 2·3단계에서 다른 탭으로 가면 아이디만 남는다', () => {
  it('2차 인증 중 [간편인증] → [로그인]: 아이디는 그대로, 비밀번호는 빈칸', () => {
    render(React.createElement(LoginDemo));
    toOtp();
    expect(input('login-otp')).not.toBeNull();
    tab('간편인증');
    tab('로그인');
    expect(input('login-id').value).toBe(DEMO_ID);
    expect(input('login-pw').value).toBe('');
  });

  it('비밀번호 변경 중 [비밀번호 재설정] → [로그인]: 아이디는 그대로, 비밀번호는 빈칸', () => {
    render(React.createElement(LoginDemo));
    toPwChange();
    expect(input('pw-cur')).not.toBeNull();
    tab('비밀번호 재설정');
    tab('로그인');
    expect(input('login-id').value).toBe(DEMO_ID);
    expect(input('login-pw').value).toBe('');
  });
});

describe('로그인 — 완료 화면의 탭 전환 = [처음부터 다시]', () => {
  it('간편인증·재설정에 적어 둔 값이 남지 않고, 로그인으로 돌아와도 빈칸이다', () => {
    render(React.createElement(LoginDemo));
    tab('간편인증');
    type('sa-name', '홍길동'); type('sa-birth', '19900101'); type('sa-phone', '010-1234-5678');
    tab('비밀번호 재설정');
    type('reset-name', '홍길동'); type('reset-id', 'hong.gd');
    tab('로그인');
    toDone();
    expect(screen.getByRole('button', { name: '처음부터 다시' })).not.toBeNull();

    tab('간편인증');
    expect([input('sa-name').value, input('sa-birth').value, input('sa-phone').value]).toEqual(['', '', '']);
    tab('비밀번호 재설정');
    expect([input('reset-name').value, input('reset-id').value]).toEqual(['', '']);
    tab('로그인');
    expect([input('login-id').value, input('login-pw').value]).toEqual(['', '']);
  });
});
