/* 로그인(S0_001) — Shell 없는 단독 화면. 정본은 claude.ai/design 캔버스 `APFS 로그인 프로토타입.dc.html`의 로그인 플로우.
   4단계(아이디·비밀번호 → 2차 인증(OTP) → (만료 시) 비밀번호 변경 → 완료)를 좌측 단계 레일과 함께 보여준다.

   ⚠ 실제 인증·TOTP 검증·계정 잠금은 수행하지 않는다. 모든 판정은 `auth_model`의 순수 함수가 하고
   이 파일은 그 결과를 그리기만 한다. 화면에 보이는 데모 계정·OTP 코드는 시연용 스캐폴딩이다. */
import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import {
  AuthLayout, SplitCard, Field, PrimaryBtn, SecondaryBtn, DonePanel, DemoNote,
  OtpCode, Toast, Logo, useDemoOtp, useToast, T, FADE_UP,
} from './auth_shared';
import {
  railSteps, LOGIN_RAIL, verifyCredentials, verifyOtp, verifyPwChange, hasError,
  verifyReset, DEMO_ID, DEMO_PW, LOCK_LIMIT, PW_POLICY_HINT, type PwChangeErrors,
} from './auth_model';

const NO_PW_ERR: PwChangeErrors = { cur: null, next: null, confirm: null };

export function LoginDemo({ onNav }: { onNav?: (route: string) => void }) {
  const [step, setStep] = useState(1);
  const [pwExpired, setPwExpired] = useState(true);   // 캔버스 props `pwExpired` — 90일 경과 시나리오 토글
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [fails, setFails] = useState(0);
  const [locked, setLocked] = useState(false);
  // 어느 입력에 오류를 붙일지까지 모델이 정한다 — 빈 아이디를 비밀번호 오류로 알리면 고칠 곳을 못 찾는다.
  const [credErr, setCredErr] = useState<{ field: 'id' | 'pw'; msg: string } | null>(null);
  const [otpIn, setOtpIn] = useState('');
  const [otpErr, setOtpErr] = useState<string | null>(null);
  const [cur, setCur] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [pwErr, setPwErr] = useState<PwChangeErrors>(NO_PW_ERR);
  const { code, prevCode, secs, display } = useDemoOtp();
  const { toast, pop } = useToast();
  /* 비밀번호 재설정 안내 — BRIEF 수용 기준이 요구하는 모달. 캔버스는 죽은 링크였으나
     기존 로컬 구현의 모달 흐름을 유지한다(기능 회귀 방지). 실제 계정 조회·발송은 하지 않는다. */
  const [resetOpen, setResetOpen] = useState(false);
  const [resetName, setResetName] = useState('');
  const [resetId, setResetId] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const resetTrigger = useRef<HTMLButtonElement>(null);   // 닫힌 뒤 초점 복귀 대상
  /* 열려 있을 때만 마운트한다 — open={false} 로 상주시키면 종료 애니메이션이 끝나지 않아
     닫힌 노드가 DOM 에 계속 남고 초점이 body 에 머문다(실측). 앱의 다른 모달(user_form_modal 등)도
     부모가 조건부로 마운트하는 같은 패턴이며, 그래야 노드가 정리되고 초점이 트리거로 돌아온다.
     아래 focus() 는 그 복귀가 늦을 때의 보조다 — 최종 초점은 실측으로 트리거 버튼에 안착한다. */
  const closeReset = () => {
    setResetOpen(false); setResetMsg('');
    requestAnimationFrame(() => resetTrigger.current?.focus());
  };

  /* 단계 전환은 직접 만든 것이라 초점이 따라오지 않는다 — 새 단계의 첫 입력으로 옮긴다.
     최초 마운트는 건너뛴다(화면에 들어오기만 해도 초점을 빼앗지 않도록). */
  const firstField = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) firstField.current?.focus();
    mounted.current = true;
  }, [step]);

  const submit1 = (e: FormEvent) => {
    e.preventDefault();
    if (locked) return;
    const r = verifyCredentials(id, pw, fails);
    if (r.ok) { setStep(2); setCredErr(null); setOtpIn(''); pop('1차 인증이 완료되었습니다'); return; }
    setFails(r.fails); setLocked(r.locked);
    setCredErr(r.field && r.error ? { field: r.field, msg: r.error } : null);
    if (r.locked) pop(`로그인 ${LOCK_LIMIT}회 실패 — 계정이 잠겼습니다`, true);
  };

  const submit2 = (e: FormEvent) => {
    e.preventDefault();
    const err = verifyOtp(otpIn, code, prevCode);
    setOtpErr(err);
    if (!err) { setStep(pwExpired ? 3 : 4); pop('OTP 인증이 완료되었습니다'); }
  };

  const submit3 = (e: FormEvent) => {
    e.preventDefault();
    const errs = verifyPwChange(cur, p1, p2, pw);
    setPwErr(errs);
    if (!hasError(errs)) { setStep(4); pop('비밀번호가 변경되었습니다'); }
  };

  const restart = () => {
    setStep(1); setId(''); setPw(''); setFails(0); setLocked(false); setCredErr(null);
    setOtpIn(''); setOtpErr(null); setCur(''); setP1(''); setP2(''); setPwErr(NO_PW_ERR);
  };

  return (
    <AuthLayout route="login" onNav={onNav}>
      <SplitCard
        steps={railSteps(LOGIN_RAIL(pwExpired, step), step)}
        railHead={<>
          <Logo />
          <p style={{ ...T.body3, color: 'var(--muted-foreground)', margin: '10px 0 32px' }}>
            에이핏(AFIT) · 농림수산식품모태펀드<br />투자자산관리시스템
          </p>
        </>}
        railFoot={<>세션 30분 · 비밀번호 90일 주기<br />{LOCK_LIMIT}회 실패 시 계정 잠금</>}>

        {step === 1 && (
          <div style={{ animation: FADE_UP }}>
            <h1 style={T.title3}>아이디·비밀번호</h1>
            <p style={{ ...T.body3, color: 'var(--muted-foreground)', margin: '6px 0 22px' }}>에이핏(AFIT) 계정으로 로그인해 주세요.</p>
            {locked && (
              <p role="alert" style={{
                ...T.caption1, lineHeight: 1.6, marginBottom: 18, padding: '14px 18px', fontWeight: 600,
                background: 'var(--danger-soft)', border: '1px solid color-mix(in srgb, var(--danger-text) 35%, transparent)',
                borderRadius: 'var(--radius-lg)', color: 'var(--danger-text)',
              }}>로그인 {LOCK_LIMIT}회 실패로 계정이 잠겼습니다.<br /><span style={{ fontWeight: 400 }}>시스템 관리자(정보화팀)의 잠금 해제가 필요합니다.</span></p>
            )}
            <form noValidate onSubmit={submit1} className="flex flex-col gap-4">
              <Field id="login-id" label="아이디" icon="user" placeholder="로그인 아이디" autoComplete="username"
                value={id} onChange={setId} disabled={locked} inputRef={firstField}
                error={credErr?.field === 'id' ? credErr.msg : null} />
              <Field id="login-pw" label="비밀번호" type="password" icon="lock" placeholder="비밀번호" autoComplete="current-password"
                value={pw} onChange={setPw} disabled={locked}
                error={credErr?.field === 'pw' ? credErr.msg : null} />
              <div className="flex items-center justify-between gap-3 flex-wrap" style={{ marginTop: 2 }}>
                <label className="flex items-center gap-2 cursor-pointer" style={{ ...T.body3, minHeight: 24 }}>
                  <input type="checkbox" defaultChecked style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                  아이디 저장
                </label>
                <button ref={resetTrigger} type="button" onClick={() => { setResetOpen(true); setResetMsg(''); }}
                  className="border-0 bg-transparent p-0 cursor-pointer underline underline-offset-4"
                  style={{ ...T.body3, minHeight: 24, color: 'var(--accent)' }}>비밀번호 재설정(간편인증)</button>
              </div>
              <PrimaryBtn type="submit" full disabled={locked}>로그인</PrimaryBtn>
            </form>
            <DemoNote>
              아이디 <b style={{ color: 'var(--foreground)' }}>{DEMO_ID}</b> · 비밀번호 <b style={{ color: 'var(--foreground)' }}>{DEMO_PW}</b> 로만 통과하는 UI 목업입니다.
              {' '}(실패 {fails}/{LOCK_LIMIT}{locked ? ' · 잠금 상태' : ''})
              <label className="flex items-center gap-2 cursor-pointer" style={{ marginTop: 8, minHeight: 24 }}>
                <input type="checkbox" checked={pwExpired} onChange={(e) => setPwExpired(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                비밀번호 90일 경과 시나리오(3단계 노출)
              </label>
            </DemoNote>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col flex-1" style={{ animation: FADE_UP }}>
            <h1 style={T.title3}>2차 인증(OTP)</h1>
            <p style={{ ...T.body3, color: 'var(--muted-foreground)', margin: '6px 0 22px' }}>휴대폰 인증앱에 표시된 6자리 코드를 입력해 주세요.</p>
            <div className="flex items-center justify-between flex-wrap gap-2" style={{
              background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
              padding: '14px 18px', marginBottom: 20,
            }}>
              <span style={{ ...T.body3, color: 'var(--muted-foreground)' }}>인증앱 코드</span>
              <OtpCode display={display} secs={secs} />
            </div>
            <form noValidate onSubmit={submit2} className="flex flex-col gap-4">
              <Field id="login-otp" label="인증 코드" icon="lock" placeholder="앱에 표시된 6자리" autoComplete="one-time-code"
                inputMode="numeric" maxLength={7} value={otpIn} onChange={setOtpIn} error={otpErr} inputRef={firstField} />
              <div className="flex gap-2.5">
                <PrimaryBtn type="submit" full style={{ flex: 1 }}>인증 확인</PrimaryBtn>
                <SecondaryBtn onClick={() => { setStep(1); setOtpErr(null); }} style={{ flex: '0 0 96px' }}>뒤로</SecondaryBtn>
              </div>
            </form>
            <DemoNote>위 「인증앱 코드」가 정답입니다 — 실제 인증앱 대신 화면에 표시하는 시연용 코드입니다.</DemoNote>
            <p style={{ ...T.caption1, margin: 'auto 0 0', paddingTop: 24, color: 'var(--muted-foreground)', lineHeight: 1.7 }}>
              표준 TOTP(RFC 6238) · 30초 회전 · 허용창 ±1<br />코드가 맞지 않으면 기기 시간 동기화를 확인해 주세요.
            </p>
          </div>
        )}

        {step === 3 && (
          <div style={{ animation: FADE_UP }}>
            <h1 style={T.title3}>비밀번호 변경</h1>
            <p style={{ ...T.body3, color: 'var(--muted-foreground)', margin: '6px 0 22px' }}>비밀번호 사용 90일이 경과했어요. 변경 후 이용할 수 있습니다.</p>
            <form noValidate onSubmit={submit3} className="flex flex-col gap-4">
              <Field id="pw-cur" label="현재 비밀번호" type="password" icon="lock" placeholder="현재 비밀번호" autoComplete="current-password"
                value={cur} onChange={setCur} error={pwErr.cur} inputRef={firstField} />
              <Field id="pw-new" label="새 비밀번호" type="password" icon="lock" placeholder="9자 이상, 영문·숫자·특수문자" autoComplete="new-password"
                value={p1} onChange={setP1} error={pwErr.next} help={PW_POLICY_HINT} />
              <Field id="pw-confirm" label="새 비밀번호 확인" type="password" icon="lock" placeholder="새 비밀번호 다시 입력" autoComplete="new-password"
                value={p2} onChange={setP2} error={pwErr.confirm} />
              <PrimaryBtn type="submit" full>변경하고 계속</PrimaryBtn>
            </form>
          </div>
        )}

        {step === 4 && (
          <DonePanel
            title="로그인 완료"
            desc="김담당 님, 에이핏(AFIT)에 안전하게 접속했습니다."
            rows={[
              { k: '계정', v: `${DEMO_ID} (농금원 · 관리자)`, strong: true },
              { k: '2차 인증', v: 'TOTP 인증 완료' },
              { k: '비밀번호', v: pwExpired ? '오늘 변경됨 (다음 변경 90일 후)' : '90일 미경과 — 변경 생략' },
              { k: '세션', v: '30분 (무활동 시 자동 종료)' },
            ]}
            actions={<>
              <PrimaryBtn onClick={() => onNav?.('main')} style={{ minWidth: 160 }}>포털 홈으로</PrimaryBtn>
              <SecondaryBtn onClick={restart} style={{ minWidth: 160 }}>처음부터 다시</SecondaryBtn>
            </>} />
        )}
      </SplitCard>
      <Toast toast={toast} />

      {/* 공용 Radix Dialog — 초점 트랩·Esc·초점 복귀를 직접 구현하지 않기 위해.
          직접 만든 오버레이는 aria-modal 만으로는 배경으로 Tab 이 새고 Esc 가 먹지 않는다. */}
      {resetOpen && (
      <Dialog open onOpenChange={(o) => { if (!o) closeReset(); }}>
        <DialogContent className="max-w-[420px]" aria-describedby="reset-desc">
          <div style={{ padding: 28 }}>
            <DialogTitle style={T.title3}>비밀번호 재설정 안내</DialogTitle>
            <DialogDescription id="reset-desc" style={{ ...T.body3, display: 'block', margin: '8px 0 18px', color: 'var(--muted-foreground)' }}>
              본인 확인 정보를 입력하는 화면 흐름만 보여 줍니다. 실제 계정 조회·안내 발송은 하지 않습니다.
            </DialogDescription>
            <form noValidate onSubmit={(e) => { e.preventDefault(); setResetMsg(verifyReset(resetName, resetId) ?? '재설정 안내를 확인하는 데모 상태입니다. 실제 발송은 하지 않습니다.'); }}
              className="flex flex-col gap-4">
              <Field id="reset-name" label="성명" icon="user" placeholder="성명" value={resetName} onChange={setResetName} />
              <Field id="reset-id" label="아이디" icon="user" placeholder="로그인 아이디" value={resetId} onChange={setResetId} />
              {resetMsg && <p role="status" style={{ ...T.caption1, background: 'var(--muted)', borderRadius: 'var(--radius)', padding: '11px 14px', lineHeight: 1.6 }}>{resetMsg}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeReset} className="cursor-pointer" style={{ minHeight: 40, padding: '0 16px', borderRadius: 'var(--radius)', background: 'var(--card)', border: '1px solid var(--border-strong)', color: 'var(--foreground)', font: '700 13.5px var(--font-sans)' }}>닫기</button>
                <button type="submit" className="cursor-pointer border-0" style={{ minHeight: 40, padding: '0 16px', borderRadius: 'var(--radius)', background: 'var(--primary)', color: 'var(--primary-foreground)', font: '700 13.5px var(--font-sans)' }}>안내 확인</button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </AuthLayout>
  );
}
