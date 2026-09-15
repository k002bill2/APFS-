/* 로그인 데모 — S0_001 기반의 Shell 없는 UI 목업.
   실제 인증, OTP/TOTP, 계정 잠금, 비밀번호 변경·재설정, 이메일 발송은 수행하지 않는다.
   단계 흐름(아이디·비밀번호 → 2차 인증 → (만료 시) 비밀번호 변경 → 완료)과 결과는 전부
   `login_demo_model`의 순수 함수가 정하며, 이 파일은 그 상태를 그리기만 한다.
   결과를 정하는 것은 입력값이 아니라 화면 상단의 **시연 시나리오 선택**이다(목업 계정·코드 없음). */
import { useState, useRef, useEffect, type FormEvent } from 'react';
import {
  initialLogin, verifyCredentials, verifyOtp, verifyPwChange, verifyReset,
  stepLabels, stepIndex, SCENARIOS, SCENARIO_LABELS, DEMO_SESSION, MAX_FAIL, PW_POLICY,
  type LoginState, type Scenario, type Verdict,
} from './login_demo_model';

type LoginDemoProps = { onNav?: (route: string) => void };

const INPUT = 'w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary';
const PRIMARY_BTN = 'rounded-md border-0 bg-primary px-4 py-2.5 font-semibold text-primary-foreground';
const GHOST_BTN = 'rounded-md border border-input bg-background px-4 py-2.5 text-sm font-semibold';

export function LoginDemo({ onNav }: LoginDemoProps) {
  const [login, setLogin] = useState<LoginState>(() => initialLogin());
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [cur, setCur] = useState('');
  const [n1, setN1] = useState('');
  const [n2, setN2] = useState('');
  const [err, setErr] = useState<Verdict | null>(null);           // 모델이 돌려준 마지막 실패 판정(필드 오류 또는 배너)
  const [resetOpen, setResetOpen] = useState(false);
  const [resetName, setResetName] = useState('');
  const [resetId, setResetId] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  /* 단계 전환 시 새 단계의 첫 입력으로 초점 이동(직접 만든 전환이라 Radix 처럼 자동 처리되지 않는다).
     최초 마운트는 건너뛴다 — 화면에 들어오기만 해도 초점을 빼앗지 않도록. */
  const firstField = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) firstField.current?.focus();
    mounted.current = true;
  }, [login.step]);

  const steps = stepLabels(login.scenario);
  const current = stepIndex(login.scenario, login.step);
  const fieldErr = (f: Verdict['field']): string | undefined => (err && !err.ok && err.field === f ? err.msg : undefined);
  const banner = err && !err.ok && !err.field ? err : null;

  const restart = (scenario: Scenario = login.scenario) => {
    setLogin(initialLogin(scenario));
    setPassword(''); setOtp(''); setCur(''); setN1(''); setN2(''); setErr(null);
  };

  const apply = ({ verdict, next }: { verdict: Verdict; next: LoginState }) => {
    setLogin(next);
    setErr(verdict.ok ? null : verdict);
  };

  const submitCredentials = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); apply(verifyCredentials(login, id, password)); };
  const submitOtp = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); apply(verifyOtp(login, otp)); };
  const submitPwChange = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); apply(verifyPwChange(login, cur, n1, n2)); };

  const requestReset = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const verdict = verifyReset(resetName, resetId);
    setResetMessage(verdict.ok
      ? '재설정 안내를 확인하는 데모 상태입니다. 실제 안내 발송이나 비밀번호 변경은 수행하지 않습니다.'
      : verdict.msg ?? '입력값을 확인해 주세요.');
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-10" style={{ background: 'var(--background, #f3f5f8)', color: 'var(--foreground, #1a1d21)' }}>
      <section aria-labelledby="login-title" className="w-full max-w-[440px] rounded-xl border border-border bg-card shadow-sm" style={{ padding: 32 }}>
        <p className="m-0 mb-2 text-sm font-semibold text-primary">AFIT</p>
        <h1 id="login-title" className="m-0 text-2xl font-bold tracking-tight">로그인</h1>
        <p className="mt-2 mb-6 text-sm text-muted-foreground">투자자산관리 서비스를 이용하려면 로그인해 주세요.</p>

        <ol aria-label="로그인 단계" className="m-0 mb-6 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-xs">
          {steps.map((s, i) => (
            <li key={s.key} aria-current={s.key === login.step ? 'step' : undefined}
              className={s.key === login.step ? 'font-bold text-primary' : i < current ? 'text-foreground' : 'text-muted-foreground'}>
              {i < current ? `✓ ${s.label}` : s.label}
            </li>
          ))}
        </ol>

        {banner && (
          <p role="alert" className={`m-0 mb-5 rounded-md p-3 text-sm leading-5 ${banner.tone === 'warning' ? 'bg-muted' : 'bg-danger-soft'}`}>{banner.msg}</p>
        )}

        {login.step === 'credentials' && (
          <>
            <fieldset className="m-0 mb-5 rounded-lg border border-border p-3">
              <legend className="px-1 text-xs font-semibold text-muted-foreground">시연 시나리오 (목업 — 실제 인증이 아니라 이 선택이 결과를 정합니다)</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {SCENARIOS.map((s) => (
                  <label key={s} className="flex items-center gap-1.5 text-sm">
                    <input type="radio" name="login-scenario" value={s} checked={login.scenario === s} onChange={() => restart(s)} />
                    <span>{SCENARIO_LABELS[s]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <form noValidate onSubmit={submitCredentials} className="grid gap-5">
              <div>
                <label htmlFor="login-id" className="mb-2 block text-sm font-semibold">아이디</label>
                <input ref={firstField} id="login-id" name="id" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)}
                  aria-invalid={Boolean(fieldErr('id'))} aria-describedby={fieldErr('id') ? 'login-id-error' : undefined} className={INPUT} />
                {fieldErr('id') && <p id="login-id-error" className="mt-1.5 mb-0 text-sm text-destructive">{fieldErr('id')}</p>}
              </div>
              <div>
                <label htmlFor="login-password" className="mb-2 block text-sm font-semibold">비밀번호</label>
                <input id="login-password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(fieldErr('pw'))} aria-describedby={fieldErr('pw') ? 'login-password-error' : undefined} className={INPUT} />
                {fieldErr('pw') && <p id="login-password-error" className="mt-1.5 mb-0 text-sm text-destructive">{fieldErr('pw')}</p>}
              </div>
              <p className="m-0 text-xs leading-5 text-muted-foreground">비밀번호 {MAX_FAIL}회 오류 시 계정이 잠깁니다(안내 문구 — 목업은 강제하지 않습니다).</p>
              <button type="submit" className={PRIMARY_BTN}>로그인</button>
            </form>
          </>
        )}

        {login.step === 'otp' && (
          <form noValidate onSubmit={submitOtp} className="grid gap-5">
            <p className="m-0 text-sm leading-6 text-muted-foreground">등록된 인증 앱의 6자리 코드를 입력해 주세요. 목업은 <b>형식만</b> 확인하며 실제 코드 검증은 하지 않습니다.</p>
            <div>
              <label htmlFor="login-otp" className="mb-2 block text-sm font-semibold">인증 코드</label>
              <input ref={firstField} id="login-otp" name="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)}
                aria-invalid={Boolean(fieldErr('otp'))} aria-describedby={fieldErr('otp') ? 'login-otp-error' : undefined} className={INPUT} />
              {fieldErr('otp') && <p id="login-otp-error" className="mt-1.5 mb-0 text-sm text-destructive">{fieldErr('otp')}</p>}
            </div>
            <div className="flex gap-2">
              <button type="button" className={GHOST_BTN} onClick={() => restart()}>처음부터</button>
              <button type="submit" className={`${PRIMARY_BTN} flex-1`}>확인</button>
            </div>
          </form>
        )}

        {login.step === 'pwchange' && (
          <form noValidate onSubmit={submitPwChange} className="grid gap-5">
            <p className="m-0 text-sm leading-6 text-muted-foreground">비밀번호 사용 기간이 만료됐습니다. 새 비밀번호로 변경해 주세요.</p>
            <p className="m-0 rounded-md bg-muted p-3 text-xs leading-5">정책 안내: {PW_POLICY} <span className="text-muted-foreground">(목업 — 강제하지 않습니다)</span></p>
            <div>
              <label htmlFor="pw-cur" className="mb-2 block text-sm font-semibold">현재 비밀번호</label>
              <input ref={firstField} id="pw-cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)}
                aria-invalid={Boolean(fieldErr('cur'))} aria-describedby={fieldErr('cur') ? 'pw-cur-error' : undefined} className={INPUT} />
              {fieldErr('cur') && <p id="pw-cur-error" className="mt-1.5 mb-0 text-sm text-destructive">{fieldErr('cur')}</p>}
            </div>
            <div>
              <label htmlFor="pw-n1" className="mb-2 block text-sm font-semibold">새 비밀번호</label>
              <input id="pw-n1" type="password" autoComplete="new-password" value={n1} onChange={(e) => setN1(e.target.value)}
                aria-invalid={Boolean(fieldErr('n1'))} aria-describedby={fieldErr('n1') ? 'pw-n1-error' : undefined} className={INPUT} />
              {fieldErr('n1') && <p id="pw-n1-error" className="mt-1.5 mb-0 text-sm text-destructive">{fieldErr('n1')}</p>}
            </div>
            <div>
              <label htmlFor="pw-n2" className="mb-2 block text-sm font-semibold">새 비밀번호 확인</label>
              <input id="pw-n2" type="password" autoComplete="new-password" value={n2} onChange={(e) => setN2(e.target.value)}
                aria-invalid={Boolean(fieldErr('n2'))} aria-describedby={fieldErr('n2') ? 'pw-n2-error' : undefined} className={INPUT} />
              {fieldErr('n2') && <p id="pw-n2-error" className="mt-1.5 mb-0 text-sm text-destructive">{fieldErr('n2')}</p>}
            </div>
            <div className="flex gap-2">
              <button type="button" className={GHOST_BTN} onClick={() => restart()}>처음부터</button>
              <button type="submit" className={`${PRIMARY_BTN} flex-1`}>변경하고 계속</button>
            </div>
          </form>
        )}

        {login.step === 'done' && (
          <div role="status" className="rounded-lg border border-[color:var(--success,#0e7c86)] bg-[color:var(--success-weak,#e2f3f4)] p-5">
            <h2 className="m-0 text-base font-bold">목업 로그인 완료</h2>
            <p className="mt-2 mb-4 text-sm leading-6">입력 형식과 단계 흐름만 확인한 UI 데모입니다. 실제 인증·권한 확인은 수행하지 않았습니다.</p>
            <dl className="m-0 mb-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="font-semibold">사용자</dt><dd className="m-0">{DEMO_SESSION.name}</dd>
              <dt className="font-semibold">소속</dt><dd className="m-0">{DEMO_SESSION.belong}</dd>
              <dt className="font-semibold">권한</dt><dd className="m-0">{DEMO_SESSION.roles.join(', ')}</dd>
              <dt className="font-semibold">최근 접속</dt><dd className="m-0">{DEMO_SESSION.last}</dd>
            </dl>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onNav?.('main')} className={`${PRIMARY_BTN} flex-1`}>메인으로 이동</button>
              <button type="button" onClick={() => restart()} className={GHOST_BTN}>다시 시연</button>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 text-sm">
          <button type="button" className="border-0 bg-transparent p-0 text-primary underline underline-offset-4" onClick={() => { setResetOpen(true); setResetMessage(''); }}>비밀번호 재설정 안내</button>
          <button type="button" className="border-0 bg-transparent p-0 text-muted-foreground underline underline-offset-4" onClick={() => onNav?.('main')}>메인으로 돌아가기</button>
        </div>
        <p className="mt-5 mb-0 text-xs leading-5 text-muted-foreground">이 화면은 접근성 및 화면 흐름 검토용 로컬 UI 목업입니다.</p>
      </section>

      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="reset-title" className="w-full max-w-[420px] rounded-xl border border-border bg-card shadow-lg" style={{ padding: 28 }}>
            <h2 id="reset-title" className="m-0 text-lg font-bold">비밀번호 재설정 안내</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">본인 확인 정보를 입력하는 화면 흐름만 보여 줍니다. 실제 계정 조회·안내 발송은 하지 않습니다.</p>
            <form noValidate onSubmit={requestReset} className="grid gap-4">
              <div><label htmlFor="reset-name" className="mb-1.5 block text-sm font-semibold">성명</label><input id="reset-name" value={resetName} onChange={(e) => setResetName(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm" /></div>
              <div><label htmlFor="reset-id" className="mb-1.5 block text-sm font-semibold">아이디</label><input id="reset-id" value={resetId} onChange={(e) => setResetId(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm" /></div>
              {resetMessage && <p role="status" className="m-0 rounded-md bg-muted p-3 text-sm leading-5">{resetMessage}</p>}
              <div className="flex justify-end gap-2"><button type="button" className="rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold" onClick={() => setResetOpen(false)}>닫기</button><button type="submit" className="rounded-md border-0 bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">안내 확인</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
