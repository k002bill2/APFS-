/* 로그인 데모 — 순수 모델(UI 없음). 출처: S0_001_로그인.html 단계 흐름(아이디·비밀번호 → 2차 인증(OTP) → (비밀번호 변경) → 완료).
   ⚠ 실제 인증이 아니다. 목업의 데모 계정·비밀번호·TOTP 시드/코드 생성은 이식하지 않는다(브리프) — 결과는 화면의
   **시연 시나리오 선택**으로 정하며, 입력값은 형식(빈 값·6자리) 검증만 한다. 계정 잠금·비밀번호 정책은 안내 문구일 뿐 강제하지 않는다. */

export type LoginStep = 'credentials' | 'otp' | 'pwchange' | 'done';
export const SCENARIOS = ['ok', 'wrong', 'locked', 'expired'] as const;
export type Scenario = typeof SCENARIOS[number];
export const SCENARIO_LABELS: Readonly<Record<Scenario, string>> = Object.freeze({ ok: '정상 로그인', wrong: '비밀번호 불일치', locked: '계정 잠금', expired: '비밀번호 만료' });
export const MAX_FAIL = 5;   // 목업 안내 문구(5회 실패 시 잠금) — 표시용, 강제 아님
export const PW_POLICY = '9자 이상 · 영문·숫자·특수문자 조합 · 최근 비밀번호 재사용 금지 · 90일 주기 변경';

export interface DemoSession { name: string; roles: string[]; belong: string; last: string }
/* 시연 계정 표시값(실명 아님) — 성공 화면의 요약 카드에만 쓴다 */
export const DEMO_SESSION: DemoSession = Object.freeze({ name: '전산관리', roles: ['전산(관리자)'], belong: '농금원 · 전산', last: '2026-09-13 09:02' });

export interface LoginState { step: LoginStep; scenario: Scenario; fails: number }
export const initialLogin = (scenario: Scenario = 'ok'): LoginState => ({ step: 'credentials', scenario, fails: 0 });

export interface Verdict { ok: boolean; field?: 'id' | 'pw' | 'otp' | 'cur' | 'n1' | 'n2'; msg?: string; tone?: 'danger' | 'warning' }

/** 1단계 검증 — 빈 값(위→아래) → 시나리오 결과 */
export function verifyCredentials(s: LoginState, id: string, pw: string): { verdict: Verdict; next: LoginState } {
  if (!id.trim()) return { verdict: { ok: false, field: 'id', msg: '아이디를 입력해 주세요.' }, next: s };
  if (!pw) return { verdict: { ok: false, field: 'pw', msg: '비밀번호를 입력해 주세요.' }, next: s };
  if (s.scenario === 'locked') return { verdict: { ok: false, msg: '계정 잠금 상태입니다 — 관리자에게 해제를 요청해 주세요. (목업)' }, next: s };
  if (s.scenario === 'wrong') {
    const fails = Math.min(MAX_FAIL, s.fails + 1);
    const msg = fails >= MAX_FAIL ? `비밀번호 ${MAX_FAIL}회 오류 — 계정이 잠깁니다. 관리자 해제가 필요합니다. (목업)` : `비밀번호가 일치하지 않습니다 (${fails}/${MAX_FAIL}) · ${MAX_FAIL - fails}회 남음 (목업)`;
    return { verdict: { ok: false, msg }, next: { ...s, fails } };
  }
  return { verdict: { ok: true }, next: { ...s, step: 'otp', fails: 0 } };
}

/** 2단계 — 인증 코드 형식(6자리 숫자)만 검사. 목업: 형식이 맞으면 통과 */
export function verifyOtp(s: LoginState, code: string): { verdict: Verdict; next: LoginState } {
  const c = code.trim();
  if (!c) return { verdict: { ok: false, field: 'otp', msg: '인증 코드를 입력해 주세요.' }, next: s };
  if (!/^\d{6}$/.test(c)) return { verdict: { ok: false, field: 'otp', msg: '6자리 숫자를 입력해 주세요. (목업: 형식만 확인)' }, next: s };
  return { verdict: { ok: true }, next: { ...s, step: s.scenario === 'expired' ? 'pwchange' : 'done' } };
}

/** 3단계(만료 시나리오) — 현재/새/확인 입력 유무와 일치만 검사(정책은 안내, 강제 아님) */
export function verifyPwChange(s: LoginState, cur: string, n1: string, n2: string): { verdict: Verdict; next: LoginState } {
  if (!cur) return { verdict: { ok: false, field: 'cur', msg: '현재 비밀번호를 입력해 주세요.' }, next: s };
  if (!n1) return { verdict: { ok: false, field: 'n1', msg: '새 비밀번호를 입력해 주세요.' }, next: s };
  if (n1 !== n2) return { verdict: { ok: false, field: 'n2', msg: '새 비밀번호 확인이 일치하지 않습니다.' }, next: s };
  return { verdict: { ok: true }, next: { ...s, step: 'done' } };
}

/** 비밀번호 재설정(간편인증) 모달 — 성명·아이디 입력 검증 */
export function verifyReset(name: string, id: string): Verdict {
  if (!name.trim()) return { ok: false, field: 'id', msg: '성명을 입력해 주세요.' };
  if (!id.trim()) return { ok: false, field: 'id', msg: '아이디를 입력해 주세요.' };
  return { ok: true };
}

/** 단계 표시(목업 steps) — 만료 시나리오는 4단계, 그 외 3단계 */
export function stepLabels(scenario: Scenario): { key: LoginStep; label: string }[] {
  const base: { key: LoginStep; label: string }[] = [{ key: 'credentials', label: '1. 아이디·비밀번호' }, { key: 'otp', label: '2. 2차 인증(OTP)' }];
  return scenario === 'expired'
    ? [...base, { key: 'pwchange', label: '3. 비밀번호 변경' }, { key: 'done', label: '4. 완료' }]
    : [...base, { key: 'done', label: '3. 완료' }];
}
export const stepIndex = (scenario: Scenario, step: LoginStep): number => stepLabels(scenario).findIndex((s) => s.key === step);
