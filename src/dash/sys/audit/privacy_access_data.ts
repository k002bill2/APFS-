/* 개인정보 접속관리(ADM-010) — 데모 데이터(UI 없음). 출처: 개인정보 접속관리.html 하단 스크립트 `MENUS`·`USERS`·샘플 생성 루프.
   목업은 리터럴 행이 아니라 **결정적 생성기**(LCG seed 7)로 140건을 만든다 → 생성기를 그대로 옮긴다.
   - `rnd()` 호출 순서가 곧 데이터다(조건부 호출도 seed 를 소비한다). 순서를 바꾸지 않는다:
     행위자 → 메뉴 → 행위 → 시간(시) → 시간(분) → (근무시간 밖이면) 시 재지정 → (i%29===11 이면) 외부 IP → 초.
   - 목업은 로컬 시각(`new Date(2026,9,28,17,30)`·getHours)으로 계산한다. 여기서는 **UTC 산술**로 같은 벽시계 값을 만든다
     — KST 는 일광절약이 없어 결과가 같고, 테스트가 실행 환경 시간대에 흔들리지 않는다.
   - 사용자 초대(ADM-002)는 목업이 표본에서 뺀 메뉴(noSample)라 140건에 없다 → 메뉴 select 로 고르면 늘 0건이라 '필터가 안 된다'로 보였다
     (2026-11-02 실측). 140건 생성기는 건드리지 않고 **seed 가 다른 두 번째 스트림**으로 12건을 덧붙인다(목업과 다른 점 — 데모 데이터만).
   ⚠ 실제 접속 로그 수집이 아니다 — 데모 행을 화면 로컬로 조회만 한다. 아이디는 목업 표본 그대로(실명 아님). */

export const ACTS = ['조회', '등록', '수정', '삭제', '다운로드'] as const;
export type Act = typeof ACTS[number];

export interface PrivacyMenu {
  id: string;              // PM05 기능개발ID(목업 MENUS.id) — 화면에 나오지 않는다(칩 키)
  label: string;           // 메뉴명 = 현 앱 메뉴 라벨(앱 메뉴에 없는 팝업은 목업 표기)
  acts: readonly Act[];    // 표본 생성 분포(목업 그대로 — 중복 = 가중치)
  noSample?: boolean;      // 목업 140건 생성기에서 제외(목업 사용자 초대) — 표본은 inviteRows() 가 따로 만든다
}

/* 기록 대상(확정) 7메뉴 — 목업 메모 "기록 대상 (확정)" = 스크립트 MENUS 와 같은 7개.
   라벨 차이: '사용자 초대(운용사)' → 현 앱 메뉴 '사용자 초대'(data.ts). '운용인력명세서'(POP-005)는 공통 팝업이라 앱 메뉴 리프가 없어 목업 표기 유지. */
export const PRIVACY_MENUS: readonly PrivacyMenu[] = Object.freeze([
  { id: 'ADM-001', label: '사용자관리', acts: ['조회', '조회', '등록', '수정', '삭제', '다운로드'] },
  { id: 'ADM-002', label: '사용자 초대', acts: ['조회', '조회', '등록'], noSample: true },   // acts 는 덧붙임 표본용(목업은 []) — 초대 목록 조회·초대 발송
  { id: 'ADM-003', label: '사용자권한관리', acts: ['조회', '수정'] },
  { id: 'IAM-026', label: '운용사 명세서', acts: ['조회', '조회', '수정', '다운로드'] },
  { id: 'POP-005', label: '운용인력명세서', acts: ['조회', '조회', '다운로드'] },
  { id: 'EWS-007', label: '운용인력 변동관리', acts: ['조회', '등록', '수정', '삭제'] },
  { id: 'MIN-002', label: '등록원부관리', acts: ['조회', '등록', '수정', '다운로드'] },
]);

const USERS: readonly { id: string; ip: string }[] = [
  { id: 'kimjh@apfs.kr', ip: '10.0.1.15' }, { id: 'leesy@apfs.kr', ip: '10.0.1.42' }, { id: 'parkmk@apfs.kr', ip: '10.0.2.8' },
  { id: 'choiha@apfs.kr', ip: '10.0.1.77' }, { id: 'admin@apfs.kr', ip: '10.0.1.20' }, { id: 'gp.manager@greenvc.co.kr', ip: '211.45.17.120' },
];

export interface AccessRow {
  id: string;
  ts: string;        // 일시 'YYYY-MM-DD HH:mm:ss'
  actor: string;     // 행위자(로그인 아이디)
  menuId: string;    // PrivacyMenu.id
  menu: string;      // 메뉴명(PrivacyMenu.label)
  act: Act;          // 행위
  ip: string;
}

/* 목업 기준 시각 BASE = 2026-10-28 17:30:00 · 기본 조회기간 = 기준일 한 달 전 ~ 기준일(목업 defCond) */
export const BASE_DATE = '2026-10-28';
export const DEFAULT_PERIOD: Readonly<{ from: string; to: string }> = Object.freeze({ from: '2026-09-28', to: BASE_DATE });

const SAMPLE_COUNT = 140;
const INVITE_COUNT = 12;
const INVITE_SEED = 23;
const HOUR = 3600 * 1000;
const MINUTE = 60 * 1000;
const BASE_MS = Date.UTC(2026, 9, 28, 17, 30, 0);

/** 목업 rnd — seed=(seed*9301+49297)%233280, floor(seed/233280*n) */
function makeRnd(seed: number): (n: number) => number {
  let s = seed;
  return (n) => { s = (s * 9301 + 49297) % 233280; return Math.floor((s / 233280) * n); };
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymdOf = (d: Date) => `${String(d.getUTCFullYear())}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** 근무시간(08~18시) 안의 벽시계 → 'YYYY-MM-DD HH:mm:ss'. 근무시간 밖이면 같은 날 08~18시로(목업 setHours) */
function workAt(at: number, rnd: (n: number) => number): number {
  const h = new Date(at).getUTCHours();
  return h < 8 || h > 19 ? at + (8 + rnd(11) - h) * HOUR : at;
}

/** 사용자 초대 표본 12건 — 내부 사용자(@apfs.kr)만, 140건과 같은 시간창(기준시각에서 140×14시간 안). 목업 스트림과 seed 를 나눠 140건을 바꾸지 않는다 */
function inviteRows(): { at: number; row: AccessRow }[] {
  const rnd = makeRnd(INVITE_SEED);
  const menu = PRIVACY_MENUS.find((m) => m.id === 'ADM-002')!;
  const staff = USERS.filter((u) => u.id.endsWith('@apfs.kr'));
  return Array.from({ length: INVITE_COUNT }, (_, i) => {
    const u = staff[rnd(staff.length)];
    const act = menu.acts[rnd(menu.acts.length)];
    const at = workAt(BASE_MS - rnd(SAMPLE_COUNT * 14) * HOUR - rnd(60) * MINUTE, rnd);
    const d = new Date(at);
    const ts = `${ymdOf(d)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(rnd(60))}`;
    return { at, row: { id: `pa-inv-${String(i + 1)}`, ts, actor: u.id, menuId: menu.id, menu: menu.label, act, ip: u.ip } };
  });
}

/** 접근기록 데모 152건(목업 140 + 사용자 초대 12) — 일시 최신순(목업 ALL.sort). 호출마다 새 배열 */
export function demoAccessRows(): AccessRow[] {
  const rnd = makeRnd(7);
  const menus = PRIVACY_MENUS.filter((m) => !m.noSample);
  const gen: { at: number; row: AccessRow }[] = [];
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const u = USERS[rnd(USERS.length)];
    const m = menus[rnd(menus.length)];
    const act = m.acts[rnd(m.acts.length)];
    const at = workAt(BASE_MS - (i * 14 + rnd(14)) * HOUR - rnd(60) * MINUTE, rnd);   // rnd 순서: 시 → 분 → (근무시간 밖이면) 시 재지정
    const ip = i % 29 === 11 ? `175.223.14.${String(6 + rnd(200))}` : u.ip;   // 외부 IP 접속 표본
    const d = new Date(at);
    const ts = `${ymdOf(d)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(rnd(60))}`;
    gen.push({ at, row: { id: `pa-${String(i + 1)}`, ts, actor: u.id, menuId: m.id, menu: m.label, act, ip } });
  }
  return [...gen, ...inviteRows()].sort((x, y) => y.at - x.at).map((g) => g.row);   // 안정 정렬 — 같은 분이면 생성 순서(목업과 같다)
}
