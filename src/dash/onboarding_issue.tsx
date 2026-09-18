/* 발급 온보딩(S0_002, 수탁) — 관리자가 발급한 계정을 본인이 활성화하는 3단계 화면.
   정본은 claude.ai/design 캔버스 `APFS 로그인 프로토타입.dc.html`의 발급 온보딩 플로우.

   ⚠ 실제 계정 활성화·OTP 등록·메일 링크 검증은 수행하지 않는다. 판정은 `auth_model`의 순수 함수가 한다. */
import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AuthLayout, SplitCard, Field, PrimaryBtn, SecondaryBtn, DonePanel,
  Callout, KvGrid, Pill, OtpRegisterBlock, Toast, Logo, useDemoOtp, useToast, T, StepPage, useStepDir,
} from './auth_shared';
import { Icon } from './icons';
import { railSteps, ISSUE_RAIL, verifyRegister, hasError, PW_POLICY_HINT, type RegisterErrors } from './auth_model';

const NO_ERR: RegisterErrors = { pw: null, confirm: null, otp: null };
const SEED = 'JBSW Y3DP EHPK 3PXP';
const TARGET = { name: '이수탁', org: 'NH농협은행 (수탁기관)', role: '수탁', email: 'lee.trust@nhbank.com' };

export function OnboardingIssue({ onNav }: { onNav?: (route: string) => void }) {
  const [step, setStep] = useState(1);
  const dir = useStepDir(step);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otpIn, setOtpIn] = useState('');
  const [errs, setErrs] = useState<RegisterErrors>(NO_ERR);
  const { code, prevCode, secs, display } = useDemoOtp();
  const { toast, pop } = useToast();

  const firstField = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) firstField.current?.focus();
    mounted.current = true;
  }, [step]);

  const submit2 = (e: FormEvent) => {
    e.preventDefault();
    const next = verifyRegister(pw, confirm, otpIn, code, prevCode);
    setErrs(next);
    if (!hasError(next)) { setStep(3); pop('계정이 활성화되었습니다'); }
  };

  const restart = () => { setStep(1); setPw(''); setConfirm(''); setOtpIn(''); setErrs(NO_ERR); };

  return (
    <AuthLayout>
      <SplitCard
        steps={railSteps(ISSUE_RAIL, step)}
        railHead={<>
          <Logo />
          {/* 크기는 className 으로 — 인라인 font 단축속성(T.*)을 쓰면 반응형 크기를 덮어쓴다.
              스케일은 로그인 화면 railHead 의 큰 줄과 동일하게 맞춘다. */}
          <p className="text-[15px] leading-[21px] md:text-[23px] md:leading-[31px]" style={{
            fontFamily: 'var(--font-sans)', fontWeight: 700, letterSpacing: '-0.01em',
            color: 'var(--foreground)', margin: '10px 0 clamp(14px,3.5vw,32px)',
          }}>계정 활성화(발급 온보딩)</p>
        </>}
      >

        {step === 1 && (
          <StepPage dir={dir} className="flex flex-col flex-1">
            <h1 style={T.title3}>계정 정보를 확인해 주세요</h1>
            <p style={{ ...T.body3, color: 'var(--muted-foreground)', margin: '6px 0 22px' }}>관리자가 발급한 계정입니다. 아래 정보가 본인과 일치하면 활성화를 진행하세요.</p>
            <KvGrid style={{ marginBottom: 20, padding: '20px 24px' }} rows={[
              { k: '대상', v: TARGET.name, strong: true },
              { k: '소속', v: TARGET.org },
              { k: '권한(ROLE)', v: TARGET.role },
              { k: '이메일', v: TARGET.email },
              { k: '상태', v: <Pill tone="warning">온보딩대기</Pill> },
            ]} />
            <Callout>담당자 변경 시 이 계정은 비활성되고 새 담당자 계정이 발급됩니다.</Callout>
            <div style={{ marginTop: 20 }}>
              <PrimaryBtn full onClick={() => { setStep(2); pop('본인 확인 완료 — 등록을 진행하세요'); }}>본인 확인</PrimaryBtn>
            </div>
            <p style={{ ...T.caption1, display: 'flex', alignItems: 'flex-start', gap: 6, margin: 'auto 0 0', paddingTop: 24, color: 'var(--muted-foreground)' }}>
              <Icon name="help-circle" size={14} style={{ marginTop: 2 }} />
              <span>정보가 다르면 시스템 관리자(정보화팀)에게 문의해 주세요.</span>
            </p>
          </StepPage>
        )}

        {step === 2 && (
          <StepPage dir={dir}>
            <h1 style={T.title3}>비밀번호·OTP 등록</h1>
            <p style={{ ...T.body3, color: 'var(--muted-foreground)', margin: '6px 0 22px' }}>비밀번호를 설정하고 인증앱(OTP)을 등록해 주세요.</p>
            <form noValidate onSubmit={submit2} className="flex flex-col gap-4">
              <Field required id="issue-pw" label="새 비밀번호" type="password" icon="lock" placeholder="9자 이상, 영문·숫자·특수문자" autoComplete="new-password"
                value={pw} onChange={setPw} error={errs.pw} help={PW_POLICY_HINT} inputRef={firstField} />
              <Field required id="issue-pw2" label="비밀번호 확인" type="password" icon="lock" placeholder="다시 입력" autoComplete="new-password"
                value={confirm} onChange={setConfirm} error={errs.confirm} />
              <OtpRegisterBlock seed={SEED} display={display} secs={secs} />
              <Field required id="issue-otp" label="등록 확인 코드" icon="lock" placeholder="앱에 표시된 6자리" autoComplete="one-time-code"
                inputMode="numeric" maxLength={7} value={otpIn} onChange={setOtpIn} error={errs.otp} />
              <PrimaryBtn type="submit" full>등록 완료</PrimaryBtn>
            </form>
          </StepPage>
        )}

        {step === 3 && (
          <DonePanel
            title="계정이 활성화되었습니다"
            desc={`${TARGET.name} 님, 이제 아이디·비밀번호와 OTP로 로그인할 수 있습니다.`}
            rows={[
              { k: '계정', v: TARGET.email, strong: true },
              { k: '상태', v: <Pill tone="success">활성</Pill> },
              { k: 'OTP', v: '인증앱 등록 완료' },
            ]}
            actions={<>
              <PrimaryBtn onClick={() => onNav?.('login')} style={{ minWidth: 180 }}>로그인 화면으로</PrimaryBtn>
              <SecondaryBtn onClick={restart} style={{ minWidth: 160 }}>처음부터 다시</SecondaryBtn>
            </>} />
        )}
      </SplitCard>
      <Toast toast={toast} />
    </AuthLayout>
  );
}
