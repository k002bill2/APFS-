/* 관리자 화면 공용 메뉴 트리 — LNB 정본 `APFS_DATA.MENU`(현행시스템 메뉴 구조표 1:1)를 계층 행으로 평탄화한다.
   메뉴 관리(menu_manage)와 사용자 권한 관리의 권한 매트릭스(user_permission_modal)가 **같은 데이터**를 본다
   — 목업(S0_105·S0_102) 원칙 "메뉴 구성은 권한관리와 동일한 데이터"를 별도 트리를 만들지 않고 코드로 보장한다.

   행 규칙(목업 S0_105 `addRow` 이식):
   - 레벨1 = 대분류(MENU top), 레벨2 = 중분류(sub), 레벨3 = 리프. 대시보드처럼 자식 없는 top은 레벨1 리프.
   - 메뉴ID = 'M' + 3자리 일련번호(등장 순), 프로그램ID = 대분류 접두어 + 4자리(중분류·리프 순번) — 목업의 랜덤 4자리를
     결정적 번호로 바꿔 새로고침·테스트에서 값이 흔들리지 않게 한다. 프로그램은 리프(자식 없는 행)에만 매핑된다.
   - 사용자 구분은 대분류별 기본값(목업 UT 표)을 하위가 상속. 비어 있으면 '공통'으로 취급.
   ⚠ 백엔드가 없어 여기서 만든 행은 화면 로컬 상태의 초기값일 뿐이며 LNB 자체를 바꾸지 않는다(UI 프로토타입). */
import { APFS_DATA } from './data';

export const UTYPES = ['농금원', '운용사', '수탁', '부처'] as const;
export type UType = typeof UTYPES[number];
export type MenuLevel = 1 | 2 | 3;

export interface MenuRow {
  id: string;            // 안정 키(getRowId) — 'm-<seq>'
  code: string;          // 메뉴ID 'M001'
  name: string;          // 메뉴명
  en: string;            // 메뉴명(영문) — 목업은 빈 값, 대분류만 데모 영문명
  pid: string;           // 프로그램ID(리프만) — '' 이면 미매핑
  pname: string;         // 프로그램명(리프만)
  short: string;         // 단축번호(숫자 문자열) — 프로그램ID가 있을 때만 유효
  lvl: MenuLevel;
  ord: number;           // 같은 부모 안 정렬번호(1..n)
  parentId: string | null;
  utypes: UType[];       // 노출 사용자 구분(복수). 빈 배열 = 공통
  use: boolean;          // 사용여부
}

export interface Program { pid: string; pname: string }

/* 대분류 id → 사용자 구분 기본값(목업 S0_105 `UT`: 공통·투자자산관리·조기경보·회계·관리자=농금원, 자펀드보고=운용사, 부처보고=부처, 수탁보고=수탁) */
const TOP_UTYPES: Record<string, UType[]> = {
  home: [], asset: ['농금원'], risk: ['농금원'], gp: ['운용사'], acct: ['농금원'], report: ['부처'], trustee: ['수탁'], admin: ['농금원'],
};
/* 대분류 id → 프로그램ID 접두어(목업 `PFX`: 공통 CO·투자자산관리 IV·조기경보 EW·자펀드보고 FR·회계 AC·부처보고 GV·수탁보고 TR·관리자 AD) */
const TOP_PREFIX: Record<string, string> = {
  home: 'CO', asset: 'IV', risk: 'EW', gp: 'FR', acct: 'AC', report: 'GV', trustee: 'TR', admin: 'AD',
};
/* 대분류 영문명(데모) — 목업은 전부 빈 값이라 컬럼이 '-'로만 차므로 대분류에만 채운다 */
const TOP_EN: Record<string, string> = {
  home: 'Dashboard', asset: 'Investment Asset Management', risk: 'Early Warning', gp: 'Sub-fund Reporting',
  acct: 'Accounting', report: 'Ministry Reporting', trustee: 'Custody Reporting', admin: 'Administrator',
};
/* 단축번호 데모 2건 — 컬럼 표현 확인용(목업은 전부 빈 값). path 로 리프를 찾아 부여한다(라벨 개편에 흔들리지 않게). */
const DEMO_SHORT: Record<string, string> = { subfund: '1101', 'risk-manage': '2101' };

type Node = { id?: string; label: string; path?: string; children?: Node[] };

/** LNB MENU → 계층 행 목록. 호출마다 새 배열(호출자가 로컬 state 초기값으로 복사해 쓴다). */
export function buildMenuRows(): MenuRow[] {
  const rows: MenuRow[] = [];
  let seq = 0;
  const pad3 = (n: number) => String(n).padStart(3, '0');
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const add = (p: Omit<MenuRow, 'id' | 'code'>): MenuRow => {
    const r: MenuRow = { id: `m-${++seq}`, code: `M${pad3(seq)}`, ...p };
    rows.push(r);
    return r;
  };
  (APFS_DATA.MENU as Node[]).forEach((top, ti) => {
    const key = top.id ?? `t${ti}`;
    const ut = TOP_UTYPES[key] ?? [];
    const pfx = TOP_PREFIX[key] ?? 'ZZ';
    const isLeaf = !top.children || top.children.length === 0;
    const t = add({ name: top.label, en: TOP_EN[key] ?? '', pid: isLeaf ? `${pfx}0001` : '', pname: isLeaf ? top.label : '',
      short: isLeaf ? (DEMO_SHORT[top.path ?? ''] ?? '') : '', lvl: 1, ord: ti + 1, parentId: null, utypes: [...ut], use: true });
    (top.children ?? []).forEach((mid, mi) => {
      const midLeaf = !mid.children || mid.children.length === 0;
      const m = add({ name: mid.label, en: '', pid: midLeaf ? `${pfx}${pad2(mi + 1)}00` : '', pname: midLeaf ? mid.label : '',
        short: midLeaf ? (DEMO_SHORT[mid.path ?? ''] ?? '') : '', lvl: 2, ord: mi + 1, parentId: t.id, utypes: [...ut], use: true });
      (mid.children ?? []).forEach((leaf, li) => {
        add({ name: leaf.label, en: '', pid: `${pfx}${pad2(mi + 1)}${pad2(li + 1)}`, pname: leaf.label,
          short: DEMO_SHORT[leaf.path ?? ''] ?? '', lvl: 3, ord: li + 1, parentId: m.id, utypes: [...ut], use: true });
      });
    });
  });
  return rows;
}

export const hasChildren = (rows: readonly MenuRow[], id: string): boolean => rows.some((r) => r.parentId === id);
export const childrenOf = (rows: readonly MenuRow[], parentId: string | null): MenuRow[] =>
  rows.filter((r) => r.parentId === parentId).sort((a, b) => a.ord - b.ord);
export const rowById = (rows: readonly MenuRow[], id: string | null): MenuRow | undefined =>
  id == null ? undefined : rows.find((r) => r.id === id);

/** 프로그램 카탈로그 = 프로그램ID가 있는 리프(목업 `PROGRAMS`). 프로그램 검색 팝업의 데이터 소스. */
export function programsOf(rows: readonly MenuRow[]): Program[] {
  return rows.filter((r) => r.pid).map((r) => ({ pid: r.pid, pname: r.pname }));
}

/** 프로그램 관리 목록 한 행 — 프로그램(리프) + 연결 메뉴 경로(대분류 › 중분류 › 리프) + 사용여부 */
export interface ProgramEntry { leafId: string; pid: string; pname: string; menuPath: string; use: boolean }

/** 프로그램 관리(program_manage) 데이터 소스 — `programsOf` 와 같은 집합·순서에 연결 메뉴 경로를 붙인다.
    목업 S0_105 PROGRAMS 는 pid·pname 뿐이라 "연결 메뉴"는 리프의 상위 라벨을 ' › ' 로 이어 만든다. */
export function programCatalog(rows: readonly MenuRow[]): ProgramEntry[] {
  const pathOf = (r: MenuRow): string => {
    const p = rowById(rows, r.parentId);
    return p ? `${pathOf(p)} › ${r.name}` : r.name;
  };
  return rows.filter((r) => r.pid).map((r) => ({ leafId: r.id, pid: r.pid, pname: r.pname, menuPath: pathOf(r), use: r.use }));
}

/** 프로그램ID 유일 불변식 — `pid`를 이미 쓰는 **다른** 행(수정 중인 자기 자신 `excludeId` 제외). 빈 pid 는 충돌이 아니다.
    메뉴 등록/수정 모달이 저장 전에 검사한다(한 프로그램은 한 메뉴에만 — 아니면 프로그램 카탈로그에 같은 행이 두 번 생긴다). */
export const pidTakenBy = (rows: readonly MenuRow[], pid: string, excludeId?: string): MenuRow | undefined =>
  pid ? rows.find((r) => r.pid === pid && r.id !== excludeId) : undefined;

/** 리프 여부(자식 없음) — 권한 매트릭스 행·프로그램 매핑 대상 */
export const isLeaf = (rows: readonly MenuRow[], r: MenuRow): boolean => !hasChildren(rows, r.id);

/** 사용자 구분 표시 문자열 — 비어 있으면 '공통'(목업 규칙) */
export const utypeLabel = (u: readonly UType[]): string => (u.length ? u.join(', ') : '공통');
