/* 게시판관리(ADM-013) — 데모 데이터·도메인 상수. 출처: 게시판관리.html 하단 스크립트 `TODAY`·`AUDS`·`DATA.post`·`CLK_NONE`.
   목업 리터럴(RAW)은 목업 필드 모양(xw·xz·xb·file 단일·disp 선택) 그대로 두고, `fromMock` 이 화면 행 모양으로 바꾼다:
   - 게시 종류: xw=팝업창 · xz=팝업존 · xb=배너 → `kinds` 배열(빈 배열 = 일반 게시글).
   - 표시 형태: 목업 등록창과 같은 규칙 — disp 가 없고 게시 종류가 있으면 '이미지'(첨부 `image_<id>.png`), 종류가 없으면 없음(null).
   - 첨부: 목업 `file`(1건) + 표시 이미지 → CSV 한 필드(`a.pdf, b.png` — DocumentsField 계약).
   - 목업 disp.text(배너 문구)는 화면 어디에서도 읽지 않아 옮기지 않는다.
   ⚠ 실제 게시판·팝업 송출이 아니다 — 화면 로컬 더미 상태의 초기값일 뿐이다. 샘플 이름은 예시(실명 아님). */

/** 상태 계산 기준일 — 목업 고정값 그대로(오늘 날짜가 아니다). 신규 글 등록일·게시 시작 기본값도 이 날짜. */
export const TODAY = '2026-10-28';

/** 게시대상(사용자 구분) — 목업 AUDS. '전체' 는 모든 구분에 보인다. */
export const AUDIENCES = ['전체', '농금원', '수탁기관', '농식품부·해수부'] as const;
export type Audience = typeof AUDIENCES[number];

/** 게시 종류 — 목업 xw·xz·xb. 아무것도 없으면 '일반'. */
export const POST_KINDS = ['팝업창', '팝업존', '배너'] as const;
export type PostKind = typeof POST_KINDS[number];
export const GENERAL_KIND = '일반';
export const KIND_FILTERS = [GENERAL_KIND, ...POST_KINDS] as const;

export type DispType = 'text' | 'img';   // 게시글 내용 · 이미지
export type LinkKind = 'none' | 'url' | 'file';
export type LinkTarget = 'new' | 'self';
export interface ClickSpec { readonly link: LinkKind; readonly url: string; readonly file: string; readonly target: LinkTarget }
export interface Display { readonly type: DispType; readonly img?: string }
export interface Published { readonly at: string; readonly by: string }

export interface PostRow {
  id: string;
  pub: Published | null;      // 게시 확정(null = 미게시)
  reg: string;                // 등록일 'YYYY-MM-DD'
  aud: Audience[];            // 게시대상(복수)
  title: string;
  from: string;               // 게시 시작일
  to: string;                 // 게시 종료일
  file: string;               // 첨부 CSV
  writer: string;             // 작성자
  body: string;               // 본문 — 목업 HTML 또는 에디터 Slate JSON 문자열
  kinds: PostKind[];          // 게시 종류(빈 배열 = 일반)
  disp: Display | null;       // 표시 형태(게시 종류가 있을 때만)
  click: ClickSpec;           // 클릭 시 이동
}

export const CLK_NONE: ClickSpec = Object.freeze({ link: 'none', url: '', file: '', target: 'new' });

/** 로그인 사용자(작성자 자동 입력·게시 처리자) — 사용자관리 데모의 시드 관리자 계정(user_manage_model.demoUsers U2 'nh.admin').
    목업은 '홍길동'이지만 같은 관리자 대분류의 감사로그·사용자관리가 이 계정을 관리자로 쓴다. */
export const LOGIN_WRITER = '전산관리';

/* ── 목업 DATA.post 12건(필드 모양 그대로) ── */
interface MockPost {
  id: string; pub: Published | null; reg: string; aud: Audience[]; title: string; from: string; to: string;
  file: string; writer: string; body: string;
  xw?: object | null; xz?: object | null; xb?: object | null;
  disp?: { type: DispType; img?: string };
  click: ClickSpec;
}
const PUB_0901: Published = { at: '2026-09-01 09:00', by: '홍길동' };
const RAW: readonly MockPost[] = [
  { id: 'p8', pub: null, reg: '2026-10-27', aud: ['전체'], title: '[안내] 연말 출자금 납입 일정 안내', from: '2026-11-10', to: '2026-12-15', file: '연말_출자금_납입일정.pdf', writer: '홍길동', body: '<p>연말 출자금 납입 일정을 안내드립니다.</p><p>첨부된 일정표를 확인해 주시기 바랍니다.</p>', xw: {}, xz: null, click: { link: 'file', url: '', file: '연말_출자금_납입일정.pdf', target: 'new' } },
  { id: 'p1', pub: { at: '2026-10-27 09:12', by: '홍길동' }, reg: '2026-10-27', aud: ['전체'], title: '[안내] 농식품모태펀드 자펀드 손상차손 처리기준 개정 반영', from: '2026-10-27', to: '2026-11-30', file: '자펀드_손상차손_처리기준_개정.pdf', writer: '홍길동', body: '<p>2026.2.26. 개정된 「농식품모태펀드 자펀드 손상차손 처리기준」이 시스템에 반영되었습니다.</p><p>자펀드보고양식관리 메뉴에서 개정본을 내려받으실 수 있습니다.</p>', xw: null, xz: {}, click: { link: 'file', url: '', file: '자펀드_손상차손_처리기준_개정.pdf', target: 'new' } },
  { id: 'p2', pub: { at: '2026-10-24 10:05', by: '홍길동' }, reg: '2026-10-24', aud: ['전체'], title: '[점검] 시스템 정기점검에 따른 서비스 일시 중단 안내 (11/1 토 22:00~24:00)', from: '2026-10-24', to: '2026-11-01', file: '', writer: '김철수', body: '<p>정기점검으로 <b>11월 1일(토) 22:00~24:00</b> 서비스 이용이 일시 중단됩니다.</p><p>이용에 불편을 드려 죄송합니다.</p>', disp: { type: 'text' }, xw: {}, xz: null, click: CLK_NONE },
  { id: 'p3', pub: { at: '2026-10-20 16:40', by: '홍길동' }, reg: '2026-10-20', aud: ['전체'], title: '[공지] 2026년 하반기 반기 영업보고서 제출 기한 안내', from: '2026-11-03', to: '2026-12-31', file: '농식품투자조합_반기_영업보고서.hwp', writer: '이영희', body: '<p>2026년 하반기 반기 영업보고서 제출 기한을 안내드립니다.</p><p>첨부된 2024.03 Ver. 양식을 사용해 주시기 바랍니다.</p>', xw: null, xz: null, click: CLK_NONE },
  { id: 'p4', pub: { at: '2026-10-13 11:20', by: '홍길동' }, reg: '2026-10-13', aud: ['수탁기관'], title: '[안내] 운용사ERP 자펀드 보고양식 14종 일괄 정비', from: '2026-10-13', to: '2026-11-13', file: '', writer: '홍길동', body: '<p>운용사ERP에서 사용하는 자펀드 보고양식 14종을 최신본으로 정비했습니다.</p>', xw: null, xz: {}, click: CLK_NONE },
  { id: 'p5', pub: { at: '2026-09-30 14:00', by: '홍길동' }, reg: '2026-09-30', aud: ['농금원'], title: '[공지] 리스크관리역 조기경보 모니터링 화면 개편 안내', from: '2026-09-30', to: '2026-10-15', file: '', writer: '박민수', body: '<p>조기경보 모니터링 화면이 개편되었습니다.</p>', xw: null, xz: null, click: CLK_NONE },
  { id: 'p6', pub: { at: '2026-02-02 09:00', by: '홍길동' }, reg: '2026-02-02', aud: ['전체'], title: '[공지] 2026년 정기 출자사업(농식품투자 계정) 계획 공고', from: '2026-02-02', to: '2026-03-06', file: '26년_정기_출자사업_농식품투자계정_계획공고.pdf', writer: '홍길동', body: '<p>2026년 정기 출자사업(농식품투자 계정) 계획을 공고합니다.</p><p>상세 내용은 첨부 공고문을 참고하시기 바랍니다.</p>', xw: null, xz: null, click: CLK_NONE },
  { id: 'p7', pub: { at: '2026-01-22 10:30', by: '홍길동' }, reg: '2026-01-22', aud: ['전체'], title: '[안내] 농식품모태펀드 출자 자펀드 사후관리 가이드라인 개정 (26.01.22.)', from: '2026-01-22', to: '2026-02-28', file: '자펀드사후관리가이드라인.pdf', writer: '이영희', body: '<p>자펀드 사후관리 가이드라인이 개정되었습니다.</p>', xw: null, xz: null, click: CLK_NONE },
  { id: 'p9', pub: PUB_0901, reg: '2026-09-01', aud: ['전체'], title: '농림축산식품부 바로가기', from: '2026-01-01', to: '2026-12-31', file: '', writer: '김철수', body: '', xw: null, xz: null, disp: { type: 'text' }, xb: {}, click: { link: 'url', url: 'https://www.mafra.go.kr', file: '', target: 'new' } },
  { id: 'p10', pub: PUB_0901, reg: '2026-09-01', aud: ['전체'], title: '해양수산부 바로가기', from: '2026-01-01', to: '2026-12-31', file: '', writer: '김철수', body: '', xw: null, xz: null, disp: { type: 'text' }, xb: {}, click: { link: 'url', url: 'https://www.mof.go.kr', file: '', target: 'new' } },
  { id: 'p11', pub: PUB_0901, reg: '2026-09-01', aud: ['전체'], title: '농업정책보험금융원 바로가기', from: '2026-01-01', to: '2026-12-31', file: '', writer: '김철수', body: '', xw: null, xz: null, disp: { type: 'text' }, xb: {}, click: { link: 'url', url: 'https://www.apfs.kr', file: '', target: 'new' } },
  { id: 'p12', pub: { at: '2025-03-02 09:00', by: '홍길동' }, reg: '2025-03-02', aud: ['전체'], title: '2025 농식품 투자 박람회 안내', from: '2025-03-02', to: '2025-04-30', file: '', writer: '이영희', body: '<p>2025 농식품 투자 박람회 일정을 안내드립니다.</p>', xw: null, xz: null, xb: {}, click: CLK_NONE },
];

/** 목업 행 → 화면 행. 표시 형태 기본값은 목업 openPostForm(`dp`·`dpImg`)과 같은 규칙. */
function fromMock(m: MockPost): PostRow {
  const kinds: PostKind[] = [m.xw ? '팝업창' : null, m.xz ? '팝업존' : null, m.xb ? '배너' : null].filter((k): k is PostKind => k !== null);
  const disp: Display | null = !kinds.length ? null
    : m.disp?.type === 'text' ? { type: 'text' }
    : { type: 'img', img: m.disp?.img || `image_${m.id}.png` };
  const file = [m.file, disp?.type === 'img' ? disp.img : ''].filter(Boolean).join(', ');
  return { id: m.id, pub: m.pub, reg: m.reg, aud: [...m.aud], title: m.title, from: m.from, to: m.to, file, writer: m.writer, body: m.body, kinds, disp, click: { ...m.click } };
}

/** 데모 게시글 12건 — 호출마다 새 배열(페이지 로컬 state 초기값). */
export function demoPosts(): PostRow[] {
  return RAW.map(fromMock);
}
