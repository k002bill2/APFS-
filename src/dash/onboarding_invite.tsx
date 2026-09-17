/* 초대 온보딩(S0_003, 운용사) — 초대받은 운용사 담당자가 계정을 만드는 4단계 화면.
   정본은 claude.ai/design 캔버스 `APFS 로그인 프로토타입.dc.html`의 초대 온보딩 플로우.
   로그인·발급과 달리 좌측 레일이 없는 단일 카드(500px) + 브랜드 헤더 + 점 진행표시다.

   ⚠ 관리자가 초대를 보내는 화면(`user_invite_manage`, S0_103)과는 별개다 — 이 화면은 초대받은 쪽이 본다.
   실제 간편인증(CI 실명매칭)·계정 생성·감사로그 기록은 수행하지 않는다. */
import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AuthLayout, Field, PrimaryBtn, SecondaryBtn, DonePanel, Callout,
  KvGrid, Pill, OtpRegisterBlock, Toast, Logo, useDemoOtp, useToast, T, FADE_UP, FADE_UP_CARD,
} from './auth_shared';
import {
  INVITE_LABELS, verifyRealName, verifyRegister, hasError,
  DEMO_REAL_NAME, PW_POLICY_HINT, type RegisterErrors,
} from './auth_model';

const NO_ERR: RegisterErrors = { pw: null, confirm: null, otp: null };
const SEED = 'KRQW G5LT MFZG K3TP';
const INVITEE = { name: DEMO_REAL_NAME, email: 'park@imm.co.kr', org: 'IMM인베스트먼트 (운용사)', role: '운용사' };

const DONE_LINE = 'color-mix(in srgb, var(--success-text) 35%, transparent)';

/** 4단계 점 진행표시 — 점과 캡션을 같은 열에 세로로 묶어 위치를 일치시킨다(좁은 카드용).
    연결선은 각 열 내부에 절대배치해 다음 점까지 정확히 잇는다. */
function DotSteps({ step }: { step: number }) {
  const last = INVITE_LABELS.length - 1;
  return (
    <ol className="flex list-none m-0 p-0" style={{ ...T.caption1, color: 'var(--muted-foreground)', marginBottom: 20 }} aria-label="진행 단계">
      {INVITE_LABELS.map((label, i) => {
        const n = i + 1, done = n < step, cur = n === step;
        return (
          <li key={label} aria-current={cur ? 'step' : undefined}
            className="relative flex flex-col" style={{ flex: i === last ? '0 0 auto' : '1 1 auto', minWidth: 0, paddingRight: i === last ? 0 : 14 }}>
            <span aria-hidden="true" style={{
              width: 8, height: 8, borderRadius: '50%', flex: 'none',
              background: done ? 'var(--success-text)' : cur ? 'var(--primary)' : 'var(--border-strong)',
              boxShadow: cur ? '0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)' : 'none',
            }} />
            {i < last && <span aria-hidden="true" style={{ position: 'absolute', left: 14, right: 6, top: 3, height: 2, background: done ? DONE_LINE : 'var(--border)' }} />}
            <span style={{ marginTop: 10, ...(cur ? { fontWeight: 700, color: 'var(--primary)' } : done ? { color: 'var(--success-text)' } : null) }}>
              <span className="sr-only">{done ? '완료: ' : cur ? '진행 중: ' : '예정: '}</span>
              {n} {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OnboardingInvite({ onNav }: { onNav?: (route: string) => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [nameErr, setNameErr] = useState<string | null>(null);
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
    const err = verifyRealName(name);
    setNameErr(err);
    if (err) { pop('실명 불일치 — 초대 거부 및 감사로그 기록', true); return; }
    setStep(3); pop('실명매칭 일치 — 본인 확인 완료');
  };

  const submit3 = (e: FormEvent) => {
    e.preventDefault();
    const next = verifyRegister(pw, confirm, otpIn, code, prevCode);
    setErrs(next);
    if (!hasError(next)) { setStep(4); pop('온보딩이 완료되었습니다'); }
  };

  const restart = () => { setStep(1); setName(''); setNameErr(null); setPw(''); setConfirm(''); setOtpIn(''); setErrs(NO_ERR); };

  return (
    <AuthLayout>
      <div className="w-full overflow-hidden" style={{ maxWidth: 500, background: 'var(--card)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-md)', animation: FADE_UP_CARD }}>
        {/* 고정 브랜드 표면 — 적응형 --primary 가 아니라 --brand-solid 를 써야 다크에서도 흰 글자 대비가 유지된다 */}
        <header className="box-border" style={{ background: 'var(--brand-solid)', color: 'var(--on-brand-solid)', padding: '32px 32px 28px' }}>
          <Logo white />
          <h1 style={{ font: '700 24px/1.3 var(--font-sans)', letterSpacing: '-0.02em', margin: '18px 0 4px' }}>
            {step === 4 ? `${INVITEE.name} 님, 환영합니다` : `${INVITEE.name} 님, 계정에 초대되었습니다`}
          </h1>
          <p style={{ font: '400 13.5px/1.6 var(--font-sans)', margin: 0, color: 'color-mix(in srgb, var(--on-brand-solid) 78%, transparent)' }}>
            {step === 4 ? '농금원 투자관리부 · 운용사 계정 생성 완료' : '농금원 투자관리부 · 초대 유효기간 72시간'}
          </p>
        </header>

        <div className="box-border" style={{ padding: '28px 32px 32px' }}>
          <DotSteps step={step} />

          {step === 1 && (
            <div style={{ animation: FADE_UP }}>
              <KvGrid labelWidth={90} style={{ marginBottom: 18 }} rows={[
                { k: '이메일', v: <>{INVITEE.email} <Pill tone="info">화이트리스트</Pill></> },
                { k: '소속', v: INVITEE.org },
                { k: '부여 ROLE', v: INVITEE.role },
              ]} />
              <Callout>운용사 사용자는 농금원 보유 운용인력 명단으로만 초대되며, 초대는 사전 승인을 의미합니다.</Callout>
              <div style={{ marginTop: 20 }}>
                <PrimaryBtn full onClick={() => { setStep(2); pop('초대를 수락했습니다 — 간편인증을 진행하세요'); }}>초대수락</PrimaryBtn>
              </div>
              <p style={{ ...T.caption1, textAlign: 'center', margin: '16px 0 0', color: 'var(--muted-foreground)' }}>본인이 아니면 이 초대를 무시해 주세요. 72시간 후 자동 만료됩니다.</p>
            </div>
          )}

          {step === 2 && (
            <div style={{ animation: FADE_UP }}>
              <h2 style={{ ...T.body2, fontWeight: 700, marginBottom: 4 }}>간편인증으로 본인을 확인합니다</h2>
              <p style={{ ...T.body3, color: 'var(--muted-foreground)', marginBottom: 16 }}>
                간편인증 실명(CI)이 초대 대상 <b style={{ color: 'var(--foreground)' }}>{INVITEE.name}</b>와 일치해야 다음 단계가 열립니다.
              </p>
              <form noValidate onSubmit={submit2} className="flex flex-col gap-4">
                <Field required id="invite-name" label="본인 실명" icon="user" placeholder="실명 입력" autoComplete="name"
                  value={name} onChange={setName} error={nameErr} inputRef={firstField} />
                <PrimaryBtn type="submit" full>간편인증 진행</PrimaryBtn>
              </form>
              <p style={{ ...T.caption1, margin: '16px 0 0', color: 'var(--muted-foreground)' }}>실명 불일치 시 초대가 거부되고 감사로그에 기록됩니다.</p>
            </div>
          )}

          {step === 3 && (
            <div style={{ animation: FADE_UP }}>
              <h2 style={{ ...T.body2, fontWeight: 700, marginBottom: 14 }}>비밀번호·OTP 등록</h2>
              <form noValidate onSubmit={submit3} className="flex flex-col gap-4">
                <Field required id="invite-pw" label="새 비밀번호" type="password" icon="lock" placeholder="9자 이상, 영문·숫자·특수문자" autoComplete="new-password"
                  value={pw} onChange={setPw} error={errs.pw} help={PW_POLICY_HINT} inputRef={firstField} />
                <Field required id="invite-pw2" label="비밀번호 확인" type="password" icon="lock" placeholder="다시 입력" autoComplete="new-password"
                  value={confirm} onChange={setConfirm} error={errs.confirm} />
                <OtpRegisterBlock seed={SEED} display={display} secs={secs} />
                <Field required id="invite-otp" label="등록 확인 코드" icon="lock" placeholder="앱에 표시된 6자리" autoComplete="one-time-code"
                  inputMode="numeric" maxLength={7} value={otpIn} onChange={setOtpIn} error={errs.otp} />
                <PrimaryBtn type="submit" full>등록 완료</PrimaryBtn>
              </form>
            </div>
          )}

          {step === 4 && (
            <DonePanel
              compact
              titleAs="h2"
              title="온보딩 완료"
              desc={<>{INVITEE.name} 님의 운용사 계정이 생성되었습니다.<br />이제 로그인해 이용할 수 있어요.</>}
              rows={[
                { k: '계정', v: INVITEE.email, strong: true },
                { k: '실명매칭', v: '간편인증 일치 확인' },
                { k: 'OTP', v: '인증앱 등록 완료' },
                { k: 'ROLE', v: INVITEE.role },
              ]}
              actions={<>
                <PrimaryBtn onClick={() => onNav?.('login')} style={{ minWidth: 170 }}>로그인 화면으로</PrimaryBtn>
                <SecondaryBtn onClick={restart} style={{ minWidth: 150 }}>처음부터 다시</SecondaryBtn>
              </>} />
          )}
        </div>
      </div>
      <Toast toast={toast} />
    </AuthLayout>
  );
}
