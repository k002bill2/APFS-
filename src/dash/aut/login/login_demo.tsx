/* 로그인(S0_001) — Shell 없는 단독 화면. 정본은 claude.ai/design 캔버스 `APFS 로그인 프로토타입.dc.html`의 로그인 플로우.
   4단계(아이디·비밀번호 → 2차 인증(OTP) → (만료 시) 비밀번호 변경 → 완료)로 진행한다. 1단 카드 — 위에서부터 브랜드 헤더 · 탭(모든 단계) · 단계 칩 · 본문.
   단계 칩은 흐름이 시작된 뒤에만 나온다 — 첫 화면은 어느 탭이든 브랜드와 입력만 보이고,
   로그인은 2차 인증부터·간편인증은 요청 뒤·재설정은 메일 발송 뒤에 칩이 붙는다(판정 showLoginRail).

   ⚠ 실제 인증·TOTP 검증·계정 잠금은 수행하지 않는다. 모든 판정은 `auth_model`의 순수 함수가 하고
   이 파일은 그 결과를 그리기만 한다. 화면에 보이는 데모 계정·OTP 코드는 시연용 스캐폴딩이다.
   ⚠ 정본과의 차이(2026-09-18): "아이디 저장" 체크는 DS `Checkbox`(ui/checkbox.tsx)로 코드에서 **먼저** 바꿨다(전 화면 통일).
     캔버스는 아직 네이티브 체크박스다 — 캔버스에서 재이식할 때 이 체크만은 DS 컴포넌트를 유지하고, 캔버스도 함께 갱신할 것.
   ⚠ 정본과의 차이(2026-11-13, 사용자 지시): 캔버스의 좌측 레일 2단 카드를 코드에서 **먼저** 1단 카드로 바꿨다.
     단계는 사용자 첨부 목업(S0_001_로그인.html `.steps`)처럼 캡션 없는 "N. 제목" 칩으로 단순화해 본문 위로,
     로고·시스템명은 카드 상단 브랜드 헤더로 옮겼다. 칩은 흐름이 시작된 뒤에만 보인다(showLoginRail).
     목업에서는 골격만 가져왔다 — 목업의 색·문구(에이핏)·정책 안내·데모 계정 표·재설정 모달은 옮기지 않았다.
     캔버스는 아직 2단이다 — 재이식할 때 이 1단 구조와 showLoginRail 조건을 유지할 것. */
import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import { UI } from '../../components';
import { Checkbox } from '../../ui/checkbox';   // 아이디 저장 = DS 체크박스(전 화면 통일, 2026-09-18). Radix <button> 이라 <label> 래핑 금지 → htmlFor
import { Icon } from '../../icons';
import {
  AuthLayout, Field, FormError, PrimaryBtn, SecondaryBtn, DonePanel,
  OtpCode, Toast, Logo, InfoHint, useDemoOtp, useToast, T, StepPage, useStepDir, FADE_UP_CARD,
} from '../auth_shared';
import {
  railSteps, LOGIN_RAIL, RESET_RAIL, SIMPLE_AUTH_RAIL, showLoginRail,
  verifyCredentials, verifyOtp, verifyPwChange, verifySimpleAuth, hasError,
  verifyReset, DEMO_ID, LOCK_LIMIT, PW_POLICY_HINT, type PwChangeErrors, type RailStep,
} from '../auth_model';

const NO_PW_ERR: PwChangeErrors = { cur: null, next: null, confirm: null };

const STATUS_LABEL = { done: '완료', current: '진행 중', todo: '예정' } as const;

/** 카드 좌우 여백 — 헤더와 본문이 같은 값을 써서 로고·탭·입력칸의 왼쪽 선이 맞는다.
    데스크톱 40(2026-11-13 사용자 지시 "좌우 패딩을 늘리자", 32→40), 좁은 화면은 24까지 줄인다. */
const SIDE_PAD = 'clamp(24px,6vw,40px)';

/** 단순화한 단계 표시 — 첨부 목업 `.steps` 처럼 캡션 없는 "N. 제목" 칩을 가로로 늘어놓고, 좁으면 줄을 바꾼다.
    누르는 버튼이 아니라 진행 상태 표시다(Pill 과 같은 반경). 완료·진행·예정이 색으로만 갈리지 않게
    완료 칩은 번호 자리에 체크를 놓고, 스크린리더엔 번호·상태 문구를 붙인다(보이는 번호는 sr-only 와 겹치지 않게 숨김).
    체크를 번호에 "더하지" 않고 "바꿔" 넣는 이유: 완료가 늘수록 칩 줄이 넓어져 3·4단계에서 줄이 바뀌었다(실측 +17px/칩). */
function StepChips({ steps }: { steps: RailStep[] }) {
  return (
    <ol aria-label="진행 단계" className="flex flex-wrap list-none m-0 p-0 gap-1.5" style={{ marginBottom: 22 }}>
      {steps.map((s) => (
        <li key={s.num} aria-current={s.status === 'current' ? 'step' : undefined}
          className="inline-flex items-center gap-1"
          style={{
            /* 12px — 첨부 목업 .steps 와 같은 크기. 칩 4개 합계 396~400(2~4단계 실측) — 카드 폭이 이 값 + 좌우 여백 80 보다 작아지면 줄이 바뀐다. */
            font: '700 12px/18px var(--font-sans)', padding: '4px 10px', borderRadius: 20,
            ...(s.status === 'done' ? { background: 'var(--success-soft)', color: 'var(--success-text)' }
              : s.status === 'current' ? { background: 'var(--primary)', color: 'var(--primary-foreground)' }
                : { background: 'var(--muted)', color: 'var(--muted-foreground)' }),
          }}>
          <span className="sr-only">{s.num}단계 — {STATUS_LABEL[s.status]}: </span>
          {s.done ? <Icon name="check" size={13} stroke={2.6} /> : <span aria-hidden="true">{s.num}.</span>}
          {s.title}
        </li>
      ))}
    </ol>
  );
}

/** 로그인 1단 카드 — 브랜드 헤더(고정 브랜드 표면, 초대 온보딩과 같은 패턴) + 탭 + 단계 칩 + 본문.
    탭이 칩보다 위다(2026-11-13 사용자 지시) — 칩이 나타나도 탭 줄은 제자리에 있다.
    steps 가 null 이면 칩 줄을 그리지 않는다. 카드 한 벌을 유지하므로 칩이 나타나도 본문은 다시 마운트되지 않는다. */
function LoginCard({ tabs, steps, children }: { tabs: React.ReactNode; steps: RailStep[] | null; children: React.ReactNode }) {
  return (
    /* 폭 500 — 2026-11-13 사용자 지시: "인증창의 너비를 줄이자"(540→480) 뒤 "단계가 줄내림 안 되게"(→500).
       본문 420 = 500 − 좌우 여백 80 ≥ 칩 4개 합계 최대 400(완료 단계 실측). 여백(SIDE_PAD)·칩 크기를 바꾸면 이 폭도 다시 잰다. */
    <div className="w-full overflow-hidden flex flex-col"
      style={{ maxWidth: 500, background: 'var(--card)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-md)', animation: FADE_UP_CARD }}>
      {/* 고정 브랜드 표면 — 적응형 --primary 가 아니라 --brand-solid 라야 다크에서도 흰 글자 대비가 유지된다.
          시스템명은 <p> — 페이지의 h1 은 본문의 단계 제목 하나다. 한 문장이라 사이 공백을 남겨 이어 읽히게 한다. */}
      <header className="box-border" style={{ background: 'var(--brand-solid)', color: 'var(--on-brand-solid)', padding: `22px ${SIDE_PAD} 20px` }}>
        <Logo white />
        {/* 로고와의 간격 0·글자 크기는 사용자 지정값(2026-11-13: 19px/22px · 28px/30px). */}
        <p className="flex flex-wrap items-baseline gap-x-2" style={{ margin: 0 }}>
          {/* 85% — 19px 600 은 WCAG "큰 글자"(18.66px 700)가 아니라 4.5:1 이 필요하다. 78% 는 4.46:1(실측)로 모자랐다. */}
          <span style={{ font: '600 19px/22px var(--font-sans)', letterSpacing: '0.006em', color: 'color-mix(in srgb, var(--on-brand-solid) 85%, transparent)' }}>농림수산식품모태펀드</span>{' '}
          <span style={{ font: '700 28px/30px var(--font-sans)', letterSpacing: '-0.01em' }}>투자자산관리시스템</span>
        </p>
      </header>
      {/* minHeight 560 — AuthLayout 이 카드를 세로 가운데 정렬하므로 본문 높이가 탭마다 다르면 탭을 누를 때 탭 줄이 위아래로 움직인다.
          첫 화면에서 가장 긴 간편인증 탭(390px 폭 실측 545)을 덮는 값이라 세 탭의 카드 높이가 같다(옛 2단 카드 본문과 같은 값). */}
      <div className="flex-1 box-border flex flex-col" style={{ padding: `clamp(22px,4.5vw,28px) ${SIDE_PAD} clamp(24px,4.5vw,32px)`, minHeight: 560 }}>
        {/* 탭↔칩 세로 간격 24(2026-11-13 사용자 지시 "세로 간격 늘려", 16→24). */}
        <div style={{ marginBottom: steps ? 24 : 30 }}>{tabs}</div>
        {steps && <StepChips steps={steps} />}
        {children}
      </div>
    </div>
  );
}

export function LoginDemo({ onNav }: { onNav?: (route: string) => void }) {
  const [step, setStep] = useState(1);
  const dir = useStepDir(step);
  // 실제 시스템에서는 서버가 내려주는 값. 데모 토글을 걷어낸 뒤로는 항상 경과 상태라 3단계가 늘 표시된다.
  const [pwExpired] = useState(true);
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
  /* 비밀번호 재설정 — 모달이 아니라 로그인 카드 안 탭이다. 인증 수단은 간편인증(휴대폰 본인확인)
     하나만 두고 이름·생년월일·휴대폰번호로 본인을 확인한다. 실제 기관 조회·발송은 하지 않는다. */
  const [mode, setMode] = useState<'login' | 'reset' | 'simple'>('login');
  const [resetName, setResetName] = useState('');
  const [resetId, setResetId] = useState('');
  const [resetErr, setResetErr] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);
  /* 간편인증 — 인증서 선택·인증정보 입력·앱 인증은 NexBe Sign 통합인증창(외부 모듈)이 자기 화면에서
     처리한다(소개서 p.7 연동 구조, p.12 통합인증창). 앱이 그리는 것은 요청 화면과 결과 화면뿐이라
     앱은 요청에 필요한 정보(이름·생년월일·휴대폰번호)만 받아 넘긴다. saStep: 1 요청 · 2 외부창 대기 · 3 결과. */
  const [saStep, setSaStep] = useState(1);
  const [saName, setSaName] = useState('');
  const [saBirth, setSaBirth] = useState('');
  const [saPhone, setSaPhone] = useState('');
  const [saErr, setSaErr] = useState<string | null>(null);

  /* 단계 전환은 직접 만든 것이라 초점이 따라오지 않는다 — 새 단계의 첫 입력으로 옮긴다.
     최초 마운트는 건너뛴다(화면에 들어오기만 해도 초점을 빼앗지 않도록). */
  const firstField = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) firstField.current?.focus();
    mounted.current = true;
  }, [step, mode]);

  const [attempt, setAttempt] = useState(0);   // 제출 횟수 — 같은 오류로 재제출해도 필드 shake 가 다시 재생되게(Field shakeKey)
  const submit1 = (e: FormEvent) => {
    e.preventDefault();
    if (locked) return;
    const r = verifyCredentials(id, pw, fails);
    if (r.ok) { setStep(2); setCredErr(null); setOtpIn(''); pop('1차 인증이 완료되었습니다'); return; }
    setFails(r.fails); setLocked(r.locked);
    setCredErr(r.field && r.error ? { field: r.field, msg: r.error } : null);
    setAttempt((n) => n + 1);
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

  const submitReset = (e: FormEvent) => {
    e.preventDefault();
    const err = verifyReset(resetName, resetId);
    setResetErr(err);
    if (!err) { setResetDone(true); pop('재발급 안내 메일을 보냈습니다'); }
  };

  /** 통합인증창 호출. 실제 연동에서는 인증중계 툴킷(SDK)이 이 값들을 실어 창을 띄우고
      인증결과를 콜백으로 돌려준다. */
  const requestSimpleAuth = (e: FormEvent) => {
    e.preventDefault();
    const err = verifySimpleAuth(saName, saBirth, saPhone);
    setSaErr(err);
    if (!err) { setSaStep(2); pop('간편인증을 요청했습니다'); }
  };

  const resetSimpleAuth = () => { setSaStep(1); setSaErr(null); };

  /** 탭 전환 — 반대편 폼의 오류를 들고 가지 않는다. 로그인으로 돌아오면 재설정 결과도 접는다.
      탭은 2단계~(2차 인증·비밀번호 변경·완료)에도 보인다(2026-11-13 사용자 지시). 그때 [로그인] 탭은 진행 중인 흐름 그대로 두고,
      다른 탭으로 가면 로그인 흐름을 접고 1단계의 그 탭으로 간다. 2차 인증·비밀번호 변경 중이면 [뒤로]처럼 아이디는 남기되
      OTP·비밀번호 변경 입력은 지운다(다시 로그인했을 때 옛 비밀번호가 채워져 나오지 않게). 완료 뒤에는 [처음부터 다시]와 같다. */
  const switchMode = (m: 'login' | 'reset' | 'simple') => {
    if (step > 1) {
      if (m === 'login') return;
      if (step === 4) {
        setId(''); setPw(''); setFails(0); setLocked(false);
      }
      setStep(1); setOtpIn(''); setOtpErr(null); setCur(''); setP1(''); setP2(''); setPwErr(NO_PW_ERR);
    }
    setMode(m); setCredErr(null); setResetErr(null); setSaErr(null);
    if (m === 'login') { setResetDone(false); resetSimpleAuth(); }
  };

  const restart = () => {
    setStep(1); setId(''); setPw(''); setFails(0); setLocked(false); setCredErr(null);
    setOtpIn(''); setOtpErr(null); setCur(''); setP1(''); setP2(''); setPwErr(NO_PW_ERR);
    setMode('login'); setResetDone(false); setResetErr(null);
    setResetName(''); setResetId(''); setSaName(''); setSaBirth(''); setSaPhone(''); resetSimpleAuth();
  };

  return (
    <AuthLayout>
      <LoginCard
        /* 로그인 ↔ 간편인증 ↔ 비밀번호 재설정 — 모든 단계에서 보인다(2단계~ 동작은 switchMode). */
        tabs={
          <UI.SegTabs value={mode} onChange={switchMode}
            options={[
              { value: 'login', label: '로그인' },
              { value: 'simple', label: '간편인증' },
              { value: 'reset', label: '비밀번호 재설정' },
            ]} />
        }
        steps={!showLoginRail({ step, mode, saStep, resetDone }) ? null
          : mode === 'login'
            ? railSteps(LOGIN_RAIL(pwExpired, step), step)
            : mode === 'simple'
              ? railSteps(SIMPLE_AUTH_RAIL, saStep)
              : railSteps(RESET_RAIL, resetDone ? 2 : 1)}>

        {step === 1 && (
          <StepPage dir={dir}>
            {mode === 'login' ? (
              <>
                <h1 style={T.title3}>아이디·비밀번호</h1>
                <p style={{ ...T.body3, color: 'var(--muted-foreground)', margin: '6px 0 22px' }}>등록된 계정으로 로그인해 주세요.</p>
                {locked && (
                  <p role="alert" style={{
                    ...T.caption1, lineHeight: 1.6, marginBottom: 18, padding: '14px 18px', fontWeight: 600,
                    background: 'var(--danger-soft)', border: '1px solid color-mix(in srgb, var(--danger-text) 35%, transparent)',
                    borderRadius: 'var(--radius-lg)', color: 'var(--danger-text)',
                  }}>로그인 {LOCK_LIMIT}회 실패로 계정이 잠겼습니다.<br /><span style={{ fontWeight: 400 }}>시스템 관리자(정보화팀)의 잠금 해제가 필요합니다.</span></p>
                )}
                <form noValidate onSubmit={submit1} className="flex flex-col gap-4">
                  <Field required id="login-id" shakeKey={attempt} label="아이디" icon="user" placeholder="로그인 아이디" autoComplete="username"
                    value={id} onChange={setId} disabled={locked} inputRef={firstField}
                    error={credErr?.field === 'id' ? credErr.msg : null} />
                  <Field required id="login-pw" shakeKey={attempt} label="비밀번호" type="password" icon="lock" placeholder="비밀번호" autoComplete="current-password"
                    value={pw} onChange={setPw} disabled={locked}
                    error={credErr?.field === 'pw' ? credErr.msg : null} />
                  <div className="flex items-center gap-2" style={{ ...T.body3, minHeight: 24, marginTop: 2 }}>
                    <Checkbox id="login-remember" defaultChecked aria-label="아이디 저장" />
                    <label htmlFor="login-remember" style={{ cursor: 'pointer', userSelect: 'none' }}>아이디 저장</label>
                  </div>
                  <PrimaryBtn type="submit" full disabled={locked}>로그인</PrimaryBtn>
                </form>
              </>
            ) : (
              <>
                {mode === 'reset' ? (
                  resetDone ? (
                    <DonePanel
                      compact
                      title="재발급 안내 메일 발송"
                      desc="가입할 때 등록한 이메일로 비밀번호 재발급 안내를 보냈습니다."
                      rows={[
                        { k: '확인 정보', v: '성명·아이디', strong: true },
                        { k: '성명', v: resetName },
                        { k: '아이디', v: resetId },
                        { k: '받는 사람', v: '가입 시 등록한 이메일 주소' },
                        { k: '안내 링크', v: '발송 후 24시간 유효' },
                      ]}
                      actions={<PrimaryBtn onClick={() => switchMode('login')} style={{ minWidth: 180 }}>로그인 화면으로</PrimaryBtn>} />
                  ) : (
                    <>
                      <h1 style={T.title3}>이메일로 재발급</h1>
                      <p style={{ ...T.body3, color: 'var(--muted-foreground)', margin: '6px 0 22px' }}>
                        성명과 아이디를 입력하면 가입할 때 등록한 이메일로 재발급 안내를 보내 드립니다.
                      </p>
                      <form noValidate onSubmit={submitReset} className="flex flex-col gap-4">
                        <Field required id="reset-name" label="성명" icon="user" placeholder="성명" autoComplete="name"
                          value={resetName} onChange={setResetName} inputRef={firstField} />
                        <Field required id="reset-id" label="아이디" icon="user" placeholder="로그인 아이디" autoComplete="username"
                          value={resetId} onChange={setResetId} />
                        {resetErr && <FormError>{resetErr}</FormError>}
                        <PrimaryBtn type="submit" full>재발급 안내 메일 받기</PrimaryBtn>
                      </form>
                    </>
                  )
                ) : saStep === 1 ? (
                  <>
                    <h1 style={T.title3}>간편인증</h1>
                    <p style={{ ...T.body3, color: 'var(--muted-foreground)', margin: '6px 0 22px' }}>
                      입력한 정보로 통합인증창에 인증을 요청합니다. 인증서 선택과 앱 인증은 인증창에서 진행하며,
                      별도 프로그램·앱 설치는 필요하지 않습니다.
                    </p>
                    <form noValidate onSubmit={requestSimpleAuth} className="flex flex-col gap-4">
                      <Field required id="sa-name" label="이름" icon="user" placeholder="실명" autoComplete="name"
                        value={saName} onChange={setSaName} inputRef={firstField} />
                      <Field required id="sa-birth" label="생년월일" icon="calendar" placeholder="YYYYMMDD"
                        inputMode="numeric" maxLength={10} autoComplete="bday" value={saBirth} onChange={setSaBirth} />
                      <Field required id="sa-phone" label="휴대폰번호" icon="smartphone" placeholder="010-0000-0000"
                        inputMode="numeric" maxLength={13} autoComplete="tel" value={saPhone} onChange={setSaPhone} />
                      {saErr && <FormError>{saErr}</FormError>}
                      <PrimaryBtn type="submit" full>간편인증 시작</PrimaryBtn>
                    </form>
                  </>
                ) : saStep === 2 ? (
                  <>
                    <h1 style={T.title3}>통합인증창 인증</h1>
                    <p style={{ ...T.body3, color: 'var(--muted-foreground)', margin: '6px 0 20px' }}>
                      통합인증창에서 인증서를 고르고 인증앱 확인을 마치면 결과가 이 화면으로 전달됩니다.
                    </p>
                    <div style={{
                      background: 'var(--muted)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)', padding: '16px 18px', marginBottom: 20,
                    }}>
                      <p style={{ ...T.body3, margin: 0 }}>{saName} · {saPhone}</p>
                      <p style={{ ...T.caption1, marginTop: 6, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
                        인증 모듈 연동 전이라 화면 흐름만 이어집니다. 연동 후에는 인증창의 결과 콜백이 다음 단계를 대신합니다.
                      </p>
                    </div>
                    <div className="flex gap-2.5">
                      {/* 실제 연동에서는 이 전환을 사람이 누르지 않는다 — 인증중계 툴킷의 결과 콜백이 대신한다. */}
                      <PrimaryBtn full style={{ flex: 1 }}
                        onClick={() => { setSaStep(3); pop('인증 결과를 받았습니다'); }}>인증 결과 확인</PrimaryBtn>
                      <SecondaryBtn onClick={resetSimpleAuth} style={{ flex: '0 0 96px' }}>취소</SecondaryBtn>
                    </div>
                  </>
                ) : (
                  <DonePanel
                    compact
                    title="인증결과 확인"
                    desc="본인확인이 끝나면 임시 비밀번호가 발급됩니다."
                    rows={[
                      { k: '인증 방식', v: '간편인증(통합인증창)', strong: true },
                      { k: '이름', v: saName },
                      { k: '휴대폰', v: saPhone },
                      { k: '임시 비밀번호', v: '본인확인 후 발급 — 로그인 후 즉시 변경' },
                    ]}
                    actions={<PrimaryBtn onClick={() => switchMode('login')} style={{ minWidth: 180 }}>로그인 화면으로</PrimaryBtn>} />
                )}
              </>
            )}
          </StepPage>
        )}

        {step === 2 && (
          <StepPage dir={dir} className="flex flex-col flex-1">
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
              <Field required id="login-otp" label="인증 코드" icon="lock" placeholder="앱에 표시된 6자리" autoComplete="one-time-code"
                inputMode="numeric" maxLength={7} value={otpIn} onChange={setOtpIn} error={otpErr} inputRef={firstField}
                labelExtra={<InfoHint label="인증 코드 도움말">코드가 맞지 않으면 기기 시간 동기화를 확인해 주세요.</InfoHint>} />
              <div className="flex gap-2.5">
                <PrimaryBtn type="submit" full style={{ flex: 1 }}>인증 확인</PrimaryBtn>
                <SecondaryBtn onClick={() => { setStep(1); setOtpErr(null); }} style={{ flex: '0 0 96px' }}>뒤로</SecondaryBtn>
              </div>
            </form>
          </StepPage>
        )}

        {step === 3 && (
          <StepPage dir={dir}>
            <h1 style={T.title3}>비밀번호 변경</h1>
            <p style={{ ...T.body3, color: 'var(--muted-foreground)', margin: '6px 0 22px' }}>비밀번호 사용 90일이 경과했어요. 변경 후 이용할 수 있습니다.</p>
            <form noValidate onSubmit={submit3} className="flex flex-col gap-4">
              <Field required id="pw-cur" label="현재 비밀번호" type="password" icon="lock" placeholder="현재 비밀번호" autoComplete="current-password"
                value={cur} onChange={setCur} error={pwErr.cur} inputRef={firstField} />
              <Field required id="pw-new" label="새 비밀번호" type="password" icon="lock" placeholder="9자 이상, 영문·숫자·특수문자" autoComplete="new-password"
                value={p1} onChange={setP1} error={pwErr.next} help={PW_POLICY_HINT} />
              <Field required id="pw-confirm" label="새 비밀번호 확인" type="password" icon="lock" placeholder="새 비밀번호 다시 입력" autoComplete="new-password"
                value={p2} onChange={setP2} error={pwErr.confirm} />
              <PrimaryBtn type="submit" full>변경하고 계속</PrimaryBtn>
            </form>
          </StepPage>
        )}

        {step === 4 && (
          <DonePanel
            title="로그인 완료"
            desc="김담당 님, 안전하게 접속했습니다."
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
      </LoginCard>
      <Toast toast={toast} />

    </AuthLayout>
  );
}
