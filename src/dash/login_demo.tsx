/* 로그인 데모 — S0_001 기반의 Shell 없는 UI 목업.
   실제 인증, OTP/TOTP, 계정 잠금, 비밀번호 변경·재설정, 이메일 발송은 수행하지 않는다. */
import { useState, type FormEvent } from 'react';
import { verifyReset } from './login_demo_model';

type LoginDemoProps = { onNav?: (route: string) => void };
type FieldErrors = { id?: string; password?: string };

export function LoginDemo({ onNav }: LoginDemoProps) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetName, setResetName] = useState('');
  const [resetId, setResetId] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: FieldErrors = {};
    if (!id.trim()) next.id = '아이디를 입력해 주세요.';
    if (!password) next.password = '비밀번호를 입력해 주세요.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSuccess(true);
  };

  const requestReset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
        <p className="mt-2 mb-7 text-sm text-muted-foreground">투자자산관리 서비스를 이용하려면 로그인해 주세요.</p>

        {success ? (
          <div role="status" className="rounded-lg border border-[color:var(--success,#0e7c86)] bg-[color:var(--success-weak,#e2f3f4)] p-5">
            <h2 className="m-0 text-base font-bold">목업 로그인 완료</h2>
            <p className="mt-2 mb-4 text-sm leading-6">입력 형식만 확인한 UI 데모입니다. 실제 인증·권한 확인은 수행하지 않았습니다.</p>
            <button type="button" onClick={() => onNav?.('main')} className="w-full rounded-md border-0 bg-primary px-4 py-2.5 font-semibold text-primary-foreground">메인으로 이동</button>
          </div>
        ) : (
          <form noValidate onSubmit={submit} className="grid gap-5">
            <div>
              <label htmlFor="login-id" className="mb-2 block text-sm font-semibold">아이디</label>
              <input id="login-id" name="id" autoComplete="username" value={id} onChange={(event) => setId(event.target.value)} aria-invalid={Boolean(errors.id)} aria-describedby={errors.id ? 'login-id-error' : undefined} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
              {errors.id && <p id="login-id-error" className="mt-1.5 mb-0 text-sm text-destructive">{errors.id}</p>}
            </div>
            <div>
              <label htmlFor="login-password" className="mb-2 block text-sm font-semibold">비밀번호</label>
              <input id="login-password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'login-password-error' : undefined} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
              {errors.password && <p id="login-password-error" className="mt-1.5 mb-0 text-sm text-destructive">{errors.password}</p>}
            </div>
            <button type="submit" className="rounded-md border-0 bg-primary px-4 py-2.5 font-semibold text-primary-foreground">로그인</button>
          </form>
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
              <div><label htmlFor="reset-name" className="mb-1.5 block text-sm font-semibold">성명</label><input id="reset-name" value={resetName} onChange={(event) => setResetName(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm" /></div>
              <div><label htmlFor="reset-id" className="mb-1.5 block text-sm font-semibold">아이디</label><input id="reset-id" value={resetId} onChange={(event) => setResetId(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm" /></div>
              {resetMessage && <p role="status" className="m-0 rounded-md bg-muted p-3 text-sm leading-5">{resetMessage}</p>}
              <div className="flex justify-end gap-2"><button type="button" className="rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold" onClick={() => setResetOpen(false)}>닫기</button><button type="submit" className="rounded-md border-0 bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">안내 확인</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
