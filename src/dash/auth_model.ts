/* 인증 화면(로그인·발급 온보딩·초대 온보딩) 3종의 순수 판정 로직.
   정본은 claude.ai/design 캔버스 `APFS 로그인 프로토타입.dc.html` — 단계 수·검증 규칙·안내 문구를 그대로 옮겼다.
   화면(.tsx)은 이 모듈이 돌려준 값을 그리기만 하고, 자체 판정을 하지 않는다.

   ⚠ 백엔드 없는 UI 프로토타입이다. 실제 인증·TOTP 검증·계정 잠금·메일 발송은 수행하지 않으며,
   아래 DEMO_* 상수는 시연용 가짜 값이다(실 계정 자격증명이 아니다). */

/* 비밀번호 정책 — 9자 이상, 영문·숫자·특수문자 각 1자 이상(캔버스 Component.PWRE 동일) */
export const PW_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{9,}$/;
export const PW_POLICY_HINT = '9자 이상 · 90일 주기 · 최근 사용 비밀번호 재사용 불가';

export const LOCK_LIMIT = 5;
export const OTP_PERIOD = 30;          // 초. 표준 TOTP(RFC 6238) 회전 주기

/* 시연용 가짜 계정 — 실제 자격증명 아님.

   ⚠ 의도적 편차(2026-09-16 사용자 결정): `dev/active/admin-pages-complete/BRIEF.md` 는 S0_001 에서
   raw mock credential·TOTP seed/code·실명/개인정보를 화면·커밋에 노출하지 말 것을 요구한다.
   이 화면들의 정본은 claude.ai/design 캔버스 `APFS 로그인 프로토타입.dc.html` 이고 캔버스가 이 값들을
   화면에 그대로 띄우는 구성이라, "원본 디자인을 그대로 쓴다"는 결정에 따라 캔버스를 따랐다.
   Codex 리뷰가 P1 로 지적했으나 위 결정으로 미반영한다 — 재론 전에 이 주석을 먼저 볼 것.
   (대안은 시연 시나리오 선택으로 결과를 정하고 값은 플레이스홀더로 두는 구 로컬 구현 방식이었다.)
   실 배포 전 전제: 이 값들은 전부 가공이며 실제 계정·시드·개인정보가 아니다. */
export const DEMO_ID = 'kim.admin';
export const DEMO_PW = 'Apfs!2026';
export const DEMO_REAL_NAME = '박심사';

export const MSG = {
  pwWeak: '9자 이상, 영문·숫자·특수문자를 모두 포함해야 합니다.',
  pwMismatch: '비밀번호가 일치하지 않습니다.',
  pwNewMismatch: '새 비밀번호가 일치하지 않습니다.',
  pwReuse: '최근 사용한 비밀번호는 다시 사용할 수 없습니다.',
  curRequired: '현재 비밀번호를 입력해 주세요.',
  curMismatch: '현재 비밀번호가 올바르지 않습니다.',
  otpMismatch: '인증 코드가 일치하지 않습니다. 최신 코드를 확인해 주세요.',
  regOtpMismatch: '확인 코드가 일치하지 않습니다. 최신 코드를 확인해 주세요.',
  idRequired: '아이디를 입력해 주세요.',
  pwRequired: '비밀번호를 입력해 주세요.',
  locked: '계정이 잠겼습니다. 관리자에게 문의해 주세요.',
  nameMismatch: '초대 대상과 실명이 일치하지 않습니다.',
} as const;

/* ---------- 단계 레일 ---------- */

export type StepStatus = 'done' | 'current' | 'todo';
export type RailDef = { title: string; capTodo: string; capDone: string; forceDone?: boolean };
export type RailStep = {
  num: string; title: string; cap: string;
  status: StepStatus; done: boolean; notLast: boolean;
};

/** 단계 정의 + 현재 단계 → 레일 표시 상태. forceDone은 "건너뛴 단계"를 완료로 표시한다. */
export function railSteps(defs: readonly RailDef[], step: number): RailStep[] {
  return defs.map((d, i) => {
    const n = i + 1;
    const status: StepStatus = d.forceDone || n < step ? 'done' : n === step ? 'current' : 'todo';
    const done = status === 'done';
    return {
      num: String(n), title: d.title, cap: done ? d.capDone : d.capTodo,
      status, done, notLast: i < defs.length - 1,
    };
  });
}

export const LOGIN_RAIL = (pwExpired: boolean, step: number): readonly RailDef[] => [
  { title: '아이디·비밀번호', capTodo: '계정 인증', capDone: '인증 완료 — 김담당 님' },
  { title: '2차 인증(OTP)', capTodo: '인증앱의 6자리 코드 입력', capDone: 'TOTP 인증 완료' },
  {
    title: '비밀번호 변경',
    capTodo: '90일 경과 시에만 진행',
    capDone: pwExpired ? '변경 완료' : '90일 미경과 — 건너뜀',
    forceDone: !pwExpired && step === 4,
  },
  { title: '완료', capTodo: '', capDone: '접속 완료' },
];

export const ISSUE_RAIL: readonly RailDef[] = [
  { title: '온보딩 링크 확인', capTodo: '메일의 [계정 활성화] 링크 접속', capDone: '계정 정보 확인 완료' },
  { title: '비밀번호·OTP 등록', capTodo: '비밀번호 설정 + 인증앱 등록', capDone: '등록 완료' },
  { title: '활성 완료', capTodo: '', capDone: '계정 활성' },
];

export const INVITE_LABELS = ['초대 확인', '간편인증(실명매칭)', '비밀번호·OTP 등록', '완료'] as const;

/* ---------- 판정 ---------- */

/** 화면은 코드를 `123 456`으로 띄어 보여준다 — 그대로 복사해 붙여넣어도 통과하도록 모든 공백을 지운다. */
const normalizeCode = (s: string) => s.replace(/\s+/g, '');

export type CredentialResult = {
  ok: boolean;
  fails: number;
  locked: boolean;
  error: string | null;
  /** 오류를 붙일 입력. 빈 값은 그 필드를, 자격증명 불일치는 비밀번호를 지목한다. */
  field: 'id' | 'pw' | null;
};

/** 1차 인증. 실패 누적이 lockLimit에 닿으면 잠금(프로토타입 — 실제 계정 잠금은 하지 않는다). */
export function verifyCredentials(
  id: string, pw: string, fails: number, lockLimit: number = LOCK_LIMIT,
): CredentialResult {
  // 빈 제출은 인증 시도가 아니다 — 여기서 세면 빈 칸으로 엔터만 쳐도 계정이 잠긴다.
  if (!id.trim()) return { ok: false, fails, locked: false, error: MSG.idRequired, field: 'id' };
  if (!pw) return { ok: false, fails, locked: false, error: MSG.pwRequired, field: 'pw' };

  if (id.trim() === DEMO_ID && pw === DEMO_PW) {
    return { ok: true, fails, locked: false, error: null, field: null };
  }
  const next = fails + 1;
  const locked = next >= lockLimit;
  return {
    ok: false, fails: next, locked, field: 'pw',
    error: locked ? MSG.locked : `아이디 또는 비밀번호가 올바르지 않습니다. (${next}/${lockLimit})`,
  };
}

/** 2차 인증 — 화면에 표시 중인 데모 코드와 대조한다(실 TOTP 검증 아님).
    `prevCode`는 입력 도중 코드가 회전한 경우를 받아 준다 — 화면이 약속한 허용창 ±1 을 실제로 지키기 위함.
    없으면(최초 창) 현재 코드만 받는다. */
export function verifyOtp(input: string, code: string, prevCode?: string): string | null {
  return acceptsCode(input, code, prevCode) ? null : MSG.otpMismatch;
}

const acceptsCode = (input: string, code: string, prevCode?: string) => {
  const v = normalizeCode(input);
  return v === normalizeCode(code) || (Boolean(prevCode) && v === normalizeCode(prevCode!));
};

export type PwChangeErrors = { cur: string | null; next: string | null; confirm: string | null };

/** 만료 비밀번호 변경 — 현재/신규/확인 3필드를 한 번에 판정한다.
    현재 비밀번호는 미입력과 불일치를 구분해 알린다(둘을 합치면 어느 쪽인지 고칠 수 없다). */
export function verifyPwChange(cur: string, next: string, confirm: string, prevPw: string): PwChangeErrors {
  const nextErr = PW_RE.test(next) ? (next === prevPw ? MSG.pwReuse : null) : MSG.pwWeak;
  return {
    cur: !cur ? MSG.curRequired : cur !== prevPw ? MSG.curMismatch : null,
    next: nextErr,
    confirm: next === confirm ? null : MSG.pwNewMismatch,
  };
}

export type RegisterErrors = { pw: string | null; confirm: string | null; otp: string | null };

/** 온보딩 공통 — 새 비밀번호 + 인증앱 등록 확인 코드를 한 번에 판정한다(발급·초대 두 흐름이 공유). */
export function verifyRegister(
  pw: string, confirm: string, otpInput: string, code: string, prevCode?: string,
): RegisterErrors {
  return {
    pw: PW_RE.test(pw) ? null : MSG.pwWeak,
    confirm: pw === confirm ? null : MSG.pwMismatch,
    otp: acceptsCode(otpInput, code, prevCode) ? null : MSG.regOtpMismatch,
  };
}

/** 초대 온보딩 간편인증 — 간편인증 실명(CI)이 초대 대상과 일치해야 한다. */
export function verifyRealName(input: string): string | null {
  return input.trim() === DEMO_REAL_NAME ? null : MSG.nameMismatch;
}

/** 비밀번호 재설정 안내 — 본인 확인 입력의 형식만 본다. 실제 계정 조회는 하지 않는다.
    통과하면 null, 아니면 안내 메시지. */
export function verifyReset(name: string, id: string): string | null {
  if (!name.trim()) return '성명을 입력해 주세요.';
  if (!id.trim()) return '아이디를 입력해 주세요.';
  return null;
}

/** 오류 맵에 하나라도 메시지가 있으면 true. */
export function hasError(errors: Record<string, string | null>): boolean {
  return Object.values(errors).some(Boolean);
}
