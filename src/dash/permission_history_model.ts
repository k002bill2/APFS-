/* 권한 변경이력 — 순수 모델(UI 없음). 출처: S0_107_권한변경이력.html `POOL`·`DATA`·`applyFilter`·`updateSummary`·`monthRange`.
   조회 전용 — 사용자관리·권한관리에서 발생한 변경을 자동 수집한 것으로 가정한 데모(실명 아님). 보관 3년(목업 문구).
   ⚠ 실제 감사 데이터가 아니며 보안 사건·정책을 단정하지 않는다(브리프). */

export const CHANGE_TYPES = ['권한 부여', '권한 회수', '권한 변경', '권한 생성', '권한 삭제'] as const;
export type ChangeType = typeof CHANGE_TYPES[number];
export type ItemAction = '추가' | '회수';

export interface HistItem { path: string; field: string; action: ItemAction }
export interface Holder { name: string; org: string }
export interface HistEntry {
  id: string;
  ts: string;             // 'YYYY-MM-DD HH:mm:ss'
  ctype: ChangeType;
  preset: string;         // 대상 권한
  items?: HistItem[];     // 권한 변경(메뉴별 추가/회수)
  tgt?: string; tgtorg?: string;   // 부여·회수 대상 개인
  before?: string; after?: string; // 전→후
  actor: string; src: string; ip: string; reason: string;
  holders: Holder[];      // 적용 대상(동일 권한 보유자)
}

/* 데모 기준일(목업 monthRange 고정 시각) — 더미 이력이 2026-08~09 에 몰려 있어 실시계 대신 고정 */
export const DEMO_TODAY = '2026-09-13';

/* 동일 권한 보유자 풀 — 권한 단위 변경 시 전원에게 적용 */
const POOL: Record<string, Holder[]> = {
  '투자팀': [{ name: '김담당', org: '농금원 · 투자팀' }, { name: '정투자', org: '농금원 · 투자팀' }, { name: '한심사', org: '농금원 · 투자팀' }],
  '운용사': [{ name: '이대표', org: '운용사 · IMM인베스트먼트' }, { name: '정운용', org: '운용사 · IMM인베스트먼트' }, { name: '서운용', org: '운용사 · KB증권' }, { name: '박심사', org: '운용사 · 한국투자파트너스' }],
  '수탁': [{ name: '김수탁', org: '수탁 · 농협은행' }, { name: '이수탁', org: '수탁 · 농협은행' }],
  '부처': [{ name: '박농식', org: '부처 · 농식품 계정' }, { name: '최수산', org: '부처 · 수산 계정' }],
  '전산(관리자)': [{ name: '전산관리', org: '농금원 · 전산' }],
};

type Raw = Omit<HistEntry, 'id' | 'holders'>;
const A = (path: string, field: string): HistItem => ({ path, field, action: '추가' });
const R = (path: string, field: string): HistItem => ({ path, field, action: '회수' });
const RAW: Raw[] = [
  { ts: '2026-09-13 09:20:11', ctype: '권한 변경', preset: '투자팀', items: [A('투자자산관리 > 사후보고관리 > 투심보고 확정 및 승인', '인쇄/다운로드'), A('투자자산관리 > 사후보고관리 > 투심보고 확정 및 승인', '관리자'), R('투자자산관리 > 자펀드 관리 > 종합통계(확정)', '등록/수정')], actor: '전산관리', src: '권한관리', ip: '10.0.1.20', reason: '감사 지적 반영 — 반출 통제 조정' },
  { ts: '2026-09-12 17:44:29', ctype: '권한 회수', preset: '운용사', tgt: '정운용', tgtorg: '운용사 · IMM인베스트먼트', before: '운용사', after: '미부여', actor: '전산관리', src: '사용자관리', ip: '10.0.1.20', reason: '퇴사 보고 연동 — 계정 비활성' },
  { ts: '2026-09-12 14:05:33', ctype: '권한 변경', preset: '부처', items: [A('부처보고 > 모태펀드 > 연도별투자현황', '조회'), A('부처보고 > 등록원부 > 등록원부관리', '조회')], actor: '전산관리', src: '권한관리', ip: '10.0.1.20', reason: '부처 보고범위 확대' },
  { ts: '2026-09-11 10:30:20', ctype: '권한 부여', preset: '수탁', tgt: '이수탁', tgtorg: '수탁 · 농협은행', before: '미부여', after: '수탁', actor: '전산관리', src: '사용자 초대', ip: '10.0.1.20', reason: '신규 온보딩(초대 수락)' },
  { ts: '2026-09-10 16:22:40', ctype: '권한 생성', preset: '부처', before: '-', after: '생성', actor: '전산관리', src: '권한관리', ip: '10.0.1.20', reason: '부처(농식품부·해양수산부) 권한 세트 신설' },
  { ts: '2026-09-10 11:05:12', ctype: '권한 변경', preset: '수탁', items: [A('수탁보고 > 자펀드수탁 > 유가증권관리(업로드)', '등록/수정'), A('수탁보고 > 자펀드수탁 > 유가증권비교조회', '조회'), R('수탁보고 > 자펀드수탁 > 실물자료관리(업로드)', '등록/수정')], actor: '전산관리', src: '권한관리', ip: '10.0.1.20', reason: '수탁 업무 범위 조정' },
  { ts: '2026-09-09 15:41:07', ctype: '권한 변경', preset: '투자팀', items: [A('투자자산관리 > 사후보고관리 > 체크리스트 관리', '등록/수정')], actor: '전산관리', src: '권한관리', ip: '10.0.1.20', reason: '체크리스트 작성 권한 부여' },
  { ts: '2026-09-08 13:12:55', ctype: '권한 회수', preset: '부처', tgt: '최수산', tgtorg: '부처 · 수산 계정', before: '부처', after: '미부여', actor: '전산관리', src: '사용자관리', ip: '10.0.1.20', reason: '담당자 변경 — 구 계정 회수' },
  { ts: '2026-09-05 09:33:18', ctype: '권한 변경', preset: '운용사', items: [R('자펀드 보고 > 조합정보 > 조합출자/분배현황', '인쇄/다운로드'), R('자펀드 보고 > 투자자산 > 투자기업재무정보', '인쇄/다운로드')], actor: '전산관리', src: '권한관리', ip: '10.0.1.20', reason: '반출 통제 강화' },
  { ts: '2026-09-02 10:48:26', ctype: '권한 부여', preset: '투자팀', tgt: '김담당', tgtorg: '농금원 · 투자팀', before: '미부여', after: '투자팀', actor: '전산관리', src: '사용자관리', ip: '10.0.1.20', reason: '인사 발령 — 투자팀 배치' },
  { ts: '2026-08-28 14:20:00', ctype: '권한 삭제', preset: '공동GP(구)', before: '존재', after: '삭제', actor: '전산관리', src: '권한관리', ip: '10.0.1.20', reason: '미사용 권한 정리(보유자 0명)' },
  { ts: '2026-08-26 11:02:41', ctype: '권한 변경', preset: '수탁', items: [A('수탁보고 > 모태펀드수탁 > 입출금정보관리', '조회')], actor: '전산관리', src: '권한관리', ip: '10.0.1.20', reason: '수탁 조회범위 확대' },
  { ts: '2026-08-20 09:15:33', ctype: '권한 부여', preset: '전산(관리자)', tgt: '전산관리', tgtorg: '농금원 · 전산', before: '미부여', after: '전산(관리자)', actor: '정보화팀(마스터)', src: '사용자관리', ip: '10.0.1.10', reason: '최초 구축 — 마스터 관리자 지정' },
];

/** 적용 대상 산출(목업): 권한 단위 변경=보유자 전원, 부여/회수=대상 개인, 삭제=0명 */
export function holdersOf(e: Raw): Holder[] {
  if (e.ctype === '권한 부여' || e.ctype === '권한 회수') return e.tgt ? [{ name: e.tgt, org: e.tgtorg ?? '' }] : [];
  if (e.ctype === '권한 삭제') return [];
  return [...(POOL[e.preset] ?? [])];
}

export function demoHistory(): HistEntry[] {
  return RAW.map((e, i) => ({ ...e, id: `h-${i + 1}`, holders: holdersOf(e) }));
}

export const cntAdd = (e: Pick<HistEntry, 'items'>): number => (e.items ?? []).filter((i) => i.action === '추가').length;
export const cntRev = (e: Pick<HistEntry, 'items'>): number => (e.items ?? []).filter((i) => i.action === '회수').length;

/** 변경 요약 문자열(엑셀·정렬용) — 항목형은 '추가N 회수M', 전이형은 'before→after' */
export const summaryText = (e: HistEntry): string => (e.items ? `추가 ${cntAdd(e)} 회수 ${cntRev(e)}` : `${e.before ?? ''}→${e.after ?? ''}`);

export const CT_TONE: Readonly<Record<ChangeType, 'success' | 'danger' | 'info' | 'warning' | 'primary'>> =
  Object.freeze({ '권한 부여': 'success', '권한 회수': 'danger', '권한 변경': 'info', '권한 생성': 'warning', '권한 삭제': 'primary' });

/** 대상 사용자 옵션 = 이력에 등장하는 모든 적용 대상(정렬) */
export function usersOf(rows: readonly HistEntry[]): string[] {
  const s = new Set<string>();
  for (const e of rows) for (const h of e.holders) s.add(h.name);
  return [...s].sort((a, b) => a.localeCompare(b, 'ko'));
}

/** 이번 달 범위 — 기준일의 1일 ~ 기준일('YYYY-MM-DD') */
export function monthRange(today: string = DEMO_TODAY): [string, string] {
  return [`${today.slice(0, 7)}-01`, today];
}

export interface HistFilter { from?: string; to?: string; user?: string; type?: string; actor?: string; kw?: string }
/** 목업 applyFilter — 기간(빈 값=열린 경계)·대상 사용자·변경유형·행위자·검색어(권한·메뉴경로·기능·후값) */
export function filterHistory(rows: readonly HistEntry[], f: HistFilter): HistEntry[] {
  const actor = (f.actor ?? '').trim().toLowerCase();
  const kw = (f.kw ?? '').trim().toLowerCase();
  return rows.filter((e) => {
    const d = e.ts.slice(0, 10);
    if (f.from && d < f.from) return false;
    if (f.to && d > f.to) return false;
    if (f.user && !e.holders.some((h) => h.name === f.user)) return false;
    if (f.type && e.ctype !== f.type) return false;
    if (actor && !e.actor.toLowerCase().includes(actor)) return false;
    if (kw) {
      const hay = `${e.preset} ${(e.items ?? []).map((i) => `${i.path} ${i.field}`).join(' ')} ${e.after ?? ''}`.toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });
}

/** 유형별 건수(목업 updateSummary) — CHANGE_TYPES 순서, 0건은 제외 */
export function summaryCounts(rows: readonly HistEntry[]): { type: ChangeType; n: number }[] {
  const c = new Map<ChangeType, number>();
  for (const e of rows) c.set(e.ctype, (c.get(e.ctype) ?? 0) + 1);
  return CHANGE_TYPES.filter((t) => c.has(t)).map((t) => ({ type: t, n: c.get(t)! }));
}
